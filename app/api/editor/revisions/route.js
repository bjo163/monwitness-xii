import { neon } from "@neondatabase/serverless";
import { authorizeEditor } from "../../../../lib/editor-auth.js";
import { reserveEditorWrite } from "../../../../lib/editor-write-limit.js";
import { createEditorRevisionHandler } from "../../../../lib/editor-write-handlers.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createEditorRevisionHandler({
  authorizeEditor,
  reserveEditorWrite,
  getSql: () => process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null,
});
