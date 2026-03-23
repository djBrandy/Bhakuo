import { useState } from 'react'
import type { Page, Profile, Knowledge } from '../types'
import { ShieldAlert, Save, X } from 'lucide-react'
import { supabase } from '../services/supabase'
import ChatInterface from '../components/ChatInterface'

interface MentorProps {
  profile: Profile | null
  onNavigate: (page: Page) => void
}

const Mentor = ({ profile, onNavigate }: MentorProps) => {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: `Washindaze? What word or phrase are we teaching to preserve our roots?` }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingEntry, setPendingEntry] = useState<Partial<Knowledge> | null>(null)
  const [audioBlob] = useState<Blob | null>(null)

  if (profile?.role !== 'mentor' && profile?.role !== 'pending_mentor') {
    return (
      <div className="page centered">
        <ShieldAlert size={48} className="accent" />
        <h2>Access Denied</h2>
        <p>Only verified Mentors can contribute structured knowledge.</p>
        <button className="primary-btn" onClick={() => onNavigate('home')}>Go Back</button>
      </div>
    )
  }

  const handleChat = async (input: string) => {
    if (!input || !profile?.groq_api_key) return

    const userText = input
    const updatedMessages = [...messages, { role: 'user' as const, text: userText }]
    setMessages(updatedMessages)
    setIsProcessing(true)

    try {
      const history = updatedMessages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text
      }))

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${profile.groq_api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are Alexander's Knowledge Assistant helping a Kitaveta mentor document language knowledge.
Read the full conversation to understand what has been shared so far.

- If you have enough to identify the Kitaveta word/phrase AND at least one translation, extract the entry as a raw JSON object in this exact format (no extra text):
{"kitaveta": "...", "english": "...", "swahili": "...", "social_context": "..."}
Use null for any field not provided.

- If you do NOT have enough info yet, reply conversationally in plain text asking for what is missing.`
            },
            ...history
          ]
        })
      })

      const data = await response.json()
      const aiText: string = data.choices[0].message.content.trim()

      if (aiText.startsWith('{')) {
        const structured = JSON.parse(aiText)
        setPendingEntry(structured)
        setMessages(prev => [...prev, {
          role: 'ai',
          text: `I've prepared the entry for "${structured.kitaveta}". Does this look correct? If so, save it.`
        }])
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: aiText }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "I had a moment of confusion. Could you repeat that or provide more context?" }])
    } finally {
      setIsProcessing(false)
    }
  }

  const saveToDatabase = async () => {
    if (!pendingEntry || !profile) return
    setIsProcessing(true)
    try {
      const audio_url = ''

      const { error } = await supabase
        .from('knowledge')
        .insert([{
          kitaveta: pendingEntry.kitaveta,
          english: pendingEntry.english,
          swahili: pendingEntry.swahili,
          context: pendingEntry.social_context,
          category: 'general', // Default category
          formality: 'neutral',
          audience: 'anyone',
          time_of_day: 'anytime',
          contributor_id: profile.id,
          audio_url
        }])

      if (error) throw error
      
      setMessages(prev => [...prev, { role: 'ai', text: "Success! That knowledge is now part of the bridge. What else shall we teach?" }])
      setPendingEntry(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="page mentor-page">
      <div className="mentor-chat-container">
        <ChatInterface
          messages={messages}
          onSendMessage={handleChat}
          loading={isProcessing && !pendingEntry}
          placeholder="Tell me about a Kitaveta word or phrase..."
          headerTitle="Mentor Panel"
          headerSubtitle="Contribute to the bridge"
        />
      </div>

      {pendingEntry && (
        <div className="entry-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPendingEntry(null) }}>
          <div className="entry-preview-panel">
            <button className="preview-close" onClick={() => setPendingEntry(null)}><X size={18} /></button>
            <p className="preview-eyebrow">Ready to save</p>
            <div className="preview-hero">
              <span className="preview-kitaveta">{pendingEntry.kitaveta}</span>
            </div>

            <div className="preview-translations">
              {pendingEntry.english && (
                <div className="translation-pill">
                  <span className="pill-lang">EN</span>
                  <span className="pill-value">{pendingEntry.english}</span>
                </div>
              )}
              {pendingEntry.swahili && (
                <div className="translation-pill">
                  <span className="pill-lang">SW</span>
                  <span className="pill-value">{pendingEntry.swahili}</span>
                </div>
              )}
              {pendingEntry.social_context && (
                <div className="translation-pill context">
                  <span className="pill-lang">CTX</span>
                  <span className="pill-value">{pendingEntry.social_context}</span>
                </div>
              )}
            </div>

            <button
              className="primary-btn save-btn"
              onClick={saveToDatabase}
              disabled={isProcessing}
            >
              <Save size={18} /> {isProcessing ? 'Saving...' : 'Save to the Bridge'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Mentor
