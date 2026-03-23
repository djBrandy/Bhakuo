import { useState, useEffect } from 'react'
import type { Page } from '../types'
import { supabase } from '../services/supabase'

const Library = ({ }: { onNavigate: (page: Page) => void }) => {
  const [words, setWords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('knowledge')
      .select('kitaveta, english, swahili, expected_response, category, time_of_day, audience')
      .eq('is_verified', true)
      .order('kitaveta', { ascending: true })
      .then(({ data }) => {
        setWords(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="page library-page">
      <header className="library-hero">
        <div className="hero-badge">Digital Archive</div>
        <h1>Kitaveta Library</h1>
        <p>All verified words and phrases contributed by our mentors.</p>
      </header>

      <main className="library-body">
        {loading ? (
          <div className="loading-state">Gathering wisdom...</div>
        ) : words.length === 0 ? (
          <div className="loading-state">No verified words yet — mentors are still contributing.</div>
        ) : (
          <div className="premium-grid">
            {words.map((w, i) => (
              <div key={i} className="premium-card">
                <div className="card-accent" />
                <div className="card-main">
                  <span className="kitaveta-term">{w.kitaveta}</span>
                  <div className="source-terms">
                    {w.english && <span className="source-pill">EN: {w.english}</span>}
                    {w.swahili && <span className="source-pill">SW: {w.swahili}</span>}
                    {w.expected_response && <span className="source-pill">↩ {w.expected_response}</span>}
                    {w.time_of_day && w.time_of_day !== 'anytime' && <span className="source-pill">{w.time_of_day}</span>}
                    {w.audience && w.audience !== 'anyone' && <span className="source-pill">{w.audience}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Library
