import { useState, useEffect } from 'react'
import type { Page } from '../types'
import { ExternalLink, Info, Key, ShieldCheck, RefreshCw } from 'lucide-react'

interface SettingsProps {
  apiKey: string | null
  onSave: (key: string) => void
  onNavigate: (page: Page) => void
}

const Settings = ({ apiKey, onSave, onNavigate }: SettingsProps) => {
  const [inputKey, setInputKey] = useState('')

  useEffect(() => {
    if (apiKey) setInputKey(apiKey)
  }, [apiKey])

  return (
    <div className="page settings-page">
      <h1>Configuration</h1>
      <p className="vision">Set up your AI bridge to the Kitaveta language.</p>
      
      <div className="settings-grid">
        <section className="settings-section main-card">
          <div className="section-header">
            <Key className="icon" />
            <h3>Groq AI API Key</h3>
          </div>
          
          <div className="onboarding-guide">
            <p>To keep Alexander free and private, we use your own Groq API key. Here is how to get one:</p>
            <ol className="steps">
              <li>Visit the <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq Cloud Console <ExternalLink size={14} /></a></li>
              <li>Sign up (it's free and fast).</li>
              <li>Click <strong>"Create API Key"</strong>, name it "Alexander", and copy it.</li>
              <li>Paste the key below.</li>
            </ol>
          </div>

          <div className="input-group">
            <input 
              type="password" 
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="gsk_..."
            />
            <button className="primary-btn" onClick={() => onSave(inputKey)}>
              {apiKey ? 'Update Key' : 'Save Key'}
            </button>
          </div>
          {apiKey && <p className="success-text"><ShieldCheck size={16} /> Your key is securely stored in this browser.</p>}
        </section>

        <section className="settings-section info-card">
          <div className="section-header">
            <Info className="icon" />
            <h3>How it works</h3>
          </div>
          
          <div className="info-item">
            <div className="info-title"><RefreshCw size={14} /> The 24-Hour Cycle</div>
            <p className="small">Groq provides a generous free tier. If the AI stops responding, it usually means you've hit the daily limit. It will automatically reset after 24 hours.</p>
          </div>

          <div className="info-item">
            <div className="info-title"><ShieldCheck size={14} /> Privacy First</div>
            <p className="small">We never see your key. It is stored directly in your browser's "LocalStorage," meaning only your phone can use it to talk to the AI.</p>
          </div>
        </section>
      </div>

      <div className="navigation-footer">
        <button className="secondary-btn" onClick={() => onNavigate('home')}>Back to Home</button>
      </div>
    </div>
  )
}

export default Settings
