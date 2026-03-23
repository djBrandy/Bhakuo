import { useState, useEffect } from 'react'
import type { Page, Profile } from '../types'
import { Key, User, AlertTriangle, Plus, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { supabase } from '../services/supabase'

interface SettingsProps {
  profile: Profile | null
  onRefresh: () => void
  onNavigate: (page: Page) => void
}

const MAX_KEYS = 5

// groq_api_key stores either a plain string (legacy) or JSON array string
const parseKeys = (raw: string | null): string[] => {
  if (!raw) return ['']
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.length ? parsed : ['']
    return [raw]
  } catch {
    return [raw]
  }
}

const Settings = ({ profile, onRefresh }: SettingsProps) => {
  const [keys, setKeys] = useState<string[]>([''])
  const [displayName, setDisplayName] = useState('')
  const [showKeys, setShowKeys] = useState<boolean[]>([false])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      const parsed = parseKeys(profile.groq_api_key)
      setKeys(parsed)
      setShowKeys(parsed.map(() => false))
      setDisplayName(profile.full_name ?? '')
    }
  }, [profile])

  const updateKey = (i: number, val: string) => {
    setKeys(prev => prev.map((k, idx) => idx === i ? val : k))
  }

  const addKey = () => {
    if (keys.length >= MAX_KEYS) return
    setKeys(prev => [...prev, ''])
    setShowKeys(prev => [...prev, false])
  }

  const removeKey = (i: number) => {
    if (keys.length === 1) { setKeys(['']); return }
    setKeys(prev => prev.filter((_, idx) => idx !== i))
    setShowKeys(prev => prev.filter((_, idx) => idx !== i))
  }

  const toggleShow = (i: number) => {
    setShowKeys(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

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
        .update({
          groq_api_key: keyValue,
          full_name: displayName.trim() || null
        })
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

  return (
    <div className="settings-page">

      {/* Profile Section */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <User size={18} />
          </div>
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
            {profile?.role === 'mentor' ? '🎓 Mentor' :
             profile?.role === 'pending_mentor' ? '⏳ Pending Mentor' :
             '📚 Learner'}
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

      {/* API Keys Section */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon accent">
            <Key size={18} />
          </div>
          <div>
            <h2 className="settings-card-title">Groq API Keys</h2>
            <p className="settings-card-sub">Powers Alexander, your AI tutor</p>
          </div>
        </div>

        {/* Why do I need this? */}
        <div className="settings-why-box">
          <p className="settings-why-title">Why do I need a Groq API key?</p>
          <p className="settings-why-body">
            Alexander — the AI that teaches you Kitaveta — runs on a language model hosted by
            <strong> Groq</strong>. To use it, you need your own free API key. This keeps the
            platform free for everyone: you bring your own key, and Groq handles the AI.
            Your key is stored securely in your profile and never shared.
          </p>
        </div>

        {/* Step-by-step guide */}
        <div className="settings-guide">
          <p className="settings-guide-title">How to get your free Groq API key — step by step:</p>
          <ol className="settings-steps">
            <li>
              <span className="step-num">1</span>
              <span>Open your browser and go to <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="settings-link">console.groq.com</a></span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>Click <strong>"Sign Up"</strong> (top right). You can sign up with Google or your email — it's completely free.</span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>Once you're logged in, look at the left sidebar and click <strong>"API Keys"</strong>.</span>
            </li>
            <li>
              <span className="step-num">4</span>
              <span>Click the <strong>"Create API Key"</strong> button. Give it any name you like (e.g. "Alexander").</span>
            </li>
            <li>
              <span className="step-num">5</span>
              <span>A long key starting with <strong>gsk_</strong> will appear. <strong>Copy it immediately</strong> — Groq only shows it once.</span>
            </li>
            <li>
              <span className="step-num">6</span>
              <span>Paste it into the field below and click <strong>"Save Changes"</strong>. You're done! 🎉</span>
            </li>
          </ol>
        </div>

        {/* Key inputs */}
        <div className="settings-keys-list">
          {keys.map((k, i) => (
            <div key={i} className="settings-key-row">
              <div className="settings-key-input-wrap">
                <input
                  className="settings-input mono"
                  type={showKeys[i] ? 'text' : 'password'}
                  value={k}
                  onChange={e => updateKey(i, e.target.value)}
                  placeholder="gsk_…"
                />
                <button className="settings-key-toggle" onClick={() => toggleShow(i)} type="button">
                  {showKeys[i] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button className="settings-key-remove" onClick={() => removeKey(i)} type="button" title="Remove key">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {keys.length < MAX_KEYS && (
          <button className="settings-add-key-btn" onClick={addKey} type="button">
            <Plus size={15} /> Add another key ({keys.length}/{MAX_KEYS})
          </button>
        )}

        <p className="settings-keys-note">
          You can add up to {MAX_KEYS} keys. Alexander will use the first valid one.
          Useful if you share this account or rotate keys.
        </p>
      </section>

      {/* Save */}
      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? 'Saving…' : saved ? <><CheckCircle size={16} /> Saved!</> : 'Save Changes'}
      </button>
    </div>
  )
}

export default Settings
