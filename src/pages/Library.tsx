import { useState, useEffect } from 'react'
import type { Page } from '../types'
import { Book, MessageCircle, History, Volume2, Search, Users } from 'lucide-react'
import { supabase } from '../services/supabase'

const Library = ({ onNavigate }: { onNavigate: (page: Page) => void }) => {
  const [activeTab, setActiveTab] = useState<'phrases' | 'stories' | 'lineage'>('phrases')
  const [groupedPhrases, setGroupedPhrases] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAndGroupPhrases()
  }, [])

  const fetchAndGroupPhrases = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('translations')
      .select('*')
      .order('kitaveta', { ascending: true })

    if (data) {
      // Group synonyms by the Kitaveta word
      const groups = data.reduce((acc: any, item: any) => {
        if (!acc[item.kitaveta]) {
          acc[item.kitaveta] = {
            kitaveta: item.kitaveta,
            sources: new Set(),
            audio: item.audio_url,
            lang: item.source_language
          }
        }
        acc[item.kitaveta].sources.add(item.source_word)
        if (!acc[item.kitaveta].audio && item.audio_url) {
          acc[item.kitaveta].audio = item.audio_url
        }
        return acc
      }, {})
      setGroupedPhrases(groups)
    }
    setLoading(false)
  }

  const playAudio = (url: string) => {
    new Audio(url).play()
  }

  return (
    <div className="page library-page">
      <header className="library-hero">
        <div className="hero-badge">Digital Archive</div>
        <h1>Kitaveta Heritage</h1>
        <p>Preserving the voices, stories, and lineages of the Kitaveta people.</p>
      </header>

      <nav className="library-nav">
        <button className={activeTab === 'phrases' ? 'active' : ''} onClick={() => setActiveTab('phrases')}>
          <MessageCircle size={18} /> Dictionary
        </button>
        <button className={activeTab === 'stories' ? 'active' : ''} onClick={() => setActiveTab('stories')}>
          <Book size={18} /> Oral Stories
        </button>
        <button className={activeTab === 'lineage' ? 'active' : ''} onClick={() => setActiveTab('lineage')}>
          <Users size={18} /> Family Trees
        </button>
      </nav>

      <main className="library-body">
        {activeTab === 'phrases' && (
          <div className="dictionary-section">
            <div className="section-header-alt">
              <h3>Community Dictionary</h3>
              <p>Grouped by Kitaveta synonyms and meanings.</p>
            </div>
            
            <div className="premium-grid">
              {loading ? (
                <div className="loading-state">Gathering wisdom...</div>
              ) : (
                Object.values(groupedPhrases).map((group: any, i: number) => (
                  <div key={i} className="premium-card">
                    <div className="card-accent"></div>
                    <div className="card-main">
                      <span className="kitaveta-term">{group.kitaveta}</span>
                      <div className="source-terms">
                        {Array.from(group.sources).map((s: any, idx) => (
                          <span key={idx} className="source-pill">{s}</span>
                        ))}
                      </div>
                    </div>
                    {group.audio && (
                      <button className="icon-btn-play" onClick={() => playAudio(group.audio)}>
                        <Volume2 size={18} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="culture-placeholder">
            <div className="empty-book">
              <Book size={64} />
              <h3>The Elders' Scrolls</h3>
              <p>We are currently recording and transcribing the oral histories of the Kitaveta elders.</p>
              <button className="secondary-btn">Contribute a Story</button>
            </div>
          </div>
        )}

        {activeTab === 'lineage' && (
          <div className="culture-placeholder">
            <div className="empty-book">
              <Users size={64} />
              <h3>Family Lineages</h3>
              <p>Understanding the roots. This section will feature interactive family trees of the Kitaveta people.</p>
              <button className="secondary-btn">Add to the Tree</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Library
