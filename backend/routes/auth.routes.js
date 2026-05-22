const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { pool, transaction } = require("../config/database");
const env = require("../config/env");
const { asyncHandler } = require("../utils/http");
const {
  comparePassword,
  emailLookupHash,
  encryptJson,
  hashPassword,
  regimentalLookupHash
} = require("../utils/crypto");
const { formatDisplayName, getServiceBranch, parseNameParts } = require("../utils/display-name");
const { signAccessToken } = require("../services/token.service");
const { loadUserById, toClientUser } = require("../services/user.service");
const { writeAudit } = require("../services/audit.service");
const { requireAuth } = require("../middleware/auth");
const { profileUpload } = require("../middleware/upload");

const router = express.Router();

function validateSignup(body) {
  const required = ["fullName", "email", "password", "rank", "regimentalNumber"];
  const missing = required.filter((field) => !String(body[field] || "").trim());

  if (missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  const digits = String(body.regimentalNumber || "").replace(/\D/g, "");

  if (![4, 5].includes(digits.length)) {
    return "Regimental number must contain exactly 4 or 5 digits.";
  }

  if (String(body.password).length < 8) {
    return "Password must be at least 8 characters long.";
  }

  return null;
}

function validateProfileUpdate(body) {
  const required = ["fullName", "email", "rank"];
  const missing = required.filter((field) => !String(body[field] || "").trim());

  if (missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  return null;
}

function buildProfilePayload(payload) {
  const { digits } = getServiceBranch(payload.regimentalNumber);
  const nameParts = parseNameParts(payload.fullName);

  return {
    full_name: String(payload.fullName || "").trim(),
    email: String(payload.email || "").trim(),
    rank: String(payload.rank || "").trim(),
    regimental_number: digits,
    surname: nameParts.surname,
    given_names: nameParts.givenNames,
    initials: nameParts.initials,
    display_name: formatDisplayName({
      fullName: payload.fullName,
      rank: payload.rank,
      regimentalNumber: digits,
      isStaff: payload.accountType === "STAFF"
    })
  };
}

function hashUploadedFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest();
}

async function createUserRecord(connection, payload) {
  const passwordHash = await hashPassword(payload.password);
  const { serviceBranch, digits } = getServiceBranch(payload.regimentalNumber);
  const profile = buildProfilePayload(payload);
  const encryptedProfile = encryptJson(profile);
  const roleCode = payload.accountType === "STAFF" ? "STAFF" : "VETERAN";

  const [roleRows] = await connection.execute(
    "SELECT role_id FROM roles WHERE role_code = ? LIMIT 1",
    [roleCode]
  );

  const role = roleRows[0];

  if (!role) {
    throw new Error(`Role not found: ${roleCode}`);
  }

  const [result] = await connection.execute(
    `INSERT INTO users (
      public_uuid,
      account_type,
      role_id,
      staff_approval_status,
      email_lookup_hash,
      regimental_number_lookup_hash,
      service_branch,
      regimental_number_digits,
      password_hash,
      password_algorithm,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BCRYPT', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      crypto.randomUUID(),
      payload.accountType,
      role.role_id,
      payload.accountType === "STAFF" ? "PENDING" : "NOT_APPLICABLE",
      emailLookupHash(payload.email),
      regimentalLookupHash(digits),
      serviceBranch,
      digits.length,
      passwordHash
    ]
  );

  const userId = result.insertId;

  await connection.execute(
    `INSERT INTO user_secure_profiles (
      user_id,
      key_version,
      profile_schema_version,
      profile_ciphertext,
      profile_iv,
      profile_tag,
      created_at,
      updated_at
    ) VALUES (?, ?, 1, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      userId,
      encryptedProfile.keyVersion,
      encryptedProfile.ciphertext,
      encryptedProfile.iv,
      encryptedProfile.tag
    ]
  );

  if (payload.accountType === "STAFF") {
    const requestedDepartmentCode = String(payload.requestedDepartmentCode || "").trim();
    const requestedPrimaryDepartmentId = Number(payload.requestedPrimaryDepartmentId || 0) || null;
    const [departmentRows] = requestedPrimaryDepartmentId
      ? await connection.execute(
          "SELECT department_id FROM departments WHERE department_id = ? LIMIT 1",
          [requestedPrimaryDepartmentId]
        )
      : await connection.execute(
          "SELECT department_id FROM departments WHERE department_code = ? LIMIT 1",
          [requestedDepartmentCode || "WELFARE_ASSISTANCE"]
        );
    const department = departmentRows[0] || null;

    await connection.execute(
      `INSERT INTO staff_profiles (
        user_id,
        requested_primary_department_id,
        employment_status,
        requested_at,
        created_at,
        updated_at
      ) VALUES (?, ?, 'PENDING_APPROVAL', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [userId, department ? department.department_id : null]
    );
  }

  return userId;
}

router.post(
  "/bootstrap-main-admin",
  asyncHandler(async (req, res) => {
    const { bootstrapKey, fullName, email, password, rank, regimentalNumber } = req.body || {};

    if (bootstrapKey !== env.mainAdminBootstrapKey) {
      return res.status(403).json({ message: "Invalid bootstrap key." });
    }

    const [existingAdmins] = await pool.execute(
      `SELECT COUNT(*) AS count
      FROM users u
      INNER JOIN roles r
        ON r.role_id = u.role_id
      WHERE r.role_code = 'MAIN_ADMIN'`
    );

    if (existingAdmins[0].count > 0) {
      return res.status(409).json({ message: "Main Admin already exists." });
    }

    const validationError = validateSignup({ fullName, email, password, rank, regimentalNumber });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await transaction(async (connection) => {
      const userId = await createUserRecord(connection, {
        accountType: "STAFF",
        fullName,
        email,
        password,
        rank,
        regimentalNumber,
        requestedDepartmentCode: "OUTREACH_COMMUNICATION"
      });

      const [roleRows] = await connection.execute(
        "SELECT role_id FROM roles WHERE role_code = 'MAIN_ADMIN' LIMIT 1"
      );

      await connection.execute(
        `UPDATE users
        SET role_id = ?,
            staff_approval_status = 'APPROVED',
            approved_by_user_id = ?,
            approved_at = UTC_TIMESTAMP(),
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?`,
        [roleRows[0].role_id, userId, userId]
      );

      const [departmentRows] = await connection.execute(
        "SELECT department_id FROM departments"
      );

      for (const department of departmentRows) {
        await connection.execute(
          `INSERT INTO staff_department_access (
            user_id,
            department_id,
            access_level,
            is_primary,
            is_active,
            granted_by_user_id,
            granted_at
          ) VALUES (?, ?, 'MANAGE', ?, 1, ?, UTC_TIMESTAMP())`,
          [userId, department.department_id, departmentRows[0].department_id === department.department_id ? 1 : 0, userId]
        );
      }

      await writeAudit(connection, {
        actorUserId: userId,
        actorRoleId: roleRows[0].role_id,
        eventCode: "BOOTSTRAP_MAIN_ADMIN",
        entityType: "USER",
        entityId: userId,
        targetUserId: userId,
        summary: "Bootstrapped the first Main Admin account."
      });

      return loadUserById(connection, userId);
    });

    return res.status(201).json({
      token: signAccessToken(user),
      user: toClientUser(user)
    });
  })
);

router.post(
  "/signup/veteran",
  asyncHandler(async (req, res) => {
    const { fullName, email, password, rank, regimentalNumber } = req.body || {};
    const validationError = validateSignup({ fullName, email, password, rank, regimentalNumber });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    try {
      const user = await transaction(async (connection) => {
        const userId = await createUserRecord(connection, {
          accountType: "VETERAN",
          fullName,
          email,
          password,
          rank,
          regimentalNumber
        });

        await writeAudit(connection, {
          actorUserId: userId,
          eventCode: "REGISTER_VETERAN",
          entityType: "USER",
          entityId: userId,
          targetUserId: userId,
          summary: "Registered a veteran portal account."
        });

        return loadUserById(connection, userId);
      });

      return res.status(201).json({
        token: signAccessToken(user),
        user: toClientUser(user)
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "An account already exists with that email or regimental number." });
      }

      throw error;
    }
  })
);

router.post(
  "/signup/staff",
  asyncHandler(async (req, res) => {
    if (!env.allowStaffSelfSignup) {
      return res.status(403).json({ message: "Staff self-signup is disabled." });
    }

    const { fullName, email, password, rank, regimentalNumber, requestedDepartmentCode, requestedPrimaryDepartmentId } = req.body || {};
    const validationError = validateSignup({ fullName, email, password, rank, regimentalNumber });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    try {
      const user = await transaction(async (connection) => {
        const userId = await createUserRecord(connection, {
          accountType: "STAFF",
          fullName,
          email,
          password,
          rank,
          regimentalNumber,
          requestedDepartmentCode,
          requestedPrimaryDepartmentId
        });

        await writeAudit(connection, {
          actorUserId: userId,
          eventCode: "REGISTER_STAFF",
          entityType: "USER",
          entityId: userId,
          targetUserId: userId,
          summary: "Registered a staff account pending approval."
        });

        return loadUserById(connection, userId);
      });

      return res.status(201).json({
        message: "Staff account submitted and pending admin approval.",
        user: toClientUser(user)
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "An account already exists with that email or regimental number." });
      }

      throw error;
    }
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    if (!String(email || "").trim() || !String(password || "").trim()) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT
          u.user_id,
          u.password_hash
        FROM users u
        WHERE u.email_lookup_hash = ?
        LIMIT 1`,
        [emailLookupHash(email)]
      );

      const row = rows[0];

      if (!row) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const passwordMatches = await comparePassword(password, row.password_hash.toString());

      if (!passwordMatches) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const user = await loadUserById(connection, row.user_id);

      if (!user?.isActive) {
        return res.status(403).json({ message: "This account is blocked. Please contact the Department of Veterans Affairs." });
      }

      if (user.accountType === "STAFF" && user.staffApprovalStatus !== "APPROVED") {
        return res.status(403).json({
          message: "Staff account is not approved yet.",
          staffApprovalStatus: user.staffApprovalStatus
        });
      }

      await connection.execute(
        "UPDATE users SET last_login_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE user_id = ?",
        [row.user_id]
      );

      return res.json({
        token: signAccessToken(user),
        user: toClientUser(user)
      });
    } finally {
      connection.release();
    }
  })
);

