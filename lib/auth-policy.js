const AUTH_ROUTE_METHODS = new Map([
  ["get-session", ["GET"]],
  ["sign-in/email", ["POST"]],
  ["sign-out", ["POST"]],
  ["token", ["GET"]],
]);

export function getAuthRouteMethods(path) {
  return typeof path === "string" ? AUTH_ROUTE_METHODS.get(path) ?? null : null;
}

export function isAuthPathAllowed(path){
 return getAuthRouteMethods(path) !== null;
}

const ALLOWED_AUTH_METHODS=new Set(["GET","POST"]);
export function isAuthMethodAllowed(method){
 return typeof method==="string"&&ALLOWED_AUTH_METHODS.has(method.toUpperCase());
}

export function isAuthRequestAllowed(path, method) {
  const methods = getAuthRouteMethods(path);
  return Boolean(methods && typeof method === "string" && methods.includes(method.toUpperCase()));
}
