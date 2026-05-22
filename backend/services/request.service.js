const crypto = require("crypto");
const { decryptJson, encryptJson } = require("../utils/crypto");
const { createIdentityVerificationRequest } = require("./identity-verification.service");

function generatePublicUuid() {
  return crypto.randomUUID();
}

async function getRequestTypeByCode(connection, requestTypeCode) {
  const [rows] = await connection.execute(
    `SELECT
      rt.request_type_id,
      rt.request_type_code,
      rt.request_type_name,
      rt.default_department_id,
      rt.requires_identity_verification,
      rt.produces_pickup_item,
      rt.output_kind
    FROM request_types rt
    WHERE rt.request_type_code = ?
      AND rt.is_active = 1
    LIMIT 1`,
    [requestTypeCode]
  );

  return rows[0] || null;
}

async function createRequest(connection, payload) {
  const encryptedPayload = encryptJson(payload.formData || {});
  const publicUuid = generatePublicUuid();
  const initialStatusCode =
    payload.requestType.requires_identity_verification && !payload.identityVerified
      ? "PENDING_VERIFICATION"
      : "SUBMITTED";

  const [requestResult] = await connection.execute(
    `INSERT INTO service_requests (
      public_uuid,
      requester_user_id,
      submitted_by_user_id,
      request_type_id,
      owning_department_id,
      current_status_id,
      priority,
      intake_channel,
      requires_identity_verification,
      identity_verified,
      pickup_required,
      submitted_at,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, (
        SELECT status_id FROM request_statuses WHERE status_code = ? LIMIT 1
      ), ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )`,
    [
      publicUuid,
      payload.requesterUserId,
      payload.submittedByUserId,
      payload.requestType.request_type_id,
      payload.requestType.default_department_id,
      initialStatusCode,
      payload.priority || "NORMAL",
      payload.intakeChannel || "PORTAL",
      payload.requestType.requires_identity_verification ? 1 : 0,
      payload.identityVerified ? 1 : 0,
      payload.requestType.produces_pickup_item ? 1 : 0
    ]
  );

  const requestId = requestResult.insertId;

  let verificationRequestId = null;

  if (payload.requestType.requires_identity_verification && !payload.identityVerified) {
    verificationRequestId = await createIdentityVerificationRequest(connection, {
      userId: payload.requesterUserId,
      relatedRequestId: requestId,
      verificationType: "SERVICE_ISSUANCE",
      requestedByUserId: payload.submittedByUserId
    });

    await connection.execute(
      `UPDATE service_requests
      SET latest_verification_request_id = ?
      WHERE request_id = ?`,
      [verificationRequestId, requestId]
    );
  }

  await connection.execute(
    `INSERT INTO service_request_payloads (
      request_id,
      key_version,
      payload_schema_code,
      payload_ciphertext,
      payload_iv,
      payload_tag,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      requestId,
      encryptedPayload.keyVersion,
      payload.requestType.request_type_code,
      encryptedPayload.ciphertext,
      encryptedPayload.iv,
      encryptedPayload.tag
    ]
  );

  await connection.execute(
    `INSERT INTO request_status_history (
      request_id,
      from_status_id,
      to_status_id,
      changed_by_user_id,
      is_visible_to_requester,
      created_at
    )
    VALUES (
      ?,
      NULL,
      (SELECT status_id FROM request_statuses WHERE status_code = ? LIMIT 1),
      ?,
      1,
      UTC_TIMESTAMP()
    )`,
    [requestId, initialStatusCode, payload.submittedByUserId]
  );

  return {
    requestId,
    publicUuid,
    initialStatusCode,
    verificationRequestId
  };
}

async function loadRequestDetail(connection, requestId) {
  const [rows] = await connection.execute(
    `SELECT
      sr.request_id,
      sr.public_uuid,
      sr.requester_user_id,
      sr.submitted_by_user_id,
      sr.request_type_id,
      sr.owning_department_id,
      sr.current_status_id,
      sr.assigned_to_user_id,
      sr.priority,
      sr.intake_channel,
      sr.requires_identity_verification,
      sr.identity_verified,
      sr.pickup_required,
      sr.submitted_at,
      sr.completed_at,
      sr.closed_at,
      rt.request_type_code,
      rt.request_type_name,
      rs.status_code,
      rs.status_name,
      d.department_code,
      d.department_name,
      usp.profile_ciphertext AS requester_profile_ciphertext,
      usp.profile_iv AS requester_profile_iv,
      usp.profile_tag AS requester_profile_tag,
      srp.payload_schema_code,
      srp.payload_ciphertext,
      srp.payload_iv,
      srp.payload_tag
    FROM service_requests sr
    INNER JOIN request_types rt
      ON rt.request_type_id = sr.request_type_id
    INNER JOIN request_statuses rs
      ON rs.status_id = sr.current_status_id
    INNER JOIN departments d
      ON d.department_id = sr.owning_department_id
    LEFT JOIN user_secure_profiles usp
      ON usp.user_id = sr.requester_user_id
    LEFT JOIN service_request_payloads srp
      ON srp.request_id = sr.request_id
    WHERE sr.request_id = ?
    LIMIT 1`,
    [requestId]
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const requesterProfile = row.requester_profile_ciphertext
    ? decryptJson(row.requester_profile_ciphertext, row.requester_profile_iv, row.requester_profile_tag)
    : null;

  const [history] = await connection.execute(
    `SELECT
      rsh.status_history_id,
      rs.status_code,
      rs.status_name,
      rsh.is_visible_to_requester,
      rsh.created_at
    FROM request_status_history rsh
    INNER JOIN request_statuses rs
      ON rs.status_id = rsh.to_status_id
    WHERE rsh.request_id = ?
    ORDER BY rsh.created_at DESC`,
    [requestId]
  );

  const [outputs] = await connection.execute(
    `SELECT
      output_id,
      output_code,
      output_name,
      output_kind,
      output_status,
      ready_for_pickup_at,
      pickup_location,
      picked_up_at,
      issued_at
    FROM request_outputs
    WHERE request_id = ?
    ORDER BY created_at DESC`,
    [requestId]
  );

  const [attachments] = await connection.execute(
    `SELECT
      attachment_id,
      attachment_type,
      relative_path,
      mime_type,
      file_size_bytes,
      is_visible_to_requester,
      created_at
    FROM request_attachments
    WHERE request_id = ?
    ORDER BY created_at DESC`,
    [requestId]
  );

  return {
    requestId: row.request_id,
    publicUuid: row.public_uuid,
    requesterUserId: row.requester_user_id,
    requesterDisplayName: requesterProfile?.display_name || null,
    requesterFullName: requesterProfile?.full_name || null,
    requesterEmail: requesterProfile?.email || null,
    submittedByUserId: row.submitted_by_user_id,
    requestTypeId: row.request_type_id,
    requestTypeCode: row.request_type_code,
    requestTypeName: row.request_type_name,
    owningDepartmentId: row.owning_department_id,
    departmentCode: row.department_code,
    departmentName: row.department_name,
    statusId: row.current_status_id,
    statusCode: row.status_code,
    statusName: row.status_name,
    assignedToUserId: row.assigned_to_user_id,
    priority: row.priority,
    intakeChannel: row.intake_channel,
    requiresIdentityVerification: Boolean(row.requires_identity_verification),
    identityVerified: Boolean(row.identity_verified),
    pickupRequired: Boolean(row.pickup_required),
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    closedAt: row.closed_at,
    payload: row.payload_ciphertext ? decryptJson(row.payload_ciphertext, row.payload_iv, row.payload_tag) : {},
    history,
    outputs,
    attachments
  };
}

async function listRequestsForUser(connection, options) {
  const params = [];
  const conditions = [];

  if (options.requesterUserId) {
    conditions.push("sr.requester_user_id = ?");
    params.push(options.requesterUserId);
  }

  if (options.departmentIds && options.departmentIds.length) {
    conditions.push(`sr.owning_department_id IN (${options.departmentIds.map(() => "?").join(",")})`);
    params.push(...options.departmentIds);
  }

  if (options.statusCode) {
    conditions.push("rs.status_code = ?");
    params.push(options.statusCode);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await connection.execute(
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
    ${where}
    ORDER BY sr.updated_at DESC`,
    params
  );

  return rows.map((row) => {
    const profile = row.profile_ciphertext
      ? decryptJson(row.profile_ciphertext, row.profile_iv, row.profile_tag)
      : null;

    return {
      ...row,
      requester_display_name: profile?.display_name || null,
      requester_full_name: profile?.full_name || null
    };
  });
}

