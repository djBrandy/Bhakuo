import { supabase } from './supabase'

// ── Profile ──────────────────────────────────────────────────

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export const saveApiKey = async (userId: string, key: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ groq_api_key: key })
    .eq('id', userId)
  if (error) throw error
}

export const requestMentorRole = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'pending_mentor' })
    .eq('id', userId)
  if (error) throw error
}

export const approveMentor = async (mentorId: string, approverId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'mentor', verified_by: approverId })
    .eq('id', mentorId)
  if (error) throw error
}

export const getPendingMentors = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('role', 'pending_mentor')
  if (error) throw error
  return data
}

// ── Audio ─────────────────────────────────────────────────────

export const uploadAudio = async (blob: Blob, fileName: string) => {
  const { data, error } = await supabase.storage
    .from('pronunciations')
    .upload(`${Date.now()}_${fileName}.webm`, blob)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('pronunciations')
    .getPublicUrl(data.path)
  return publicUrl
}

// ── Knowledge ─────────────────────────────────────────────────

export const saveKnowledge = async (entry: {
  category: string
  subcategory?: string
  kitaveta: string
  english?: string
  swahili?: string
  pronunciation?: string
  audio_url?: string
  context?: string
  usage_example?: string
  expected_response?: string
  formality?: string
  audience?: string
  time_of_day?: string
  notes?: string
}) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('knowledge')
    .insert([{ ...entry, contributor_id: user.id }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const verifyKnowledge = async (knowledgeId: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('knowledge')
    .update({ is_verified: true, verified_by: user.id })
    .eq('id', knowledgeId)
  if (error) throw error
}

export const getKnowledgeForLesson = async (knowledgeIds: string[]) => {
  if (!knowledgeIds.length) return []
  const { data, error } = await supabase
    .from('knowledge')
    .select('*')
    .in('id', knowledgeIds)
    .eq('is_verified', true)
  if (error) throw error
  return data
}

export const getUnverifiedKnowledge = async () => {
  const { data, error } = await supabase
    .from('knowledge')
    .select('*, profiles(full_name)')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getKnowledgeByCategory = async (category: string) => {
  const { data, error } = await supabase
    .from('knowledge')
    .select('*')
    .eq('category', category)
    .eq('is_verified', true)
  if (error) throw error
  return data
}

// ── Syllabus ──────────────────────────────────────────────────

export const getSyllabus = async () => {
  const { data, error } = await supabase
    .from('syllabus')
    .select('*')
    .eq('is_active', true)
    .order('lesson_number', { ascending: true })
  if (error) throw error
  return data
}

export const addSyllabusLesson = async (lesson: {
  unit: number
  lesson_number: number
  title: string
  description?: string
  category: string
  subcategory?: string
  ai_generated?: boolean
}) => {
  const { data, error } = await supabase
    .from('syllabus')
    .insert([lesson])
    .select()
    .single()
  if (error) throw error
  return data
}

export const linkKnowledgeToLesson = async (syllabusId: string, knowledgeId: string) => {
  const { data: lesson, error: fetchError } = await supabase
    .from('syllabus')
    .select('knowledge_ids')
    .eq('id', syllabusId)
    .single()
  if (fetchError) throw fetchError
  const updated = [...(lesson.knowledge_ids || []), knowledgeId]
  const { error } = await supabase
    .from('syllabus')
    .update({ knowledge_ids: updated })
    .eq('id', syllabusId)
  if (error) throw error
}

// ── Learner Progress ──────────────────────────────────────────

export const getLearnerProgress = async (learnerId: string) => {
  const { data, error } = await supabase
    .from('learner_progress')
    .select('*, syllabus(lesson_number, title, unit)')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const upsertProgress = async (progress: {
  learner_id: string
  syllabus_id: string
  taught_knowledge_ids?: string[]
  quiz_results?: object[]
  status?: string
  score?: number
}) => {
  const { error } = await supabase
    .from('learner_progress')
    .upsert([{ ...progress, last_session_at: new Date().toISOString() }], {
      onConflict: 'learner_id,syllabus_id'
    })
  if (error) throw error
}

// ── Chat Messages ────────────────────────────────────────────

export const getChatMessages = async (userId: string, context: 'learner' | 'mentor') => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, text, created_at')
    .eq('user_id', userId)
    .eq('context', context)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as { role: 'user' | 'ai'; text: string; created_at: string }[]
}

export const saveChatMessage = async (userId: string, role: 'user' | 'ai', text: string, context: 'learner' | 'mentor') => {
  const { error } = await supabase
    .from('chat_messages')
    .insert([{ user_id: userId, role, text, context }])
  if (error) throw error
}

// ── Knowledge Queue ───────────────────────────────────────────

export const queueKnowledgeGap = async (question: string, learnerName: string, aiAttempt?: string, suggestedCategory?: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('knowledge_queue')
    .insert([{
      asked_by: user?.id,
      question,
      ai_attempt: aiAttempt,
      suggested_category: suggestedCategory,
      learner_name: learnerName
    }])
  if (error) throw error
}

export const notifyLearnersOfAnswer = async (kitaveta: string, english: string) => {
  const { data: items } = await supabase
    .from('knowledge_queue')
    .select('id, asked_by, question')
    .eq('status', 'open')

  if (!items || items.length === 0) return

  const matched = items.filter((item: any) =>
    item.question.toLowerCase().includes(english.toLowerCase()) ||
    item.question.toLowerCase().includes(kitaveta.toLowerCase())
  )

  if (matched.length === 0) return

  // Mark as answered with the resolved kitaveta word — learner chat will pick this up on next load
  await supabase.from('knowledge_queue')
    .update({ status: 'answered', ai_attempt: `"${english}" in Kitaveta is "${kitaveta}"` })
    .in('id', matched.map((item: any) => item.id))
}

export const getAnsweredGapsForLearner = async (userId: string) => {
  const { data } = await supabase
    .from('knowledge_queue')
    .select('id, ai_attempt')
    .eq('asked_by', userId)
    .eq('status', 'answered')
    .not('ai_attempt', 'is', null)
  return data ?? []
}

export const markGapNotified = async (gapId: string) => {
  await supabase.from('knowledge_queue').update({ status: 'notified' }).eq('id', gapId)
}

export const getNewQueueItemsForMentor = async (since?: string) => {
  let query = supabase
    .from('knowledge_queue')
    .select('id, question, learner_name, created_at')
    .in('status', ['open', 'answered'])
    .order('created_at', { ascending: true })
  if (since) query = query.gt('created_at', since)
  const { data } = await query
  return data ?? []
}


export const getOpenQueue = async () => {
  const { data, error } = await supabase
    .from('knowledge_queue')
    .select('*, profiles(full_name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const resolveQueueItem = async (queueId: string, knowledgeId: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('knowledge_queue')
    .update({ status: 'answered', answered_by: user.id, knowledge_id: knowledgeId })
    .eq('id', queueId)
  if (error) throw error
}
