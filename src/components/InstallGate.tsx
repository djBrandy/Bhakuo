import { useState, useEffect } from 'react'
import { Download, Smartphone } from 'lucide-react'

interface InstallGateProps {
  children: React.ReactNode
}

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true

const InstallGate = ({ children }: InstallGateProps) => {
  const [installed, setInstalled] = useState(isInstalled())
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    if (isInstalled()) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    // Also listen for display-mode change (after install)
    const mq = window.matchMedia('(display-mode: standalone)')
    const mqHandler = (e: MediaQueryListEvent) => { if (e.matches) setInstalled(true) }
    mq.addEventListener('change', mqHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      mq.removeEventListener('change', mqHandler)
    }
  }, [])

  if (installed) return <>{children}</>

  const handleInstall = async () => {
    if (isIOS) { setShowIOSGuide(true); return }
    if (!deferredPrompt) { setShowIOSGuide(true); return }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return (
    <div className="install-gate">
      <div className="install-gate-card">

        <div className="install-gate-icon">
          <Smartphone size={40} />
        </div>

        <h1 className="install-gate-title">Install Alexander</h1>
        <p className="install-gate-sub">
          Alexander is a mobile app. Install it on your device to start learning Kitaveta.
        </p>

        {!showIOSGuide ? (
          <>
            <button className="install-gate-btn" onClick={handleInstall}>
              <Download size={18} /> Install App
            </button>

            {isIOS && (
              <button className="install-gate-link" onClick={() => setShowIOSGuide(true)}>
                How do I install on iPhone?
              </button>
            )}
          </>
        ) : (
          <div className="install-ios-guide">
            {isIOS ? (
              <>
                <p className="install-guide-title">To install on iPhone / iPad:</p>
                <ol className="install-steps">
                  <li><span className="install-step-num">1</span> Tap the <strong>Share</strong> button at the bottom of Safari <strong>⎙</strong></li>
                  <li><span className="install-step-num">2</span> Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li><span className="install-step-num">3</span> Tap <strong>"Add"</strong> in the top right</li>
                  <li><span className="install-step-num">4</span> Open Alexander from your home screen</li>
                </ol>
              </>
            ) : (
              <>
                <p className="install-guide-title">To install on Android / Desktop:</p>
                <ol className="install-steps">
                  <li><span className="install-step-num">1</span> Tap the <strong>menu (⋮)</strong> in your browser</li>
                  <li><span className="install-step-num">2</span> Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></li>
                  <li><span className="install-step-num">3</span> Open Alexander from your home screen</li>
                </ol>
              </>
            )}
            <button className="install-gate-link" onClick={() => setShowIOSGuide(false)}>← Back</button>
          </div>
        )}

        <p className="install-gate-note">
          Free to install · No app store required
        </p>
      </div>
    </div>
  )
}

export default InstallGate
