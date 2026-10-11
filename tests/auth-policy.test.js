import test from "node:test";
import assert from "node:assert/strict";
import {getAuthRouteMethods,isAuthMethodAllowed,isAuthPathAllowed,isAuthRequestAllowed} from "../lib/auth-policy.js";

test("only sign-in, session, sign-out and token routes are proxied",()=>{
 for(const path of ["get-session","sign-in/email","sign-out","token"])assert.equal(isAuthPathAllowed(path),true);
 for(const path of ["sign-up/email","admin/create-user","request-password-reset","unknown",""])assert.equal(isAuthPathAllowed(path),false);
 assert.equal(isAuthPathAllowed(null),false);
});

test("the auth proxy permits only methods exported by the Neon Next.js handler",()=>{
 assert.equal(isAuthMethodAllowed("GET"),true);
 assert.equal(isAuthMethodAllowed("POST"),true);
 for(const method of ["PUT","PATCH","DELETE","OPTIONS",null])assert.equal(isAuthMethodAllowed(method),false);
});

test("each allowlisted Auth path permits only its SDK-defined method",()=>{
 const routes={"get-session":"GET","sign-in/email":"POST","sign-out":"POST",token:"GET"};
 for(const [path,method] of Object.entries(routes)){
  assert.equal(isAuthRequestAllowed(path,method),true,`${method} ${path}`);
  assert.deepEqual(getAuthRouteMethods(path),[method]);
  assert.equal(isAuthRequestAllowed(path,method==="GET"?"POST":"GET"),false,`wrong method for ${path}`);
 }
 assert.equal(getAuthRouteMethods("sign-up/email"),null);
});
