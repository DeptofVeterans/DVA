const { encryptText } = require("../utils/crypto");

const ALLOWED_NOTIFICATION_TYPES = new Set([
  "STATUS_UPDATE",
  "READY_FOR_PICKUP",
  "ACCOUNT_APPROVED",
  "ACCOUNT_REJECTED",
  "IDENTITY_VERIFICATION_REQUIRED",
  "IDENTITY_VERIFIED",
  "IDENTITY_VERIFICATION_REJECTED",
  "GENERAL"
]);

function normalizeNotificationType(notificationType) {
  const code = String(notificationType || "").trim().toUpperCase();
  return ALLOWED_NOTIFICATION_TYPES.has(code) ? code : "GENERAL";
}

async function createNotification(connection, payload) {
  const encrypted = encryptText(payload.message);

  const [result] = await connection.execute(
    `INSERT INTO notifications (
      recipient_user_id,
      request_id,
      output_id,
      notification_type,
      title,
      message_ciphertext,
      message_iv,
      message_tag,
      key_version,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      payload.recipientUserId,
      payload.requestId || null,
      payload.outputId || null,
      normalizeNotificationType(payload.notificationType),
      payload.title,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.tag,
      encrypted.keyVersion
    ]
  );

  return result.insertId;
}

module.exports = {
  createNotification,
  normalizeNotificationType
};
