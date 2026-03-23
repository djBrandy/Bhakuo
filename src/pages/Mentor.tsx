import { useState, useEffect } from 'react'
import type { Page, Profile, Knowledge } from '../types'
import { ShieldAlert, Save, X, Sparkles } from 'lucide-react'
import { supabase } from '../services/supabase'
import { getSyllabus, getChatMessages, saveChatMessage, notifyLearnersOfAnswer, getNewQueueItemsForMentor } from '../services/database'
import ChatInterface from '../components/ChatInterface'

interface MentorProps {
  profile: Profile | null
  onNavigate: (page: Page) => void
}

const SYSTEM_PROMPT = `You are Alexander — an eager, curious student of the Kitaveta language, being taught by a native mentor.

Your job is to fully understand every word or phrase the mentor shares. Use your judgment to decide which fields are relevant:

For GREETINGS and CONVERSATIONAL PHRASES — collect all of these, one question at a time:
1. Kitaveta word/phrase
2. English meaning
3. Swahili equivalent (or null)
4. Expected response (what do you say back?)
5. Who can say it (anyone / elders / peers / children)
6. Time of day (anytime / morning / afternoon / evening)
7. Social context

For VOCABULARY (nouns, adjectives, verbs, standalone words) — only collect:
1. Kitaveta word
2. English meaning
3. Swahili equivalent (or null)
Skip fields 4–7 entirely and set them to null. Do NOT ask about expected response, audience, time of day, or social context for plain vocabulary words.

Once you have the relevant fields, do the following before saving:
STEP A — Ask: "Is there anything else I should know about this before we save it? Any pronunciation tips, notes, or exceptions?"
STEP B — Do a verification recap in your own words. For vocabulary: "So 'Imbuji' means 'goat' / 'mbuzi'. Is that correct?" For greetings: include audience, time, context, and expected response.
STEP C — For GREETINGS ONLY: after confirmation, do a short practice exchange. Say: "Just to confirm I've got its essence — let's do a quick practice: [kitaveta phrase]?" Wait for the mentor's reply, acknowledge it warmly with a brief translation, then output the JSON. For VOCABULARY: skip STEP C and output the JSON immediately after the mentor confirms the recap.

RULES:
- Ask exactly ONE question at a time. Never bundle multiple questions.
- Read the FULL conversation history carefully. NEVER ask for something already provided in this conversation.
- Be warm, curious, and eager — like a student who genuinely wants to understand deeply.
- When outputting the entry, respond with ONLY a raw JSON object, no text before or after:
{"kitaveta": "...", "english": "...", "swahili": "...", "expected_response": "...", "audience": "anyone|elder|peer|child", "time_of_day": "anytime|morning|afternoon|evening", "social_context": "...", "pronunciation": "...", "notes": "..."}
Use null for any field the mentor confirmed is not applicable.
- After a save is confirmed, ask: "What OTHER word or phrase should we add?" — never repeat a word already discussed in this conversation.`

