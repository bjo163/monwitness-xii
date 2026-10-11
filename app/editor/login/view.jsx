'use client';
import {useState} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';

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
   if(!session.ok){await authClient.signOut();setMessage('This account does not have editor access.');return}
   const data=await session.json();
   if(data.role!=='admin'){await authClient.signOut();setMessage('This account does not have editor access.');return}
   window.location.assign('/editor');
  }catch{setMessage('The authentication service is not available right now. Please try again later.')}
  finally{setBusy(false)}
 }
 return <main className="editorAuth"><a className="editorHome" href="/">← MOONWITNESS XII</a><section className="editorLoginCard"><p className="kicker">PRIVATE CREW ACCESS</p><h1>EDITOR<br/><span>GATE</span></h1><p>Sign in with an account the project owner has provisioned and assigned the administrator role.</p><form onSubmit={submit}><label>Email<input required type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="button" disabled={busy}>{busy?'CHECKING…':'SIGN IN ↗'}</button>{message&&<p className="authMessage" role="alert">{message}</p>}</form><small>Account creation is disabled here. Access is assigned by the project owner.</small></section></main>
}
