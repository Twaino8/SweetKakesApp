import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function SignIn() {
  const [email, setEmail] = useState('creativecoupledesigns@gmail.com')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!navigator.onLine) {
      setError('Connect to the internet to sign in the first time. After that the app works offline.')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'That email and password don’t match.' : error.message)
  }

  return (
    <div className="signin">
      <form className="signin-card" onSubmit={submit}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Sweet Kakes n Treats" style={{ width: 200, height: 200, alignSelf: 'center' }} />
        <h1 className="title">Welcome back</h1>
        <div className="field" style={{ textAlign: 'left' }}>
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field" style={{ textAlign: 'left' }}>
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-big btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

/** Shown once after the first sign-in with the temporary password. */
export function SetPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return setError('Use at least 8 characters.')
    if (pw !== pw2) return setError('The two passwords don’t match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw, data: { must_change_password: false } })
    setBusy(false)
    if (error) return setError(error.message)
    onDone()
  }

  return (
    <div className="signin">
      <form className="signin-card" onSubmit={submit}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" style={{ width: 140, height: 140, alignSelf: 'center' }} />
        <h1 className="title">Choose your password</h1>
        <p className="muted">Replace the temporary password with one only you know.</p>
        <div className="field" style={{ textAlign: 'left' }}>
          <label htmlFor="pw">New password</label>
          <input id="pw" className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="field" style={{ textAlign: 'left' }}>
          <label htmlFor="pw2">Type it again</label>
          <input id="pw2" className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-big btn-block" disabled={busy}>
          Save password
        </button>
      </form>
    </div>
  )
}
