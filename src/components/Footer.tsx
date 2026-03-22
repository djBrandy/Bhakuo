import type { Page } from '../types'

interface FooterProps {
  onNavigate: (page: Page) => void
}

const Footer = ({ onNavigate }: FooterProps) => {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>About Alexander</a>
        <a href="#" onClick={(e) => { e.preventDefault(); }}>Open Source</a>
      </div>
      <button className="support-btn" onClick={() => alert('Mpesa STK Push integration coming soon!')}>
        Support Developer
      </button>
      <div className="copyright">
        © {new Date().getFullYear()} Alexander Project
      </div>
    </footer>
  )
}

export default Footer
