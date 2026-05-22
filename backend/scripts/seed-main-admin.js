require("dotenv").config();

const crypto = require("crypto");
const { pool } = require("../config/database");
const { encryptJson, emailLookupHash, hashPassword, regimentalLookupHash } = require("../utils/crypto");
const { formatDisplayName, getServiceBranch, parseNameParts } = require("../utils/display-name");

function required(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildMainAdmin() {
  const fullName = required("SEED_MAIN_ADMIN_FULL_NAME");
  const email = required("SEED_MAIN_ADMIN_EMAIL").toLowerCase();
  const password = required("SEED_MAIN_ADMIN_PASSWORD");
  const rank = required("SEED_MAIN_ADMIN_RANK");
  const regimentalNumber = required("SEED_MAIN_ADMIN_REGIMENTAL_NUMBER");
  const { serviceBranch, digits } = getServiceBranch(regimentalNumber);
  const nameParts = parseNameParts(fullName);
  const displayName = formatDisplayName({
    fullName,
    rank,
    regimentalNumber: digits,
    isStaff: true
  });

  if (password.length < 12) {
    throw new Error("SEED_MAIN_ADMIN_PASSWORD should be at least 12 characters.");
  }

  return {
    fullName,
    email,
    password,
    rank,
    serviceBranch,
    regimentalNumber: digits,
    regimentalNumberDigits: digits.length,
    displayName,
    profile: {
      full_name: fullName,
      email,
      rank,
      regimental_number: digits,
      surname: nameParts.surname,
      given_names: nameParts.givenNames,
      initials: nameParts.initials,
      display_name: displayName
    }
  };
}

async function main() {
  const admin = buildMainAdmin();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [roleRows] = await connection.execute(
      "SELECT role_id FROM roles WHERE role_code = 'MAIN_ADMIN' LIMIT 1"
    );

    if (!roleRows.length) {
      throw new Error("MAIN_ADMIN role was not found. Import database/jdf_portal_schema.sql first.");
    }

    const [existingMainAdmins] = await connection.execute(
      `SELECT u.user_id
      FROM users u
      INNER JOIN roles r ON r.role_id = u.role_id
      WHERE r.role_code = 'MAIN_ADMIN'
      LIMIT 1`
    );

    if (existingMainAdmins.length && String(process.env.SEED_MAIN_ADMIN_FORCE || "false") !== "true") {
      await connection.rollback();
      console.log("Main Admin already exists. Set SEED_MAIN_ADMIN_FORCE=true only if you intentionally want to replace/update it.");
      return;
    }

    const encryptedProfile = encryptJson(admin.profile);
    const passwordHash = await hashPassword(admin.password);

    const [existingUserRows] = await connection.execute(
      "SELECT user_id FROM users WHERE email_lookup_hash = ? LIMIT 1",
      [emailLookupHash(admin.email)]
    );

    let userId = existingUserRows[0]?.user_id || null;

    if (!userId) {
      const [insertResult] = await connection.execute(
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
          is_email_verified,
          is_identity_verified,
          is_active,
          approved_at,
          created_at,
          updated_at
        ) VALUES (?, 'STAFF', ?, 'APPROVED', ?, ?, ?, ?, ?, 'BCRYPT', 1, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          crypto.randomUUID(),
          roleRows[0].role_id,
          emailLookupHash(admin.email),
          regimentalLookupHash(admin.regimentalNumber),
          admin.serviceBranch,
          admin.regimentalNumberDigits,
          passwordHash
        ]
      );

      userId = insertResult.insertId;
    } else {
      await connection.execute(
        `UPDATE users
        SET account_type = 'STAFF',
            role_id = ?,
            staff_approval_status = 'APPROVED',
            regimental_number_lookup_hash = ?,
            service_branch = ?,
            regimental_number_digits = ?,
            password_hash = ?,
            password_algorithm = 'BCRYPT',
            is_email_verified = 1,
            is_identity_verified = 1,
            is_active = 1,
            approved_at = COALESCE(approved_at, UTC_TIMESTAMP()),
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?`,
        [
          roleRows[0].role_id,
          regimentalLookupHash(admin.regimentalNumber),
          admin.serviceBranch,
          admin.regimentalNumberDigits,
          passwordHash,
          userId
        ]
      );
    }

    await connection.execute(
      "UPDATE users SET approved_by_user_id = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ?",
      [userId, userId]
    );

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
      ) VALUES (?, ?, 1, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE
        key_version = VALUES(key_version),
        profile_schema_version = VALUES(profile_schema_version),
        profile_ciphertext = VALUES(profile_ciphertext),
        profile_iv = VALUES(profile_iv),
        profile_tag = VALUES(profile_tag),
        updated_at = UTC_TIMESTAMP()`,
      [
        userId,
        encryptedProfile.keyVersion,
        encryptedProfile.ciphertext,
        encryptedProfile.iv,
        encryptedProfile.tag
      ]
    );

    const [departmentRows] = await connection.execute(
      "SELECT department_id FROM departments WHERE is_active = 1"
    );
    const primaryDepartmentId = departmentRows[0]?.department_id || null;

    await connection.execute(
      `INSERT INTO staff_profiles (
        user_id,
        requested_primary_department_id,
        assigned_primary_department_id,
        employment_status,
        requested_at,
        activated_at,
        assigned_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE
        requested_primary_department_id = VALUES(requested_primary_department_id),
        assigned_primary_department_id = VALUES(assigned_primary_department_id),
        employment_status = 'ACTIVE',
        activated_at = UTC_TIMESTAMP(),
        assigned_by_user_id = VALUES(assigned_by_user_id),
        updated_at = UTC_TIMESTAMP()`,
      [userId, primaryDepartmentId, primaryDepartmentId, userId]
    );

    await connection.execute("DELETE FROM staff_department_access WHERE user_id = ?", [userId]);

    for (const row of departmentRows) {
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
        [userId, row.department_id, row.department_id === primaryDepartmentId ? 1 : 0, userId]
      );
    }

    await connection.commit();

    console.log(JSON.stringify({
      seeded: true,
      userId,
      email: admin.email,
      displayName: admin.displayName
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
