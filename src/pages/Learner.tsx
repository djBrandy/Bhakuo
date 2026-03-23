import { useState, useEffect } from 'react'
import type { Page, Profile, SyllabusLesson, KnowledgeEntry, ChatMessage } from '../types'
import { getSyllabus, getKnowledgeForLesson, upsertProgress, queueKnowledgeGap } from '../services/database'
import { BookOpen, ChevronRight } from 'lucide-react'
import ChatInterface from '../components/ChatInterface'

interface LearnerProps {
  apiKey: string | null
  onNavigate: (page: Page) => void
  profile: Profile | null
}

const Learner = ({ apiKey, onNavigate, profile }: LearnerProps) => {
  const [syllabus, setSyllabus] = useState<SyllabusLesson[]>([])
  const [activeLesson, setActiveLesson] = useState<SyllabusLesson | null>(null)
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [view, setView] = useState<'syllabus' | 'lesson'>('syllabus')
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  useEffect(() => {
    getSyllabus().then(setSyllabus).catch(console.error)
  }, [])

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

  const startLesson = async (lesson: SyllabusLesson) => {
    setLoadingLesson(true)
    setActiveLesson(lesson)
    setMessages([])
    setView('lesson')

    try {
      const entries = await getKnowledgeForLesson(lesson.knowledge_ids)
      setKnowledge(entries)

      if (profile?.id) {
        await upsertProgress({
          learner_id: profile.id,
          syllabus_id: lesson.id,
          status: 'in_progress',
        })
      }

      // Build grounded system context from verified DB entries
      const knowledgeBlock = entries.length > 0
        ? entries.map(e =>
            `- Kitaveta: "${e.kitaveta}" | English: "${e.english ?? '—'}" | Swahili: "${e.swahili ?? '—'}"` +
            (e.context ? ` | Context: ${e.context}` : '') +
            (e.expected_response ? ` | Response: "${e.expected_response}"` : '') +
            (e.formality !== 'neutral' ? ` | Formality: ${e.formality}` : '') +
            (e.audience !== 'anyone' ? ` | Audience: ${e.audience}` : '') +
            (e.time_of_day !== 'anytime' ? ` | Time: ${e.time_of_day}` : '')
          ).join('\n')
        : 'No verified knowledge has been added to this lesson yet.'

      const systemPrompt = `You are Alexander, a warm and patient Kitaveta language tutor.
You are teaching ${firstName} the lesson: "${lesson.title}".

CRITICAL RULE: You may ONLY use the verified knowledge below. Do NOT invent, guess, or hallucinate any Kitaveta words or phrases. If something is not in the knowledge base, say exactly: "I don't have that verified yet — I've asked the mentors to fill that gap for us."

VERIFIED KNOWLEDGE FOR THIS LESSON:
${knowledgeBlock}

TEACHING APPROACH:
1. Greet ${firstName} warmly by name in English, then introduce the lesson topic.
2. Teach one knowledge entry at a time — say the Kitaveta phrase, explain its meaning and context.
3. After teaching 2–3 entries, move to a quiz: say the Kitaveta phrase and wait for ${firstName} to respond with the meaning, OR give the English/Swahili and ask for the Kitaveta.
4. Affirm correct answers warmly. Gently correct wrong ones and try again.
5. Keep responses concise — this is a mobile conversation, not an essay.
6. If ${firstName} asks something you don't have in the knowledge base, log it as a gap and say you've asked the mentors.`

      // Start the lesson with the AI's opening message
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Start the lesson.' }
          ]
        })
      })
      const data = await res.json()
      const aiText = data.choices[0].message.content
      setMessages([{ role: 'ai', text: aiText }])
    } catch (err) {
      console.error(err)
      setMessages([{ role: 'ai', text: 'Something went wrong starting the lesson. Please try again.' }])
    } finally {
      setLoadingLesson(false)
    }
  }

  const sendMessage = async (input: string) => {
    if (!input.trim() || thinking || !activeLesson || !apiKey) return
    const userText = input.trim()
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', text: userText }]
    setMessages(updatedMessages)
    setThinking(true)

    try {
      const knowledgeBlock = knowledge.length > 0
        ? knowledge.map(e =>
            `- Kitaveta: "${e.kitaveta}" | English: "${e.english ?? '—'}" | Swahili: "${e.swahili ?? '—'}"` +
            (e.context ? ` | Context: ${e.context}` : '') +
            (e.expected_response ? ` | Response: "${e.expected_response}"` : '')
          ).join('\n')
        : 'No verified knowledge available.'

      const systemPrompt = `You are Alexander, a warm Kitaveta tutor teaching ${firstName} the lesson "${activeLesson.title}".
CRITICAL: Only use the verified knowledge below. Never hallucinate Kitaveta words.
If you don't know something, say: "I don't have that verified yet — I've asked the mentors."

VERIFIED KNOWLEDGE:
${knowledgeBlock}`

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

      // If AI flagged a gap, queue it
      if (aiText.includes("don't have that verified")) {
        await queueKnowledgeGap(userText, undefined, activeLesson.category).catch(() => {})
      }

      // Play audio if a known kitaveta word appears in the response
      // Feature coming soon - audio playback temporarily disabled
      /*
      for (const entry of knowledge) {
        if (entry.audio_url && aiText.toLowerCase().includes(entry.kitaveta.toLowerCase())) {
          new Audio(entry.audio_url).play()
          break
        }
      }
      */
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  // ── Syllabus view ─────────────────────────────────────────
  if (view === 'syllabus') {
    const units = [...new Set(syllabus.map(l => l.unit))].sort()

    return (
      <div className="page learner-page">
        <div className="page-header">
          <h1>Welcome, {firstName}</h1>
          <p className="vision">Choose a lesson to begin your Kitaveta journey.</p>
        </div>

        {syllabus.length === 0 ? (
          <div className="empty-card" style={{ margin: '0 auto' }}>
            <BookOpen size={36} className="muted-icon" />
            <p>The syllabus is loading or has not been set up yet.</p>
          </div>
        ) : (
          units.map(unit => (
            <div key={unit} className="unit-section">
              <div className="unit-label">
                Unit {unit} — {['Foundations', 'People & Relationships', 'Daily Life', 'Language Structure', 'Culture & Fluency'][unit - 1] ?? `Unit ${unit}`}
              </div>
              <div className="lesson-list">
                {syllabus.filter(l => l.unit === unit).map(lesson => (
                  <button
                    key={lesson.id}
                    className="lesson-row"
                    onClick={() => startLesson(lesson)}
                  >
                    <span className="lesson-num">{lesson.lesson_number}</span>
                    <span className="lesson-title">{lesson.title}</span>
                    <ChevronRight size={16} className="muted-icon" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  // ── Lesson / chat view ────────────────────────────────────
  return (
    <div className="page lesson-page">
      <ChatInterface
        messages={messages}
        onSendMessage={sendMessage}
        loading={loadingLesson}
        placeholder="Type your response..."
        headerTitle={activeLesson?.title || 'Lesson'}
        headerSubtitle={knowledge.length > 0 ? `${knowledge.length} words` : undefined}
        showTypingIndicator={thinking}
        onBack={() => setView('syllabus')}
      />
    </div>
  )
}

export default Learner
