export function resolveEditorAuthorization({authConfigured,session,origin,expectedOrigin,fetchSite}){
 if(!authConfigured)return {ok:false,status:503,message:"Editor authentication is not configured"};
 if(!session?.user)return {ok:false,status:401,message:"Sign in required"};
 if(session.user.role!=="admin")return {ok:false,status:403,message:"Editor administrator role required"};
 if(!origin||origin!==expectedOrigin||fetchSite==="cross-site")return {ok:false,status:403,message:"Cross-origin write rejected"};
 const id=typeof session.user.id==="string"?session.user.id.trim():"";
 if(!id||id.length>255)return {ok:false,status:403,message:"Editor identity is invalid"};
 return {ok:true,user:{id,name:typeof session.user.name==="string"?session.user.name.slice(0,160):null}};
}
