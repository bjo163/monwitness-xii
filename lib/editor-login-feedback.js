export const EDITOR_ACCESS_DENIED_MESSAGE = "This account isn't approved for editor access. Ask the project owner to verify its administrator role and server allowlist entry.";
export const EDITOR_ACCESS_UNAVAILABLE_MESSAGE = "Editor access could not be verified right now. Please try again later.";

export function getEditorLoginAccessDecision({ status, role, canEdit }) {
  if (status >= 500) {
    return { authorized: false, message: EDITOR_ACCESS_UNAVAILABLE_MESSAGE };
  }
  if (status !== 200) {
    return { authorized: false, message: EDITOR_ACCESS_DENIED_MESSAGE };
  }
  if (role !== "admin") {
    return {
      authorized: false,
      message: "This account doesn't have the Neon Auth administrator role. Ask the project owner to provision your editor account.",
    };
  }
  if (canEdit !== true) {
    return {
      authorized: false,
      message: "This administrator account isn't on the server-side editor allowlist. Ask the project owner to approve its user ID.",
    };
  }
  return { authorized: true, message: "" };
}
