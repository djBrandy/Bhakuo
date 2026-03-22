import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import Home from './pages/Home'
import Mentor from './pages/Mentor'
import Learner from './pages/Learner'
import Settings from './pages/Settings'
import Auth from './pages/Auth'
import LiveSession from './pages/LiveSession'
import Header from './components/Header'
import Footer from './components/Footer'
import './App.css'

import type { Page } from './types'

function App() {
  const [session, setSession] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session with error handling to avoid hang
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
      })
      .catch((err) => {
        console.error('Session check failed:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const savedKey = localStorage.getItem('groq_api_key')
    if (savedKey) setApiKey(savedKey)
  }, [])

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('groq_api_key', key)
    setApiKey(key)
    setCurrentPage('home')
  }

  const renderPage = () => {
    if (loading) return <div className="centered"><p>Loading...</p></div>
    
    // If not logged in, only show Auth page
    if (!session) {
      return <Auth onSuccess={() => setCurrentPage('home')} />
    }

    switch (currentPage) {
      case 'home': return <Home onNavigate={setCurrentPage} />
      case 'mentor': return <Mentor apiKey={apiKey} onNavigate={setCurrentPage} />
      case 'learner': return <Learner apiKey={apiKey} onNavigate={setCurrentPage} />
      case 'settings': return <Settings apiKey={apiKey} onSave={handleSaveApiKey} onNavigate={setCurrentPage} />
      case 'live': return <LiveSession apiKey={apiKey} onNavigate={setCurrentPage} />
      default: return <Home onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="app-container">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} session={session} />
      <main className="main-content">
        {renderPage()}
      </main>
      <Footer onNavigate={setCurrentPage} />
    </div>
  )
}

export default App
