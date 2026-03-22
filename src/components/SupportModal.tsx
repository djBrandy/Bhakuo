import { useState } from 'react'
import { X, Smartphone, CreditCard, Heart, CheckCircle } from 'lucide-react'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

const SupportModal = ({ isOpen, onClose }: SupportModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('100')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // This is where the Supabase Edge Function call will go
    // For now, we simulate the flow
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 3000)
    }, 2000)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content support-modal">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        
        {!success ? (
          <>
            <div className="modal-header">
              <Heart className="heart-icon" />
              <h2>Support Alexander</h2>
              <p>Your contribution helps keep the Kitaveta bridge alive and free for everyone.</p>
            </div>

            <form onSubmit={handleSupport}>
              <div className="support-options">
                {['50', '100', '500', '1000'].map((amt) => (
                  <button 
                    key={amt}
                    type="button"
                    className={`amt-btn ${amount === amt ? 'active' : ''}`}
                    onClick={() => setAmount(amt)}
                  >
                    KES {amt}
                  </button>
                ))}
              </div>

              <div className="input-field">
                <label>Mpesa Phone Number</label>
                <div className="phone-input-wrapper">
                  <Smartphone size={18} className="input-icon" />
                  <input 
                    type="tel" 
                    placeholder="0712345678" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <button className="mpesa-btn" type="submit" disabled={loading}>
                {loading ? 'Requesting STK...' : `Pay KES ${amount} via M-PESA`}
              </button>
              <p className="small-text">An STK push will be sent to your phone.</p>
            </form>
          </>
        ) : (
          <div className="success-state centered">
            <CheckCircle size={64} className="success-icon" />
            <h3>Asante Sana!</h3>
            <p>Thank you for supporting the preservation of Kitaveta.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupportModal
