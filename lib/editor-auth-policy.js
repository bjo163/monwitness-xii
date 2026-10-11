export function parseEditorAdminUserIds(value=""){
 return new Set(value.split(",").map(id=>id.trim()).filter(Boolean));
}

export function isEditorAdmin(user,adminUserIds){
 const id=typeof user?.id==="string"?user.id.trim():"";
 return Boolean(id&&id.length<=255&&user.role==="admin"&&adminUserIds.has(id));
}

export function resolveEditorAuthorization({authConfigured,session,origin,expectedOrigin,fetchSite,adminUserIds=new Set()}){
 if(!authConfigured)return {ok:false,status:503,message:"Editor authentication is not configured"};
 if(!session?.user)return {ok:false,status:401,message:"Sign in required"};
 if(!isEditorAdmin(session.user,adminUserIds))return {ok:false,status:403,message:"Editor administrator access is not assigned"};
 if(!origin||origin!==expectedOrigin||fetchSite==="cross-site")return {ok:false,status:403,message:"Cross-origin write rejected"};
 const id=typeof session.user.id==="string"?session.user.id.trim():"";
 return {ok:true,user:{id,name:typeof session.user.name==="string"?session.user.name.slice(0,160):null}};
}
