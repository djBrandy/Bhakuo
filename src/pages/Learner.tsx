import { useState, useEffect } from 'react'
import type { Page, Profile, ChatMessage } from '../types'
import { getSyllabus, getLearnerProgress, getChatMessages, saveChatMessage, queueKnowledgeGap } from '../services/database'
import { BookOpen } from 'lucide-react'
import ChatInterface from '../components/ChatInterface'

interface LearnerProps {
  apiKey: string | null
  onNavigate: (page: Page) => void
  profile: Profile | null
}

const Learner = ({ apiKey, onNavigate, profile }: LearnerProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [loading, setLoading] = useState(true)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  useEffect(() => {
    if (!profile?.id || !apiKey) { setLoading(false); return }
    initChat()
  }, [profile?.id])

  const initChat = async () => {
    setLoading(true)
    try {
      const history = await getChatMessages(profile!.id, 'learner')
      if (history.length > 0) {
        setMessages(history)
      } else {
        // First time — Alexander opens the conversation
        await startFreshChat()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buildSystemPrompt = async () => {
    const [syllabus, progress] = await Promise.all([
      getSyllabus(),
      getLearnerProgress(profile!.id)
    ])

    const completedIds = new Set(
      progress.filter((p: any) => p.status === 'completed').map((p: any) => p.syllabus_id)
    )
    const inProgressIds = new Set(
      progress.filter((p: any) => p.status === 'in_progress').map((p: any) => p.syllabus_id)
    )

    const syllabusContext = syllabus.map((l: any) => {
      const status = completedIds.has(l.id) ? '✓ completed' : inProgressIds.has(l.id) ? '→ in progress' : 'not started'
      return `- Lesson ${l.lesson_number} (Unit ${l.unit}): "${l.title}" [${status}]`
    }).join('\n')

    return `You are Alexander, a warm and patient Kitaveta language tutor in a continuous one-on-one conversation with ${firstName}.

CRITICAL RULES:
- You may ONLY teach Kitaveta words/phrases that exist in the verified knowledge base (fetched per lesson). Never invent or guess Kitaveta.
- If ${firstName} asks something you cannot verify, say: "I don't have that verified yet — I've asked the mentors to fill that gap for us."
- This is a continuous conversation — never reset or re-introduce yourself unless it is truly the first message.
- Pick up naturally from where you left off.

SYLLABUS FRAMEWORK (use this to guide what to teach next — it can expand):
${syllabusContext}

TEACHING APPROACH:
- Follow the syllabus order loosely — complete earlier lessons before moving to later ones.
- Teach conversationally: introduce a word/phrase, explain it, use it in context, then quiz ${firstName}.
- Keep responses short and mobile-friendly.
- If ${firstName} wants to jump to a topic, accommodate them.
- After completing a topic area, naturally transition to the next.`
  }

  const startFreshChat = async () => {
    try {
      const systemPrompt = await buildSystemPrompt()
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Begin.' }
          ]
        })
      })
      const data = await res.json()
      const aiText: string = data.choices[0].message.content
      const aiMsg: ChatMessage = { role: 'ai', text: aiText }
      setMessages([aiMsg])
      await saveChatMessage(profile!.id, 'ai', aiText, 'learner')
    } catch (err) {
      console.error(err)
    }
  }

  const sendMessage = async (input: string) => {
    if (!input.trim() || thinking || !apiKey || !profile?.id) return
    const userText = input.trim()
    const userMsg: ChatMessage = { role: 'user', text: userText }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setThinking(true)

    await saveChatMessage(profile.id, 'user', userText, 'learner').catch(() => {})

    try {
      const systemPrompt = await buildSystemPrompt()
      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...updatedMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
      ]

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: groqMessages })
      })
      const data = await res.json()
      const aiText: string = data.choices[0].message.content

      setMessages(prev => [...prev, { role: 'ai', text: aiText }])
      await saveChatMessage(profile.id, 'ai', aiText, 'learner').catch(() => {})

      if (aiText.includes("don't have that verified")) {
        await queueKnowledgeGap(userText, firstName).catch(() => {})
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  if (!apiKey) {
    return (
      <div className="page centered">
        <div className="empty-card">
          <BookOpen size={40} className="muted-icon" />
          <h2>API Key Required</h2>
          <p>Enter your Groq API key in settings to start learning.</p>
          <button className="primary-btn" onClick={() => onNavigate('settings')}>Go to Settings</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page lesson-page">
      <ChatInterface
        messages={messages}
        onSendMessage={sendMessage}
        loading={loading}
        placeholder="Talk to Alexander..."
        headerTitle="Alexander"
        headerSubtitle="Your Kitaveta tutor"
        showTypingIndicator={thinking}
      />
    </div>
  )
}

export default Learner
