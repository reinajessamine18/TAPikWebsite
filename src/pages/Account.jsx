import { useState } from 'react'
import { authenticateUser, registerUser } from '../lib/storage'

export default function Account({ onSuccess, onCancel, modal = false, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    setError('')
    try {
      const user = mode === 'login'
        ? authenticateUser(email, password)
        : registerUser({ name, email, password })
      onSuccess(user)
    } catch (err) {
      setError(err.message)
    }
  }

  const form = (
    <section className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-950/80 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-300">TAPik account</p>
          <h1 className="mt-2 text-2xl font-black">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-blue-100">Sign in to save your cart and follow your orders.</p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/25 px-3 py-1 text-sm hover:bg-white/10">
            Close
          </button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <label className="block text-sm font-semibold">
            Name
            <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Email
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input required minLength={6} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-white placeholder:text-blue-200" />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-rose-300">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-yellow-300">
          {mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-blue-100">
        {mode === 'login' ? 'New to TAPik?' : 'Already have an account?'}{' '}
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="font-bold text-yellow-300 underline underline-offset-2">
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </button>
      </p>
      <div className="mt-5 rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-3 text-xs text-yellow-100">
        Demo admin: admin@tapikco.com / TapikAdmin2026!
      </div>
    </section>
  )

  return modal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Sign in to TAPik">
      {form}
    </div>
  ) : (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-10">{form}</div>
  )
}