router.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({
      user: toClientUser(req.user)
    });
  })
);

router.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { fullName, email, rank } = req.body || {};
    const validationError = validateProfileUpdate({ fullName, email, rank });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    try {
      const user = await transaction(async (connection) => {
        const profile = buildProfilePayload({
          accountType: req.user.accountType,
          fullName,
          email,
          rank,
          regimentalNumber: req.user.profile.regimental_number
        });
        const encryptedProfile = encryptJson(profile);

        await connection.execute(
          `UPDATE users
          SET email_lookup_hash = ?,
              updated_at = UTC_TIMESTAMP()
          WHERE user_id = ?`,
          [emailLookupHash(email), req.user.userId]
        );

        await connection.execute(
          `UPDATE user_secure_profiles
          SET key_version = ?,
              profile_ciphertext = ?,
              profile_iv = ?,
              profile_tag = ?,
              updated_at = UTC_TIMESTAMP()
          WHERE user_id = ?`,
          [
            encryptedProfile.keyVersion,
            encryptedProfile.ciphertext,
            encryptedProfile.iv,
            encryptedProfile.tag,
            req.user.userId
          ]
        );

        await writeAudit(connection, {
          actorUserId: req.user.userId,
          actorRoleId: req.user.roleId,
          actorDepartmentId: req.user.departments[0]?.departmentId || null,
          eventCode: "PROFILE_UPDATED",
          entityType: "USER",
          entityId: req.user.userId,
          targetUserId: req.user.userId,
          summary: "Updated account profile details."
        });

        return loadUserById(connection, req.user.userId);
      });

      return res.json({
        message: "Profile updated successfully.",
        user: toClientUser(user)
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Another account already uses that email address." });
      }

      throw error;
    }
  })
);

