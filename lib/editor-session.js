import { isEditorAdmin } from "./editor-auth-policy.js";

export async function resolveEditorSession({ authConfigured, getSession, adminUserIds = new Set() }) {
  if (!authConfigured) return { ok: false, status: 503, message: "Editor authentication is not configured" };
  try {
    const { data, error } = await getSession();
    if (error) return { ok: false, status: 503, message: "Authentication service unavailable" };
    const session = data ?? null;
    return { ok: true, session, isEditorAdmin: isEditorAdmin(session?.user, adminUserIds) };
  } catch {
    return { ok: false, status: 503, message: "Authentication service unavailable" };
  }
}
