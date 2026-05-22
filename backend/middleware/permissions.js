function hasRole(user, allowedRoleCodes = []) {
  return allowedRoleCodes.includes(user.roleCode);
}

function requireRole(...allowedRoleCodes) {
  return (req, res, next) => {
    if (!req.user || !hasRole(req.user, allowedRoleCodes)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }

    return next();
  };
}

function canAccessDepartment(user, departmentId) {
  if (!user) {
    return false;
  }

  if (user.permissions.canAccessAllDepartments) {
    return true;
  }

  return user.departments.some((department) => Number(department.departmentId) === Number(departmentId));
}

function requireDepartmentAccess(getDepartmentId) {
  return (req, res, next) => {
    const departmentId = typeof getDepartmentId === "function" ? getDepartmentId(req) : getDepartmentId;

    if (!canAccessDepartment(req.user, departmentId)) {
      return res.status(403).json({ message: "Department access denied." });
    }

    return next();
  };
}

function canManageRole(actor, targetRoleCode) {
  if (actor.roleCode === "MAIN_ADMIN") {
    return true;
  }

  if (targetRoleCode === "MAIN_ADMIN") {
    return false;
  }

  if (actor.roleCode === "DIRECTOR") {
    return targetRoleCode !== "MAIN_ADMIN";
  }

  if (actor.roleCode === "QM") {
    return !["MAIN_ADMIN", "DIRECTOR"].includes(targetRoleCode);
  }

  return false;
}

module.exports = {
  requireRole,
  canAccessDepartment,
  requireDepartmentAccess,
  canManageRole
};
