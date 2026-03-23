import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import '../styles/ChatInterface.css'

export type ChatMessage = {
  role: 'user' | 'ai'
  text: string
  timestamp?: number
}

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  loading?: boolean
  placeholder?: string
  headerTitle?: string
  headerSubtitle?: string
  showTypingIndicator?: boolean
  onBack?: () => void
}

const ChatInterface = ({
  messages,
  onSendMessage,
  loading = false,
  placeholder = "Type your message...",
  headerTitle = "Chat",
  headerSubtitle,
  showTypingIndicator = false,
  onBack
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showTypingIndicator])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    onSendMessage(input.trim())
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as any)
    }
  }

  return (
    <div className="chat-interface">
      {/* Chat Header */}
      <div className="chat-header">
        {onBack && (
          <button className="back-btn" onClick={onBack} aria-label="Go back">
            ← Back
          </button>
        )}
        <div className="header-content">
          <h2 className="header-title">{headerTitle}</h2>
          {headerSubtitle && <p className="header-subtitle">{headerSubtitle}</p>}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="chat-container">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Start a conversation</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message-wrapper ${msg.role}`}
            >
              <div className={`chat-message ${msg.role}`}>
                {msg.text}
              </div>
            </div>
          ))
        )}

        {showTypingIndicator && (
          <div className="chat-message-wrapper ai">
            <div className="chat-message ai">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading || showTypingIndicator}
          className="chat-input"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || showTypingIndicator}
          className={`send-button ${!input.trim() || loading ? 'disabled' : ''}`}
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 size={20} className="spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  )
}

export default ChatInterface
