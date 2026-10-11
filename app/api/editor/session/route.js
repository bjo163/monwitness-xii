import {getEditorSession} from "../../../../lib/editor-auth.js";

export const dynamic="force-dynamic";
export const runtime="nodejs";

export async function GET(){
 const result=await getEditorSession();
 if(!result.ok)return Response.json({error:result.message},{status:result.status});
 if(!result.session?.user)return Response.json({authenticated:false},{status:401});
 return Response.json({authenticated:true,role:result.session.user.role??"user",canEdit:result.isEditorAdmin});
}
