const express = require("express");
const { pool, transaction } = require("../config/database");
const { asyncHandler } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");
const { canManageRole, requireRole } = require("../middleware/permissions");
const { writeAudit } = require("../services/audit.service");
const { createNotification } = require("../services/notification.service");
const { loadUserById, toClientUser } = require("../services/user.service");
const { decryptJson } = require("../utils/crypto");

const router = express.Router();

function uniqueDepartmentIds(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
}

function accessLevelForRole(roleCode) {
  if (["MAIN_ADMIN", "DIRECTOR", "QM"].includes(roleCode)) {
    return "MANAGE";
  }

  if (roleCode === "RECEPTION") {
    return "SUPERVISE";
  }

  return "WORK";
}

async function listManagedUsers(connection, actor) {
  const [rows] = await connection.execute(
    `SELECT
      u.user_id,
      u.public_uuid,
      u.account_type,
      u.staff_approval_status,
      u.is_active,
      u.is_email_verified,
      u.is_identity_verified,
      u.created_at,
      u.last_login_at,
      r.role_code,
      r.role_name,
      usp.profile_ciphertext,
      usp.profile_iv,
      usp.profile_tag
    FROM users u
    INNER JOIN roles r
      ON r.role_id = u.role_id
    INNER JOIN user_secure_profiles usp
      ON usp.user_id = u.user_id
    ORDER BY u.created_at DESC, u.user_id DESC`
  );

  const userIds = rows.map((row) => row.user_id);
  const departmentsByUserId = new Map();

  if (userIds.length) {
    const placeholders = userIds.map(() => "?").join(", ");
    const [departmentRows] = await connection.execute(
      `SELECT
        sda.user_id,
        sda.department_id,
        d.department_code,
        d.department_name,
        sda.access_level,
        sda.is_primary
      FROM staff_department_access sda
      INNER JOIN departments d
        ON d.department_id = sda.department_id
      WHERE sda.is_active = 1
        AND sda.user_id IN (${placeholders})
      ORDER BY sda.is_primary DESC, d.department_name ASC`,
      userIds
    );

    for (const row of departmentRows) {
      const bucket = departmentsByUserId.get(row.user_id) || [];
      bucket.push({
        departmentId: row.department_id,
        departmentCode: row.department_code,
        departmentName: row.department_name,
        accessLevel: row.access_level,
        isPrimary: Boolean(row.is_primary)
      });
      departmentsByUserId.set(row.user_id, bucket);
    }
  }

  return rows.map((row) => {
    const profile = decryptJson(row.profile_ciphertext, row.profile_iv, row.profile_tag);

    return {
      user_id: row.user_id,
      public_uuid: row.public_uuid,
      account_type: row.account_type,
      staff_approval_status: row.staff_approval_status,
      is_active: Boolean(row.is_active),
      is_email_verified: Boolean(row.is_email_verified),
      is_identity_verified: Boolean(row.is_identity_verified),
      created_at: row.created_at,
      last_login_at: row.last_login_at,
      role_code: row.role_code,
      role_name: row.role_name,
      display_name: profile.display_name,
      full_name: profile.full_name,
      email: profile.email,
      rank: profile.rank,
      regimental_number: profile.regimental_number,
      departments: departmentsByUserId.get(row.user_id) || [],
      can_manage: row.user_id !== actor.userId && canManageRole(actor, row.role_code)
    };
  });
}

router.use(requireAuth);
router.use(requireRole("QM", "DIRECTOR", "MAIN_ADMIN"));

