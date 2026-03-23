import type { Page, Profile } from '../types'
import { Sparkles, BookOpen, Mic2 } from 'lucide-react'

interface HomeProps {
  onNavigate: (page: Page) => void
  profile: Profile | null
}

const Home = ({ onNavigate, profile }: HomeProps) => {
  const isMentor = profile?.role === 'mentor' || profile?.role === 'pending_mentor'
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <div className="page home-page">

      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-badge">🌍 Kitaveta Language Platform</div>
        <h1 className="home-hero-title">
          {firstName ? `Karibu, ${firstName}.` : 'Speak the language of your roots.'}
        </h1>
        <p className="home-hero-sub">
          Alexander is an AI tutor trained exclusively on verified Kitaveta knowledge from native speakers.
          He teaches you the way a grandmother would — word by word, exchange by exchange.
        </p>
      </div>

      {/* Live demo snippet — shows what Alexander actually does */}
      <div className="home-demo">
        <div className="home-demo-label">
          <Sparkles size={13} /> See Alexander in action
        </div>
        <div className="home-demo-chat">
          <div className="home-demo-bubble ai">
            Washindaze! 👋 That means "How are you?" in Kitaveta. Now — how do you think you'd reply?
          </div>
          <div className="home-demo-bubble user">
            Umm… I don't know yet!
          </div>
          <div className="home-demo-bubble ai">
            That's exactly why we're here. The reply is <strong>"Washindaze sana"</strong> — meaning "I am very well." Let's practice it together. Say it back to me 👇
          </div>
        </div>
        <button className="home-demo-cta" onClick={() => onNavigate('learner')}>
          Continue this conversation with Alexander →
        </button>
      </div>

      {/* Cards */}
      <div className="home-cards">

        <div className="home-card primary-card" onClick={() => onNavigate('learner')}>
          <div className="home-card-icon">
            <BookOpen size={22} />
          </div>
          <div className="home-card-body">
            <h2>Learn Kitaveta</h2>
            <p>
              Have a real conversation with Alexander — an AI tutor who only teaches
              what native mentors have verified. Greetings, vocabulary, roleplay, quizzes.
            </p>
            <ul className="home-card-features">
              <li>✦ Chat naturally, like WhatsApp</li>
              <li>✦ Quiz mode tests what you know</li>
              <li>✦ Every mistake becomes a lesson</li>
            </ul>
          </div>
          <button className="home-card-btn">Start Learning →</button>
        </div>

        {isMentor && (
          <div className="home-card mentor-card" onClick={() => onNavigate('mentor')}>
            <div className="home-card-icon accent">
              <Mic2 size={22} />
            </div>
            <div className="home-card-body">
              <h2>Contribute Knowledge</h2>
              <p>
                You know Kitaveta. Teach Alexander — and through him, everyone else.
                Your words become permanent, verified lessons for the whole family.
              </p>
              <ul className="home-card-features">
                <li>✦ AI guides you through each entry</li>
                <li>✦ Greetings, vocabulary, full exchanges</li>
                <li>✦ Learners are notified when you add words they asked about</li>
              </ul>
            </div>
            <button className="home-card-btn accent-btn">Open Mentor Panel →</button>
          </div>
        )}

      </div>

      {/* Bottom nudge for non-mentors */}
      {!isMentor && (
        <p className="home-nudge">
          Know Kitaveta natively?{' '}
          <button className="home-nudge-link" onClick={() => onNavigate('settings')}>
            Apply to become a mentor
          </button>{' '}
          and help preserve the language.
        </p>
      )}

    </div>
  )
}

export default Home
