import assert from "node:assert/strict";
import test from "node:test";
import { resolveEditorSession } from "../lib/editor-session.js";

const configured = (getSession, adminUserIds = new Set()) => resolveEditorSession({
  authConfigured: true,
  getSession,
  adminUserIds,
});

test("unconfigured auth fails closed without calling the session provider", async () => {
  let providerCalls = 0;
  const result = await resolveEditorSession({
    authConfigured: false,
    getSession: async () => { providerCalls += 1; return { data: null }; },
  });
  assert.deepEqual(result, { ok: false, status: 503, message: "Editor authentication is not configured" });
  assert.equal(providerCalls, 0);
});

test("provider errors and exceptions become generic unavailable responses", async () => {
  const providerError = await configured(async () => ({ data: null, error: new Error("provider secret detail") }));
  assert.deepEqual(providerError, { ok: false, status: 503, message: "Authentication service unavailable" });

  const providerException = await configured(async () => { throw new Error("provider secret detail"); });
  assert.deepEqual(providerException, { ok: false, status: 503, message: "Authentication service unavailable" });
});

test("empty provider session remains signed out", async () => {
  const result = await configured(async () => ({ data: null, error: null }));
  assert.deepEqual(result, { ok: true, session: null, isEditorAdmin: false });
});

test("provider error fields cannot be mistaken for a valid admin session", async () => {
  const result = await configured(async () => ({
    data: { user: { id: "owner-1", role: "admin" } },
    error: new Error("session verification failed"),
  }), new Set(["owner-1"]));
  assert.deepEqual(result, { ok: false, status: 503, message: "Authentication service unavailable" });
});

test("editor access requires both the provider admin role and exact owner allowlist ID", async () => {
  const session = { user: { id: "owner-1", role: "admin" } };
  const allowed = await configured(async () => ({ data: session, error: null }), new Set(["owner-1"]));
  const notAllowlisted = await configured(async () => ({ data: session, error: null }), new Set(["other-owner"]));
  const wrongRole = await configured(async () => ({ data: { user: { id: "owner-1", role: "user" } }, error: null }), new Set(["owner-1"]));

  assert.equal(allowed.isEditorAdmin, true);
  assert.equal(notAllowlisted.isEditorAdmin, false);
  assert.equal(wrongRole.isEditorAdmin, false);
});
