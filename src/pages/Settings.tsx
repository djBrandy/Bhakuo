import { useState, useEffect } from 'react'
import type { Page, Profile } from '../types'
import { Key, User, AlertTriangle, Plus, Trash2, Eye, EyeOff, CheckCircle, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '../services/supabase'

// Groq keys are always "gsk_" + 52 base64url chars = 56 chars total
const isValidGroqKey = (k: string) => /^gsk_[A-Za-z0-9]{52}$/.test(k.trim())

// Import guide images
import g1 from '../assets/instructions-groq/1.jpeg'
import g2 from '../assets/instructions-groq/2.jpeg'
import g3 from '../assets/instructions-groq/3.jpeg'
import g4 from '../assets/instructions-groq/4.jpeg'
import g5 from '../assets/instructions-groq/5.jpeg'
import g6 from '../assets/instructions-groq/6.jpeg'
import g7 from '../assets/instructions-groq/7.jpeg'
import g8 from '../assets/instructions-groq/8.jpeg'
import g9 from '../assets/instructions-groq/9.jpeg'

const GUIDE_STEPS = [
  { img: g1, caption: 'Go to console.groq.com and click "Continue with Google".' },
  { img: g2, caption: 'Choose the Gmail account you want to use to sign in to Groq.' },
  { img: g3, caption: 'Once logged in, tap the three-line menu icon in the top-right corner.' },
  { img: g4, caption: 'From the menu, press "API Keys".' },
  { img: g5, caption: 'On the API Keys page, press "Create API Key".' },
  { img: g6, caption: 'Name it "Alexander", set expiration to "No expiration", then press Submit.' },
  { img: g7, caption: 'Your key appears — press Copy immediately. It will not be shown again.' },
  { img: g8, caption: 'Press Done, then close the Groq tab and come back to Alexander.' },
  { img: g9, caption: 'Paste your key in the field below (as shown), scroll down, and press Save.' },
]

interface SettingsProps {
  profile: Profile | null
  onRefresh: () => void
  onNavigate: (page: Page) => void
}

const MAX_KEYS = 5

const parseKeys = (raw: string | null): string[] => {
  if (!raw) return ['']
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.length ? parsed : ['']
    return [raw]
  } catch { return [raw] }
}

