import {createNeonAuth} from "@neondatabase/auth/next/server";

export function isAuthConfigured(){
 return Boolean(process.env.NEON_AUTH_BASE_URL&&process.env.NEON_AUTH_COOKIE_SECRET?.length>=32);
}

let instance;
export function getAuth(){
 if(!isAuthConfigured())throw new Error("Neon Auth is not configured");
 instance??=createNeonAuth({
  baseUrl:process.env.NEON_AUTH_BASE_URL,
  cookies:{secret:process.env.NEON_AUTH_COOKIE_SECRET},
  logLevel:"error",
 });
 return instance;
}
