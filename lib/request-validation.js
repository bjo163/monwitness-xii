export const validSlug = v => typeof v === "string" && /^[a-z0-9-]{3,120}$/.test(v);
export const validBody = v => typeof v === "string" && v.trim().length > 0 && v.length <= 250000;
export function validateDraft(x) {
 if (!x || typeof x !== "object" || Array.isArray(x)) return false;
 return validSlug(x.slug) && typeof x.title === "string" && x.title.trim().length > 0 &&
 x.title.length <= 250 && validBody(x.body) &&
 (x.season === undefined || (typeof x.season === "string" && x.season.length <= 150)) &&
 (x.synopsis === undefined || (typeof x.synopsis === "string" && x.synopsis.length <= 2000));
}
export function validateRevision(x) {
 return !!x && typeof x==="object" && !Array.isArray(x) && validSlug(x.slug) &&
 validBody(x.body) && (x.notes === undefined || (typeof x.notes==="string" && x.notes.length<=2000));
}
