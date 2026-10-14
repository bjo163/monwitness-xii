'use client';
import {useState} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
import {getEditorLoginAccessDecision} from '../../../lib/editor-login-feedback.js';

const authClient=createAuthClient();

export default function EditorLogin(){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 async function submit(event){
  event.preventDefault();
  setBusy(true);setMessage('');
  try{
   const {error}=await authClient.signIn.email({email,password});
   if(error){setMessage('Sign in failed. Check your credentials or contact the project owner.');return}
   const session=await fetch('/api/editor/session',{cache:'no-store'});
   const data=session.status===200?await session.json():null;
   const access=getEditorLoginAccessDecision({status:session.status,role:data?.role,emailVerified:data?.emailVerified,canEdit:data?.canEdit});
   if(!access.authorized){await authClient.signOut();setMessage(access.message);return}
   window.location.assign('/editor');
  }catch{setMessage('The authentication service is not available right now. Please try again later.')}
  finally{setBusy(false)}
 }
 return <main className="editorAuth"><a className="editorHome" href="/">← MOONWITNESS XII</a><section className="editorLoginCard"><p className="kicker">PRIVATE CREW ACCESS</p><h1>EDITOR<br/><span>GATE</span></h1><p>Sign in with an account the project owner has provisioned.</p><aside className="note" role="note">Editor access requires a verified email, the Neon Auth administrator role, and a matching user ID in the server-side editor allowlist.</aside><form onSubmit={submit}><label>Email<input required type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="button" disabled={busy}>{busy?'CHECKING…':'SIGN IN ↗'}</button>{message&&<p className="authMessage" role="alert">{message}</p>}</form><p><a href="/editor/setup">Verify email or set your password</a></p><small>Accounts are provisioned by the project owner. Public sign-up is disabled.</small></section></main>
}
