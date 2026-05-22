const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { pool, transaction } = require("../config/database");
const { asyncHandler } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");
const { identityUpload, requestUpload } = require("../middleware/upload");
const { canAccessDepartment } = require("../middleware/permissions");
const { getRequestTypeByCode, createRequest, listRequestsForUser, loadRequestDetail } = require("../services/request.service");
const {
  createIdentityVerificationRequest,
  findOpenIdentityVerification,
  listIdentityVerificationsForUser,
  loadIdentityVerificationDetail,
  storeIdentityVerificationFile
} = require("../services/identity-verification.service");
const { writeAudit } = require("../services/audit.service");
const { createNotification } = require("../services/notification.service");
const { decryptText } = require("../utils/crypto");

const router = express.Router();

function hashUploadedFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest();
}

function assertRequestAccess(user, requestDetail) {
  if (!requestDetail) {
    const error = new Error("Request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (user.accountType === "VETERAN" && requestDetail.requesterUserId !== user.userId) {
    const error = new Error("You do not have access to this request.");
    error.statusCode = 403;
    throw error;
  }

  if (user.accountType !== "VETERAN" && !canAccessDepartment(user, requestDetail.owningDepartmentId)) {
    const error = new Error("Department access denied.");
    error.statusCode = 403;
    throw error;
  }
}

function sanitizeRequestForViewer(user, requestDetail) {
  if (!requestDetail || user.accountType !== "VETERAN") {
    return requestDetail;
  }

  return {
    ...requestDetail,
    history: requestDetail.history.filter((entry) => entry.is_visible_to_requester),
    attachments: requestDetail.attachments.filter((attachment) => attachment.is_visible_to_requester)
  };
}

function canManageAccountVerification(user) {
  if (!user || user.accountType === "VETERAN") {
    return false;
  }

  if (user.permissions.canAccessAllDepartments) {
    return true;
  }

  return user.departments.some((department) => department.departmentCode === "WELFARE_ASSISTANCE");
}

function canAccessIdentityVerification(user, verificationDetail) {
  if (!verificationDetail) {
    return false;
  }

  if (user.userId === verificationDetail.userId) {
    return true;
  }

  if (user.accountType === "VETERAN") {
    return false;
  }

  if (verificationDetail.relatedRequestId) {
    return canAccessDepartment(user, verificationDetail.owningDepartmentId);
  }

  return canManageAccountVerification(user);
}

async function notifyDepartmentStaffOfNewRequest(connection, options) {
  const [recipientRows] = await connection.execute(
    `SELECT DISTINCT u.user_id
    FROM staff_department_access sda
    INNER JOIN users u
      ON u.user_id = sda.user_id
    WHERE sda.department_id = ?
      AND sda.is_active = 1
      AND u.account_type = 'STAFF'
      AND u.staff_approval_status = 'APPROVED'
      AND u.is_active = 1
      AND u.user_id <> ?`,
    [options.departmentId, options.excludeUserId]
  );

  for (const row of recipientRows) {
    await createNotification(connection, {
      recipientUserId: row.user_id,
      requestId: options.requestId,
      notificationType: "GENERAL",
      title: `New ${options.requestTypeName} request`,
      message: `${options.requestTypeName} was submitted and entered the ${options.departmentName} queue. Open the dashboard to review request ${options.publicUuid}.`
    });
  }
}

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const rows =
        req.user.accountType === "VETERAN"
          ? await listRequestsForUser(connection, { requesterUserId: req.user.userId })
          : await listRequestsForUser(connection, {
              departmentIds: req.user.permissions.canAccessAllDepartments
                ? []
                : req.user.departments.map((department) => department.departmentId)
            });

      return res.json({ requests: rows });
    } finally {
      connection.release();
    }
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { requestTypeCode, formData, priority, requesterUserId } = req.body || {};

    if (!requestTypeCode || !formData || typeof formData !== "object") {
      return res.status(400).json({ message: "requestTypeCode and formData are required." });
    }

    const result = await transaction(async (connection) => {
      const requestType = await getRequestTypeByCode(connection, requestTypeCode);

      if (!requestType) {
        return { statusCode: 404, body: { message: "Request type not found." } };
      }

      const effectiveRequesterUserId =
        req.user.accountType === "VETERAN" ? req.user.userId : requesterUserId || req.user.userId;
      let requesterIdentityVerified = req.user.isIdentityVerified;

      if (Number(effectiveRequesterUserId) !== Number(req.user.userId)) {
        const [requesterRows] = await connection.execute(
          `SELECT is_identity_verified
          FROM users
          WHERE user_id = ?
          LIMIT 1`,
          [effectiveRequesterUserId]
        );

        if (!requesterRows[0]) {
          return { statusCode: 404, body: { message: "Requester user not found." } };
        }

        requesterIdentityVerified = Boolean(requesterRows[0].is_identity_verified);
      }

      const request = await createRequest(connection, {
        requesterUserId: effectiveRequesterUserId,
        submittedByUserId: req.user.userId,
        requestType,
        formData,
        priority,
        intakeChannel: req.user.accountType === "VETERAN" ? "PORTAL" : "STAFF_DESK",
        identityVerified: requesterIdentityVerified
      });

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "REQUEST_CREATED",
        entityType: "REQUEST",
        entityId: request.requestId,
        requestId: request.requestId,
        targetUserId: effectiveRequesterUserId,
        summary: `Created request ${requestType.request_type_code}.`
      });

      if (requestType.requires_identity_verification && !requesterIdentityVerified) {
        await createNotification(connection, {
          recipientUserId: effectiveRequesterUserId,
          requestId: request.requestId,
          notificationType: "IDENTITY_VERIFICATION_REQUIRED",
          title: "Identity verification required",
          message: `Upload an identification document in your dashboard so the ${requestType.request_type_name} request can continue.`
        });
      }

      const [departmentRows] = await connection.execute(
        `SELECT department_name
        FROM departments
        WHERE department_id = ?
        LIMIT 1`,
        [requestType.default_department_id]
      );

      await notifyDepartmentStaffOfNewRequest(connection, {
        requestId: request.requestId,
        publicUuid: request.publicUuid,
        requestTypeName: requestType.request_type_name,
        departmentId: requestType.default_department_id,
        departmentName: departmentRows[0]?.department_name || "assigned department",
        excludeUserId: req.user.userId
      });

      return { statusCode: 201, body: request };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.get(
  "/identity-verifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const identityVerifications = await listIdentityVerificationsForUser(connection, req.user.userId);
      return res.json({ identityVerifications });
    } finally {
      connection.release();
    }
  })
);

