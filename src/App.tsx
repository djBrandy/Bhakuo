import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import Home from './pages/Home'
import Mentor from './pages/Mentor'
import Learner from './pages/Learner'
import Settings from './pages/Settings'
import Auth from './pages/Auth'
import LiveSession from './pages/LiveSession'
import Library from './pages/Library'
import Admin from './pages/Admin'
import Header from './components/Header'
import Footer from './components/Footer'
import './App.css'

import type { Page, Profile } from './types'

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
    } else {
      // Google OAuth user — no profile yet, create one
      const { data: { user } } = await supabase.auth.getUser()
      const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
      await supabase.from('profiles').insert([{
        id: userId,
        full_name: name,
        role: 'learner',
        created_at: new Date().toISOString()
      }])
      const { data: fresh } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (fresh) setProfile(fresh)
    }
    setLoading(false)
  }

  const renderPage = () => {
    if (loading) return <div className="centered"><p>Loading Alexander...</p></div>
    if (!session) return <Auth onSuccess={() => {}} />

    const rawKey = profile?.groq_api_key || null
    let apiKey: string | null = null
    if (rawKey) {
      try {
        const parsed = JSON.parse(rawKey)
        apiKey = Array.isArray(parsed) ? (parsed.find((k: string) => k?.trim()) || null) : rawKey
      } catch { apiKey = rawKey }
    }

    switch (currentPage) {
      case 'home':     return <Home onNavigate={setCurrentPage} profile={profile} />
      case 'mentor':   return <Mentor profile={profile} onNavigate={setCurrentPage} />
      case 'learner':  return <Learner profile={profile} apiKey={apiKey} onNavigate={setCurrentPage} />
      case 'settings': return <Settings profile={profile} onRefresh={() => fetchProfile(session.user.id)} onNavigate={setCurrentPage} />
      case 'live':     return <LiveSession apiKey={apiKey} onNavigate={setCurrentPage} profile={profile} />
      case 'library':  return <Library onNavigate={setCurrentPage} />
      case 'admin':    return <Admin profile={profile} onNavigate={setCurrentPage} />
      default:         return <Home onNavigate={setCurrentPage} profile={profile} />
    }
  }

  return (
    <div className="app-container mobile-pwa">
      <Header
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        session={session}
        profile={profile}
      />
      <main className="main-content">
        {renderPage()}
      </main>
      <Footer onNavigate={setCurrentPage} />
    </div>
  )
}

export default App
