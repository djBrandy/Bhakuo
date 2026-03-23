import { useState } from 'react'
import { supabase } from '../services/supabase'
import { Eye, EyeOff } from 'lucide-react'

interface AuthProps {
  onSuccess: () => void
}

type AuthView = 'login' | 'signup' | 'forgot'

const Auth = ({ onSuccess }: AuthProps) => {
  const [view, setView] = useState<AuthView>('login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const reset = (v: AuthView) => { setView(v); setError(null); setInfo(null) }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
    // on success the page redirects — no further action needed
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?reset=true`
        })
        if (error) throw error
        setInfo('Password reset email sent! Check your inbox.')
        setLoading(false)
        return
      }

      if (view === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError

        if (data.user) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) throw signInError

          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              full_name: fullName,
              role: 'learner',
              created_at: new Date().toISOString()
            }])

          if (profileError) throw profileError
          onSuccess()
        } else {
          setInfo('Check your email for the confirmation link!')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page centered">
      <div className="auth-container card">

        <h1>
          {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Join Alexander' : 'Reset Password'}
        </h1>
        <p>
          {view === 'login' ? 'Log in to continue your journey.'
            : view === 'signup' ? 'Create your account to start learning.'
            : 'Enter your email and we\'ll send you a reset link.'}
        </p>

        {/* Google button — not shown on forgot password */}
        {view !== 'forgot' && (
          <>
            <button
              className="google-btn"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.5z" fill="#4285F4"/>
                <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.6v6.2C6.6 42.8 14.7 48 24 48z" fill="#34A853"/>
                <path d="M10.8 28.8A14.8 14.8 0 0 1 10 24c0-1.7.3-3.3.8-4.8v-6.2H2.6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8.2-6z" fill="#FBBC05"/>
                <path d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.5 30.4 0 24 0 14.7 0 6.6 5.2 2.6 13.2l8.2 6.2C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting…' : `${view === 'signup' ? 'Sign up' : 'Sign in'} with Google`}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {view === 'signup' && (
            <div className="input-group">
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {view !== 'forgot' && (
            <div className="input-group password-group">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {view === 'login' && (
            <button
              type="button"
              className="forgot-link"
              onClick={() => reset('forgot')}
            >
              Forgot password?
            </button>
          )}

          {error && <p className="error-text">{error}</p>}
          {info  && <p className="info-text">{info}</p>}

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Processing…'
              : view === 'signup' ? 'Create Account'
              : view === 'forgot' ? 'Send Reset Link'
              : 'Log In'}
          </button>
        </form>

        {view === 'forgot' ? (
          <p className="toggle-auth">
            Remember it?
            <button onClick={() => reset('login')}>Back to Log In</button>
          </p>
        ) : (
          <p className="toggle-auth">
            {view === 'signup' ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => reset(view === 'signup' ? 'login' : 'signup')}>
              {view === 'signup' ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        )}

      </div>
    </div>
  )
}

export default Auth
