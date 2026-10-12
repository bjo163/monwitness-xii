export function parseEditorAdminUserIds(value=""){
 return new Set(value.split(",").map(id=>id.trim()).filter(Boolean));
}

export function isEditorAdmin(user,adminUserIds){
 const id=typeof user?.id==="string"?user.id.trim():"";
 return Boolean(id&&id.length<=255&&user.role==="admin"&&user.emailVerified===true&&adminUserIds.has(id));
}

export function isSameOriginEditorRequest({origin,expectedOrigin,fetchSite=null}){
 return Boolean(origin&&origin===expectedOrigin&&(fetchSite===null||fetchSite==="same-origin"));
}

export function resolveEditorAuthorization({authConfigured,session,origin,expectedOrigin,fetchSite=null,adminUserIds=new Set()}){
 if(!authConfigured)return {ok:false,status:503,message:"Editor authentication is not configured"};
 if(!session?.user)return {ok:false,status:401,message:"Sign in required"};
 if(!isEditorAdmin(session.user,adminUserIds))return {ok:false,status:403,message:"Editor administrator access is not assigned"};
 if(!isSameOriginEditorRequest({origin,expectedOrigin,fetchSite}))return {ok:false,status:403,message:"Cross-origin write rejected"};
 const id=typeof session.user.id==="string"?session.user.id.trim():"";
 return {ok:true,user:{id,name:typeof session.user.name==="string"?session.user.name.slice(0,160):null}};
}
