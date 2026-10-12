import {redirect} from 'next/navigation';
import {getEditorSession} from '../../lib/editor-auth.js';
import EditorSignOut from './sign-out.jsx';

export const dynamic='force-dynamic';
export const metadata={title:'Editor • MoonWitness XII'};

export default async function EditorPage(){
 const result=await getEditorSession();
 if(!result.ok||!result.session?.user)redirect('/editor/login');
 if(!result.isEditorAdmin)return <main className="editorAuth"><section className="editorLoginCard"><h1>NO EDITOR ACCESS</h1><p>This account is not on the server-side editor allowlist.</p><EditorSignOut/><a href="/">Return to MoonWitness XII</a></section></main>;
 return <main className="editorAuth"><section className="editorLoginCard"><p className="kicker">AUTHENTICATED ADMINISTRATOR</p><h1>EDITOR<br/><span>DESK</span></h1><p>Signed in as {result.session.user.name||result.session.user.email}. Access requires both the Neon Auth admin role and an owner-assigned server allowlist entry.</p><p className="note">The manuscript editing and publishing workflow is not enabled yet. Draft writes remain behind owner review and development database validation.</p><EditorSignOut/><a className="editorHome" href="/">← RETURN TO MOONWITNESS XII</a></section></main>
}
