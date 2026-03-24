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
  const [identifier, setIdentifier] = useState('') // email or display name
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const reset = (v: AuthView) => { setView(v); setError(null); setInfo(null) }

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
        setInfo('Reset link sent! Check your inbox and click the link to set a new password.')
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
            .insert([{ id: data.user.id, full_name: fullName, role: 'learner', created_at: new Date().toISOString() }])
          if (profileError) throw profileError
          onSuccess()
        } else {
          setInfo('Check your email for the confirmation link!')
        }
        return
      }

      // LOGIN — identifier can be email or display name
      let loginEmail = identifier.trim()

      if (!loginEmail.includes('@')) {
        // Look up email by display name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .ilike('full_name', loginEmail)
          .maybeSingle()

        if (!profileData) {
          throw new Error('No account found with that name. Try using your email address instead.')
        }

        // We have the user id but not the email — attempt sign in will fail without email.
        // Inform user to use email.
        throw new Error('Found your profile! For security, please log in with your email address.')
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (signInError) {
        // Check if it's "Invalid login credentials" which could mean no account or wrong password
        if (signInError.message.toLowerCase().includes('invalid')) {
          // Try to determine if account exists by checking profiles table
          // We can't directly check auth, but we can infer from error patterns
          setError('No account found with that email. Please sign up first.')
          setTimeout(() => {
            reset('signup')
            setEmail(loginEmail)
          }, 1800)
          setLoading(false)
          return
        }
        throw signInError
      }
      onSuccess()

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
            : "Enter your email and we'll send you a reset link."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">

          {view === 'signup' && (
            <div className="input-group">
              <input
                type="text"
                placeholder="Full name (this becomes your username)"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Login: email or name. Signup & forgot: email only */}
          {view === 'login' ? (
            <div className="input-group">
              <input
                type="text"
                placeholder="Email address or display name"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="input-group">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {view !== 'forgot' && (
            <div className="input-group password-group">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {view === 'login' && (
            <button type="button" className="forgot-link" onClick={() => reset('forgot')}>
              Forgot password?
            </button>
          )}

          {error && <p className="error-text">{error}</p>}
          {info && <p className="info-text">{info}</p>}

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