router.get(
  "/staff/pending",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT
        u.user_id,
        u.public_uuid,
        u.staff_approval_status,
        sp.requested_primary_department_id,
        d.department_code,
        d.department_name,
        usp.profile_ciphertext,
        usp.profile_iv,
        usp.profile_tag
      FROM users u
      INNER JOIN staff_profiles sp
        ON sp.user_id = u.user_id
      LEFT JOIN departments d
        ON d.department_id = sp.requested_primary_department_id
      INNER JOIN user_secure_profiles usp
        ON usp.user_id = u.user_id
      WHERE u.account_type = 'STAFF'
        AND u.staff_approval_status = 'PENDING'
      ORDER BY u.created_at ASC`
    );

    return res.json({
      pendingStaff: rows.map((row) => {
        const profile = decryptJson(row.profile_ciphertext, row.profile_iv, row.profile_tag);

        return {
          user_id: row.user_id,
          public_uuid: row.public_uuid,
          staff_approval_status: row.staff_approval_status,
          requested_primary_department_id: row.requested_primary_department_id,
          department_code: row.department_code,
          department_name: row.department_name,
          display_name: profile.display_name,
          full_name: profile.full_name,
          email: profile.email,
          rank: profile.rank,
          regimental_number: profile.regimental_number
        };
      })
    });
  })
);

router.patch(
  "/staff/:userId/approve",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const { roleCode = "STAFF", departmentIds = [], primaryDepartmentId = null } = req.body || {};

    if (!departmentIds.length) {
      return res.status(400).json({ message: "At least one department must be assigned." });
    }

    if (!canManageRole(req.user, roleCode)) {
      return res.status(403).json({ message: `You cannot assign role ${roleCode}.` });
    }

    const user = await transaction(async (connection) => {
      const [roleRows] = await connection.execute(
        "SELECT role_id, role_code FROM roles WHERE role_code = ? LIMIT 1",
        [roleCode]
      );
      const role = roleRows[0];

      if (!role) {
        return null;
      }

      await connection.execute(
        `UPDATE users
        SET role_id = ?,
            staff_approval_status = 'APPROVED',
            approved_by_user_id = ?,
            approved_at = UTC_TIMESTAMP(),
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?`,
        [role.role_id, req.user.userId, userId]
      );

      await connection.execute(
        `UPDATE staff_profiles
        SET assigned_primary_department_id = ?,
            employment_status = 'ACTIVE',
            activated_at = UTC_TIMESTAMP(),
            assigned_by_user_id = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?`,
        [primaryDepartmentId || departmentIds[0], req.user.userId, userId]
      );

      await connection.execute(
        "DELETE FROM staff_department_access WHERE user_id = ?",
        [userId]
      );

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
          ) VALUES (?, ?, 'WORK', ?, 1, ?, UTC_TIMESTAMP())`,
          [userId, departmentId, Number(primaryDepartmentId || departmentIds[0]) === Number(departmentId) ? 1 : 0, req.user.userId]
        );
      }

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "STAFF_APPROVED",
        entityType: "USER",
        entityId: userId,
        targetUserId: userId,
        summary: `Approved staff account with role ${roleCode}.`
      });

      await createNotification(connection, {
        recipientUserId: userId,
        notificationType: "ACCOUNT_APPROVED",
        title: "Staff account approved",
        message: "Your staff portal account has been approved. You can now sign in and access your assigned departments."
      });

      return loadUserById(connection, userId);
    });

    if (!user) {
      return res.status(404).json({ message: "Role or staff user not found." });
    }

    return res.json({
      message: "Staff account approved.",
      user: toClientUser(user)
    });
  })
);

