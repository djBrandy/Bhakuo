import type { Page } from '../types'

interface HomeProps {
  onNavigate: (page: Page) => void
}

const Home = ({ onNavigate }: HomeProps) => {
  return (
    <div className="page home-page">
      <h1>Welcome to Alexander</h1>
      <p className="vision">
        Bridging the gap between speakers of Kitaveta and those who want to learn.
      </p>
      
      <div className="card-container">
        <div className="card mentor-card" onClick={() => onNavigate('mentor')}>
          <h2>Mentor</h2>
          <p>I know Kitaveta. I want to teach and contribute words.</p>
          <button className="primary-btn">Start Teaching</button>
        </div>
        
        <div className="card learner-card" onClick={() => onNavigate('learner')}>
          <h2>Learner</h2>
          <p>I want to learn Kitaveta. Help me bridge the gap.</p>
          <button className="primary-btn">Start Learning</button>
        </div>
      </div>
    </div>
  )
}

export default Home
