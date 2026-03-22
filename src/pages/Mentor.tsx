import { useState } from 'react'
import type { Page } from '../types'
import VoiceRecorder from '../components/VoiceRecorder'
import { uploadAudio, saveTranslation } from '../services/database'
import { supabase } from '../services/supabase'
import { BrainCircuit, Languages, Save, Globe } from 'lucide-react'

interface MentorProps {
  apiKey: string | null
  onNavigate: (page: Page) => void
}

const Mentor = ({ apiKey, onNavigate }: MentorProps) => {
  const [loading, setLoading] = useState(false)
  const [sourceLang, setSourceLang] = useState<'english' | 'swahili'>('english')
  const [sourceWord, setSourceWord] = useState('')
  const [kitaveta, setKitaveta] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  if (!apiKey) {
    return (
      <div className="page mentor-page centered">
        <h2>Groq API Key Required</h2>
        <p>To use the AI mentor guide, please enter your Groq API key in the settings.</p>
        <button className="primary-btn" onClick={() => onNavigate('settings')}>Go to Settings</button>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kitaveta || !sourceWord) return alert('Source word and Kitaveta translation are required')
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      let audio_url = ''
      if (audioBlob) {
        audio_url = await uploadAudio(audioBlob, kitaveta)
      }

      await saveTranslation({
        source_language: sourceLang,
        source_word: sourceWord,
        kitaveta,
        audio_url,
        creator_id: user.id
      })

      alert('Translation saved successfully!')
      setSourceWord('')
      setKitaveta('')
      setAudioBlob(null)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page mentor-page">
      <div className="mentor-header">
        <h1>Mentor Mode</h1>
        <p className="vision">Native speakers, help bridge the gap by teaching authentic Kitaveta.</p>
      </div>
      
      <div className="mentor-grid">
        <section className="mentor-ai-card">
          <div className="card-header">
            <BrainCircuit className="accent-icon" />
            <h3>AI Teaching Guide</h3>
          </div>
          <div className="ai-content">
            <p className="small">The AI understands its role to suggest translations. Try asking for words about family, food, or weather.</p>
            <button className="secondary-btn ai-btn">Ask for Suggestions</button>
          </div>
        </section>

        <form className="mentor-form-card" onSubmit={handleSave}>
          <div className="card-header">
            <Languages className="primary-icon" />
            <h3>Contribute to the Bridge</h3>
          </div>
          
          <div className="lang-toggle">
            <button 
              type="button"
              className={sourceLang === 'english' ? 'active' : ''} 
              onClick={() => setSourceLang('english')}
            >
              English
            </button>
            <button 
              type="button"
              className={sourceLang === 'swahili' ? 'active' : ''} 
              onClick={() => setSourceLang('swahili')}
            >
              Swahili
            </button>
          </div>

          <div className="input-field">
            <label>Word in {sourceLang.charAt(0).toUpperCase() + sourceLang.slice(1)}</label>
            <input 
              type="text" 
              value={sourceWord} 
              onChange={(e) => setSourceWord(e.target.value)} 
              placeholder={sourceLang === 'english' ? 'e.g. Good' : 'e.g. Nzuri'} 
              required
            />
          </div>

          <div className="input-field">
            <label>Kitaveta Translation</label>
            <input 
              type="text" 
              value={kitaveta} 
              onChange={(e) => setKitaveta(e.target.value)} 
              placeholder="e.g. Chedi" 
              required 
            />
          </div>

          <div className="voice-field">
            <label>How is it pronounced?</label>
            <VoiceRecorder onAudioCaptured={setAudioBlob} onClear={() => setAudioBlob(null)} />
          </div>

          <button className="save-btn-premium" type="submit" disabled={loading}>
            {loading ? 'Saving...' : <><Save size={18} /> Add to Dictionary</>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Mentor
