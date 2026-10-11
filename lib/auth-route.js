import { isAuthMethodAllowed, isAuthPathAllowed } from "./auth-policy.js";

export function createAuthRouteHandlers({ getAuth, isAuthConfigured }) {
  async function dispatch(method, request, context) {
    if (!isAuthMethodAllowed(method)) {
      return Response.json({ error: "Authentication method unavailable" }, { status: 405, headers: { Allow: "GET, POST" } });
    }
    const path = (await context?.params)?.path;
    const authPath = Array.isArray(path) ? path.join("/") : "";
    if (!isAuthPathAllowed(authPath)) {
      return Response.json({ error: "Authentication route unavailable" }, { status: 404 });
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
  };
}
