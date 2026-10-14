'use client';

import {useState} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
import {EDITOR_SIGN_OUT_ERROR_MESSAGE,signOutEditor} from '../../lib/editor-sign-out.js';

const authClient=createAuthClient();

export default function EditorSignOut(){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 async function submit(){
  setBusy(true);
  setMessage('');
  const result=await signOutEditor({
   signOut:()=>authClient.signOut(),
   redirect:path=>window.location.assign(path),
  });
  if(!result.ok){
   setMessage(result.message||EDITOR_SIGN_OUT_ERROR_MESSAGE);
   setBusy(false);
  }
 }

 return <div className="editorSignOut"><button className="button" type="button" onClick={submit} disabled={busy}>{busy?'SIGNING OUT…':'SIGN OUT'}</button>{message&&<p className="authMessage" role="alert">{message}</p>}</div>;
}
