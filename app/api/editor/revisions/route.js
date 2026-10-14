import { neon } from "@neondatabase/serverless";
import { authorizeEditor } from "../../../../lib/editor-auth.js";
import { getApplicationDatabaseUrl } from "../../../../lib/database-target.js";
import { reserveEditorWrite } from "../../../../lib/editor-write-limit.js";
import { isEditorWriteFrozen } from "../../../../lib/editor-write-freeze.js";
import { createEditorRevisionHandler } from "../../../../lib/editor-write-handlers.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createEditorRevisionHandler({
  authorizeEditor,
  isWriteFrozen: isEditorWriteFrozen,
  reserveEditorWrite,
  getSql: () => neon(getApplicationDatabaseUrl()),
});
