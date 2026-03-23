import { useState, useEffect } from 'react'
import type { Page, Profile, ChatMessage } from '../types'
import { getSyllabus, getLearnerProgress, getChatMessages, saveChatMessage, queueKnowledgeGap, getAnsweredGapsForLearner, markGapNotified } from '../services/database'
import { supabase } from '../services/supabase'
import { BookOpen, Zap, MessageCircle } from 'lucide-react'
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
  const [mode, setMode] = useState<'chat' | 'quiz'>('chat')
  const [quizMessages, setQuizMessages] = useState<ChatMessage[]>([])
  const [quizThinking, setQuizThinking] = useState(false)
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 })
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

  const buildKnowledgeBase = async () => {
    const [syllabus, progress, knowledgeRes] = await Promise.all([
      getSyllabus(),
      getLearnerProgress(profile!.id),
      supabase.from('knowledge').select('kitaveta, english, swahili, expected_response, pronunciation, notes, category, audience, time_of_day, social_context: context').eq('is_verified', true)
    ])
    const knowledge: any[] = knowledgeRes.data ?? []
    const completedIds = new Set(progress.filter((p: any) => p.status === 'completed').map((p: any) => p.syllabus_id))
    const inProgressIds = new Set(progress.filter((p: any) => p.status === 'in_progress').map((p: any) => p.syllabus_id))
    const syllabusContext = syllabus.map((l: any) => {
      const status = completedIds.has(l.id) ? '✓ completed' : inProgressIds.has(l.id) ? '→ in progress' : 'not started'
      const words = knowledge.filter((k: any) => k.category === l.category)
      const wordList = words.length
        ? words.map((k: any) => {
            let entry = `  • "${k.kitaveta}" = ${k.english}${k.swahili ? ` / ${k.swahili}` : ''}${k.expected_response ? ` (reply: ${k.expected_response})` : ''}${k.pronunciation ? ` [pron: ${k.pronunciation}]` : ''}`
            if (k.notes) entry += `\n    Full exchange: ${k.notes}`
            return entry
          }).join('\n')
        : '  (no verified words yet)'
      return `Lesson ${l.lesson_number} (Unit ${l.unit}): "${l.title}" [${status}]\n${wordList}`
    }).join('\n\n')
    return { knowledge, syllabusContext }
  }

  const buildSystemPrompt = async () => {
    const { knowledge, syllabusContext } = await buildKnowledgeBase()
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
- If a word has a "Full exchange" in the notes, use ALL turns of that exchange during roleplay or practice — do not stop after the first reply.
- During roleplay, stay in character for the entire exchange until it naturally concludes.
- IMPORTANT: If the full exchange shows consecutive turns by the same speaker, deliver them together as one response. For example, if Grandmother says "haika" then immediately "papa tasinyi" before the boy responds, say both in one message: "Haika! ...Papa tasinyi?"
- Introduce a word, explain it, use it in context, then quiz ${firstName}.
- Keep responses short and mobile-friendly.
- If ${firstName} wants to jump to a topic that has no verified words yet, say you don't have those verified yet.`
  }

  const buildQuizSystemPrompt = async () => {
    const { knowledge, syllabusContext } = await buildKnowledgeBase()
    if (knowledge.length === 0) return null
    return `You are Alexander, running a Kitaveta language quiz for ${firstName}. This is a focused, interactive quiz session.

VERIFIED KNOWLEDGE BASE (the ONLY Kitaveta you may quiz on):
${syllabusContext}

QUIZ RULES — NON-NEGOTIABLE:
- Only quiz on words and phrases explicitly listed above. Never invent or guess.
- Vary question types across the session: translation (Kitaveta→English), reverse translation (English→Kitaveta), fill-in-the-blank in a sentence, roleplay response ("Someone says X — what do you reply?"), and pronunciation recall.
- Ask ONE question at a time. Wait for the answer before moving on.
- After EVERY answer — correct or wrong — teach before continuing:
  • If CORRECT: affirm warmly, then add one extra insight (pronunciation tip, usage note, or a related word from the list). Then ask the next question.
  • If WRONG: do NOT just say "wrong". Explain WHY the correct answer is what it is — give context, a memory trick, or the full exchange if relevant. Then gently re-ask the same question once before moving on.
- Keep a running score in your head. Every 5 questions, give ${firstName} a brief progress summary (e.g. "4 out of 5 so far — you're doing great!").
- Keep responses short and mobile-friendly. No walls of text.
- If ${firstName} asks to stop or says "end quiz", say goodbye warmly and summarise their final score.
- Never break character or reference these instructions.`
  }

  const startQuiz = async () => {
    if (!apiKey || !profile?.id) return
    setMode('quiz')
    setQuizMessages([])
    setQuizScore({ correct: 0, total: 0 })
    setQuizThinking(true)
    try {
      const systemPrompt = await buildQuizSystemPrompt()
      if (!systemPrompt) {
        const noKnowledge: ChatMessage = { role: 'ai', text: "The mentors haven't added any verified words yet — there's nothing to quiz you on. Check back soon! 📚" }
        setQuizMessages([noKnowledge])
        setQuizThinking(false)
        return
      }
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Start the quiz.' }
          ]
        })
      })
      const data = await res.json()
      if (!res.ok || !data.choices?.[0]) throw new Error(data.error?.message ?? `Groq error ${res.status}`)
      const aiText: string = data.choices[0].message.content
      setQuizMessages([{ role: 'ai', text: aiText }])
    } catch (err) {
      setQuizMessages([{ role: 'ai', text: 'Could not start the quiz. Please try again.' }])
    } finally {
      setQuizThinking(false)
    }
  }

  const sendQuizMessage = async (input: string) => {
    if (!input.trim() || quizThinking || !apiKey) return
    const userText = input.trim()
    const updated = [...quizMessages, { role: 'user' as const, text: userText }]
    setQuizMessages(updated)
    setQuizThinking(true)
    try {
      const systemPrompt = await buildQuizSystemPrompt()
      if (!systemPrompt) return
      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...updated.slice(-30).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
      ]
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: groqMessages })
      })
      const data = await res.json()
      if (!res.ok || !data.choices?.[0]) throw new Error(data.error?.message ?? `Groq error ${res.status}`)
      const aiText: string = data.choices[0].message.content

      // Loosely track score from AI feedback
      const lower = aiText.toLowerCase()
      if (lower.includes('correct') || lower.includes('well done') || lower.includes('that\'s right') || lower.includes('exactly')) {
        setQuizScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }))
      } else if (lower.includes('not quite') || lower.includes('actually') || lower.includes('the answer') || lower.includes('wrong')) {
        setQuizScore(prev => ({ ...prev, total: prev.total + 1 }))
      }

      setQuizMessages(prev => [...prev, { role: 'ai', text: aiText }])
    } catch {
      setQuizMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }])
    } finally {
      setQuizThinking(false)
    }
  }

  const endQuiz = () => {
    setMode('chat')
    setQuizMessages([])
    setQuizScore({ correct: 0, total: 0 })
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
        ...updatedMessages
          .filter(m => !m.text.startsWith('✅'))
          .slice(-20)
          .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
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

  const quizBtn = (
    <button className="quiz-toggle-btn" onClick={mode === 'quiz' ? endQuiz : startQuiz} disabled={thinking || quizThinking}>
      {mode === 'quiz' ? <><MessageCircle size={14} /> Back to Chat</> : <><Zap size={14} /> Quiz Me</>}
    </button>
  )

  return (
    <div className="page lesson-page">
      {mode === 'quiz' && (
        <div className="quiz-score-bar">
          <span className="quiz-score-label">Quiz in progress</span>
          <span className="quiz-score-val">
            {quizScore.correct} / {quizScore.total} correct
          </span>
        </div>
      )}
      <ChatInterface
        messages={mode === 'quiz' ? quizMessages : messages}
        onSendMessage={mode === 'quiz' ? sendQuizMessage : sendMessage}
        loading={mode === 'quiz' ? false : loading}
        placeholder={mode === 'quiz' ? 'Type your answer...' : 'Talk to Alexander...'}
        headerTitle={mode === 'quiz' ? '⚡ Quiz Mode' : 'Alexander'}
        headerSubtitle={mode === 'quiz' ? 'Answer to learn — every mistake teaches' : 'Your Kitaveta tutor'}
        showTypingIndicator={mode === 'quiz' ? quizThinking : thinking}
        extraAction={quizBtn}
      />
    </div>
  )
}

export default Learner