router.patch(
  "/staff/:userId/reject",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);

    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE users
        SET staff_approval_status = 'REJECTED',
            rejected_by_user_id = ?,
            rejected_at = UTC_TIMESTAMP(),
            rejection_reason = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?`,
        [req.user.userId, req.body.reason || "Rejected by admin.", userId]
      );

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "STAFF_REJECTED",
        entityType: "USER",
        entityId: userId,
        targetUserId: userId,
        summary: "Rejected staff account."
      });

      await createNotification(connection, {
        recipientUserId: userId,
        notificationType: "ACCOUNT_REJECTED",
        title: "Staff account not approved",
        message: req.body.reason || "Your staff portal account was not approved."
      });
    });

    return res.json({ message: "Staff account rejected." });
  })
);

router.get(
  "/users",
  requireRole("DIRECTOR", "MAIN_ADMIN"),
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const users = await listManagedUsers(connection, req.user);
      return res.json({ users });
    } finally {
      connection.release();
    }
  })
);

router.patch(
  "/users/:userId",
  requireRole("DIRECTOR", "MAIN_ADMIN"),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const requestedRoleCode = String(req.body?.roleCode || "").trim().toUpperCase();
    const hasIsActiveValue = Object.prototype.hasOwnProperty.call(req.body || {}, "isActive");

    if (!userId) {
      return res.status(400).json({ message: "A valid user ID is required." });
    }

    if (req.user.userId === userId) {
      return res.status(400).json({ message: "You cannot change your own access from this page." });
    }

    const result = await transaction(async (connection) => {
      const [targetRows] = await connection.execute(
        `SELECT
          u.user_id,
          u.account_type,
          u.is_active,
          u.staff_approval_status,
          u.role_id,
          r.role_code,
          r.role_name
        FROM users u
        INNER JOIN roles r
          ON r.role_id = u.role_id
        WHERE u.user_id = ?
        LIMIT 1`,
        [userId]
      );
      const targetUser = targetRows[0];

      if (!targetUser) {
        return { statusCode: 404, body: { message: "User not found." } };
      }

      if (!canManageRole(req.user, targetUser.role_code)) {
        return { statusCode: 403, body: { message: "You cannot manage this user." } };
      }

      const nextRoleCode = requestedRoleCode || targetUser.role_code;

      if (!canManageRole(req.user, nextRoleCode)) {
        return { statusCode: 403, body: { message: `You cannot assign role ${nextRoleCode}.` } };
      }

      const [roleRows] = await connection.execute(
        `SELECT
          role_id,
          role_code,
          role_name,
          is_staff_role,
          can_access_all_departments
        FROM roles
        WHERE role_code = ?
        LIMIT 1`,
        [nextRoleCode]
      );
      const nextRole = roleRows[0];

      if (!nextRole) {
        return { statusCode: 404, body: { message: "Selected role not found." } };
      }

      const [currentDepartmentRows] = await connection.execute(
        `SELECT
          department_id,
          is_primary
        FROM staff_department_access
        WHERE user_id = ?
          AND is_active = 1
        ORDER BY is_primary DESC, department_id ASC`,
        [userId]
      );

      const requestedDepartmentIds = uniqueDepartmentIds(req.body?.departmentIds);
      let finalDepartmentIds = requestedDepartmentIds.length
        ? requestedDepartmentIds
        : currentDepartmentRows.map((row) => row.department_id);
      let finalPrimaryDepartmentId =
        Number(req.body?.primaryDepartmentId || 0) ||
        currentDepartmentRows.find((row) => row.is_primary)?.department_id ||
        null;

      if (nextRole.is_staff_role) {
        if (!finalDepartmentIds.length && nextRole.can_access_all_departments) {
          const [allDepartments] = await connection.execute(
            "SELECT department_id FROM departments WHERE is_active = 1 ORDER BY department_name"
          );
          finalDepartmentIds = allDepartments.map((row) => row.department_id);
        }

        if (!finalDepartmentIds.length) {
          return {
            statusCode: 400,
            body: { message: "Assign at least one department before saving a staff role." }
          };
        }

        const placeholders = finalDepartmentIds.map(() => "?").join(", ");
        const [validDepartmentRows] = await connection.execute(
          `SELECT department_id
          FROM departments
          WHERE is_active = 1
            AND department_id IN (${placeholders})`,
          finalDepartmentIds
        );

        if (validDepartmentRows.length !== finalDepartmentIds.length) {
          return { statusCode: 400, body: { message: "One or more selected departments are invalid." } };
        }

        if (!finalDepartmentIds.includes(finalPrimaryDepartmentId)) {
          finalPrimaryDepartmentId = finalDepartmentIds[0];
        }
      } else {
        finalDepartmentIds = [];
        finalPrimaryDepartmentId = null;
      }

      const nextIsActive = hasIsActiveValue ? Boolean(req.body.isActive) : Boolean(targetUser.is_active);
      const nextAccountType = nextRole.is_staff_role ? "STAFF" : "VETERAN";
      const nextStaffApprovalStatus = nextRole.is_staff_role
        ? nextIsActive
          ? "APPROVED"
          : "SUSPENDED"
        : "NOT_APPLICABLE";

      await connection.execute(
        `UPDATE users
        SET role_id = ?,
            account_type = ?,
            staff_approval_status = ?,
            is_active = ?,
            approved_by_user_id = CASE WHEN ? = 'STAFF' THEN ? ELSE approved_by_user_id END,
            approved_at = CASE WHEN ? = 'STAFF' THEN COALESCE(approved_at, UTC_TIMESTAMP()) ELSE approved_at END,
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?`,
        [
          nextRole.role_id,
          nextAccountType,
          nextStaffApprovalStatus,
          nextIsActive ? 1 : 0,
          nextAccountType,
          req.user.userId,
          nextAccountType,
          userId
        ]
      );

      if (nextRole.is_staff_role) {
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
          ) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
          ON DUPLICATE KEY UPDATE
            requested_primary_department_id = VALUES(requested_primary_department_id),
            assigned_primary_department_id = VALUES(assigned_primary_department_id),
            employment_status = VALUES(employment_status),
            activated_at = VALUES(activated_at),
            assigned_by_user_id = VALUES(assigned_by_user_id),
            updated_at = UTC_TIMESTAMP()`,
          [
            userId,
            finalPrimaryDepartmentId,
            finalPrimaryDepartmentId,
            nextIsActive ? "ACTIVE" : "SUSPENDED",
            nextIsActive ? new Date() : null,
            req.user.userId
          ]
        );

        await connection.execute("DELETE FROM staff_department_access WHERE user_id = ?", [userId]);

        for (const departmentId of finalDepartmentIds) {
          await connection.execute(
            `INSERT INTO staff_department_access (
              user_id,
              department_id,
              access_level,
              is_primary,
              is_active,
              granted_by_user_id,
              granted_at
            ) VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP())`,
            [
              userId,
              departmentId,
              accessLevelForRole(nextRole.role_code),
              Number(departmentId) === Number(finalPrimaryDepartmentId) ? 1 : 0,
              req.user.userId
            ]
          );
        }
      } else {
        await connection.execute("DELETE FROM staff_department_access WHERE user_id = ?", [userId]);
        await connection.execute(
          `UPDATE staff_profiles
          SET assigned_primary_department_id = NULL,
              employment_status = 'INACTIVE',
              updated_at = UTC_TIMESTAMP()
          WHERE user_id = ?`,
          [userId]
        );
      }

      const changeSummary = [];

      if (targetUser.role_code !== nextRole.role_code) {
        changeSummary.push(`role ${targetUser.role_name} -> ${nextRole.role_name}`);
      }

      if (Boolean(targetUser.is_active) !== nextIsActive) {
        changeSummary.push(nextIsActive ? "account reactivated" : "account blocked");
      }

      if (!changeSummary.length) {
        changeSummary.push("access settings refreshed");
      }

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "USER_ACCESS_UPDATED",
        entityType: "USER",
        entityId: userId,
        targetUserId: userId,
        summary: `Updated user access: ${changeSummary.join("; ")}.`
      });

      await createNotification(connection, {
        recipientUserId: userId,
        notificationType: "GENERAL",
        title: "Account access updated",
        message: `Your portal account access was updated by an administrator: ${changeSummary.join("; ")}.`
      });

      const users = await listManagedUsers(connection, req.user);
      return {
        statusCode: 200,
        body: {
          message: "User access updated.",
          user: users.find((item) => Number(item.user_id) === userId) || null
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.get(
  "/events",
  asyncHandler(async (req, res) => {
    if (!req.user.permissions.canPublishNotifications) {
      return res.status(403).json({ message: "Event publishing access denied." });
    }

    const [rows] = await pool.execute(
      `SELECT
        portal_event_id,
        title,
        summary,
        location,
        event_date,
        details_route,
        cta_label,
        banner_message,
        is_published,
        show_in_banner,
        created_at,
        updated_at
      FROM portal_events
      ORDER BY event_date ASC, created_at DESC`
    );

    return res.json({ events: rows });
  })
);

router.post(
  "/events",
  asyncHandler(async (req, res) => {
    if (!req.user.permissions.canPublishNotifications) {
      return res.status(403).json({ message: "Event publishing access denied." });
    }

    const {
      title,
      summary,
      location,
      eventDate,
      detailsRoute = "/",
      ctaLabel = "Open details",
      bannerMessage = "",
      isPublished = true,
      showInBanner = false
    } = req.body || {};

    if (!String(title || "").trim() || !String(summary || "").trim() || !String(location || "").trim() || !String(eventDate || "").trim()) {
      return res.status(400).json({ message: "title, summary, location, and eventDate are required." });
    }

    const result = await transaction(async (connection) => {
      if (showInBanner) {
        await connection.execute("UPDATE portal_events SET show_in_banner = 0");
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO portal_events (
          title,
          summary,
          location,
          event_date,
          details_route,
          cta_label,
          banner_message,
          is_published,
          show_in_banner,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          String(title).trim(),
          String(summary).trim(),
          String(location).trim(),
          String(eventDate).trim(),
          String(detailsRoute || "/").trim(),
          String(ctaLabel || "Open details").trim(),
          String(bannerMessage || "").trim() || null,
          isPublished ? 1 : 0,
          showInBanner ? 1 : 0,
          req.user.userId,
          req.user.userId
        ]
      );

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "PORTAL_EVENT_CREATED",
        entityType: "PORTAL_EVENT",
        entityId: insertResult.insertId,
        summary: `Created portal event ${String(title).trim()}.`
      });

      return insertResult.insertId;
    });

    return res.status(201).json({ message: "Event created.", eventId: result });
  })
);