async function updateRequestStatus(connection, payload) {
  await connection.execute(
    `UPDATE service_requests
    SET current_status_id = (
      SELECT status_id FROM request_statuses WHERE status_code = ? LIMIT 1
    ),
    completed_at = CASE
      WHEN ? IN ('DELIVERED', 'COLLECTED', 'REJECTED', 'CANCELLED', 'CLOSED') THEN UTC_TIMESTAMP()
      ELSE completed_at
    END,
    updated_at = UTC_TIMESTAMP()
    WHERE request_id = ?`,
    [payload.statusCode, payload.statusCode, payload.requestId]
  );

  await connection.execute(
    `INSERT INTO request_status_history (
      request_id,
      from_status_id,
      to_status_id,
      changed_by_user_id,
      is_visible_to_requester,
      created_at
    ) VALUES (
      ?,
      (SELECT status_id FROM request_statuses WHERE status_code = ? LIMIT 1),
      (SELECT status_id FROM request_statuses WHERE status_code = ? LIMIT 1),
      ?,
      ?,
      UTC_TIMESTAMP()
    )`,
    [
      payload.requestId,
      payload.previousStatusCode,
      payload.statusCode,
      payload.changedByUserId,
      payload.visibleToRequester ? 1 : 0
    ]
  );
}

module.exports = {
  generatePublicUuid,
  getRequestTypeByCode,
  createRequest,
  loadRequestDetail,
  listRequestsForUser,
  updateRequestStatus
};
