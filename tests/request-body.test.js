import test from "node:test";
import assert from "node:assert/strict";
import { MAX_JSON_BODY_BYTES, readJsonBody } from "../lib/read-json-body.js";

function request(body, headers = {}) {
  return new Request("http://localhost/api/editor", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

test("parses JSON within the configured byte limit", async () => {
  assert.deepEqual(await readJsonBody(request('{"ok":true}')), { ok: true, value: { ok: true } });
});

test("rejects oversized declared content before reading", async () => {
  const result = await readJsonBody(request("{}", { "content-length": String(MAX_JSON_BODY_BYTES + 1) }));
  assert.deepEqual(result, { ok: false, status: 413, message: "Request body too large" });
});

test("rejects oversized streamed content", async () => {
  const result = await readJsonBody(request(JSON.stringify({ body: "x".repeat(MAX_JSON_BODY_BYTES) })));
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test("rejects malformed JSON and invalid UTF-8", async () => {
  assert.equal((await readJsonBody(request("{"))).status, 400);
  const invalidUtf8 = new Request("http://localhost/api/editor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: new Uint8Array([0xc3, 0x28]),
  });
  assert.equal((await readJsonBody(invalidUtf8)).status, 400);
});

test("rejects requests that do not declare JSON content", async () => {
  const result = await readJsonBody(request("{}", { "content-type": "text/plain" }));
  assert.deepEqual(result, { ok: false, status: 415, message: "Content-Type must be application/json" });
});
