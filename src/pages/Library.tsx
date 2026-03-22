import { useState, useEffect } from 'react'
import type { Page } from '../types'
import { Book, MessageCircle, History, Info, Play, Volume2 } from 'lucide-react'
import { supabase } from '../services/supabase'

const Library = ({ onNavigate }: { onNavigate: (page: Page) => void }) => {
  const [activeTab, setActiveTab] = useState<'phrases' | 'stories' | 'traditions'>('phrases')
  const [phrases, setPhrases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPhrases = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('translations')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setPhrases(data)
      setLoading(false)
    }
    fetchPhrases()
  }, [])

  const playAudio = (url: string) => {
    new Audio(url).play()
  }

  return (
    <div className="page library-page">
      <div className="library-header">
        <h1>Heritage Library</h1>
        <p className="vision">Explore the stories, common phrases, and traditions of the Kitaveta people.</p>
      </div>

      <div className="library-tabs">
        <button 
          className={activeTab === 'phrases' ? 'active' : ''} 
          onClick={() => setActiveTab('phrases')}
        >
          <MessageCircle size={18} /> Common Phrases
        </button>
        <button 
          className={activeTab === 'stories' ? 'active' : ''} 
          onClick={() => setActiveTab('stories')}
        >
          <Book size={18} /> Folktales & Stories
        </button>
        <button 
          className={activeTab === 'traditions' ? 'active' : ''} 
          onClick={() => setActiveTab('traditions')}
        >
          <History size={18} /> Traditions
        </button>
      </div>

      <div className="library-content">
        {activeTab === 'phrases' && (
          <div className="phrases-grid">
            {loading ? <p>Loading the bridge...</p> : (
              phrases.map((p) => (
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
              ))
            )}
            {phrases.length === 0 && !loading && (
              <div className="empty-library">
                <Info size={48} />
                <p>No phrases added yet. Mentors, help us build the bridge!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="stories-section card">
            <h3>Kitaveta Folktales</h3>
            <p>Coming soon: Authentic stories passed down through generations.</p>
          </div>
        )}

        {activeTab === 'traditions' && (
          <div className="traditions-section card">
            <h3>Heritage & Customs</h3>
            <p>Coming soon: Understanding the Kitaveta way of life.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Library
