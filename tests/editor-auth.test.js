import test from "node:test";
import assert from "node:assert/strict";
import { authorizeEditor } from "../lib/editor-auth.js";

const old=process.env.EDITOR_API_TOKEN;
const token="moonwitness-v11-editor-token-example-must-be-rotated";
const request=(value,origin)=>({headers:new Headers({
  ...(value?{authorization:value}:{}),
  ...(origin?{origin}:{}),
})});
test("writes fail closed when token is not configured",()=>{
  delete process.env.EDITOR_API_TOKEN;
  assert.deepEqual(authorizeEditor(request("Bearer "+token)),{ok:false,status:503,message:"Editor writes are disabled"});
});
test("short configuration fails closed",()=>{
  process.env.EDITOR_API_TOKEN="short";
  assert.equal(authorizeEditor(request("Bearer short")).status,503);
});
test("missing and invalid tokens rejected",()=>{
  process.env.EDITOR_API_TOKEN=token;
  assert.equal(authorizeEditor(request()).status,401);
  assert.equal(authorizeEditor(request("Bearer invalid")).status,401);
});
test("browser origin blocked even if bearer matches",()=>{
  process.env.EDITOR_API_TOKEN=token;
  assert.equal(authorizeEditor(request("Bearer "+token,"https://evil.example")).status,403);
});
test("trusted server token authorized",()=>{
  process.env.EDITOR_API_TOKEN=token;
  assert.equal(authorizeEditor(request("Bearer "+token)).ok,true);
});
test.after(()=>{
  if(old===undefined) delete process.env.EDITOR_API_TOKEN;
  else process.env.EDITOR_API_TOKEN=old;
});
