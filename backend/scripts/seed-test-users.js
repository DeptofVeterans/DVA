require("dotenv").config();

const crypto = require("crypto");
const { pool } = require("../config/database");
const { encryptJson, emailLookupHash, hashPassword, regimentalLookupHash } = require("../utils/crypto");
const { formatDisplayName, getServiceBranch, parseNameParts } = require("../utils/display-name");

const TEST_USERS = [
  {
    label: "Main Admin",
    accountType: "STAFF",
    roleCode: "MAIN_ADMIN",
    fullName: "Marlon Beckford",
    email: "main.admin@jdfva.local",
    password: "MainAdmin!234",
    rank: "Col",
    regimentalNumber: "54321",
    isIdentityVerified: true,
    departments: ["HISTORICAL_RECORDS", "PENSION_BENEFITS", "RESETTLEMENT_EMPLOYMENT", "WELFARE_ASSISTANCE", "OUTREACH_COMMUNICATION"],
    primaryDepartmentCode: "OUTREACH_COMMUNICATION"
  },
  {
    label: "Reception",
    accountType: "STAFF",
    roleCode: "RECEPTION",
    fullName: "Andrea Williams",
    email: "reception@jdfva.local",
    password: "Reception!234",
    rank: "WO",
    regimentalNumber: "54322",
    isIdentityVerified: true,
    departments: ["WELFARE_ASSISTANCE"],
    primaryDepartmentCode: "WELFARE_ASSISTANCE"
  },
  {
    label: "Records Staff",
    accountType: "STAFF",
    roleCode: "STAFF",
    fullName: "Rohan Brown",
    email: "records.staff@jdfva.local",
    password: "Records!234",
    rank: "Sgt",
    regimentalNumber: "54323",
    isIdentityVerified: true,
    departments: ["HISTORICAL_RECORDS"],
    primaryDepartmentCode: "HISTORICAL_RECORDS"
  },
  {
    label: "Welfare Staff",
    accountType: "STAFF",
    roleCode: "STAFF",
    fullName: "Karen Thompson",
    email: "welfare.staff@jdfva.local",
    password: "Welfare!234",
    rank: "Capt",
    regimentalNumber: "4321",
    isIdentityVerified: true,
    departments: ["WELFARE_ASSISTANCE"],
    primaryDepartmentCode: "WELFARE_ASSISTANCE"
  },
  {
    label: "Veteran JDF",
    accountType: "VETERAN",
    roleCode: "VETERAN",
    fullName: "Roger Johnson",
    email: "veteran.jdf@jdfva.local",
    password: "Veteran!234",
    rank: "Pte",
    regimentalNumber: "23456",
    isIdentityVerified: false
  },
  {
    label: "Veteran JCA",
    accountType: "VETERAN",
    roleCode: "VETERAN",
    fullName: "Richard Johnson",
    email: "veteran.jca@jdfva.local",
    password: "Captain!234",
    rank: "Capt",
    regimentalNumber: "2345",
    isIdentityVerified: true
  }
];

function buildProfile(user) {
  const { digits } = getServiceBranch(user.regimentalNumber);
  const nameParts = parseNameParts(user.fullName);

  return {
    full_name: user.fullName,
    email: user.email,
    rank: user.rank,
    regimental_number: digits,
    surname: nameParts.surname,
    given_names: nameParts.givenNames,
    initials: nameParts.initials,
    display_name: formatDisplayName({
      fullName: user.fullName,
      rank: user.rank,
      regimentalNumber: digits,
      isStaff: user.accountType === "STAFF"
    })
  };
}

async function getRoleMap(connection) {
  const [rows] = await connection.execute("SELECT role_id, role_code FROM roles");
  return Object.fromEntries(rows.map((row) => [row.role_code, row.role_id]));
}

async function getDepartmentMap(connection) {
  const [rows] = await connection.execute("SELECT department_id, department_code FROM departments");
  return Object.fromEntries(rows.map((row) => [row.department_code, row.department_id]));
}

