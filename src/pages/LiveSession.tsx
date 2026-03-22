import { useState, useRef } from 'react'
import type { Page } from '../types'
import { Mic, Square, Loader2, MessageSquare, Volume2 } from 'lucide-react'

interface LiveSessionProps {
  apiKey: string | null
  onNavigate: (page: Page) => void
}

const LiveSession = ({ apiKey, onNavigate }: LiveSessionProps) => {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'ai', text: string }[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  if (!apiKey) {
    return (
      <div className="page centered">
        <h2>Groq API Key Required</h2>
        <p>To use the Live Kitaveta Bridge, please enter your API key in settings.</p>
        <button className="primary-btn" onClick={() => onNavigate('settings')}>Go to Settings</button>
      </div>
    )
  }

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        processVoice(audioBlob)
      }

      mediaRecorder.start()
      setIsListening(true)
    } catch (err) {
      alert('Could not access microphone')
    }
  }

  const stopListening = () => {
    mediaRecorderRef.current?.stop()
    setIsListening(false)
  }

  const processVoice = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      // 1. Send to Groq Whisper for STT
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.webm')
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'sw') // Using Swahili as a proxy base for Kitaveta phonetics

      const sttResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      })
      const sttData = await sttResponse.json()
      const userText = sttData.text

      setChatLog(prev => [...prev, { role: 'user', text: userText }])

      // 2. Send to Groq LLM for Kitaveta Response
      const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: `You are Alexander, a native Kitaveta speaker. 
              Respond to the user in Kitaveta. If the user speaks English or Swahili, 
              provide the Kitaveta translation and then encourage them to repeat it. 
              Keep the conversation natural, like a grandfather teaching his grandchild.` 
            },
            { role: 'user', content: userText }
          ]
        })
      })
      const llmData = await llmResponse.json()
      const aiText = llmData.choices[0].message.content

      setChatLog(prev => [...prev, { role: 'ai', text: aiText }])
      
      // 3. Simple TTS (Browser built-in)
      const utterance = new SpeechSynthesisUtterance(aiText)
      utterance.lang = 'sw-KE' // Closest phonetic match for browser TTS
      window.speechSynthesis.speak(utterance)

    } catch (err) {
      console.error(err)
      alert('Error processing conversation.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="page live-session">
      <h1>Live Kitaveta Bridge</h1>
      <p className="vision">Speak naturally. Alexander is listening and will respond in Kitaveta.</p>

      <div className="chat-window">
        {chatLog.length === 0 && (
          <div className="empty-state">
            <MessageSquare size={48} className="muted-icon" />
            <p>Press the microphone and say something in English, Swahili, or Kitaveta.</p>
          </div>
        )}
        {chatLog.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className="bubble-content">{msg.text}</div>
          </div>
        ))}
        {isProcessing && <div className="loader"><Loader2 className="spin" /> Thinking...</div>}
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
