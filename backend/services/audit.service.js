async function writeAudit(connection, entry) {
  const actorRoleId = entry.actorRoleId || null;
  const actorDepartmentId = entry.actorDepartmentId || null;
  const actorUserId = entry.actorUserId || null;
  const requestId = entry.requestId || null;
  const targetUserId = entry.targetUserId || null;
  const ipAddress = entry.ipAddress || null;
  const userAgent = entry.userAgent || null;

  await connection.execute(
    `INSERT INTO audit_logs (
      actor_user_id,
      actor_role_id,
      actor_department_id,
      event_code,
      entity_type,
      entity_id,
      request_id,
      target_user_id,
      ip_address,
      user_agent,
      summary,
      occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      actorUserId,
      actorRoleId,
      actorDepartmentId,
      entry.eventCode,
      entry.entityType,
      String(entry.entityId),
      requestId,
      targetUserId,
      ipAddress,
      userAgent,
      entry.summary
    ]
  );
}

module.exports = {
  writeAudit
};