const Mentor = ({ profile, onNavigate }: MentorProps) => {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingEntry, setPendingEntry] = useState<Partial<Knowledge> | null>(null)
  const [taughtThisSession, setTaughtThisSession] = useState<string[]>([])

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return }
    initChat()
  }, [profile?.id])

  const initChat = async () => {
    setLoading(true)
    try {
      const history = await getChatMessages(profile!.id, 'mentor')

      // Only fetch queue items newer than the last saved message
      const lastSeen = history.length > 0 ? history[history.length - 1].created_at : undefined
      const queueItems = await getNewQueueItemsForMentor(lastSeen)

      const historyText = history.map(m => m.text).join(' ')
      const newNotifications = queueItems
        .filter((item: any) => !historyText.includes(item.question))
        .map((item: any) => ({
          role: 'ai' as const,
          text: `📌 ${item.learner_name ?? 'A learner'} asked: "${item.question}" — how do we say this in Kitaveta?`
        }))

      if (history.length > 0) {
        setMessages([...history, ...newNotifications])
      } else {
        const greeting = { role: 'ai' as const, text: `Washindaze? What word or phrase are we teaching to preserve our roots?` }
        setMessages([greeting, ...newNotifications])
        await saveChatMessage(profile!.id, 'ai', greeting.text, 'mentor').catch(() => {})
      }
    } catch (err) {
      console.error(err)
      setMessages([{ role: 'ai', text: `Washindaze? What word or phrase are we teaching to preserve our roots?` }])
    } finally {
      setLoading(false)
    }
  }

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

  const askGroq = async (history: { role: string; content: string }[]) => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${profile!.groq_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history]
      })
    })
    const data = await response.json()
    if (!response.ok || !data.choices?.[0]) {
      throw new Error(data.error?.message ?? `Groq error ${response.status}`)
    }
    return data.choices[0].message.content.trim() as string
  }

  const handleChat = async (input: string) => {
    if (!input || !profile?.groq_api_key) return

    const updatedMessages = [...messages, { role: 'user' as const, text: input }]
    setMessages(updatedMessages)
    setIsProcessing(true)
    await saveChatMessage(profile.id, 'user', input, 'mentor').catch(() => {})

    try {
      const history = updatedMessages
        .filter(m => !m.text.startsWith('📌'))
        .slice(-20)
        .map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text
        }))

      const aiText = await askGroq(history)

      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const structured = JSON.parse(jsonMatch[0])
        setPendingEntry(structured)
        const preText = aiText.slice(0, jsonMatch.index).trim()
        if (preText) {
          setMessages(prev => [...prev, { role: 'ai', text: preText }])
          await saveChatMessage(profile.id, 'ai', preText, 'mentor').catch(() => {})
        }
        const confirmMsg = `I've prepared the entry for "${structured.kitaveta}". Does this look correct? If so, save it.`
        setMessages(prev => [...prev, { role: 'ai', text: confirmMsg }])
        await saveChatMessage(profile.id, 'ai', confirmMsg, 'mentor').catch(() => {})
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: aiText }])
        await saveChatMessage(profile.id, 'ai', aiText, 'mentor').catch(() => {})
      }
    } catch (err: any) {
      const errMsg = `I had a moment of confusion: ${err?.message ?? 'unknown error'}. Could you repeat that?`
      setMessages(prev => [...prev, { role: 'ai', text: errMsg }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGuideMe = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      const [syllabus, knowledgeRes] = await Promise.all([
        getSyllabus(),
        supabase.from('knowledge').select('category, kitaveta, expected_response').eq('is_verified', true)
      ])

      const knowledge = knowledgeRes.data ?? []
      const coveredCategories = new Set(knowledge.map((k: any) => k.category))

      // Find first syllabus lesson with no knowledge at all
      const emptyLesson = syllabus.find((l: any) => !coveredCategories.has(l.category))

      // Or find a lesson that has knowledge but missing expected_response
      const incompleteEntry = knowledge.find((k: any) => !k.expected_response && (k.audience || k.time_of_day))

      let question: string
      if (incompleteEntry) {
        question = `When someone says "${incompleteEntry.kitaveta}", what do they say back?`
      } else if (emptyLesson) {
        question = `For the lesson "${emptyLesson.title}" — what is the first word or phrase we should teach?`
      } else {
        question = `The knowledge base is looking strong! Is there anything you'd like to add or refine?`
      }

      setMessages(prev => [...prev, { role: 'ai', text: question }])
      await saveChatMessage(profile!.id, 'ai', question, 'mentor').catch(() => {})
    } catch (err) {
      const fallback = "What Kitaveta word or phrase shall we add today?"
      setMessages(prev => [...prev, { role: 'ai', text: fallback }])
    } finally {
      setIsProcessing(false)
    }
  }

  const clean = (v: any) => (!v || v === 'none' || v === 'null') ? null : v

  const normalizeAudience = (v: any): string => {
    if (!v || v === 'none' || v === 'null') return 'anyone'
    const s = String(v).toLowerCase()
    if (s === 'elder' || s === 'peer' || s === 'child' || s === 'anyone') return s
    if (s.includes('elder') || s.includes('grand') || s.includes('old')) return 'elder'
    if (s.includes('child') || s.includes('kid')) return 'child'
    if (s.includes('peer') || s.includes('friend') || s.includes('young') || s.includes('boy') || s.includes('girl')) return 'peer'
    return 'anyone'
  }

  const normalizeTimeOfDay = (v: any): string => {
    if (!v || v === 'none' || v === 'null') return 'anytime'
    const s = String(v).toLowerCase()
    if (s === 'morning' || s === 'afternoon' || s === 'evening' || s === 'anytime') return s
    if (s.includes('morning')) return 'morning'
    if (s.includes('afternoon')) return 'afternoon'
    if (s.includes('evening') || s.includes('night')) return 'evening'
    return 'anytime'
  }

  const saveToDatabase = async () => {
    if (!pendingEntry || !profile) return
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('knowledge')
        .insert([{
          kitaveta: pendingEntry.kitaveta,
          english: pendingEntry.english,
          swahili: pendingEntry.swahili,
          context: pendingEntry.social_context,
          expected_response: (pendingEntry as any).expected_response ?? null,
          pronunciation: (pendingEntry as any).pronunciation ?? null,
          notes: (pendingEntry as any).notes ?? null,
          formality: 'neutral',
          audience: normalizeAudience((pendingEntry as any).audience),
          time_of_day: normalizeTimeOfDay((pendingEntry as any).time_of_day),
          category: 'greetings',
          contributor_id: profile.id,
          is_verified: true,
          audio_url: null
        }])

      if (error) throw error

      const savedKitaveta = pendingEntry.kitaveta!
      const savedEnglish = pendingEntry.english!
      setTaughtThisSession(prev => [...prev, savedKitaveta])
      setPendingEntry(null)

      // Notify any learners who asked about this word
      await notifyLearnersOfAnswer(savedKitaveta, savedEnglish).catch(() => {})

      // After saving, find the next gap — never repeat what's been taught this session
      const [syllabus, knowledgeRes] = await Promise.all([
        getSyllabus(),
        supabase.from('knowledge').select('category, kitaveta, expected_response').eq('is_verified', true)
      ])

      const knowledge = knowledgeRes.data ?? []
      const coveredCategories = new Set(knowledge.map((k: any) => k.category))
      const emptyLesson = syllabus.find((l: any) => !coveredCategories.has(l.category))
      const incompleteEntry = knowledge.find(
        (k: any) => !k.expected_response && !taughtThisSession.includes(k.kitaveta) && (k.audience || k.time_of_day)
      )

      let nextQuestion: string
      if (incompleteEntry) {
        nextQuestion = `"${savedKitaveta}" is now part of the bridge! I noticed "${incompleteEntry.kitaveta}" doesn't have a response yet — when someone says "${incompleteEntry.kitaveta}", what do they say back?`
      } else if (emptyLesson) {
        nextQuestion = `"${savedKitaveta}" is now part of the bridge! What other word or phrase should we add for the lesson "${emptyLesson.title}"?`
      } else {
        nextQuestion = `"${savedKitaveta}" is now part of the bridge! What other word or phrase shall we preserve today?`
      }

      setMessages(prev => [...prev, { role: 'ai', text: nextQuestion }])
      await saveChatMessage(profile.id, 'ai', nextQuestion, 'mentor').catch(() => {})
    } catch (err: any) {
      const errMsg = `Save failed: ${err.message}`
      setMessages(prev => [...prev, { role: 'ai', text: errMsg }])
      await saveChatMessage(profile.id, 'ai', errMsg, 'mentor').catch(() => {})
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
          loading={loading || (isProcessing && !pendingEntry)}
          placeholder="Tell me about a Kitaveta word or phrase..."
          headerTitle="Mentor Panel"
          headerSubtitle="Contribute to the bridge"
          extraAction={
            <button className="guide-me-btn" onClick={handleGuideMe} disabled={isProcessing}>
              <Sparkles size={15} /> Guide me
            </button>
          }
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
              {(pendingEntry as any).expected_response && (
                <div className="translation-pill">
                  <span className="pill-lang">↩</span>
                  <span className="pill-value">{(pendingEntry as any).expected_response}</span>
                </div>
              )}
              {(pendingEntry as any).pronunciation && (
                <div className="translation-pill">
                  <span className="pill-lang">PR</span>
                  <span className="pill-value">{(pendingEntry as any).pronunciation}</span>
                </div>
              )}
              {pendingEntry.social_context && (
                <div className="translation-pill context">
                  <span className="pill-lang">CTX</span>
                  <span className="pill-value">{pendingEntry.social_context}</span>
                </div>
              )}
              {(pendingEntry as any).notes && (
                <div className="translation-pill context">
                  <span className="pill-lang">NOTE</span>
                  <span className="pill-value">{(pendingEntry as any).notes}</span>
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