const Settings = ({ profile, onRefresh }: SettingsProps) => {
  const [keys, setKeys] = useState<string[]>([""])
  const [displayName, setDisplayName] = useState('')
  const [showKeys, setShowKeys] = useState<boolean[]>([false])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [guideStep, setGuideStep] = useState<number | null>(null)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (profile) {
      const parsed = parseKeys(profile.groq_api_key)
      setKeys(parsed)
      setShowKeys(parsed.map(() => false))
      setDisplayName(profile.full_name ?? '')
    }
  }, [profile])

  const updateKey = (i: number, val: string) => setKeys(prev => prev.map((k, idx) => idx === i ? val : k))
  const addKey = () => { if (keys.length >= MAX_KEYS) return; setKeys(prev => [...prev, '']); setShowKeys(prev => [...prev, false]) }
  const removeKey = (i: number) => {
    if (keys.length === 1) { setKeys(['']); return }
    setKeys(prev => prev.filter((_, idx) => idx !== i))
    setShowKeys(prev => prev.filter((_, idx) => idx !== i))
  }
  const toggleShow = (i: number) => setShowKeys(prev => prev.map((v, idx) => idx === i ? !v : v))

  const handleSave = async () => {
    if (!profile) return
    setLoading(true)
    setSaved(false)
    try {
      const cleanKeys = keys.map(k => k.trim()).filter(Boolean)
      const keyValue = cleanKeys.length === 0 ? null
        : cleanKeys.length === 1 ? cleanKeys[0]
        : JSON.stringify(cleanKeys)
      const { error } = await supabase
        .from('profiles')
        .update({ groq_api_key: keyValue, full_name: displayName.trim() || null })
        .eq('id', profile.id)
      if (error) throw error
      onRefresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    setPwMsg(null)
    if (!newPassword) return
    if (newPassword !== confirmPassword) { setPwMsg({ type: 'err', text: 'Passwords do not match.' }); return }
    if (newPassword.length < 6) { setPwMsg({ type: 'err', text: 'Password must be at least 6 characters.' }); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPwMsg({ type: 'err', text: error.message })
    else { setPwMsg({ type: 'ok', text: 'Password updated!' }); setNewPassword(''); setConfirmPassword('') }
    setPwLoading(false)
  }

  return (
    <div className="settings-page">

      {/* Profile */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon"><User size={18} /></div>
          <div>
            <h2 className="settings-card-title">Your Profile</h2>
            <p className="settings-card-sub">How Alexander knows you</p>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-label">Display Name</label>
          <input
            className="settings-input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">Role</label>
          <div className="settings-role-badge" data-role={profile?.role}>
            {profile?.role === 'mentor' ? '🎓 Mentor'
              : profile?.role === 'pending_mentor' ? '⏳ Pending Mentor'
              : '📚 Learner'}
          </div>
        </div>

        {profile?.role === 'pending_mentor' && (
          <div className="warning-box">
            <AlertTriangle size={16} />
            <span>Your mentor request is awaiting approval.</span>
          </div>
        )}

        {profile?.role === 'learner' && (
          <div className="settings-mentor-request">
            <p className="settings-keys-note">
              Know Kitaveta natively and want to contribute? Request mentor access — an existing mentor will review and approve you.
            </p>
            <button className="settings-request-btn" onClick={async () => {
              if (!profile) return
              const { error } = await supabase.from('profiles').update({ role: 'pending_mentor' }).eq('id', profile.id)
              if (!error) onRefresh()
              else alert(error.message)
            }}>
              Request Mentor Access
            </button>
          </div>
        )}
      </section>

      {/* Change Password */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon"><Lock size={18} /></div>
          <div>
            <h2 className="settings-card-title">Change Password</h2>
            <p className="settings-card-sub">Update your account password</p>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-label">New Password</label>
          <div className="settings-key-input-wrap">
            <input
              className="settings-input"
              type={showNewPw ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <button className="settings-key-toggle" type="button" onClick={() => setShowNewPw(p => !p)}>
              {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-label">Confirm Password</label>
          <div className="settings-key-input-wrap">
            <input
              className="settings-input"
              type={showConfirmPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
            <button className="settings-key-toggle" type="button" onClick={() => setShowConfirmPw(p => !p)}>
              {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {pwMsg && (
          <p className={pwMsg.type === 'ok' ? 'info-text' : 'error-text'}>{pwMsg.text}</p>
        )}

        <button className="settings-request-btn" onClick={handlePasswordChange} disabled={pwLoading}>
          {pwLoading ? 'Updating…' : 'Update Password'}
        </button>
      </section>

      {/* API Keys */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon accent"><Key size={18} /></div>
          <div>
            <h2 className="settings-card-title">Groq API Keys</h2>
            <p className="settings-card-sub">Powers Alexander, your AI tutor</p>
          </div>
        </div>

        <div className="settings-why-box">
          <p className="settings-why-title">Why do I need a Groq API key?</p>
          <p className="settings-why-body">
            Alexander — the AI that teaches you Kitaveta — runs on a language model hosted by
            <strong> Groq</strong>. To use it, you need your own free API key. This keeps the
            platform free for everyone: you bring your own key, and Groq handles the AI.
            Your key is stored securely in your profile and never shared.
          </p>
        </div>

        {/* Visual step-by-step guide */}
        <div className="settings-guide">
          <p className="settings-guide-title">How to get your free Groq API key — step by step:</p>
          <ol className="settings-steps">
            {GUIDE_STEPS.map((step, i) => (
              <li key={i}>
                <span className="step-num">{i + 1}</span>
                <div className="settings-guide-step">
                  <span>{step.caption}</span>
                  <button
                    className="settings-guide-img-toggle"
                    type="button"
                    onClick={() => setGuideStep(guideStep === i ? null : i)}
                  >
                    {guideStep === i ? 'Hide screenshot ▲' : 'Show screenshot ▼'}
                  </button>
                  {guideStep === i && (
                    <img
                      src={step.img}
                      alt={`Step ${i + 1}`}
                      className="settings-guide-img"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="settings-keys-list">
          {keys.map((k, i) => {
            const trimmed = k.trim()
            const valid = trimmed === '' ? null : isValidGroqKey(trimmed)
            return (
              <div key={i} className="settings-key-row">
                <div className="settings-key-input-wrap">
                  <input
                    className={`settings-input mono${valid === false ? ' key-invalid' : valid === true ? ' key-valid' : ''}`}
                    type={showKeys[i] ? 'text' : 'password'}
                    value={k}
                    onChange={e => updateKey(i, e.target.value)}
                    placeholder="gsk_…"
                  />
                  <button className="settings-key-toggle" onClick={() => toggleShow(i)} type="button">
                    {showKeys[i] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {valid === false && (
                  <span className="key-status-icon invalid"><AlertCircle size={16} /></span>
                )}
                {valid === true && (
                  <span className="key-status-icon valid"><CheckCircle size={16} /></span>
                )}
                <button className="settings-key-remove" onClick={() => removeKey(i)} type="button">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>

        {keys.length < MAX_KEYS && (
          <button className="settings-add-key-btn" onClick={addKey} type="button">
            <Plus size={15} /> Add another key ({keys.length}/{MAX_KEYS})
          </button>
        )}

        <p className="settings-keys-note">
          Up to {MAX_KEYS} keys. Alexander uses the first valid one.
        </p>
      </section>

      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? 'Saving…' : saved ? <><CheckCircle size={16} /> Saved!</> : 'Save Changes'}
      </button>
    </div>
  )
}

export default Settings
