import {getAuth,isAuthConfigured} from "../../../../lib/auth.js";
import {createAuthRouteHandlers} from "../../../../lib/auth-route.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const handlers=createAuthRouteHandlers({getAuth,isAuthConfigured});
export const {GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS}=handlers;
