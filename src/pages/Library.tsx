import { useState, useEffect } from 'react'
import type { Page } from '../types'
import { supabase } from '../services/supabase'
import { Search, BookOpen, Clock, Users } from 'lucide-react'

const Library = ({ }: { onNavigate: (page: Page) => void }) => {
  const [words, setWords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    supabase
      .from('knowledge')
      .select('kitaveta, english, swahili, expected_response, category, time_of_day, audience, pronunciation, notes')
      .eq('is_verified', true)
      .order('category', { ascending: true })
      .then(({ data }) => {
        setWords(data ?? [])
        setLoading(false)
      })
  }, [])

  const categories = ['all', ...Array.from(new Set(words.map(w => w.category).filter(Boolean)))]

  const filtered = words.filter(w => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      w.kitaveta?.toLowerCase().includes(q) ||
      w.english?.toLowerCase().includes(q) ||
      w.swahili?.toLowerCase().includes(q)
    const matchCat = activeCategory === 'all' || w.category === activeCategory
    return matchSearch && matchCat
  })

  const grouped = filtered.reduce((acc: Record<string, any[]>, w) => {
    const cat = w.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(w)
    return acc
  }, {})

  return (
    <div className="lib-page">
      {/* Hero */}
      <div className="lib-hero">
        <div className="lib-hero-badge">
          <BookOpen size={14} />
          Digital Archive
        </div>
        <h1 className="lib-hero-title">Kitaveta Library</h1>
        <p className="lib-hero-sub">
          {loading ? '...' : `${words.length} verified word${words.length !== 1 ? 's' : ''} from our mentors`}
        </p>
      </div>

      {/* Search + Filter */}
      <div className="lib-controls">
        <div className="lib-search-wrap">
          <Search size={16} className="lib-search-icon" />
          <input
            className="lib-search"
            placeholder="Search Kitaveta, English, Swahili…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="lib-cats">
          {categories.map(cat => (
            <button
              key={cat}
              className={`lib-cat-btn${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="lib-empty">Gathering wisdom…</div>
      ) : filtered.length === 0 ? (
        <div className="lib-empty">No results found.</div>
      ) : (
        <div className="lib-groups">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="lib-group">
              <div className="lib-group-label">{cat}</div>
              <div className="lib-grid">
                {items.map((w, i) => (
                  <div key={i} className="lib-card">
                    <div className="lib-card-top">
                      <span className="lib-kitaveta">{w.kitaveta}</span>
                      {w.pronunciation && (
                        <span className="lib-pronunciation">/{w.pronunciation}/</span>
                      )}
                    </div>

                    <div className="lib-translations">
                      {w.english && (
                        <div className="lib-trans-row">
                          <span className="lib-lang-tag en">EN</span>
                          <span className="lib-trans-val">{w.english}</span>
                        </div>
                      )}
                      {w.swahili && (
                        <div className="lib-trans-row">
                          <span className="lib-lang-tag sw">SW</span>
                          <span className="lib-trans-val">{w.swahili}</span>
                        </div>
                      )}
                      {w.expected_response && (
                        <div className="lib-trans-row">
                          <span className="lib-lang-tag reply">↩</span>
                          <span className="lib-trans-val">{w.expected_response}</span>
                        </div>
                      )}
                    </div>

                    {(w.notes) && (
                      <p className="lib-notes">{w.notes}</p>
                    )}

                    <div className="lib-meta">
                      {w.time_of_day && w.time_of_day !== 'anytime' && (
                        <span className="lib-meta-pill">
                          <Clock size={11} />{w.time_of_day}
                        </span>
                      )}
                      {w.audience && w.audience !== 'anyone' && (
                        <span className="lib-meta-pill">
                          <Users size={11} />{w.audience}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Library
