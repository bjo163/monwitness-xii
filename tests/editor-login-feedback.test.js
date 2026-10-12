import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EDITOR_ACCESS_DENIED_MESSAGE,
  EDITOR_EMAIL_UNVERIFIED_MESSAGE,
  EDITOR_ACCESS_UNAVAILABLE_MESSAGE,
  getEditorLoginAccessDecision,
} from "../lib/editor-login-feedback.js";

test("approved editor session continues to the editor", () => {
  assert.deepEqual(getEditorLoginAccessDecision({ status: 200, role: "admin", emailVerified: true, canEdit: true }), {
    authorized: true,
    message: "",
  });
});

test("signed-out or disallowed accounts get the owner-provisioning guidance", () => {
  assert.deepEqual(getEditorLoginAccessDecision({ status: 401 }), {
    authorized: false,
    message: EDITOR_ACCESS_DENIED_MESSAGE,
  });
  assert.match(getEditorLoginAccessDecision({ status: 200, role: "user", canEdit: false }).message, /administrator role/);
  assert.equal(getEditorLoginAccessDecision({ status: 200, role: "admin", emailVerified: false, canEdit: true }).message, EDITOR_EMAIL_UNVERIFIED_MESSAGE);
  assert.match(getEditorLoginAccessDecision({ status: 200, role: "admin", emailVerified: true, canEdit: false }).message, /server-side editor allowlist/);
});

test("server failures are not reported as account authorization denials", () => {
  for (const status of [500, 502, 503]) {
    assert.deepEqual(getEditorLoginAccessDecision({ status, canEdit: false }), {
      authorized: false,
      message: EDITOR_ACCESS_UNAVAILABLE_MESSAGE,
    });
  }
});
