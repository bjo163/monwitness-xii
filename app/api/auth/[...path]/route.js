import {getAuth,isAuthConfigured} from "../../../../lib/auth.js";
import {isAuthMethodAllowed,isAuthPathAllowed} from "../../../../lib/auth-policy.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function dispatch(method,request,context){
 if(!isAuthMethodAllowed(method))return Response.json({error:"Authentication method unavailable"},{status:405,headers:{Allow:"GET, POST"}});
 if(!isAuthConfigured())return Response.json({error:"Authentication is not configured"},{status:503});
 const path=(await context?.params)?.path;
 const authPath=Array.isArray(path)?path.join("/"):"";
 if(!isAuthPathAllowed(authPath))return Response.json({error:"Authentication route unavailable"},{status:404});
 try{return await getAuth().handler()[method](request,context)}
 catch{return Response.json({error:"Authentication service unavailable"},{status:503});}
}

export const GET=(request,context)=>dispatch("GET",request,context);
export const POST=(request,context)=>dispatch("POST",request,context);
export const PUT=(request,context)=>dispatch("PUT",request,context);
export const DELETE=(request,context)=>dispatch("DELETE",request,context);
export const PATCH=(request,context)=>dispatch("PATCH",request,context);
