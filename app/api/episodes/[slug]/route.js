import { getDatabase } from "../../../../db/client";
import { stories } from "../../../../db/schema";
import { and, eq } from "drizzle-orm";
import { createPublicEpisodeResponse } from "../../../../lib/public-archive-response.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { slug } = await context.params;
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }
  try {
    const db = getDatabase();
    const [episode] = await db.select({
      slug: stories.slug, title: stories.title, season: stories.season,
      synopsis: stories.synopsis, experienceType: stories.experienceType,
    }).from(stories).where(and(eq(stories.slug, slug), eq(stories.status, "published"))).limit(1);
    if (!episode) return Response.json({ error: "Not found" }, { status: 404 });
    return createPublicEpisodeResponse(episode);
  } catch {
    return Response.json({ error: "Archive unavailable" }, { status: 503 });
  }
}