async function ensureUser(connection, user, roleMap, departmentMap, approvedByUserId = null) {
  const { serviceBranch, digits } = getServiceBranch(user.regimentalNumber);
  const roleId = roleMap[user.roleCode];
  const passwordHash = await hashPassword(user.password);
  const encryptedProfile = encryptJson(buildProfile(user));

  if (!roleId) {
    throw new Error(`Role not found: ${user.roleCode}`);
  }

  const [existingRows] = await connection.execute(
    "SELECT user_id FROM users WHERE email_lookup_hash = ? LIMIT 1",
    [emailLookupHash(user.email)]
  );

  let userId = existingRows[0]?.user_id || null;

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
        approved_by_user_id,
        approved_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BCRYPT', 1, ?, 1, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        crypto.randomUUID(),
        user.accountType,
        roleId,
        user.accountType === "STAFF" ? "APPROVED" : "NOT_APPLICABLE",
        emailLookupHash(user.email),
        regimentalLookupHash(digits),
        serviceBranch,
        digits.length,
        passwordHash,
        user.isIdentityVerified ? 1 : 0,
        approvedByUserId,
        user.accountType === "STAFF" ? new Date() : null
      ]
    );

    userId = insertResult.insertId;
  } else {
    await connection.execute(
      `UPDATE users
      SET account_type = ?,
          role_id = ?,
          staff_approval_status = ?,
          regimental_number_lookup_hash = ?,
          service_branch = ?,
          regimental_number_digits = ?,
          password_hash = ?,
          password_algorithm = 'BCRYPT',
          is_email_verified = 1,
          is_identity_verified = ?,
          is_active = 1,
          approved_by_user_id = ?,
          approved_at = ?,
          updated_at = UTC_TIMESTAMP()
      WHERE user_id = ?`,
      [
        user.accountType,
        roleId,
        user.accountType === "STAFF" ? "APPROVED" : "NOT_APPLICABLE",
        regimentalLookupHash(digits),
        serviceBranch,
        digits.length,
        passwordHash,
        user.isIdentityVerified ? 1 : 0,
        approvedByUserId,
        user.accountType === "STAFF" ? new Date() : null,
        userId
      ]
    );
  }

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

  if (user.accountType === "STAFF") {
    const primaryDepartmentId = departmentMap[user.primaryDepartmentCode];
    const departmentIds = (user.departments || []).map((code) => departmentMap[code]).filter(Boolean);

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
      [userId, primaryDepartmentId || null, primaryDepartmentId || null, approvedByUserId]
    );

    await connection.execute("DELETE FROM staff_department_access WHERE user_id = ?", [userId]);

    for (const departmentId of departmentIds) {
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
        [userId, departmentId, departmentId === primaryDepartmentId ? 1 : 0, approvedByUserId]
      );
    }
  }

  return {
    userId,
    displayName: buildProfile(user).display_name
  };
}

async function main() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const roleMap = await getRoleMap(connection);
    const departmentMap = await getDepartmentMap(connection);
    const createdUsers = [];

    const mainAdmin = await ensureUser(connection, TEST_USERS[0], roleMap, departmentMap, null);

    await connection.execute(
      `UPDATE users
      SET approved_by_user_id = ?,
          approved_at = UTC_TIMESTAMP(),
          updated_at = UTC_TIMESTAMP()
      WHERE user_id = ?`,
      [mainAdmin.userId, mainAdmin.userId]
    );

    createdUsers.push({
      ...TEST_USERS[0],
      userId: mainAdmin.userId,
      displayName: mainAdmin.displayName
    });

    for (const user of TEST_USERS.slice(1)) {
      const ensured = await ensureUser(connection, user, roleMap, departmentMap, mainAdmin.userId);
      createdUsers.push({
        ...user,
        userId: ensured.userId,
        displayName: ensured.displayName
      });
    }

    await connection.commit();

    console.log(JSON.stringify({ seededUsers: createdUsers }, null, 2));
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