router.patch(
  "/events/:eventId",
  asyncHandler(async (req, res) => {
    if (!req.user.permissions.canPublishNotifications) {
      return res.status(403).json({ message: "Event publishing access denied." });
    }

    const eventId = Number(req.params.eventId);
    const body = req.body || {};
    const {
      title,
      summary,
      location,
      eventDate,
      detailsRoute,
      ctaLabel,
      bannerMessage,
      isPublished,
      showInBanner
    } = body;
    const bannerMessageProvided = Object.prototype.hasOwnProperty.call(body, "bannerMessage");

    const result = await transaction(async (connection) => {
      if (showInBanner) {
        await connection.execute(
          "UPDATE portal_events SET show_in_banner = 0 WHERE portal_event_id <> ?",
          [eventId]
        );
      }

      const [updateResult] = await connection.execute(
        `UPDATE portal_events
        SET title = COALESCE(?, title),
            summary = COALESCE(?, summary),
            location = COALESCE(?, location),
            event_date = COALESCE(?, event_date),
            details_route = COALESCE(?, details_route),
            cta_label = COALESCE(?, cta_label),
            banner_message = CASE WHEN ? = 1 THEN ? ELSE banner_message END,
            is_published = COALESCE(?, is_published),
            show_in_banner = COALESCE(?, show_in_banner),
            updated_by_user_id = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE portal_event_id = ?`,
        [
          title ?? null,
          summary ?? null,
          location ?? null,
          eventDate ?? null,
          detailsRoute ?? null,
          ctaLabel ?? null,
          bannerMessageProvided ? 1 : 0,
          bannerMessageProvided ? String(bannerMessage || "").trim() || null : null,
          typeof isPublished === "boolean" ? Number(isPublished) : null,
          typeof showInBanner === "boolean" ? Number(showInBanner) : null,
          req.user.userId,
          eventId
        ]
      );

      if (!updateResult.affectedRows) {
        return false;
      }

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "PORTAL_EVENT_UPDATED",
        entityType: "PORTAL_EVENT",
        entityId: eventId,
        summary: `Updated portal event ${eventId}.`
      });

      return true;
    });

    if (!result) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.json({ message: "Event updated." });
  })
);

