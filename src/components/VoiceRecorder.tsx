import { useState, useRef } from 'react'
import { Mic, Square, Play, Trash2, CheckCircle } from 'lucide-react'

interface VoiceRecorderProps {
  onAudioCaptured: (blob: Blob) => void
  onClear: () => void
}

const VoiceRecorder = ({ onAudioCaptured, onClear }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioURL(URL.createObjectURL(audioBlob))
        onAudioCaptured(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const clear = () => {
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
