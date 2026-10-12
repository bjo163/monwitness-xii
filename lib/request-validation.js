const draftFields = new Set(["slug", "title", "body", "season", "synopsis"]);
const revisionFields = new Set(["slug", "body", "notes"]);

export const validSlug = (value) => typeof value === "string" && /^[a-z0-9-]{3,120}$/.test(value);
export const validBody = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 250000;

function hasOnlyFields(value, allowedFields) {
  return Object.keys(value).every((field) => allowedFields.has(field));
}

export function validateDraft(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !hasOnlyFields(value, draftFields)) return false;
  return validSlug(value.slug) && typeof value.title === "string" && value.title.trim().length > 0 &&
    value.title.length <= 250 && validBody(value.body) &&
    (value.season === undefined || (typeof value.season === "string" && value.season.length <= 150)) &&
    (value.synopsis === undefined || (typeof value.synopsis === "string" && value.synopsis.length <= 2000));
}

export function validateRevision(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && hasOnlyFields(value, revisionFields) &&
    validSlug(value.slug) && validBody(value.body) &&
    (value.notes === undefined || (typeof value.notes === "string" && value.notes.length <= 2000));
}