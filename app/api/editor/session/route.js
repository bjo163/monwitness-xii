import {getEditorSession} from "../../../../lib/editor-auth.js";
import {createEditorSessionResponse} from "../../../../lib/editor-session-response.js";

export const dynamic="force-dynamic";
export const runtime="nodejs";

export async function GET(){
 return createEditorSessionResponse(await getEditorSession());
}
