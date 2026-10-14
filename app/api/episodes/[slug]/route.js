import { getDatabase } from "../../../../db/client";
import { stories } from "../../../../db/schema";
import { createPublicEpisodeRouteHandler } from "../../../../lib/public-archive-route.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createPublicEpisodeRouteHandler({ getDatabase, stories });
