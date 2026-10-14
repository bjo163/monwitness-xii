import { resolveEditorAuthorization } from "./editor-auth-policy.js";
import { getFreshEditorAuthSession, resolveEditorSession } from "./editor-session.js";

export function createEditorAuthorizer({isAuthConfigured,getAuth,getAdminUserIds}){
 return async function authorizeEditorRequest(request){
  const authConfigured=isAuthConfigured();
  const adminUserIds=getAdminUserIds();
  const current=await resolveEditorSession({
   authConfigured,
   getSession:()=>getFreshEditorAuthSession(getAuth()),
   adminUserIds,
  });
  if(!current.ok)return current;
  const origin=request.headers.get("origin");
  let expectedOrigin="";
  try{expectedOrigin=new URL(request.url).origin}catch{}
  return resolveEditorAuthorization({
   authConfigured:true,session:current.session,origin,expectedOrigin,
   fetchSite:request.headers.get("sec-fetch-site"),adminUserIds,
  });
 }
}
