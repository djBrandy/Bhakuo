import { supabase } from './supabase'

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

export const saveTranslation = async (translation: {
  source_language: 'english' | 'swahili',
  source_word: string,
  kitaveta: string,
  audio_url?: string,
  creator_id: string
}) => {
  const { data, error } = await supabase
    .from('translations')
    .insert([translation])
    .select()

  if (error) throw error
  return data[0]
}
