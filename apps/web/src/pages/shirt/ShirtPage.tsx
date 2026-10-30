import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import Button from '@/components/common/Button'

/**
 * Public landing page reached by scanning a QR code printed on t-shirts.
 *
 * Behaviour:
 *  - The video starts playing automatically as soon as the page loads.
 *  - Because browsers block autoplay with sound, the video starts muted
 *    (required for reliable mobile autoplay) with a tap-to-unmute overlay.
 *  - If autoplay is blocked entirely, a large play button is shown.
 *  - A button at the bottom takes the visitor to the main screen.
 *
 * Video file lives at: apps/web/public/dashden-promo-final.mp4
 * (optionally add shirt-poster.jpg as a poster image).
 */

// Source for the video. Place the file in apps/web/public/
const VIDEO_SRC = '/dashden-promo-final.mp4'

const ShirtPage = () => {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [needsManualPlay, setNeedsManualPlay] = useState(false)

  // Attempt autoplay as soon as the page loads.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const tryPlay = async () => {
      try {
        // Muted autoplay is allowed by all modern browsers.
        video.muted = true
        setIsMuted(true)
        await video.play()
        setNeedsManualPlay(false)
      } catch {
        // Autoplay was blocked entirely, show a manual play button.
        setNeedsManualPlay(true)
      }
    }

    tryPlay()
  }, [])

  const handleUnmute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setIsMuted(false)
    // Ensure playback continues after unmuting.
    video.play().catch(() => {
      /* ignore */
    })
  }

  const handleManualPlay = () => {
    const video = videoRef.current
    if (!video) return
    video
      .play()
      .then(() => setNeedsManualPlay(false))
      .catch(() => setNeedsManualPlay(true))
  }

  const goToMainScreen = () => {
    navigate(ROUTES.HOME)
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Video area */}
      <div className="relative flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full max-h-screen object-contain"
          src={VIDEO_SRC}
          autoPlay
          muted
          playsInline
          controls
          preload="auto"
        >
          Your browser does not support the video tag.
        </video>

        {/* Tap-to-unmute overlay (shown while muted and playing automatically) */}
        {isMuted && !needsManualPlay && (
          <button
            onClick={handleUnmute}
            className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
            aria-label="Tap to unmute"
          >
            <span aria-hidden="true">🔇</span>
            Tap for sound
          </button>
        )}

        {/* Manual play button (shown only if autoplay was blocked) */}
        {needsManualPlay && (
          <button
            onClick={handleManualPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
            aria-label="Play video"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-4xl text-black shadow-lg transition hover:scale-105">
              ▶
            </span>
          </button>
        )}
      </div>

      {/* Bottom action */}
      <div className="flex justify-center bg-black px-4 py-6">
        <Button size="lg" onClick={goToMainScreen} className="w-full max-w-md">
          Go to DashDen
        </Button>
      </div>
    </div>
  )
}

export default ShirtPage
