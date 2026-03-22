import type { Page } from '../types'
import { supabase } from '../services/supabase'

interface HeaderProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  session: any
}

const Header = ({ currentPage, onNavigate, session }: HeaderProps) => {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    onNavigate('auth' as Page)
  }

  return (
    <header className="header">
      <div className="logo" onClick={() => onNavigate('home')}>
        ALEXANDER
      </div>
      {session && (
        <nav className="nav">
          <button 
            className={currentPage === 'mentor' ? 'active' : ''} 
            onClick={() => onNavigate('mentor')}
          >
            Mentor
          </button>
          <button 
            className={currentPage === 'learner' ? 'active' : ''} 
            onClick={() => onNavigate('learner')}
          >
            Learner
          </button>
          <button 
            className={currentPage === 'live' ? 'active' : ''} 
            onClick={() => onNavigate('live')}
          >
            Live Bridge
          </button>
          <button 
            className={currentPage === 'library' ? 'active' : ''} 
            onClick={() => onNavigate('library')}
          >
            Library
          </button>
          <button 
            className={currentPage === 'settings' ? 'active' : ''} 
            onClick={() => onNavigate('settings')}
          >
            Settings
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      )}
    </header>
  )
}

export default Header
