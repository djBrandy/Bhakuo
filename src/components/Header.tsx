import type { Page, Profile } from '../types'
import { supabase } from '../services/supabase'
import { Home, BookOpen, GraduationCap, Library, Settings, LogOut } from 'lucide-react'

interface HeaderProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  session: any
  profile: Profile | null
}

const Header = ({ currentPage, onNavigate, session, profile }: HeaderProps) => {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isMentor = profile?.role === 'mentor' || profile?.role === 'pending_mentor'

  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'home',     label: 'Home',     icon: <Home size={18} /> },
    { page: 'learner',  label: 'Learn',    icon: <GraduationCap size={18} /> },
    ...(isMentor ? [{ page: 'mentor' as Page, label: 'Mentor', icon: <BookOpen size={18} /> }] : []),
    { page: 'library',  label: 'Library',  icon: <Library size={18} /> },
    { page: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ]

  return (
    <header className="header">
      <div className="logo" onClick={() => onNavigate('home')}>
        ALEXANDER
      </div>

      {session && (
        <nav className="nav">
          {navItems.map(({ page, label, icon }) => (
            <button
              key={page}
              className={currentPage === page ? 'active' : ''}
              onClick={() => onNavigate(page)}
            >
              {icon} {label}
            </button>
          ))}
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </nav>
      )}
    </header>
  )
}

export default Header
