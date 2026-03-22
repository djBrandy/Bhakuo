import type { Page } from '../types'

interface LearnerProps {
  apiKey: string | null
  onNavigate: (page: Page) => void
}

const Learner = ({ apiKey, onNavigate }: LearnerProps) => {
  if (!apiKey) {
    return (
      <div className="page learner-page centered">
        <h2>Groq API Key Required</h2>
        <p>To use the AI learning guide, please enter your Groq API key in the settings.</p>
        <button className="primary-btn" onClick={() => onNavigate('settings')}>Go to Settings</button>
      </div>
    )
  }

  return (
    <div className="page learner-page">
      <h1>Learner Mode</h1>
      <p>Start bridging the gap by learning Kitaveta from mentors.</p>
      
      <div className="search-bar">
        <input type="text" placeholder="Search for a word (English, Swahili, Kitaveta)" />
        <button className="search-btn">Search</button>
      </div>

      <div className="ai-box">
        <h3>AI Learning Guide</h3>
        <p>Ask the AI what words you should prioritize today!</p>
        <button className="secondary-btn">Get Recommendations</button>
      </div>
    </div>
  )
}

export default Learner
