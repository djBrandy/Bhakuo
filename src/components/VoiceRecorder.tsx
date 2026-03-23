import { useState, useRef } from 'react'
import { Mic, Square, Trash2, CheckCircle } from 'lucide-react'

interface VoiceRecorderProps {
  onAudioCaptured: (blob: Blob) => void
  onClear: () => void
}

// @ts-ignore: Voice features temporarily disabled, preserving code for future use
const VoiceRecorder = ({ onAudioCaptured, onClear }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  // @ts-ignore: Voice features temporarily disabled, preserving code for future use
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  // @ts-ignore: Voice features temporarily disabled, preserving code for future use
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    // Feature coming soon - temporarily disabled
    alert('Voice recording feature coming soon! For now, pronunciation guides will be added by mentors.')
    return
  }

  const stopRecording = () => {
    // Feature coming soon - temporarily disabled
    setIsRecording(false)
  }

  const clear = () => {
    // Feature coming soon - temporarily disabled
    setAudioURL(null)
    onClear()
  }

  return (
    <div className="voice-recorder">
      <div className="recorder-status">
        {!audioURL && !isRecording && (
          <button className="record-btn" onClick={startRecording}>
            <Mic size={20} /> Record Pronunciation
          </button>
        )}
        
        {isRecording && (
          <button className="stop-btn pulse" onClick={stopRecording}>
            <Square size={20} /> Stop Recording
          </button>
        )}

        {audioURL && (
          <div className="audio-preview">
            <audio src={audioURL} controls />
            <button className="delete-btn" onClick={clear}>
              <Trash2 size={18} />
            </button>
            <div className="success-badge"><CheckCircle size={16} /> Audio Captured</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VoiceRecorder
