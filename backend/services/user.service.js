const { decryptJson } = require("../utils/crypto");

async function loadUserById(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT
      u.user_id,
      u.public_uuid,
      u.account_type,
      u.role_id,
      u.staff_approval_status,
      u.service_branch,
      u.regimental_number_digits,
      u.is_email_verified,
      u.is_identity_verified,
      u.is_active,
      EXISTS(
        SELECT 1
        FROM user_profile_images upi
        WHERE upi.user_id = u.user_id
          AND upi.is_active = 1
      ) AS has_profile_image,
      r.role_code,
      r.role_name,
      r.is_staff_role,
      r.can_access_all_departments,
      r.can_manage_main_admin,
      r.can_manage_director,
      r.can_manage_qm,
      r.can_manage_staff_accounts,
      r.can_approve_staff_signups,
      r.can_assign_departments,
      r.can_view_audit_logs,
      r.can_manage_roles,
      r.can_manage_request_types,
      r.can_override_request_assignment,
      r.can_close_any_request,
      r.can_publish_notifications,
      usp.profile_ciphertext,
      usp.profile_iv,
      usp.profile_tag
    FROM users u
    INNER JOIN roles r
      ON r.role_id = u.role_id
    INNER JOIN user_secure_profiles usp
      ON usp.user_id = u.user_id
    WHERE u.user_id = ?
    LIMIT 1`,
    [userId]
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const profile = decryptJson(row.profile_ciphertext, row.profile_iv, row.profile_tag);

  const [departments] = await connection.execute(
    `SELECT
      sda.department_id,
      d.department_code,
      d.department_name,
      sda.access_level,
      sda.is_primary
    FROM staff_department_access sda
    INNER JOIN departments d
      ON d.department_id = sda.department_id
    WHERE sda.user_id = ?
      AND sda.is_active = 1
    ORDER BY sda.is_primary DESC, d.department_name ASC`,
    [row.user_id]
  );

  return {
    userId: row.user_id,
    publicUuid: row.public_uuid,
    accountType: row.account_type,
    roleId: row.role_id,
    roleCode: row.role_code,
    roleName: row.role_name,
    staffApprovalStatus: row.staff_approval_status,
    serviceBranch: row.service_branch,
    regimentalNumberDigits: row.regimental_number_digits,
    isEmailVerified: Boolean(row.is_email_verified),
    isIdentityVerified: Boolean(row.is_identity_verified),
    isActive: Boolean(row.is_active),
    hasProfileImage: Boolean(row.has_profile_image),
    permissions: {
      canAccessAllDepartments: Boolean(row.can_access_all_departments),
      canManageMainAdmin: Boolean(row.can_manage_main_admin),
      canManageDirector: Boolean(row.can_manage_director),
      canManageQm: Boolean(row.can_manage_qm),
      canManageStaffAccounts: Boolean(row.can_manage_staff_accounts),
      canApproveStaffSignups: Boolean(row.can_approve_staff_signups),
      canAssignDepartments: Boolean(row.can_assign_departments),
      canViewAuditLogs: Boolean(row.can_view_audit_logs),
      canManageRoles: Boolean(row.can_manage_roles),
      canManageRequestTypes: Boolean(row.can_manage_request_types),
      canOverrideRequestAssignment: Boolean(row.can_override_request_assignment),
      canCloseAnyRequest: Boolean(row.can_close_any_request),
      canPublishNotifications: Boolean(row.can_publish_notifications)
    },
    profile,
    departments: departments.map((department) => ({
      departmentId: department.department_id,
      departmentCode: department.department_code,
      departmentName: department.department_name,
      accessLevel: department.access_level,
      isPrimary: Boolean(department.is_primary)
    }))
  };
}

function toClientUser(user) {
  return {
    userId: user.userId,
    publicUuid: user.publicUuid,
    accountType: user.accountType,
    roleCode: user.roleCode,
    roleName: user.roleName,
    staffApprovalStatus: user.staffApprovalStatus,
    isEmailVerified: user.isEmailVerified,
    isIdentityVerified: user.isIdentityVerified,
    hasProfileImage: user.hasProfileImage,
    displayName: user.profile.display_name,
    fullName: user.profile.full_name,
    email: user.profile.email,
    rank: user.profile.rank,
    regimentalNumber: user.profile.regimental_number,
    serviceBranch: user.serviceBranch,
    departments: user.departments
  };
}

module.exports = {
  loadUserById,
  toClientUser
};
