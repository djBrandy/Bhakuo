import { useState, useRef } from 'react'
import type { Page, Profile } from '../types'
import { Mic, Square, MessageSquare } from 'lucide-react'
import { supabase } from '../services/supabase'
import { queueKnowledgeGap } from '../services/database'

interface LiveSessionProps {
  apiKey: string | null
  onNavigate: (page: Page) => void
  profile: Profile | null
}

const LiveSession = ({ apiKey, onNavigate, profile }: LiveSessionProps) => {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'ai', text: string }[]>([])
  // @ts-ignore: Voice features temporarily disabled, preserving code for future use
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  // @ts-ignore: Voice features temporarily disabled, preserving code for future use
  const chunksRef = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'friend'

  if (!apiKey) {
    return (
      <div className="page centered">
        <div className="empty-card">
          <Mic size={40} className="muted-icon" />
          <h2>API Key Required</h2>
          <p>Enter your Groq API key in settings to use the Live Bridge.</p>
          <button className="primary-btn" onClick={() => onNavigate('settings')}>Go to Settings</button>
        </div>
      </div>
    )
  }

  const startListening = async () => {
    // Feature coming soon - temporarily disabled
    alert('Voice chat feature coming soon! For now, use the text-based learning experiences.')
    return
  }

  const stopListening = () => {
    // Feature coming soon - temporarily disabled
    setIsListening(false)
  }

  // @ts-ignore: Voice features temporarily disabled, preserving code for future use
  const processVoice = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      // 1. STT via Groq Whisper
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.webm')
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'sw')

      const sttRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      })
      const sttData = await sttRes.json()
      const userText = sttData.text
      setChatLog(prev => [...prev, { role: 'user', text: userText }])

      // 2. Fetch verified knowledge from DB to ground the AI
      const { data: knowledgeData } = await supabase
        .from('knowledge')
        .select('kitaveta, english, swahili, context, expected_response, audio_url')
        .eq('is_verified', true)
        .limit(50)

      const knowledgeBlock = knowledgeData && knowledgeData.length > 0
        ? knowledgeData.map((e: any) =>
            `- "${e.kitaveta}" = ${e.english ?? ''} / ${e.swahili ?? ''}` +
            (e.context ? ` (${e.context})` : '') +
            (e.expected_response ? ` → response: "${e.expected_response}"` : '')
          ).join('\n')
        : 'No verified knowledge available yet.'

      // 3. LLM with grounded system prompt
      const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are Alexander, a warm and wise Kitaveta elder speaking with ${firstName}.
CRITICAL: You may ONLY use the verified Kitaveta knowledge listed below. Never invent or guess Kitaveta words.
If you don't know something in Kitaveta, say: "I don't have that word verified yet — I've asked the mentors to teach me."
Keep responses short and conversational — this is a voice chat on a phone.

VERIFIED KITAVETA KNOWLEDGE:
${knowledgeBlock}`
            },
            ...chatLog.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: userText }
          ]
        })
      })
      const llmData = await llmRes.json()
      const aiText: string = llmData.choices[0].message.content
      setChatLog(prev => [...prev, { role: 'ai', text: aiText }])

      // 4. Queue gap if AI flagged it
      if (aiText.includes("don't have that word verified")) {
        await queueKnowledgeGap(userText).catch(() => {})
      }

      // 5. Play audio for any matching verified word
      // Feature coming soon - audio playback temporarily disabled
      /*
      if (knowledgeData) {
        for (const entry of knowledgeData as any[]) {
          if (entry.audio_url && aiText.toLowerCase().includes(entry.kitaveta.toLowerCase())) {
            new Audio(entry.audio_url).play()
            break
          }
        }
      }
      */

      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      console.error(err)
      setChatLog(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="page live-session">
      <div className="page-header">
        <h1>Live Bridge</h1>
        <p className="vision">Speak to Alexander. He will respond only in verified Kitaveta.</p>
      </div>

      <div className="chat-window">
        {chatLog.length === 0 && (
          <div className="empty-state">
            <MessageSquare size={40} className="muted-icon" />
            <p>Press the mic and speak in English, Swahili, or Kitaveta.</p>
          </div>
        )}
        {chatLog.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'ai' && <span className="bubble-label">Alexander</span>}
            <div className="bubble-content">{msg.text}</div>
          </div>
        ))}
        {isProcessing && (
          <div className="chat-bubble ai">
            <span className="bubble-label">Alexander</span>
            <div className="bubble-content thinking"><span /><span /><span /></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="controls">
        {!isListening ? (
          <button className="record-btn-large" onClick={startListening} disabled={isProcessing}>
            <Mic size={32} />
          </button>
        ) : (
          <button className="stop-btn-large pulse" onClick={stopListening}>
            <Square size={32} />
          </button>
        )}
      </div>
    </div>
  )
}

export default LiveSession