router.post(
  "/profile/photo",
  requireAuth,
  profileUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Profile image file is required." });
    }

    const user = await transaction(async (connection) => {
      await connection.execute(
        `UPDATE user_profile_images
        SET is_active = 0,
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?
          AND is_active = 1`,
        [req.user.userId]
      );

      await connection.execute(
        `INSERT INTO user_profile_images (
          user_id,
          storage_disk,
          relative_path,
          mime_type,
          file_size_bytes,
          file_sha256,
          is_active,
          uploaded_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, 'PRIVATE_UPLOADS', ?, ?, ?, ?, 1, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          req.user.userId,
          path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
          req.file.mimetype,
          req.file.size,
          hashUploadedFile(req.file.path),
          req.user.userId
        ]
      );

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "PROFILE_IMAGE_UPLOADED",
        entityType: "USER",
        entityId: req.user.userId,
        targetUserId: req.user.userId,
        summary: "Uploaded a new profile image."
      });

      return loadUserById(connection, req.user.userId);
    });

    return res.status(201).json({
      message: "Profile image uploaded successfully.",
      user: toClientUser(user)
    });
  })
);

router.get(
  "/profile/photo",
  requireAuth,
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT
          relative_path,
          mime_type
        FROM user_profile_images
        WHERE user_id = ?
          AND is_active = 1
        ORDER BY created_at DESC
        LIMIT 1`,
        [req.user.userId]
      );

      const image = rows[0];

      if (!image) {
        return res.status(404).json({ message: "Profile image not found." });
      }

      const resolvedPath = path.resolve(process.cwd(), image.relative_path);

      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ message: "Profile image file not found." });
      }

      res.set("Cache-Control", "no-store");

      if (image.mime_type) {
        res.type(image.mime_type);
      }

      return res.sendFile(resolvedPath);
    } finally {
      connection.release();
    }
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({
      user: toClientUser(req.user)
    });
  })
);

module.exports = router;
