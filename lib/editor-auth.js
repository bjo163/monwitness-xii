import {getAuth,isAuthConfigured} from "./auth.js";
import {parseEditorAdminUserIds} from "./editor-auth-policy.js";
import {createEditorAuthorizer} from "./editor-authorizer.js";
import {getFreshEditorAuthSession,resolveEditorSession} from "./editor-session.js";
export {resolveEditorAuthorization} from "./editor-auth-policy.js";
export {createEditorAuthorizer} from "./editor-authorizer.js";
export {getFreshEditorAuthSession,resolveEditorSession} from "./editor-session.js";

export function getEditorSession(){
 return resolveEditorSession({
  authConfigured:isAuthConfigured(),
  getSession:()=>getFreshEditorAuthSession(getAuth()),
  adminUserIds:parseEditorAdminUserIds(process.env.EDITOR_ADMIN_USER_IDS),
 });
}

export const authorizeEditor=createEditorAuthorizer({
 isAuthConfigured,
 getAuth,
 getAdminUserIds:()=>parseEditorAdminUserIds(process.env.EDITOR_ADMIN_USER_IDS),
});
