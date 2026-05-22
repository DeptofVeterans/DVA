const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { decryptJson, decryptText, encryptText } = require("../utils/crypto");

function hashUploadedFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest();
}

async function findOpenIdentityVerification(connection, userId, verificationType, relatedRequestId = null) {
  const [rows] = await connection.execute(
    `SELECT
      verification_request_id
    FROM identity_verification_requests
    WHERE user_id = ?
      AND verification_type = ?
      AND ((related_request_id IS NULL AND ? IS NULL) OR related_request_id = ?)
      AND status IN ('PENDING_UPLOAD', 'UPLOADED', 'UNDER_REVIEW')
    ORDER BY requested_at DESC
    LIMIT 1`,
    [userId, verificationType, relatedRequestId, relatedRequestId]
  );

  return rows[0] || null;
}

async function createIdentityVerificationRequest(
  connection,
  { userId, relatedRequestId = null, verificationType = "ACCOUNT_VERIFICATION", requestedByUserId = null, expiresInDays = 30 }
) {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const [result] = await connection.execute(
    `INSERT INTO identity_verification_requests (
      user_id,
      related_request_id,
      verification_type,
      status,
      requested_by_user_id,
      requested_at,
      expires_at
    ) VALUES (?, ?, ?, 'PENDING_UPLOAD', ?, UTC_TIMESTAMP(), ?)`,
    [userId, relatedRequestId, verificationType, requestedByUserId, expiresAt]
  );

  return result.insertId;
}

async function loadIdentityVerificationFiles(connection, verificationRequestId) {
  const [rows] = await connection.execute(
    `SELECT
      verification_file_id,
      relative_path,
      mime_type,
      file_size_bytes,
      uploaded_at,
      is_active,
      original_filename_ciphertext,
      original_filename_iv,
      original_filename_tag
    FROM identity_verification_files
    WHERE verification_request_id = ?
    ORDER BY uploaded_at DESC`,
    [verificationRequestId]
  );

  return rows.map((row) => ({
    verificationFileId: row.verification_file_id,
    relativePath: row.relative_path,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    uploadedAt: row.uploaded_at,
    isActive: Boolean(row.is_active),
    originalFileName:
      row.original_filename_ciphertext && row.original_filename_iv && row.original_filename_tag
        ? decryptText(row.original_filename_ciphertext, row.original_filename_iv, row.original_filename_tag)
        : "identity-document"
  }));
}

async function loadIdentityVerificationDetail(connection, verificationRequestId) {
  const [rows] = await connection.execute(
    `SELECT
      ivr.verification_request_id,
      ivr.user_id,
      ivr.related_request_id,
      ivr.verification_type,
      ivr.status,
      ivr.requested_by_user_id,
      ivr.reviewed_by_user_id,
      ivr.requested_at,
      ivr.submitted_at,
      ivr.reviewed_at,
      ivr.expires_at,
      ivr.review_note_ciphertext,
      ivr.review_note_iv,
      ivr.review_note_tag,
      sr.public_uuid AS related_request_uuid,
      sr.owning_department_id,
      rt.request_type_code,
      rt.request_type_name,
      d.department_code,
      d.department_name,
      usp.profile_ciphertext,
      usp.profile_iv,
      usp.profile_tag
    FROM identity_verification_requests ivr
    INNER JOIN users u
      ON u.user_id = ivr.user_id
    INNER JOIN user_secure_profiles usp
      ON usp.user_id = u.user_id
    LEFT JOIN service_requests sr
      ON sr.request_id = ivr.related_request_id
    LEFT JOIN request_types rt
      ON rt.request_type_id = sr.request_type_id
    LEFT JOIN departments d
      ON d.department_id = sr.owning_department_id
    WHERE ivr.verification_request_id = ?
    LIMIT 1`,
    [verificationRequestId]
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const profile = decryptJson(row.profile_ciphertext, row.profile_iv, row.profile_tag);
  const files = await loadIdentityVerificationFiles(connection, verificationRequestId);

  return {
    verificationRequestId: row.verification_request_id,
    userId: row.user_id,
    relatedRequestId: row.related_request_id,
    relatedRequestUuid: row.related_request_uuid,
    verificationType: row.verification_type,
    status: row.status,
    requestedByUserId: row.requested_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id,
    requestedAt: row.requested_at,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    expiresAt: row.expires_at,
    reviewNote:
      row.review_note_ciphertext && row.review_note_iv && row.review_note_tag
        ? decryptText(row.review_note_ciphertext, row.review_note_iv, row.review_note_tag)
        : "",
    owningDepartmentId: row.owning_department_id,
    departmentCode: row.department_code || "WELFARE_ASSISTANCE",
    departmentName: row.department_name || "Welfare and Assistance",
    requestTypeCode: row.request_type_code,
    requestTypeName: row.request_type_name,
    requesterDisplayName: profile.display_name,
    requesterFullName: profile.full_name,
    requesterEmail: profile.email,
    files
  };
}

async function listIdentityVerificationsForUser(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT
      verification_request_id
    FROM identity_verification_requests
    WHERE user_id = ?
    ORDER BY requested_at DESC`,
    [userId]
  );

  const items = [];

  for (const row of rows) {
    const detail = await loadIdentityVerificationDetail(connection, row.verification_request_id);

    if (detail) {
      items.push(detail);
    }
  }

  return items;
}

async function listIdentityVerificationQueue(connection) {
  const [rows] = await connection.execute(
    `SELECT
      verification_request_id
    FROM identity_verification_requests
    WHERE status IN ('PENDING_UPLOAD', 'UPLOADED', 'UNDER_REVIEW')
    ORDER BY requested_at ASC`
  );

  const items = [];

  for (const row of rows) {
    const detail = await loadIdentityVerificationDetail(connection, row.verification_request_id);

    if (detail) {
      items.push(detail);
    }
  }

  return items;
}

async function storeIdentityVerificationFile(connection, { verificationRequestId, file, uploadedByUserId }) {
  const encryptedName = encryptText(file.originalname);
  const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, "/");

  const [insertResult] = await connection.execute(
    `INSERT INTO identity_verification_files (
      verification_request_id,
      storage_disk,
      relative_path,
      original_filename_ciphertext,
      original_filename_iv,
      original_filename_tag,
      key_version,
      mime_type,
      file_size_bytes,
      file_sha256,
      uploaded_by_user_id,
      uploaded_at,
      is_active
    ) VALUES (?, 'UPLOADS', ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), 1)`,
    [
      verificationRequestId,
      relativePath,
      encryptedName.ciphertext,
      encryptedName.iv,
      encryptedName.tag,
      encryptedName.keyVersion,
      file.mimetype,
      file.size,
      hashUploadedFile(file.path),
      uploadedByUserId
    ]
  );

  await connection.execute(
    `UPDATE identity_verification_requests
    SET status = 'UPLOADED',
        submitted_at = UTC_TIMESTAMP(),
        reviewed_by_user_id = NULL,
        reviewed_at = NULL,
        review_note_ciphertext = NULL,
        review_note_iv = NULL,
        review_note_tag = NULL,
        key_version = NULL
    WHERE verification_request_id = ?`,
    [verificationRequestId]
  );

  return insertResult.insertId;
}

module.exports = {
  createIdentityVerificationRequest,
  findOpenIdentityVerification,
  listIdentityVerificationQueue,
  listIdentityVerificationsForUser,
  loadIdentityVerificationDetail,
  loadIdentityVerificationFiles,
  storeIdentityVerificationFile
};
