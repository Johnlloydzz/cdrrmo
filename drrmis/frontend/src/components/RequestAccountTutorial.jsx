import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'

// "How to request an account" tutorial: a real screen recording of the PDRA
// site (landing page → Request access → filling in the form → Request sent),
// with captions and chapter buttons to jump to a step.
//
// Files (in drrmis/frontend/public/tutorial/):
//   request-access.mp4  the recording (H.264, ~1 MB)
//   request-access.webm same recording (VP9) for browsers without H.264
//   request-access.jpg  still frame shown before it plays
//   request-access.vtt  captions
// To re-record after the form changes, replace those three files.

const MP4 = '/tutorial/request-access.mp4'
const WEBM = '/tutorial/request-access.webm'
const POSTER = '/tutorial/request-access.jpg'
const CAPTIONS = '/tutorial/request-access.vtt'

// Where each step starts in the video (seconds).
const CHAPTERS = [
  { t: 0, label: 'Open PDRA' },
  { t: 6, label: 'Request access' },
  { t: 9.3, label: 'Full name' },
  { t: 12.5, label: 'Email' },
  { t: 16.7, label: 'Contact number' },
  { t: 19.7, label: 'Barangay' },
  { t: 24, label: 'Position' },
  { t: 27.6, label: 'Submit' },
  { t: 30.1, label: 'Request sent' },
]

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function RequestAccountTutorial() {
  const video = useRef(null)
  const [started, setStarted] = useState(false) // cover removed
  const [loading, setLoading] = useState(false) // spinner on the cover
  const [now, setNow] = useState(0)
  const pending = useRef(null) // chapter to jump to once the video is ready

  // First play: show a short loading spinner (at least ~0.7 s, or until the
  // video is actually ready), then start.
  const begin = (from = 0) => {
    if (loading) return
    setLoading(true)
    pending.current = from
    const v = video.current
    const minWait = new Promise(r => setTimeout(r, 700))
    const giveUp = new Promise(r => setTimeout(r, 6000)) // slow connection: start anyway
    const ready = new Promise(r => {
      if (v.readyState >= 3) return r()
      const ok = () => { v.removeEventListener('canplay', ok); r() }
      v.addEventListener('canplay', ok)
      v.load()
    })
    Promise.all([minWait, Promise.race([ready, giveUp])]).then(() => {
      v.currentTime = pending.current || 0
      setStarted(true)
      setLoading(false)
      v.play().catch(() => {})
    })
  }

  const jump = (t) => {
    if (!started) { begin(t); return }
    const v = video.current
    v.currentTime = t
    v.play().catch(() => {})
  }

  // Captions on by default.
  useEffect(() => {
    const v = video.current
    const on = () => { for (const tr of v.textTracks) tr.mode = 'showing' }
    on()
    v.textTracks.addEventListener?.('addtrack', on)
    return () => v.textTracks.removeEventListener?.('addtrack', on)
  }, [])

  const current = CHAPTERS.reduce((a, c, i) => (now >= c.t - 0.05 ? i : a), 0)

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-blue-950 aspect-video">
        <video
          ref={video}
          className="absolute inset-0 w-full h-full object-contain bg-blue-950"
          poster={POSTER}
          preload="none"
          playsInline
          controls={started}
          onTimeUpdate={e => setNow(e.currentTarget.currentTime)}
          aria-label="Screen recording: how to request a PDRA account"
        >
          <source src={MP4} type="video/mp4" />
          <source src={WEBM} type="video/webm" />
          <track kind="captions" src={CAPTIONS} srcLang="en" label="English" default />
        </video>

        {/* Cover before the first play: only the play button */}
        {!started && (
          <button type="button" onClick={() => begin(0)} disabled={loading}
            className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-blue-900 via-blue-950 to-[#050b1f] group"
            aria-label={loading ? 'Loading tutorial' : 'Play tutorial: how to request an account'}>
            {loading ? (
              <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white/25 border-t-white animate-spin" aria-hidden="true" />
            ) : (
              <span className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white text-blue-900 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                <Play size={30} className="ml-1 fill-current" aria-hidden="true" />
              </span>
            )}
          </button>
        )}
      </div>

      {/* Chapters: jump to a step */}
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Jump to a step">
        {CHAPTERS.map((c, i) => (
          <button key={c.label} type="button" onClick={() => jump(c.t)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              started && i === current
                ? 'border-primary-600 bg-primary-50 text-primary-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
            }`}>
            <span className="tabular-nums text-gray-400">{clock(c.t)}</span>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}