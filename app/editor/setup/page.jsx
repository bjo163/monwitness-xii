'use client';

import { useState } from 'react';

async function postAuth(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || 'The request could not be completed.');
  return payload;
}

export default function EditorAccountSetup() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState('verify');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function run(event, action) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch {
      setMessage('We could not complete that step. Check the code and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sendVerification(event) {
    await run(event, async () => {
      await postAuth('email-otp/send-verification-otp', { email, type: 'email-verification' });
      setMessage('Verification code sent. Check your email.');
    });
  }

  async function verifyEmail(event) {
    await run(event, async () => {
      await postAuth('email-otp/verify-email', { email, otp: code.trim() });
      setCode('');
      setStage('reset');
      setMessage('Email verified. Request a password setup code next.');
    });
  }

  async function sendPasswordCode(event) {
    await run(event, async () => {
      await postAuth('email-otp/request-password-reset', { email });
      setStage('password');
      setMessage('Password setup code sent. Check your email.');
    });
  }

  async function setNewPassword(event) {
    await run(event, async () => {
      if (password.length < 12) throw new Error('Use at least 12 characters.');
      if (password !== confirmPassword) throw new Error('Passwords do not match.');
      await postAuth('email-otp/reset-password', { email, otp: code.trim(), password });
      setPassword('');
      setConfirmPassword('');
      setCode('');
      setStage('done');
      setMessage('Password set. You can now sign in.');
    });
  }

  return <main className="editorAuth">
    <a className="editorHome" href="/">← MOONWITNESS XII</a>
    <section className="editorLoginCard">
      <p className="kicker">OWNER ACCOUNT SETUP</p>
      <h1>VERIFY<br/><span>ACCESS</span></h1>
      <p>Verify your email, then set a password using one-time codes.</p>
      <aside className="note" role="note">Password is sent directly to Neon Auth over this local page and is not saved by the app.</aside>
      {stage !== 'done' && <label>Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy || stage !== 'verify'} /></label>}
      {stage === 'verify' && <>
        <form onSubmit={sendVerification}><button className="button" disabled={busy || !email}>{busy ? 'SENDING…' : 'SEND VERIFICATION CODE'}</button></form>
        <form onSubmit={verifyEmail}><label>Verification code<input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} /></label><button className="button" disabled={busy || !email || !code}>{busy ? 'CHECKING…' : 'VERIFY EMAIL'}</button></form>
      </>}
      {stage === 'reset' && <form onSubmit={sendPasswordCode}><button className="button" disabled={busy}>{busy ? 'SENDING…' : 'SEND PASSWORD CODE'}</button></form>}
      {stage === 'password' && <form onSubmit={setNewPassword}>
        <label>Password code<input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} /></label>
        <label>New password<input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label>Confirm password<input required type="password" minLength={12} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
        <button className="button" disabled={busy || !code || !password || !confirmPassword}>{busy ? 'SETTING PASSWORD…' : 'SET PASSWORD'}</button>
      </form>}
      {message && <p className="authMessage" role="status">{message}</p>}
      {stage === 'done' && <a className="button" href="/editor/login">GO TO SIGN IN ↗</a>}
      <p><a href="/editor/login">Back to sign in</a></p>
    </section>
  </main>;
}
