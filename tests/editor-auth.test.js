import test from "node:test";
import assert from "node:assert/strict";
import {resolveEditorAuthorization} from "../lib/editor-auth-policy.js";

const admin={user:{id:"auth-user-7",name:"Moon Editor",role:"admin"}};
const context=(overrides={})=>({
 authConfigured:true,session:admin,origin:"http://localhost:3000",
 expectedOrigin:"http://localhost:3000",fetchSite:"same-origin",...overrides,
});

test("editor writes fail closed when Managed Auth is not configured",()=>{
 assert.equal(resolveEditorAuthorization(context({authConfigured:false})).status,503);
});
test("signed-out users cannot write",()=>{
 assert.equal(resolveEditorAuthorization(context({session:null})).status,401);
});
test("authenticated non-admins cannot write",()=>{
 assert.equal(resolveEditorAuthorization(context({session:{user:{id:"reader-1",role:"user"}}})).status,403);
});
test("admin role and same-origin browser request are authorized with actor identity",()=>{
 assert.deepEqual(resolveEditorAuthorization(context()),{ok:true,user:{id:"auth-user-7",name:"Moon Editor"}});
});
test("missing or cross-origin requests are rejected",()=>{
 assert.equal(resolveEditorAuthorization(context({origin:null})).status,403);
 assert.equal(resolveEditorAuthorization(context({origin:"https://attacker.example"})).status,403);
 assert.equal(resolveEditorAuthorization(context({fetchSite:"cross-site"})).status,403);
});
test("invalid identity identifiers fail closed",()=>{
 assert.equal(resolveEditorAuthorization(context({session:{user:{id:" ",role:"admin"}}})).status,403);
 assert.equal(resolveEditorAuthorization(context({session:{user:{id:"x".repeat(256),role:"admin"}}})).status,403);
});
