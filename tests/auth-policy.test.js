import test from "node:test";
import assert from "node:assert/strict";
import {isAuthPathAllowed} from "../lib/auth-policy.js";

test("only sign-in, session, sign-out and token routes are proxied",()=>{
 for(const path of ["get-session","sign-in/email","sign-out","token"])assert.equal(isAuthPathAllowed(path),true);
 for(const path of ["sign-up/email","admin/create-user","request-password-reset","unknown",""])assert.equal(isAuthPathAllowed(path),false);
 assert.equal(isAuthPathAllowed(null),false);
});
