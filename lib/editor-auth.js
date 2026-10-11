import { createHash, timingSafeEqual } from "node:crypto";
export function authorizeEditor(request) {
  const configured = process.env.EDITOR_API_TOKEN;
  if (!configured || configured.length < 32) return {ok:false,status:503,message:"Editor writes are disabled"};
  const header = request.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expectedHash = createHash("sha256").update(configured).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  if (!supplied || !timingSafeEqual(expectedHash,suppliedHash)) return {ok:false,status:401,message:"Unauthorized"};
  const origin = request.headers.get("origin");
  // API tokens must be used by trusted backend clients, not cross-origin browser scripts.
  if (origin) return {ok:false,status:403,message:"Browser-origin writes disabled"};
  return {ok:true};
}
