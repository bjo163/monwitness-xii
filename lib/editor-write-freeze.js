export async function isEditorWriteFrozen({ sql }) {
  const rows = await sql`
    SELECT writes_frozen FROM system.editor_write_controls
    WHERE singleton_id='global' FOR SHARE
  `;
  if (rows.length !== 1 || typeof rows[0].writes_frozen !== "boolean") {
    throw new Error("Editor write control row is unavailable");
  }
  return rows[0].writes_frozen;
}

export async function setEditorWriteFreezeState({ sql, frozen, operator, reason }) {
  if (typeof frozen !== "boolean") throw new TypeError("frozen must be boolean");
  if (typeof operator !== "string" || !operator.trim() || operator.length > 120) {
    throw new TypeError("operator reference is required and must be at most 120 characters");
  }
  if (typeof reason !== "string" || !reason.trim() || reason.length > 240) {
    throw new TypeError("change reason is required and must be at most 240 characters");
  }
  const rows = await sql`
    UPDATE system.editor_write_controls
    SET writes_frozen=${frozen}, updated_at=now(), changed_by=${operator.trim()}, change_reason=${reason.trim()}
    WHERE singleton_id='global'
    RETURNING writes_frozen
  `;
  if (rows.length !== 1 || typeof rows[0].writes_frozen !== "boolean") {
    throw new Error("Editor write control row is unavailable");
  }
  return rows[0].writes_frozen;
}
