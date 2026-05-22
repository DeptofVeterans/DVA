const express = require("express");
const env = require("../config/env");
const { pool, transaction } = require("../config/database");
const { asyncHandler } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");
const { canAccessDepartment, requireRole } = require("../middleware/permissions");
const { createNotification } = require("../services/notification.service");
const { loadRequestDetail, updateRequestStatus } = require("../services/request.service");
const {
  listIdentityVerificationQueue,
  loadIdentityVerificationDetail
} = require("../services/identity-verification.service");
const { writeAudit } = require("../services/audit.service");
const { decryptJson, encryptText } = require("../utils/crypto");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("STAFF", "RECEPTION", "QM", "DIRECTOR", "MAIN_ADMIN"));

function ensureStaffAccess(user, requestDetail) {
  if (!requestDetail) {
    const error = new Error("Request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!canAccessDepartment(user, requestDetail.owningDepartmentId)) {
    const error = new Error("Department access denied.");
    error.statusCode = 403;
    throw error;
  }
}

function canReviewAccountVerification(user) {
  if (!user) {
    return false;
  }

  if (user.permissions.canAccessAllDepartments) {
    return true;
  }

  return user.departments.some((department) => department.departmentCode === "WELFARE_ASSISTANCE");
}

function ensureIdentityVerificationAccess(user, verificationDetail) {
  if (!verificationDetail) {
    const error = new Error("Identity verification request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (verificationDetail.relatedRequestId) {
    if (!canAccessDepartment(user, verificationDetail.owningDepartmentId)) {
      const error = new Error("Department access denied.");
      error.statusCode = 403;
      throw error;
    }

    return;
  }

  if (!canReviewAccountVerification(user)) {
    const error = new Error("Department access denied.");
    error.statusCode = 403;
    throw error;
  }
}

router.get(
  "/queue",
  asyncHandler(async (req, res) => {
    const params = [];
    let whereClause = "";

    if (!req.user.permissions.canAccessAllDepartments) {
      const departmentIds = req.user.departments.map((department) => department.departmentId);

      if (!departmentIds.length) {
        return res.json({ requests: [] });
      }

      whereClause = `WHERE sr.owning_department_id IN (${departmentIds.map(() => "?").join(",")})`;
      params.push(...departmentIds);
    }

    const [rows] = await pool.execute(
      `SELECT
        sr.request_id,
        sr.public_uuid,
        sr.requester_user_id,
        rt.request_type_code,
        rt.request_type_name,
        d.department_code,
        d.department_name,
        rs.status_code,
        rs.status_name,
        sr.priority,
        sr.assigned_to_user_id,
        sr.pickup_required,
        sr.submitted_at,
        sr.updated_at,
        usp.profile_ciphertext,
        usp.profile_iv,
        usp.profile_tag
      FROM service_requests sr
      INNER JOIN request_types rt
        ON rt.request_type_id = sr.request_type_id
      INNER JOIN departments d
        ON d.department_id = sr.owning_department_id
      INNER JOIN request_statuses rs
        ON rs.status_id = sr.current_status_id
      LEFT JOIN user_secure_profiles usp
        ON usp.user_id = sr.requester_user_id
      ${whereClause}
      ORDER BY sr.updated_at DESC`,
      params
    );

    return res.json({
      requests: rows.map((row) => {
        const profile = row.profile_ciphertext
          ? decryptJson(row.profile_ciphertext, row.profile_iv, row.profile_tag)
          : null;

        return {
          ...row,
          requester_display_name: profile?.display_name || null,
          requester_full_name: profile?.full_name || null
        };
      })
    });
  })
);

router.patch(
  "/requests/:requestId/status",
  asyncHandler(async (req, res) => {
    const requestId = Number(req.params.requestId);
    const { statusCode, visibleToRequester = true } = req.body || {};

    if (!statusCode) {
      return res.status(400).json({ message: "statusCode is required." });
    }

    const result = await transaction(async (connection) => {
      const requestDetail = await loadRequestDetail(connection, requestId);
      ensureStaffAccess(req.user, requestDetail);

      if (
        env.requireIdentityVerificationForIssuance &&
        requestDetail.requiresIdentityVerification &&
        !requestDetail.identityVerified &&
        ["APPROVED", "IN_PROGRESS", "PRINTED", "READY_FOR_PICKUP", "DELIVERED", "COLLECTED"].includes(statusCode)
      ) {
        return {
          statusCode: 400,
          body: {
            message: "Identity verification must be approved before moving this request into processing or issuance."
          }
        };
      }

      await updateRequestStatus(connection, {
        requestId,
        previousStatusCode: requestDetail.statusCode,
        statusCode,
        changedByUserId: req.user.userId,
        visibleToRequester
      });

      if (visibleToRequester) {
        await createNotification(connection, {
          recipientUserId: requestDetail.requesterUserId,
          requestId,
          notificationType: "STATUS_UPDATE",
          title: `${requestDetail.requestTypeName} updated`,
          message: `Your ${requestDetail.requestTypeName} request is now ${statusCode.replace(/_/g, " ").toLowerCase()}.`
        });
      }

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: requestDetail.owningDepartmentId,
        eventCode: "REQUEST_STATUS_UPDATED",
        entityType: "REQUEST",
        entityId: requestId,
        requestId,
        targetUserId: requestDetail.requesterUserId,
        summary: `Updated request ${requestId} to ${statusCode}.`
      });

      return {
        statusCode: 200,
        body: {
          message: "Request status updated."
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.post(
  "/requests/:requestId/outputs",
  asyncHandler(async (req, res) => {
    const requestId = Number(req.params.requestId);
    const {
      outputCode,
      outputName,
      outputKind,
      outputStatus = "IN_PRODUCTION",
      pickupLocation = "Department of Veterans Affairs",
      relativePath = null
    } = req.body || {};

    if (!outputCode || !outputName || !outputKind) {
      return res.status(400).json({ message: "outputCode, outputName, and outputKind are required." });
    }

    const result = await transaction(async (connection) => {
      const requestDetail = await loadRequestDetail(connection, requestId);
      ensureStaffAccess(req.user, requestDetail);

      if (env.requireIdentityVerificationForIssuance && requestDetail.requiresIdentityVerification && !requestDetail.identityVerified) {
        return {
          statusCode: 400,
          body: {
            message: "Identity verification must be approved before creating an output for this request."
          }
        };
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO request_outputs (
          request_id,
          output_code,
          output_name,
          output_kind,
          output_status,
          storage_disk,
          relative_path,
          ready_for_pickup_at,
          pickup_location,
          issued_by_user_id,
          issued_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, 'PRIVATE_UPLOADS', ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          requestId,
          outputCode,
          outputName,
          outputKind,
          outputStatus,
          relativePath,
          outputStatus === "READY_FOR_PICKUP" ? new Date() : null,
          pickupLocation,
          req.user.userId
        ]
      );

      if (outputStatus === "READY_FOR_PICKUP") {
        await updateRequestStatus(connection, {
          requestId,
          previousStatusCode: requestDetail.statusCode,
          statusCode: "READY_FOR_PICKUP",
          changedByUserId: req.user.userId,
          visibleToRequester: true
        });

        await createNotification(connection, {
          recipientUserId: requestDetail.requesterUserId,
          requestId,
          outputId: insertResult.insertId,
          notificationType: "READY_FOR_PICKUP",
          title: `${outputName} ready for pickup`,
          message: `${outputName} is ready for pickup at ${pickupLocation}.`
        });
      }

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: requestDetail.owningDepartmentId,
        eventCode: "REQUEST_OUTPUT_CREATED",
        entityType: "REQUEST_OUTPUT",
        entityId: insertResult.insertId,
        requestId,
        targetUserId: requestDetail.requesterUserId,
        summary: `Created output ${outputCode} for request ${requestId}.`
      });

      return {
        outputId: insertResult.insertId
      };
    });

    return res.status(201).json(result);
  })
);

router.get(
  "/payment-receipts",
  asyncHandler(async (req, res) => {
    const params = [];
    let whereClause = "";

    if (!req.user.permissions.canAccessAllDepartments) {
      const departmentIds = req.user.departments.map((department) => department.departmentId);
      whereClause = `WHERE sr.owning_department_id IN (${departmentIds.map(() => "?").join(",")})`;
      params.push(...departmentIds);
    }

    const [rows] = await pool.execute(
      `SELECT
        rpr.payment_receipt_id,
        rpr.request_id,
        rpr.attachment_id,
        rpr.receipt_status,
        rpr.created_at,
        ra.relative_path,
        sr.public_uuid AS request_uuid
      FROM request_payment_receipts rpr
      INNER JOIN request_attachments ra
        ON ra.attachment_id = rpr.attachment_id
      INNER JOIN service_requests sr
        ON sr.request_id = rpr.request_id
      ${whereClause}
      ORDER BY rpr.created_at DESC`,
      params
    );

    return res.json({ receipts: rows });
  })
);

router.patch(
  "/payment-receipts/:paymentReceiptId/review",
  asyncHandler(async (req, res) => {
    const paymentReceiptId = Number(req.params.paymentReceiptId);
    const { decision, pickupLocation = "Department of Veterans Affairs" } = req.body || {};

    if (!["ACCEPTED", "REJECTED"].includes(decision)) {
      return res.status(400).json({ message: "decision must be ACCEPTED or REJECTED." });
    }

    const result = await transaction(async (connection) => {
      const [receiptRows] = await connection.execute(
        `SELECT
          rpr.payment_receipt_id,
          rpr.request_id,
          rpr.receipt_status
        FROM request_payment_receipts rpr
        WHERE rpr.payment_receipt_id = ?
        LIMIT 1`,
        [paymentReceiptId]
      );

      const receipt = receiptRows[0];

      if (!receipt) {
        return { statusCode: 404, body: { message: "Payment receipt not found." } };
      }

      const requestDetail = await loadRequestDetail(connection, receipt.request_id);
      ensureStaffAccess(req.user, requestDetail);

      if (decision === "ACCEPTED" && env.requireIdentityVerificationForIssuance && requestDetail.requiresIdentityVerification && !requestDetail.identityVerified) {
        return {
          statusCode: 400,
          body: {
            message: "Identity verification must be approved before issuing the funeral proof of payment letter."
          }
        };
      }

      await connection.execute(
        `UPDATE request_payment_receipts
        SET receipt_status = ?,
            reviewed_by_user_id = ?,
            reviewed_at = UTC_TIMESTAMP(),
            updated_at = UTC_TIMESTAMP()
        WHERE payment_receipt_id = ?`,
        [decision, req.user.userId, paymentReceiptId]
      );

      let outputId = null;

      if (decision === "ACCEPTED") {
        const [outputResult] = await connection.execute(
          `INSERT INTO request_outputs (
            request_id,
            output_code,
            output_name,
            output_kind,
            output_status,
            storage_disk,
            relative_path,
            ready_for_pickup_at,
            pickup_location,
            issued_by_user_id,
            issued_at,
            created_at,
            updated_at
          ) VALUES (
            ?, 'FUNERAL_PROOF_OF_PAYMENT_LETTER', 'Funeral Proof of Payment Letter', 'LETTER',
            'READY_FOR_PICKUP', 'PRIVATE_UPLOADS', NULL, UTC_TIMESTAMP(), ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP()
          )`,
          [receipt.request_id, pickupLocation, req.user.userId]
        );

        outputId = outputResult.insertId;

        await connection.execute(
          `UPDATE request_payment_receipts
          SET proof_letter_output_id = ?,
              proof_letter_generated_at = UTC_TIMESTAMP(),
              updated_at = UTC_TIMESTAMP()
          WHERE payment_receipt_id = ?`,
          [outputId, paymentReceiptId]
        );

        await updateRequestStatus(connection, {
          requestId: receipt.request_id,
          previousStatusCode: requestDetail.statusCode,
          statusCode: "READY_FOR_PICKUP",
          changedByUserId: req.user.userId,
          visibleToRequester: true
        });

        await createNotification(connection, {
          recipientUserId: requestDetail.requesterUserId,
          requestId: receipt.request_id,
          outputId,
          notificationType: "READY_FOR_PICKUP",
          title: "Funeral proof of payment letter ready",
          message: `Your funeral proof of payment letter is ready for pickup at ${pickupLocation}.`
        });
      }

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: requestDetail.owningDepartmentId,
        eventCode: "FUNERAL_RECEIPT_REVIEWED",
        entityType: "PAYMENT_RECEIPT",
        entityId: paymentReceiptId,
        requestId: receipt.request_id,
        targetUserId: requestDetail.requesterUserId,
        summary: `Reviewed funeral payment receipt ${paymentReceiptId} as ${decision}.`
      });

      return {
        statusCode: 200,
        body: {
          message: `Receipt marked as ${decision}.`,
          outputId
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.get(
  "/identity-verifications",
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const queue = await listIdentityVerificationQueue(connection);
      const filteredQueue = queue.filter((item) => {
        if (item.relatedRequestId) {
          return canAccessDepartment(req.user, item.owningDepartmentId);
        }

        return canReviewAccountVerification(req.user);
      });

      return res.json({ identityVerifications: filteredQueue });
    } finally {
      connection.release();
    }
  })
);

router.patch(
  "/identity-verifications/:verificationRequestId/review",
  asyncHandler(async (req, res) => {
    const verificationRequestId = Number(req.params.verificationRequestId);
    const { decision, note = "" } = req.body || {};

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({ message: "decision must be APPROVED or REJECTED." });
    }

    const result = await transaction(async (connection) => {
      const verificationDetail = await loadIdentityVerificationDetail(connection, verificationRequestId);
      ensureIdentityVerificationAccess(req.user, verificationDetail);

      if (!["PENDING_UPLOAD", "UPLOADED", "UNDER_REVIEW", "REJECTED"].includes(verificationDetail.status)) {
        return {
          statusCode: 400,
          body: {
            message: "This identity verification request is not available for review."
          }
        };
      }

      const encryptedNote = note ? encryptText(String(note).trim()) : null;

      await connection.execute(
        `UPDATE identity_verification_requests
        SET status = ?,
            reviewed_by_user_id = ?,
            reviewed_at = UTC_TIMESTAMP(),
            review_note_ciphertext = ?,
            review_note_iv = ?,
            review_note_tag = ?,
            key_version = ?
        WHERE verification_request_id = ?`,
        [
          decision,
          req.user.userId,
          encryptedNote?.ciphertext || null,
          encryptedNote?.iv || null,
          encryptedNote?.tag || null,
          encryptedNote?.keyVersion || null,
          verificationRequestId
        ]
      );

      if (decision === "APPROVED") {
        await connection.execute(
          `UPDATE users
          SET is_identity_verified = 1,
              updated_at = UTC_TIMESTAMP()
          WHERE user_id = ?`,
          [verificationDetail.userId]
        );

        await connection.execute(
          `UPDATE service_requests
          SET identity_verified = 1,
              updated_at = UTC_TIMESTAMP()
          WHERE requester_user_id = ?
            AND requires_identity_verification = 1`,
          [verificationDetail.userId]
        );

        const [pendingRequests] = await connection.execute(
          `SELECT
            sr.request_id,
            rt.request_type_name,
            rs.status_code
          FROM service_requests sr
          INNER JOIN request_types rt
            ON rt.request_type_id = sr.request_type_id
          INNER JOIN request_statuses rs
            ON rs.status_id = sr.current_status_id
          WHERE sr.requester_user_id = ?
            AND sr.requires_identity_verification = 1
            AND rs.status_code = 'PENDING_VERIFICATION'`,
          [verificationDetail.userId]
        );

        for (const pendingRequest of pendingRequests) {
          await updateRequestStatus(connection, {
            requestId: pendingRequest.request_id,
            previousStatusCode: "PENDING_VERIFICATION",
            statusCode: "UNDER_REVIEW",
            changedByUserId: req.user.userId,
            visibleToRequester: true
          });

          await createNotification(connection, {
            recipientUserId: verificationDetail.userId,
            requestId: pendingRequest.request_id,
            notificationType: "STATUS_UPDATE",
            title: `${pendingRequest.request_type_name} moved to review`,
            message: `Identity verification is approved and your ${pendingRequest.request_type_name} request is now under review.`
          });
        }

        await createNotification(connection, {
          recipientUserId: verificationDetail.userId,
          requestId: verificationDetail.relatedRequestId,
          notificationType: "IDENTITY_VERIFIED",
          title: "Identity verified",
          message: "Your identity verification has been approved. Requests that depend on identity verification can now continue."
        });
      } else {
        if (verificationDetail.relatedRequestId) {
          await connection.execute(
            `UPDATE service_requests
            SET identity_verified = 0,
                updated_at = UTC_TIMESTAMP()
            WHERE request_id = ?`,
            [verificationDetail.relatedRequestId]
          );
        }

        await createNotification(connection, {
          recipientUserId: verificationDetail.userId,
          requestId: verificationDetail.relatedRequestId,
          notificationType: "IDENTITY_VERIFICATION_REJECTED",
          title: "Identity verification needs another upload",
          message: note
            ? `Identity verification could not be approved: ${String(note).trim()}`
            : "Identity verification could not be approved. Upload another identification image in your dashboard."
        });
      }

      await writeAudit(connection, {
        actorUserId: req.user.userId,
        actorRoleId: req.user.roleId,
        actorDepartmentId: verificationDetail.owningDepartmentId || req.user.departments[0]?.departmentId || null,
        eventCode: "IDENTITY_VERIFICATION_REVIEWED",
        entityType: "IDENTITY_VERIFICATION",
        entityId: verificationRequestId,
        requestId: verificationDetail.relatedRequestId,
        targetUserId: verificationDetail.userId,
        summary: `Reviewed identity verification ${verificationRequestId} as ${decision}.`
      });

      return {
        statusCode: 200,
        body: {
          message: `Identity verification marked as ${decision}.`
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

module.exports = router;
