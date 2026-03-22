import type { Page } from '../types'
import { supabase } from '../services/supabase'

interface HeaderProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  session: any
}

const Header = ({ currentPage, onNavigate, session }: HeaderProps) => {
  const [userRole, setUserRole] = useState<'mentor' | 'learner'>('learner')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onNavigate('auth' as Page)
  }

  const toggleRole = () => {
    const newRole = userRole === 'learner' ? 'mentor' : 'learner'
    setUserRole(newRole)
    onNavigate(newRole as Page)
  }

  return (
    <header className="header">
      <div className="logo" onClick={() => onNavigate('home')}>
        ALEXANDER
      </div>
      {session && (
        <nav className="nav">
          <button className="role-toggle" onClick={toggleRole}>
            Switch to {userRole === 'learner' ? 'Mentor' : 'Learner'}
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
