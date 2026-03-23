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
  const [userRole, setUserRole] = useState<'learner' | 'mentor'>('learner')
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        
        // Create a profile for the new user with selected role
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              full_name: fullName,
              role: userRole,
              created_at: new Date().toISOString()
            }])
          
          if (profileError) throw profileError
        }
        
        alert('Check your email for the confirmation link!')
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
        <p>{isSignUp ? 'Choose your role to get started.' : 'Log in to continue your journey.'}</p>
        
        <form onSubmit={handleAuth} className="auth-form">
          {isSignUp && (
            <>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Full name" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              
              <div className="role-selector">
                <label className={`role-option ${userRole === 'learner' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="learner" 
                    checked={userRole === 'learner'}
                    onChange={(e) => setUserRole(e.target.value as 'learner' | 'mentor')}
                  />
                  <div className="role-content">
                    <span className="role-title">📚 Learner</span>
                    <span className="role-desc">Learn Kitaveta with AI guidance</span>
                  </div>
                </label>
                
                <label className={`role-option ${userRole === 'mentor' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="mentor" 
                    checked={userRole === 'mentor'}
                    onChange={(e) => setUserRole(e.target.value as 'learner' | 'mentor')}
                  />
                  <div className="role-content">
                    <span className="role-title">👨‍🏫 Mentor</span>
                    <span className="role-desc">Contribute native knowledge</span>
                  </div>
                </label>
              </div>
            </>
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
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }}>
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Auth