router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    if (!req.user.permissions.canViewAuditLogs) {
      return res.status(403).json({ message: "Audit log access denied." });
    }

    const [rows] = await pool.execute(
      `SELECT
        al.audit_log_id,
        al.actor_user_id,
        al.event_code,
        al.entity_type,
        al.entity_id,
        al.request_id,
        al.target_user_id,
        al.summary,
        al.occurred_at,
        actor_role.role_name AS actor_role_name,
        actor_profile.profile_ciphertext AS actor_profile_ciphertext,
        actor_profile.profile_iv AS actor_profile_iv,
        actor_profile.profile_tag AS actor_profile_tag,
        target_profile.profile_ciphertext AS target_profile_ciphertext,
        target_profile.profile_iv AS target_profile_iv,
        target_profile.profile_tag AS target_profile_tag
      FROM audit_logs al
      LEFT JOIN roles actor_role
        ON actor_role.role_id = al.actor_role_id
      LEFT JOIN user_secure_profiles actor_profile
        ON actor_profile.user_id = al.actor_user_id
      LEFT JOIN user_secure_profiles target_profile
        ON target_profile.user_id = al.target_user_id
      ORDER BY al.occurred_at DESC
      LIMIT 250`
    );

    return res.json({
      auditLogs: rows.map((row) => {
        const actorProfile = row.actor_profile_ciphertext
          ? decryptJson(row.actor_profile_ciphertext, row.actor_profile_iv, row.actor_profile_tag)
          : null;
        const targetProfile = row.target_profile_ciphertext
          ? decryptJson(row.target_profile_ciphertext, row.target_profile_iv, row.target_profile_tag)
          : null;

        return {
          audit_log_id: row.audit_log_id,
          actor_user_id: row.actor_user_id,
          actor_display_name: actorProfile?.display_name || null,
          actor_full_name: actorProfile?.full_name || null,
          actor_role_name: row.actor_role_name || null,
          event_code: row.event_code,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          request_id: row.request_id,
          target_user_id: row.target_user_id,
          target_display_name: targetProfile?.display_name || null,
          summary: row.summary,
          occurred_at: row.occurred_at
        };
      })
    });
  })
);

module.exports = router;
