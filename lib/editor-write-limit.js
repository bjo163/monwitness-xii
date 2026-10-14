export const EDITOR_WRITE_LIMIT = 30;
export const EDITOR_WRITE_WINDOW_SECONDS = 15 * 60;

export async function reserveEditorWrite({
  sql,
  actorId,
  limit = EDITOR_WRITE_LIMIT,
  windowSeconds = EDITOR_WRITE_WINDOW_SECONDS,
}) {
  if (typeof actorId !== "string" || actorId.length === 0) {
    throw new TypeError("actorId is required");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowSeconds) || windowSeconds < 1) {
    throw new TypeError("Rate limit settings must be positive integers");
  }

  const rows = await sql`
    INSERT INTO system.editor_write_limits AS limits(actor_id, window_started_at, request_count)
    VALUES (${actorId}, now(), 1)
    ON CONFLICT (actor_id) DO UPDATE SET
      window_started_at = CASE
        WHEN limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
        THEN EXCLUDED.window_started_at ELSE limits.window_started_at END,
      request_count = CASE
        WHEN limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
        THEN 1 ELSE limits.request_count + 1 END
    WHERE limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
       OR limits.request_count < ${limit}
    RETURNING request_count,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
        window_started_at + (${windowSeconds} * interval '1 second') - now()
      )))::int) AS retry_after
  `;

  if (rows.length > 0) {
    return { allowed: true, remaining: Math.max(0, limit - rows[0].request_count), retryAfterSeconds: rows[0].retry_after };
  }

  const current = await sql`
    SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
      window_started_at + (${windowSeconds} * interval '1 second') - now()
    )))::int) AS retry_after
    FROM system.editor_write_limits WHERE actor_id = ${actorId}
  `;
  return { allowed: false, remaining: 0, retryAfterSeconds: current[0]?.retry_after ?? windowSeconds };
}
