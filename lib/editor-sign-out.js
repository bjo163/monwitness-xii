export const EDITOR_SIGN_OUT_ERROR_MESSAGE = "Sign out could not be completed. Please try again.";

export async function signOutEditor({ signOut, redirect }) {
  try {
    const result = await signOut();
    if (result?.error || result?.data?.success !== true) {
      return { ok: false, message: EDITOR_SIGN_OUT_ERROR_MESSAGE };
    }
    redirect("/editor/login");
    return { ok: true, message: "" };
  } catch {
    return { ok: false, message: EDITOR_SIGN_OUT_ERROR_MESSAGE };
  }
}
