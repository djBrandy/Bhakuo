import { useState } from 'react'
import type { Page } from '../types'
import SupportModal from './SupportModal'

interface FooterProps {
  onNavigate: (page: Page) => void
}

const Footer = ({ onNavigate }: FooterProps) => {
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>About Alexander</a>
        <a href="#" onClick={(e) => { e.preventDefault(); }}>Open Source</a>
      </div>
      <button className="support-btn" onClick={() => setIsSupportOpen(true)}>
        Support Developer
      </button>
      <div className="copyright">
        © {new Date().getFullYear()} Alexander Project
      </div>

      <SupportModal 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
      />
    </footer>
  )
}

export default Footer
