import { useState, useEffect } from 'react'
import type { Page, Profile, ChatMessage } from '../types'
import { getSyllabus, getLearnerProgress, getChatMessages, saveChatMessage, queueKnowledgeGap, getAnsweredGapsForLearner, markGapNotified } from '../services/database'
import { supabase } from '../services/supabase'
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
      const [history, answeredGaps] = await Promise.all([
        getChatMessages(profile!.id, 'learner'),
        getAnsweredGapsForLearner(profile!.id)
      ])

      // Inject notifications for newly answered gaps
      const notifications: { role: 'ai'; text: string }[] = []
      for (const gap of answeredGaps) {
        notifications.push({ role: 'ai', text: `✅ Update: ${gap.ai_attempt}! The mentors just added it — ask me about it now.` })
        await markGapNotified(gap.id).catch(() => {})
      }

      if (history.length > 0) {
        setMessages([...history, ...notifications])
      } else {
        await startFreshChat()
        if (notifications.length > 0) setMessages(prev => [...prev, ...notifications])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buildSystemPrompt = async () => {
    const [syllabus, progress, knowledgeRes] = await Promise.all([
      getSyllabus(),
      getLearnerProgress(profile!.id),
      supabase.from('knowledge').select('kitaveta, english, swahili, expected_response, pronunciation, notes, category, audience, time_of_day, social_context: context').eq('is_verified', true)
    ])

    const knowledge: any[] = knowledgeRes.data ?? []

    const completedIds = new Set(
      progress.filter((p: any) => p.status === 'completed').map((p: any) => p.syllabus_id)
    )
    const inProgressIds = new Set(
      progress.filter((p: any) => p.status === 'in_progress').map((p: any) => p.syllabus_id)
    )

    const syllabusContext = syllabus.map((l: any) => {
      const status = completedIds.has(l.id) ? '✓ completed' : inProgressIds.has(l.id) ? '→ in progress' : 'not started'
      const words = knowledge.filter((k: any) => k.category === l.category)
      const wordList = words.length
        ? words.map((k: any) => `  • "${k.kitaveta}" = ${k.english}${k.swahili ? ` / ${k.swahili}` : ''}${k.expected_response ? ` (reply: ${k.expected_response})` : ''}${k.pronunciation ? ` [pron: ${k.pronunciation}]` : ''}`).join('\n')
        : '  (no verified words yet)'
      return `Lesson ${l.lesson_number} (Unit ${l.unit}): "${l.title}" [${status}]\n${wordList}`
    }).join('\n\n')

    const hasAnyKnowledge = knowledge.length > 0

    return `You are Alexander, a warm and patient Kitaveta language tutor in a continuous one-on-one conversation with ${firstName}.

CRITICAL RULES — NON-NEGOTIABLE:
- You may ONLY use Kitaveta words and phrases that are explicitly listed below in the VERIFIED KNOWLEDGE BASE.
- Do NOT invent, guess, or extrapolate any Kitaveta word, phrase, or translation. Not even one.
- If any previous message in this conversation contains a Kitaveta word NOT listed below, that message was an error. Ignore it and do not repeat that word.
- If ${firstName} asks about something not in the list below, say exactly: "I don't have that verified yet — I've asked the mentors to fill that gap for us."
- This is a continuous conversation — never reset or re-introduce yourself.
${!hasAnyKnowledge ? '- The knowledge base is currently empty. Tell ' + firstName + ' that the mentors are still adding words and to check back soon. Do not teach anything.' : ''}

VERIFIED KNOWLEDGE BASE (the ONLY Kitaveta you are allowed to teach):
${syllabusContext}

TEACHING APPROACH:
- Teach only what is in the verified list above.
- Introduce a word, explain it, use it in context, then quiz ${firstName}.
- Keep responses short and mobile-friendly.
- If ${firstName} wants to jump to a topic that has no verified words yet, say you don't have those verified yet.`
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
      if (!res.ok || !data.choices?.[0]) throw new Error(data.error?.message ?? `Groq error ${res.status}`)
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
      if (!res.ok || !data.choices?.[0]) throw new Error(data.error?.message ?? `Groq error ${res.status}`)
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
