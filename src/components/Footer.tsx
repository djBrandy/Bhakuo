import type { Page } from '../types'

interface FooterProps {
  onNavigate: (page: Page) => void
}

const Footer = ({ onNavigate }: FooterProps) => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">ALEXANDER</span>
          <p className="footer-desc">
            An open-source platform built to preserve the Kitaveta language — spoken by the Kitaveta people of Kenya.
            Native mentors contribute verified words and phrases. Alexander, the AI, teaches only what the mentors have confirmed.
            No hallucinations. No guessing. Just truth, passed down.
            Named after <em>"Bhakuo"</em>.
          </p>
        </div>

        <div className="footer-links">
          <a href="https://github.com/djBrandy/Bhakuo" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
          <span className="footer-dot">·</span>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home') }}>
            About
          </a>
        </div>

        <div className="footer-support">
          <p>Built with care by <strong>Brandon</strong>. If this project means something to you, consider supporting its development.</p>
          <a
            href="https://buymeacoffee.com"
            target="_blank"
            rel="noopener noreferrer"
            className="support-link"
          >
            ☕ Support Brandon
          </a>
        </div>

        <p className="footer-copy">© {new Date().getFullYear()} Project Alexander · Open Source · MIT License</p>
      </div>
    </footer>
  )
}

export default Footer