router.post(
  "/identity-verifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.isIdentityVerified) {
      return res.status(409).json({ message: "This account is already identity verified." });
    }

    const result = await transaction(async (connection) => {
      const openRequest = await findOpenIdentityVerification(connection, req.user.userId, "ACCOUNT_VERIFICATION", null);

      if (openRequest) {
        return {
          statusCode: 409,
          body: {
            message: "An identity verification request is already active.",
            verificationRequestId: openRequest.verification_request_id
          }
        };
      }

      const verificationRequestId = await createIdentityVerificationRequest(connection, {
        userId: req.user.userId,
        verificationType: "ACCOUNT_VERIFICATION",
        requestedByUserId: req.user.userId
      });

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: req.user.departments[0]?.departmentId || null,
        eventCode: "IDENTITY_VERIFICATION_REQUESTED",
        entityType: "IDENTITY_VERIFICATION",
        entityId: verificationRequestId,
        targetUserId: req.user.userId,
        summary: "Started an account identity verification request."
      });

      return {
        statusCode: 201,
        body: {
          message: "Identity verification request created.",
          verificationRequestId
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.post(
  "/identity-verifications/:verificationRequestId/files",
  requireAuth,
  identityUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Identity document file is required." });
    }

    const verificationRequestId = Number(req.params.verificationRequestId);

    const result = await transaction(async (connection) => {
      const verificationDetail = await loadIdentityVerificationDetail(connection, verificationRequestId);

      if (!verificationDetail) {
        return { statusCode: 404, body: { message: "Identity verification request not found." } };
      }

      if (!canAccessIdentityVerification(req.user, verificationDetail)) {
        return { statusCode: 403, body: { message: "You do not have access to this identity verification request." } };
      }

      if (verificationDetail.status === "APPROVED") {
        return { statusCode: 400, body: { message: "This identity verification request is already approved." } };
      }

      const verificationFileId = await storeIdentityVerificationFile(connection, {
        verificationRequestId,
        file: req.file,
        uploadedByUserId: req.user.userId
      });

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: verificationDetail.owningDepartmentId || req.user.departments[0]?.departmentId || null,
        eventCode: "IDENTITY_DOCUMENT_UPLOADED",
        entityType: "IDENTITY_VERIFICATION_FILE",
        entityId: verificationFileId,
        requestId: verificationDetail.relatedRequestId,
        targetUserId: verificationDetail.userId,
        summary: `Uploaded an identity document for verification request ${verificationRequestId}.`
      });

      return {
        statusCode: 201,
        body: {
          message: "Identity document uploaded.",
          verificationFileId
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.get(
  "/identity-verifications/:verificationRequestId/files/:fileId/download",
  requireAuth,
  asyncHandler(async (req, res) => {
    const verificationRequestId = Number(req.params.verificationRequestId);
    const fileId = Number(req.params.fileId);
    const connection = await pool.getConnection();

    try {
      const verificationDetail = await loadIdentityVerificationDetail(connection, verificationRequestId);

      if (!verificationDetail) {
        return res.status(404).json({ message: "Identity verification request not found." });
      }

      if (!canAccessIdentityVerification(req.user, verificationDetail)) {
        return res.status(403).json({ message: "You do not have access to this identity verification file." });
      }

      const file = verificationDetail.files.find((item) => item.verificationFileId === fileId && item.isActive);

      if (!file) {
        return res.status(404).json({ message: "Identity verification file not found." });
      }

      const resolvedPath = path.resolve(process.cwd(), file.relativePath);

      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ message: "Identity verification file not found on disk." });
      }

      return res.download(resolvedPath, file.originalFileName);
    } finally {
      connection.release();
    }
  })
);

router.get(
  "/:requestId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const requestDetail = await loadRequestDetail(connection, Number(req.params.requestId));
      assertRequestAccess(req.user, requestDetail);

      return res.json({ request: sanitizeRequestForViewer(req.user, requestDetail) });
    } finally {
      connection.release();
    }
  })
);

