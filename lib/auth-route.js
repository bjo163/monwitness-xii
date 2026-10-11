import { getAuthRouteMethods, isAuthMethodAllowed } from "./auth-policy.js";

export function createAuthRouteHandlers({ getAuth, isAuthConfigured }) {
  async function dispatch(method, request, context) {
    const path = (await context?.params)?.path;
    const authPath = Array.isArray(path) ? path.join("/") : "";
    const allowedMethods = getAuthRouteMethods(authPath);
    if (!allowedMethods) {
      return Response.json({ error: "Authentication route unavailable" }, { status: 404 });
    }
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { Allow: allowedMethods.join(", ") } });
    }
    if (!isAuthMethodAllowed(method) || !allowedMethods.includes(method)) {
      return Response.json({ error: "Authentication method unavailable" }, {
        status: 405,
        headers: { Allow: allowedMethods.join(", ") },
      });
    }
    if (!isAuthConfigured()) {
      return Response.json({ error: "Authentication is not configured" }, { status: 503 });
    }
    try {
      return await getAuth().handler()[method](request, context);
    } catch {
      return Response.json({ error: "Authentication service unavailable" }, { status: 503 });
    }
  }

  return {
    GET: (request, context) => dispatch("GET", request, context),
    POST: (request, context) => dispatch("POST", request, context),
    PUT: (request, context) => dispatch("PUT", request, context),
    PATCH: (request, context) => dispatch("PATCH", request, context),
    DELETE: (request, context) => dispatch("DELETE", request, context),
    HEAD: (request, context) => dispatch("HEAD", request, context),
    OPTIONS: (request, context) => dispatch("OPTIONS", request, context),
  };
}
