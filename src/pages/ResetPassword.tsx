import { useState } from 'react'
import { supabase } from '../services/supabase'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

interface ResetPasswordProps {
  onDone?: () => void
}

const ResetPassword = ({ onDone }: ResetPasswordProps) => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="page auth-page centered">
        <div className="auth-container card" style={{ textAlign: 'center', gap: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CheckCircle size={48} color="var(--accent)" />
          <h1>Password Updated!</h1>
          <p style={{ color: 'var(--muted)' }}>Your password has been changed successfully.</p>
          <button className="primary-btn" onClick={() => {
            if (onDone) onDone()
            else window.location.href = '/'
          }}>
            Continue to Alexander
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page auth-page centered">
      <div className="auth-container card">
        <h1>Set New Password</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group password-group">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="button" className="password-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="input-group password-group">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            <button type="button" className="password-toggle" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
