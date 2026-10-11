import {getAuth,isAuthConfigured} from "./auth.js";
import {resolveEditorAuthorization} from "./editor-auth-policy.js";
export {resolveEditorAuthorization} from "./editor-auth-policy.js";

export async function getEditorSession(){
 if(!isAuthConfigured())return {ok:false,status:503,message:"Editor authentication is not configured"};
 try{
  const {data,error}=await getAuth().getSession();
  if(error)return {ok:false,status:503,message:"Authentication service unavailable"};
  return {ok:true,session:data??null};
 }catch{return {ok:false,status:503,message:"Authentication service unavailable"};}
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
 });
 return result;
}
