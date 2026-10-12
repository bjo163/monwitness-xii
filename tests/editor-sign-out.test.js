import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { EDITOR_SIGN_OUT_ERROR_MESSAGE, signOutEditor } from "../lib/editor-sign-out.js";

test("editor sign out redirects to the login page after provider success", async () => {
  let destination = "";
  const result = await signOutEditor({
    signOut: async () => ({ data: { success: true }, error: null }),
    redirect: (path) => { destination = path; },
  });

  assert.deepEqual(result, { ok: true, message: "" });
  assert.equal(destination, "/editor/login");
});

test("editor sign out reports provider errors without redirecting", async () => {
  let redirected = false;
  const result = await signOutEditor({
    signOut: async () => ({ data: null, error: new Error("private provider detail") }),
    redirect: () => { redirected = true; },
  });

  assert.deepEqual(result, { ok: false, message: EDITOR_SIGN_OUT_ERROR_MESSAGE });
  assert.equal(redirected, false);
  assert.doesNotMatch(result.message, /private provider detail/);
});

test("editor sign out fails safely when the provider throws", async () => {
  const result = await signOutEditor({
    signOut: async () => { throw new Error("private provider detail"); },
    redirect: () => assert.fail("must not redirect when sign out throws"),
  });

  assert.deepEqual(result, { ok: false, message: EDITOR_SIGN_OUT_ERROR_MESSAGE });
});

test("authenticated editor page exposes the sign-out action and accessible failure feedback", async () => {
  const page = await readFile(new URL("../app/editor/page.jsx", import.meta.url), "utf8");
  const component = await readFile(new URL("../app/editor/sign-out.jsx", import.meta.url), "utf8");

  assert.match(page, /import EditorSignOut from ['"]\.\/sign-out\.jsx['"]/);
  assert.match(page, /<EditorSignOut\s*\/>/);
  assert.match(component, /authClient\.signOut\(\)/);
  assert.match(component, /type="button"[^>]*onClick=\{submit\}[^>]*disabled=\{busy\}/);
  assert.match(component, /role="alert"/);
});
