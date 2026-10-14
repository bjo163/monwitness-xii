import {createNeonAuth} from "@neondatabase/auth/next/server";
import {getNeonAuthConfig} from "./auth-config.js";

export function isAuthConfigured(){
 return Boolean(process.env.NEON_AUTH_BASE_URL&&process.env.NEON_AUTH_COOKIE_SECRET?.length>=32);
}

let instance;
export function getAuth(){
 if(!isAuthConfigured())throw new Error("Neon Auth is not configured");
 instance??=createNeonAuth(getNeonAuthConfig());
 return instance;
}
