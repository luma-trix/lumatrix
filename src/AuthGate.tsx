import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, MessageCircle, ShieldCheck, UserRound } from './icons'
import { LumaMark } from './Brand'
import RealtimeApp from './RealtimeApp'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './auth.css'

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null)
  const [recovery, setRecovery] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="auth-loading"><LumaMark className="auth-logo"/><LoaderCircle/></div>
  if (!isSupabaseConfigured) return <ConfigurationRequired />
  if (recovery && session) return <ResetPassword onComplete={()=>{setRecovery(false);setSession(null)}} />
  if (!session) return <AuthScreen />
  return <RealtimeApp session={session} />
}

function AuthScreen() {
  const [mode, setMode] = useState<'login'|'signup'|'forgot'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{type:'error'|'success'; text:string}|null>(null)
  const [canResend, setCanResend] = useState(false)

  function changeMode(next:'login'|'signup'|'forgot') { setMode(next); setMessage(null); setCanResend(false) }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(null); setCanResend(false)
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: {
          emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
          data: { display_name: name.trim(), username: name.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_') }
        }
      })
      if (error) setMessage({type:'error',text:error.message})
      else if (!data.session) { setMessage({type:'success',text:'Confirmation sent. Open the email from Luma and confirm your address before signing in.'}); setCanResend(true) }
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString() })
      if (error) setMessage({type:'error',text:error.message})
      else setMessage({type:'success',text:'Password-reset email sent. Open the secure link in that email to choose a new password.'})
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email:email.trim(), password })
      if (error) {
        setMessage({type:'error',text:error.message === 'Email not confirmed' ? 'Confirm your email address before signing in.' : error.message})
        if (error.message.toLowerCase().includes('confirm')) setCanResend(true)
      }
    }
    setBusy(false)
  }

  async function resendConfirmation() {
    if (!email.trim()) return
    setBusy(true)
    const { error } = await supabase.auth.resend({ type:'signup', email:email.trim(), options:{ emailRedirectTo:new URL(import.meta.env.BASE_URL, window.location.origin).toString() } })
    setMessage(error ? {type:'error',text:error.message} : {type:'success',text:'A new confirmation email has been sent.'})
    setBusy(false)
  }

  const title = mode==='login' ? 'Good to see you again' : mode==='signup' ? 'Create your account' : 'Reset your password'
  const subtitle = mode==='login' ? 'Sign in to continue your conversations.' : mode==='signup' ? 'Confirm your email to activate your Luma account.' : 'Enter your email and we’ll send a secure reset link.'

  return <main className="auth-page">
    <section className="auth-visual">
      <div className="auth-brand"><LumaMark/><strong>Luma</strong></div>
      <div className="visual-copy"><span className="auth-tag"><ShieldCheck/> Private by design</span><h1>One place for every<br/><em>conversation.</em></h1><p>Private conversations, shared Moments, communities and calls — woven into one beautiful space.</p><div className="floating-chat fc1"><span>AO</span><div><b>Amara</b><small>Are you free for a quick call?</small></div></div><div className="floating-chat fc2"><MessageCircle/><div><b>Design Crew</b><small>5 new messages</small></div></div></div>
      <p className="auth-foot">Free to use · Secure · Built for everyone</p>
    </section>
    <section className="auth-form-wrap">
      <form className="auth-form" onSubmit={submit}>
        <div className="mobile-auth-brand"><LumaMark/><strong>Luma</strong></div>
        {mode==='forgot'&&<button type="button" className="auth-back" onClick={()=>changeMode('login')}><ArrowLeft/> Back to sign in</button>}
        <p className="auth-kicker">{mode==='forgot'?'ACCOUNT RECOVERY':'WELCOME TO LUMA'}</p>
        <h2>{title}</h2>
        <p className="auth-sub">{subtitle}</p>
        {mode==='signup'&&<label><span>Display name</span><div className="auth-input"><UserRound/><input required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></div></label>}
        <label><span>Email address</span><div className="auth-input"><Mail/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></div></label>
        {mode!=='forgot'&&<label><span className="password-label">Password {mode==='login'&&<button type="button" onClick={()=>changeMode('forgot')}>Forgot password?</button>}</span><div className="auth-input"><LockKeyhole/><input required minLength={6} type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>}
        {message&&<div className={`auth-message ${message.type}`}>{message.text}</div>}
        {canResend&&<button type="button" className="resend-confirmation" disabled={busy} onClick={resendConfirmation}><Mail/> Resend confirmation email</button>}
        <button className="auth-submit" disabled={busy}>{busy?<><LoaderCircle className="spin"/> Please wait…</>:mode==='login'?'Sign in':mode==='signup'?'Create account':'Send reset link'}</button>
        {mode!=='forgot'&&<p className="auth-switch">{mode==='login'?"New to Luma?":"Already confirmed your account?"} <button type="button" onClick={()=>changeMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create an account':'Sign in'}</button></p>}
        <div className="secure-note"><ShieldCheck/> Your connection to Luma is encrypted.</div>
      </form>
    </section>
  </main>
}

function ResetPassword({onComplete}:{onComplete:()=>void}) {
  const [password,setPassword]=useState(''), [confirm,setConfirm]=useState(''), [show,setShow]=useState(false)
  const [busy,setBusy]=useState(false), [message,setMessage]=useState<{type:'error'|'success';text:string}|null>(null)
  async function update(e:React.FormEvent){e.preventDefault();if(password!==confirm){setMessage({type:'error',text:'The passwords do not match.'});return}setBusy(true);const {error}=await supabase.auth.updateUser({password});if(error){setMessage({type:'error',text:error.message});setBusy(false);return}setMessage({type:'success',text:'Password updated. You can now sign in with your new password.'});await supabase.auth.signOut();setBusy(false);setTimeout(onComplete,900)}
  return <main className="recovery-page"><form className="recovery-card" onSubmit={update}><LumaMark/><p>SECURE RECOVERY</p><h1>Choose a new password</h1><span>Use at least eight characters and avoid passwords used on other services.</span><label>New password<div className="auth-input"><KeyRound/><input required minLength={8} type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label><label>Confirm password<div className="auth-input"><LockKeyhole/><input required minLength={8} type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></div></label>{message&&<div className={`auth-message ${message.type}`}>{message.text}</div>}<button className="auth-submit" disabled={busy}>{busy?<><LoaderCircle className="spin"/>Updating…</>:'Update password'}</button></form></main>
}

function ConfigurationRequired(){return <main className="recovery-page"><div className="recovery-card"><LumaMark/><h1>Configuration required</h1><span>Add the Supabase project URL and publishable key before starting Luma.</span></div></main>}
