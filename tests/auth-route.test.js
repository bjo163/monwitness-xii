import assert from "node:assert/strict";
import test from "node:test";
import { createAuthRouteHandlers } from "../lib/auth-route.js";

const context = (path) => ({ params: Promise.resolve({ path }) });
const request = (method, path) => new Request(`http://localhost:3000/api/auth/${path.join("/")}`, { method });

function makeHandlers({ configured = false, handler } = {}) {
  let providerCalls = 0;
  const handlers = createAuthRouteHandlers({
    isAuthConfigured: () => configured,
    getAuth: () => {
      providerCalls += 1;
      return { handler: () => handler ?? {} };
    },
  });
  return { handlers, providerCalls: () => providerCalls };
}

test("Auth dispatcher hides every non-allowlisted path regardless of provider configuration", async () => {
  for (const configured of [false, true]) {
    const { handlers, providerCalls } = makeHandlers({ configured });
    for (const path of [
      ["sign-up", "email"],
      ["admin", "create-user"],
      ["sign-in", "email", "extra"],
      [],
    ]) {
      const response = await handlers.GET(request("GET", path), context(path));
      assert.equal(response.status, 404, path.join("/") || "empty route");
      assert.deepEqual(await response.json(), { error: "Authentication route unavailable" });
    }
    assert.equal(providerCalls(), 0);
  }
});

test("POST signup and admin routes are denied before provider access", async () => {
  const { handlers, providerCalls } = makeHandlers({ configured: true });
  for (const path of [["sign-up", "email"], ["admin", "create-user"]]) {
    const response = await handlers.POST(request("POST", path), context(path));
    assert.equal(response.status, 404, `POST ${path.join("/")}`);
    assert.deepEqual(await response.json(), { error: "Authentication route unavailable" });
  }
  assert.equal(providerCalls(), 0);
});

test("unsupported Auth methods are rejected before configuration or provider access", async () => {
  const { handlers, providerCalls } = makeHandlers({ configured: true });
  for (const [method, handler] of [["PUT", handlers.PUT], ["PATCH", handlers.PATCH], ["DELETE", handlers.DELETE]]) {
    const response = await handler(request(method, ["get-session"]), context(["get-session"]));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET, POST");
  }
  assert.equal(providerCalls(), 0);
});

test("allowlisted Auth routes reject mismatched methods before provider access", async () => {
  const { handlers, providerCalls } = makeHandlers({ configured: true });
  for (const [path, method, handler, expectedAllow] of [
    [["get-session"], "POST", handlers.POST, "GET"],
    [["sign-in", "email"], "GET", handlers.GET, "POST"],
    [["sign-out"], "GET", handlers.GET, "POST"],
    [["token"], "POST", handlers.POST, "GET"],
  ]) {
    const response = await handler(request(method, path), context(path));
    assert.equal(response.status, 405, `${method} ${path.join("/")}`);
    assert.equal(response.headers.get("allow"), expectedAllow);
    assert.deepEqual(await response.json(), { error: "Authentication method unavailable" });
  }
  assert.equal(providerCalls(), 0);
});

test("allowlisted Auth routes fail closed with 503 when provider configuration is absent", async () => {
  const { handlers, providerCalls } = makeHandlers();
  const response = await handlers.POST(request("POST", ["sign-in", "email"]), context(["sign-in", "email"]));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Authentication is not configured" });
  assert.equal(providerCalls(), 0);
});

test("configured allowlisted requests dispatch once to the matching provider method", async () => {
  let forwardedMethod = "";
  const { handlers, providerCalls } = makeHandlers({
    configured: true,
    handler: { GET: async () => { forwardedMethod = "GET"; return Response.json({ ok: true }); } },
  });
  const response = await handlers.GET(request("GET", ["get-session"]), context(["get-session"]));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(forwardedMethod, "GET");
  assert.equal(providerCalls(), 1);
});

test("provider exceptions return a generic fail-closed response", async () => {
  const { handlers } = makeHandlers({
    configured: true,
    handler: { GET: async () => { throw new Error("provider detail must not escape"); } },
  });
  const response = await handlers.GET(request("GET", ["get-session"]), context(["get-session"]));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Authentication service unavailable" });
});
