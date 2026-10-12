import test from "node:test";
import assert from "node:assert/strict";
import {isEditorAdmin,parseEditorAdminUserIds,resolveEditorAuthorization} from "../lib/editor-auth-policy.js";

const admin={user:{id:"auth-user-7",name:"Moon Editor",role:"admin"}};
const context=(overrides={})=>({
 authConfigured:true,session:admin,adminUserIds:new Set(["auth-user-7"]),origin:"http://localhost:3000",
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
test("an admin role alone cannot grant editor access without the owner allowlist",()=>{
 assert.equal(resolveEditorAuthorization(context({adminUserIds:new Set()})).status,403);
 assert.equal(resolveEditorAuthorization(context({adminUserIds:new Set(["another-user"])})).status,403);
});
test("editor allowlist parsing is exact and ignores empty values",()=>{
 assert.deepEqual([...parseEditorAdminUserIds(" first, ,second,first ")],["first","second"]);
 assert.equal(isEditorAdmin({id:"first",role:"admin"},parseEditorAdminUserIds("first")),true);
 assert.equal(isEditorAdmin({id:"first",role:"user"},parseEditorAdminUserIds("first")),false);
});
test("admin role and same-origin browser request are authorized with actor identity",()=>{
 assert.deepEqual(resolveEditorAuthorization(context()),{ok:true,user:{id:"auth-user-7",name:"Moon Editor"}});
});
test("missing or cross-origin requests are rejected",()=>{
 assert.equal(resolveEditorAuthorization(context({origin:null})).status,403);
 assert.equal(resolveEditorAuthorization(context({origin:"https://attacker.example"})).status,403);
 for(const fetchSite of ["cross-site","same-site","none","unknown"]){
  assert.equal(resolveEditorAuthorization(context({fetchSite})).status,403,fetchSite);
 }
 assert.deepEqual(resolveEditorAuthorization(context({fetchSite:null})),{ok:true,user:{id:"auth-user-7",name:"Moon Editor"}});
});
test("invalid identity identifiers fail closed",()=>{
 assert.equal(resolveEditorAuthorization(context({session:{user:{id:" ",role:"admin"}}})).status,403);
 assert.equal(resolveEditorAuthorization(context({session:{user:{id:"x".repeat(256),role:"admin"}}})).status,403);
});
