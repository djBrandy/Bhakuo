import type { Page, Profile } from '../types'

interface HomeProps {
  onNavigate: (page: Page) => void
  profile: Profile | null
}

const Home = ({ onNavigate, profile }: HomeProps) => {
  const isMentor = profile?.role === 'mentor' || profile?.role === 'pending_mentor'

  return (
    <div className="page home-page">
      <h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h1>
      <p className="vision">
        Bridging the gap between speakers of Kitaveta and those who want to learn.
      </p>

      <div className="card-container">
        {isMentor && (
          <div className="card mentor-card" onClick={() => onNavigate('mentor')}>
            <h2>Mentor</h2>
            <p>I know Kitaveta. I want to teach and contribute words.</p>
            <button className="primary-btn">Start Teaching</button>
          </div>
        )}

        <div className="card learner-card" onClick={() => onNavigate('learner')}>
          <h2>{isMentor ? 'Learn' : 'Learner'}</h2>
          <p>{isMentor ? 'Switch roles and learn alongside your students.' : 'I want to learn Kitaveta. Help me bridge the gap.'}</p>
          <button className="primary-btn">Start Learning</button>
        </div>
      </div>
    </div>
  )
}

export default Home
