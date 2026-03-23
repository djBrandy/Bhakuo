import { useState, useEffect } from 'react'
import type { Page, Profile } from '../types'
import { Key, ShieldCheck, AlertTriangle } from 'lucide-react'
import { supabase } from '../services/supabase'

interface SettingsProps {
  profile: Profile | null
  onRefresh: () => void
  onNavigate: (page: Page) => void
}

const Settings = ({ profile, onRefresh, onNavigate }: SettingsProps) => {
  const [inputKey, setInputKey] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile?.groq_api_key) setInputKey(profile.groq_api_key)
  }, [profile])

  const handleSave = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ groq_api_key: inputKey })
        .eq('id', profile.id)
      
      if (error) throw error
      onRefresh()
      alert('Settings updated successfully!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page settings-page">
      <h1>Configuration</h1>
      <p className="vision">Manage your identity and intelligence keys.</p>
      
      <div className="settings-grid">
        <section className="card">
          <div className="section-header">
            <Key className="accent" />
            <h3>Intelligence Layer</h3>
          </div>
          <p className="small">Your Groq API Key is saved directly to your secure Supabase profile.</p>
          <div className="input-group">
            <input 
              type="password" 
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="gsk_..."
            />
            <button className="primary-btn" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Update Key'}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <ShieldCheck className="primary" />
            <h3>Your Profile</h3>
          </div>
          <div className="profile-details">
            <p><strong>Status:</strong> <span className="badge">{profile?.role}</span></p>
            <p><strong>Name:</strong> {profile?.full_name || 'Not set'}</p>
          </div>
          {profile?.role === 'pending_mentor' && (
            <div className="warning-box">
              <AlertTriangle size={16} />
              <span>Awaiting verification from another Mentor.</span>
            </div>
          )}
        </section>
      </div>

      <div className="navigation-footer">
        <button className="secondary-btn" onClick={() => onNavigate('home')}>Back to Home</button>
      </div>
    </div>
  )
}

export default Settings
