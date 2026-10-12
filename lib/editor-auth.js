import {getAuth,isAuthConfigured} from "./auth.js";
import {parseEditorAdminUserIds,resolveEditorAuthorization} from "./editor-auth-policy.js";
import {getFreshEditorAuthSession,resolveEditorSession} from "./editor-session.js";
export {resolveEditorAuthorization} from "./editor-auth-policy.js";
export {getFreshEditorAuthSession,resolveEditorSession} from "./editor-session.js";

export function getEditorSession(){
 return resolveEditorSession({
  authConfigured:isAuthConfigured(),
  getSession:()=>getFreshEditorAuthSession(getAuth()),
  adminUserIds:parseEditorAdminUserIds(process.env.EDITOR_ADMIN_USER_IDS),
 });
}

export async function authorizeEditor(request){
 const current=await getEditorSession();
 if(!current.ok)return current;
 const origin=request.headers.get("origin");
 let expectedOrigin="";
 try{expectedOrigin=new URL(request.url).origin}catch{}
 const result=resolveEditorAuthorization({
  authConfigured:true,session:current.session,origin,expectedOrigin,
  fetchSite:request.headers.get("sec-fetch-site"),
  adminUserIds:parseEditorAdminUserIds(process.env.EDITOR_ADMIN_USER_IDS),
 });
 return result;
}
