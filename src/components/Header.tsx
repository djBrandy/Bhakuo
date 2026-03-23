import { useState } from 'react'
import type { Page, Profile } from '../types'
import { supabase } from '../services/supabase'
import { Home, BookOpen, GraduationCap, Radio, Library, Settings, LogOut, ChevronDown } from 'lucide-react'

interface HeaderProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  session: any
  profile: Profile | null
}

const Header = ({ currentPage, onNavigate, session, profile }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isMentor = profile?.role === 'mentor'

  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'home',    label: 'Home',       icon: <Home size={18} /> },
    { page: 'learner', label: 'Learn',      icon: <GraduationCap size={18} /> },
    ...(isMentor ? [{ page: 'mentor' as Page, label: 'Mentor', icon: <BookOpen size={18} /> }] : []),
    { page: 'live',    label: 'Live',       icon: <Radio size={18} /> },
    { page: 'library', label: 'Library',    icon: <Library size={18} /> },
    { page: 'settings',label: 'Settings',   icon: <Settings size={18} /> },
  ]

  return (
    <header className="header">
      <div className="logo" onClick={() => onNavigate('home')}>
        ALEXANDER
      </div>

      {session && (
        <>
          {/* Desktop nav */}
          <nav className="nav desktop-nav">
            {navItems.map(({ page, label }) => (
              <button
                key={page}
                className={currentPage === page ? 'active' : ''}
                onClick={() => onNavigate(page)}
              >
                {label}
              </button>
            ))}
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </nav>

          {/* Mobile: profile chip + dropdown */}
          <div className="mobile-menu-wrapper">
            <button className="profile-chip" onClick={() => setMenuOpen(o => !o)}>
              <span className="chip-avatar">
                {(profile?.full_name ?? 'U')[0].toUpperCase()}
              </span>
              <ChevronDown size={14} className={menuOpen ? 'rotated' : ''} />
            </button>

            {menuOpen && (
              <div className="dropdown-menu" onClick={() => setMenuOpen(false)}>
                {navItems.map(({ page, label, icon }) => (
                  <button
                    key={page}
                    className={`dropdown-item ${currentPage === page ? 'active' : ''}`}
                    onClick={() => onNavigate(page)}
                  >
                    {icon} {label}
                  </button>
                ))}
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  )
}

export default Header
