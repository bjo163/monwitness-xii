import {redirect} from 'next/navigation';
import {getEditorSession} from '../../lib/editor-auth.js';

export const dynamic='force-dynamic';
export const metadata={title:'Editor • MoonWitness XII'};

export default async function EditorPage(){
 const result=await getEditorSession();
 if(!result.ok||!result.session?.user)redirect('/editor/login');
 if(result.session.user.role!=='admin')return <main className="editorAuth"><section className="editorLoginCard"><h1>NO EDITOR ACCESS</h1><p>This account does not have the administrator role.</p><a href="/">Return to MoonWitness XII</a></section></main>;
 return <main className="editorAuth"><section className="editorLoginCard"><p className="kicker">AUTHENTICATED ADMINISTRATOR</p><h1>EDITOR<br/><span>DESK</span></h1><p>Signed in as {result.session.user.name||result.session.user.email}. Private write routes now check your Neon Auth session and admin role.</p><p className="note">The manuscript editing and publishing workflow is not enabled yet. Draft writes remain behind owner review and development database validation.</p><a className="editorHome" href="/">← RETURN TO MOONWITNESS XII</a></section></main>
}
