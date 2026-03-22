import { useState, useEffect } from 'react'
import type { Page } from '../types'
import { Search, Play, Volume2, Info, Loader2 } from 'lucide-react'
import { supabase } from '../services/supabase'

interface LearnerProps {
  apiKey: string | null
  onNavigate: (page: Page) => void
}

const Learner = ({ apiKey, onNavigate }: LearnerProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  // Fetch initial scrolling list
  useEffect(() => {
    fetchLatest()
  }, [])

  const fetchLatest = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('translations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setResults(data)
    setLoading(false)
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchTerm) return fetchLatest()
    
    setSearching(true)
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .or(`source_word.ilike.%${searchTerm}%,kitaveta.ilike.%${searchTerm}%`)
    
    if (data) setResults(data)
    setSearching(false)
  }

  const playAudio = (url: string) => {
    new Audio(url).play()
  }

  if (!apiKey) {
    return (
      <div className="page learner-page centered">
        <h2>Groq API Key Required</h2>
        <p>To use the AI learning guide, please enter your Groq API key in the settings.</p>
        <button className="primary-btn" onClick={() => onNavigate('settings')}>Go to Settings</button>
      </div>
    )
  }

  const generateLesson = async () => {
    if (!apiKey || results.length === 0) return alert('Add some words first!')
    setSearching(true)
    try {
      const wordsList = results.map(r => r.kitaveta).join(', ')
      const prompt = `Use these Kitaveta words: ${wordsList}. Create a small, engaging lesson (3-4 sentences) for a learner. Suggest a fun practice sentence they should try to say.`

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: 'You are a wise Kitaveta teacher.' }, { role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      alert(data.choices[0].message.content)
    } catch (err) {
      alert('AI error building lesson.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="page learner-page">
      <div className="learner-header">
        <h1>Learner Mode</h1>
        <p className="vision">Explore the community-built Kitaveta bridge.</p>
      </div>
      
      <div className="ai-lesson-box card">
        <h3>Today's Learning Path</h3>
        <p className="small">The AI will build a custom lesson based on your community dictionary.</p>
        <button className="primary-btn" onClick={generateLesson} disabled={searching}>
          {searching ? 'Building Lesson...' : 'Start AI Guided Lesson'}
        </button>
      </div>

      <form className="search-bar-container" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search for a word (e.g. Good or Chedi)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="primary-btn search-btn" type="submit" disabled={searching}>
          {searching ? <Loader2 className="spin" size={20} /> : 'Search'}
        </button>
      </form>

      <div className="dictionary-feed">
        <div className="feed-header">
          <h3>{searchTerm ? 'Search Results' : 'Latest Contributions'}</h3>
          <span className="count">{results.length} words found</span>
        </div>

        <div className="results-grid">
          {results.map((p) => (
            <div key={p.id} className="phrase-card">
              <div className="phrase-meta">
                <span className="source-lang">{p.source_language}</span>
                <h3>{p.source_word}</h3>
              </div>
              <div className="phrase-target">
                <span className="kitaveta-label">Kitaveta</span>
                <p className="kitaveta-word">{p.kitaveta}</p>
              </div>
              {p.audio_url && (
                <button className="play-btn-circle" onClick={() => playAudio(p.audio_url)}>
                  <Volume2 size={20} />
                </button>
              )}
            </div>
          ))}

          {results.length === 0 && !loading && (
            <div className="empty-state">
              <Info size={48} />
              <p>No results found for "{searchTerm}".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Learner
