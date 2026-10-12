import assert from "node:assert/strict";
import { test } from "node:test";
import { createEditorSessionResponse } from "../lib/editor-session-response.js";

test("editor session response is no-store and exposes only the caller's role and edit decision", async () => {
  const cases = [
    {
      result: { ok: true, session: null, isEditorAdmin: false },
      status: 401,
      body: { authenticated: false },
    },
    {
      result: {
        ok: true,
        session: { user: { id: "private-id", email: "private@example.test", role: "admin", token: "private-token" } },
        isEditorAdmin: false,
      },
      status: 200,
      body: { authenticated: true, role: "admin", canEdit: false },
    },
    {
      result: {
        ok: true,
        session: { user: { id: "private-id", email: "private@example.test", role: "admin", token: "private-token" } },
        isEditorAdmin: true,
      },
      status: 200,
      body: { authenticated: true, role: "admin", canEdit: true },
    },
    {
      result: {
        ok: true,
        session: { user: { id: "private-id", email: "private@example.test", role: "unexpected", token: "private-token" } },
        isEditorAdmin: false,
      },
      status: 200,
      body: { authenticated: true, role: "user", canEdit: false },
    },
  ];

  for (const { result, status, body } of cases) {
    const response = createEditorSessionResponse(result);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const payload = await response.json();
    assert.deepEqual(payload, body);
    assert.doesNotMatch(JSON.stringify(payload), /private-id|private@example|private-token/);
  }
});

test("editor session service errors preserve status without returning session details", async () => {
  const response = createEditorSessionResponse({
    ok: false,
    status: 503,
    message: "Authentication service unavailable",
    session: { user: { id: "private-id", token: "private-token" } },
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.deepEqual(payload, { error: "Authentication service unavailable" });
  assert.doesNotMatch(JSON.stringify(payload), /private-id|private-token/);
});