router.post(
  "/:requestId/attachments",
  requireAuth,
  requestUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Attachment file is required." });
    }

    const requestId = Number(req.params.requestId);

    const result = await transaction(async (connection) => {
      const requestDetail = await loadRequestDetail(connection, requestId);
      assertRequestAccess(req.user, requestDetail);

      const attachmentType = req.body.attachmentType || "SUPPORTING_DOCUMENT";

      const [insertResult] = await connection.execute(
        `INSERT INTO request_attachments (
          request_id,
          uploaded_by_user_id,
          attachment_type,
          storage_disk,
          relative_path,
          mime_type,
          file_size_bytes,
          file_sha256,
          is_visible_to_requester,
          created_at
        ) VALUES (?, ?, ?, 'PRIVATE_UPLOADS', ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          requestId,
          req.user.userId,
          attachmentType,
          path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
          req.file.mimetype,
          req.file.size,
          hashUploadedFile(req.file.path),
          0
        ]
      );

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: requestDetail.owningDepartmentId,
        eventCode: "REQUEST_ATTACHMENT_UPLOADED",
        entityType: "REQUEST_ATTACHMENT",
        entityId: insertResult.insertId,
        requestId,
        targetUserId: requestDetail.requesterUserId,
        summary: `Uploaded ${attachmentType} attachment for request ${requestId}.`
      });

      return {
        attachmentId: insertResult.insertId,
        attachmentType,
        relativePath: path.relative(process.cwd(), req.file.path).replace(/\\/g, "/")
      };
    });

    return res.status(201).json(result);
  })
);

router.post(
  "/:requestId/payment-receipts",
  requireAuth,
  requestUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Receipt file is required." });
    }

    const requestId = Number(req.params.requestId);

    const result = await transaction(async (connection) => {
      const requestDetail = await loadRequestDetail(connection, requestId);
      assertRequestAccess(req.user, requestDetail);

      if (requestDetail.requestTypeCode !== "FUNERAL_SUPPORT_REQUEST") {
        return { statusCode: 400, body: { message: "Payment receipts are only supported for funeral requests." } };
      }

      const [attachmentResult] = await connection.execute(
        `INSERT INTO request_attachments (
          request_id,
          uploaded_by_user_id,
          attachment_type,
          storage_disk,
          relative_path,
          mime_type,
          file_size_bytes,
          file_sha256,
          is_visible_to_requester,
          created_at
        ) VALUES (?, ?, 'PAYMENT_RECEIPT', 'PRIVATE_UPLOADS', ?, ?, ?, ?, 0, UTC_TIMESTAMP())`,
        [
          requestId,
          req.user.userId,
          path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
          req.file.mimetype,
          req.file.size,
          hashUploadedFile(req.file.path)
        ]
      );

      const [receiptResult] = await connection.execute(
        `INSERT INTO request_payment_receipts (
          request_id,
          attachment_id,
          submitted_by_user_id,
          receipt_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'SUBMITTED', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [requestId, attachmentResult.insertId, req.user.userId]
      );

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: requestDetail.owningDepartmentId,
        eventCode: "FUNERAL_RECEIPT_SUBMITTED",
        entityType: "PAYMENT_RECEIPT",
        entityId: receiptResult.insertId,
        requestId,
        targetUserId: requestDetail.requesterUserId,
        summary: `Submitted funeral payment receipt for request ${requestId}.`
      });

      return {
        statusCode: 201,
        body: {
          paymentReceiptId: receiptResult.insertId
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.get(
  "/:requestId/attachments/:attachmentId/download",
  requireAuth,
  asyncHandler(async (req, res) => {
    const requestId = Number(req.params.requestId);
    const attachmentId = Number(req.params.attachmentId);
    const connection = await pool.getConnection();

    try {
      const requestDetail = await loadRequestDetail(connection, requestId);
      assertRequestAccess(req.user, requestDetail);

      const [rows] = await connection.execute(
        `SELECT
          attachment_id,
          attachment_type,
          relative_path,
          mime_type
        FROM request_attachments
        WHERE attachment_id = ?
          AND request_id = ?
        LIMIT 1`,
        [attachmentId, requestId]
      );

      const attachment = rows[0];

      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found." });
      }

      const resolvedPath = path.resolve(process.cwd(), attachment.relative_path);

      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ message: "Attachment file not found." });
      }

      return res.download(resolvedPath);
    } finally {
      connection.release();
    }
  })
);

router.get(
  "/notifications/inbox",
  requireAuth,
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT
          notification_id,
          request_id,
          output_id,
          notification_type,
          title,
          message_ciphertext,
          message_iv,
          message_tag,
          is_read,
          created_at,
          read_at
        FROM notifications
        WHERE recipient_user_id = ?
        ORDER BY created_at DESC`,
        [req.user.userId]
      );

      const notifications = rows.map((row) => ({
        notificationId: row.notification_id,
        requestId: row.request_id,
        outputId: row.output_id,
        notificationType: row.notification_type,
        title: row.title,
        message: decryptText(row.message_ciphertext, row.message_iv, row.message_tag),
        isRead: Boolean(row.is_read),
        createdAt: row.created_at,
        readAt: row.read_at
      }));

      return res.json({ notifications });
    } finally {
      connection.release();
    }
  })
);

router.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notificationId = Number(req.params.notificationId);

    const [result] = await pool.execute(
      `UPDATE notifications
      SET is_read = 1,
          read_at = UTC_TIMESTAMP()
      WHERE notification_id = ?
        AND recipient_user_id = ?`,
      [notificationId, req.user.userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.json({ message: "Notification marked as read." });
  })
);

module.exports = router;
