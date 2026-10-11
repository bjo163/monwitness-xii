const ALLOWED_AUTH_PATHS=new Set([
 "get-session",
 "sign-in/email",
 "sign-out",
 "token",
]);

export function isAuthPathAllowed(path){
 return typeof path==="string"&&ALLOWED_AUTH_PATHS.has(path);
}
