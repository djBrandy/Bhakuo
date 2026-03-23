import { useState } from 'react'
import { supabase } from '../services/supabase'

interface AuthProps {
  onSuccess: () => void
}

const Auth = ({ onSuccess }: AuthProps) => {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
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
          alert('Check your email for the confirmation link!')
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
        <h1>{isSignUp ? 'Join Alexander' : 'Welcome Back'}</h1>
        <p>{isSignUp ? 'Create your account to start learning.' : 'Log in to continue your journey.'}</p>

        <form onSubmit={handleAuth} className="auth-form">
          {isSignUp && (
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
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Log In')}
          </button>
        </form>

        <p className="toggle-auth">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null) }}>
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Auth
