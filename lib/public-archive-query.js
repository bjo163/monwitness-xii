import { and, desc, eq } from "drizzle-orm";

const editorialProjection = (stories) => ({
  slug: stories.slug,
  title: stories.title,
  season: stories.season,
  synopsis: stories.synopsis,
  experienceType: stories.experienceType,
});

export function listPublicEpisodes(db, stories) {
  return db
    .select(editorialProjection(stories))
    .from(stories)
    .where(eq(stories.status, "published"))
    .orderBy(desc(stories.createdAt))
    .limit(100);
}

export async function findPublicEpisode(db, stories, slug) {
  const [episode] = await db
    .select(editorialProjection(stories))
    .from(stories)
    .where(and(eq(stories.slug, slug), eq(stories.status, "published")))
    .limit(1);
  return episode ?? null;
}
