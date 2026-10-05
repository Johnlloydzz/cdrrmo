import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Volume2, VolumeX, MousePointer2, Check, ChevronDown } from 'lucide-react'

// "How to request an account" tutorial, played like a short video.
//
// It isn't a video file: it's an animated walkthrough of the real Request an
// Account form, narrated by the browser's built-in text-to-speech voice
// (Web Speech API). Nothing to download, it always matches the current form,
// and captions are always shown — so it works even with the sound off or on
// a device without a voice.

const SAMPLE = {
  name: 'Juan Dela Cruz',
  email: 'juan.delacruz@gmail.com',
  contact: '09171234567',
  barangay: 'San Juan',
  position: 'Barangay Secretary',
}

// Each scene: what's on screen, which field is active, what gets typed, and
// what the narrator says (also the caption).
const SCENES = [
  { view: 'landing', say: 'To get a PDRA account, open the PDRA website and click "Request an account".' },
  { view: 'form', field: 'name', type: SAMPLE.name, say: 'Type your full name.' },
  { view: 'form', field: 'email', type: SAMPLE.email, say: 'Enter your email address. Your username and password will be sent here once your account is ready.' },
  { view: 'form', field: 'contact', type: SAMPLE.contact, say: 'Enter your mobile number. It must be eleven digits and start with zero nine. CDRRMO may call or text you here.' },
  { view: 'form', field: 'barangay', type: SAMPLE.barangay, say: 'Choose your barangay from the list.' },
  { view: 'form', field: 'position', type: SAMPLE.position, say: 'Your position is optional, but it helps CDRRMO confirm who you are.' },
  { view: 'form', field: 'submit', say: 'Check your details, then click "Submit Request".' },
  { view: 'done', say: 'Done! CDRRMO will review your request. Once approved, your username and password are sent to your email.' },
]

const FIELD_ORDER = ['name', 'email', 'contact', 'barangay', 'position']
const TYPE_MS = 55 // per character

// A clear English voice if the device has one.
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || []
  return voices.find(v => /en-PH/i.test(v.lang))
    || voices.find(v => /en-(US|GB)/i.test(v.lang) && /female|samantha|google|zira|aria|jenny/i.test(v.name))
    || voices.find(v => /^en/i.test(v.lang))
    || null
}

export default function RequestAccountTutorial() {
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(!canSpeak)
  const [scene, setScene] = useState(0)
  const [typed, setTyped] = useState({}) // field -> text shown so far
  const timers = useRef([])
  const runId = useRef(0) // bumps on every pause/seek so stale callbacks stop

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const stopSpeech = () => { if (canSpeak) window.speechSynthesis.cancel() }

  // Fields filled in by the scenes before `index` (so jumping ahead looks right).
  const filledBefore = (index) => {
    const t = {}
    SCENES.slice(0, index).forEach(s => { if (s.field && s.type) t[s.field] = s.type })
    return t
  }

  const playScene = useCallback((index, isMuted) => {
    const id = ++runId.current
    clearTimers(); stopSpeech()
    setScene(index)
    setTyped(filledBefore(index))
    const s = SCENES[index]

    let typingDone = !s.type
    let speechDone = false
    const next = () => {
      if (id !== runId.current || !typingDone || !speechDone) return
      timers.current.push(setTimeout(() => {
        if (id !== runId.current) return
        if (index + 1 < SCENES.length) playScene(index + 1, isMuted)
        else setPlaying(false)
      }, 700))
    }

    // Typing animation
    if (s.type) {
      for (let i = 1; i <= s.type.length; i++) {
        timers.current.push(setTimeout(() => {
          if (id !== runId.current) return
          setTyped(t => ({ ...t, [s.field]: s.type.slice(0, i) }))
          if (i === s.type.length) { typingDone = true; next() }
        }, 600 + i * TYPE_MS))
      }
    }

    // Narration (or a reading-time pause when muted / no voice)
    if (!isMuted && canSpeak) {
      const u = new SpeechSynthesisUtterance(s.say)
      const v = pickVoice()
      if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'en-US'
      u.rate = 0.98
      const finish = () => { if (!speechDone) { speechDone = true; next() } }
      u.onend = finish
      u.onerror = finish
      window.speechSynthesis.speak(u)
      // Safety net: some browsers never fire onend (e.g. no voice installed).
      timers.current.push(setTimeout(finish, Math.max(4000, s.say.split(' ').length * 450) + 3000))
    } else {
      const ms = Math.max(2500, s.say.split(' ').length * 330)
      timers.current.push(setTimeout(() => { speechDone = true; next() }, ms))
    }
  }, [canSpeak])

  // Voices load late in some browsers.
  useEffect(() => {
    if (!canSpeak) return
    window.speechSynthesis.getVoices()
    const h = () => window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', h)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', h)
  }, [canSpeak])

  // Stop everything when leaving the page.
  useEffect(() => () => { runId.current++; clearTimers(); stopSpeech() }, [])

  const start = (from = 0) => { setStarted(true); setPlaying(true); playScene(from, muted) }
  const pause = () => { runId.current++; clearTimers(); stopSpeech(); setPlaying(false) }
  const togglePlay = () => {
    if (playing) pause()
    else start(scene === SCENES.length - 1 ? 0 : scene)
  }
  const restart = () => start(0)
  const seek = (i) => { if (playing) { setStarted(true); playScene(i, muted) } else { runId.current++; clearTimers(); stopSpeech(); setStarted(true); setScene(i); setTyped({ ...filledBefore(i), ...(SCENES[i].type ? { [SCENES[i].field]: SCENES[i].type } : {}) }) } }
  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    if (playing) playScene(scene, m) // restart this scene with/without voice
  }

  const s = SCENES[scene]
  const active = s.field

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-gray-900 select-none">
      {/* Screen */}
      <div className="relative aspect-video bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 overflow-hidden">
        {/* Scene: landing */}
        {s.view === 'landing' && (
          <div key="landing" className="absolute inset-0 flex flex-col justify-center px-[8%] text-white animate-fade-in">
            <p className="text-[10px] sm:text-xs text-blue-200">For authorized government personnel</p>
            <p className="mt-1 text-base sm:text-2xl font-bold leading-tight">Pre-Disaster Risk Assessment<br />for Gingoog City</p>
            <div className="mt-3 sm:mt-5 flex gap-2">
              <span className="rounded-md bg-white text-blue-900 text-[10px] sm:text-sm font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2">Sign in to PDRA</span>
              <span className="relative rounded-md border border-white/40 text-[10px] sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 ring-4 ring-yellow-300/80 animate-pulse">
                Request an account
                <MousePointer2 size={20} className="absolute -right-3 -bottom-4 text-white fill-white drop-shadow" aria-hidden="true" />
              </span>
            </div>
          </div>
        )}

        {/* Scene: the form */}
        {s.view === 'form' && (
          <div key="form" className="absolute inset-0 flex items-center justify-center p-[3%] animate-fade-in">
            <div className="w-full max-w-[560px] bg-white rounded-xl shadow-2xl p-3 sm:p-5 text-left">
              <p className="text-[11px] sm:text-base font-semibold text-gray-900">Request an Account</p>
              <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2.5">
                {[
                  ['name', 'Full Name', 'Juan Dela Cruz'],
                  ['email', 'Email Address', 'you@example.com'],
                  ['contact', 'Contact Number', '09XXXXXXXXX'],
                  ['barangay', 'Barangay', 'Select your barangay…'],
                  ['position', 'Position', 'e.g. Barangay Secretary'],
                ].map(([key, label, ph]) => {
                  const isActive = active === key
                  const value = typed[key]
                  return (
                    <div key={key} className={key === 'position' ? 'col-span-2' : ''}>
                      <p className="text-[8px] sm:text-xs font-medium text-gray-600 mb-0.5">{label}{key !== 'position' && <span className="text-red-500">*</span>}</p>
                      <div className={`relative h-5 sm:h-8 rounded border text-[8px] sm:text-xs px-1.5 sm:px-2.5 flex items-center justify-between transition-all duration-300 ${isActive ? 'border-primary-500 ring-2 ring-primary-300' : 'border-gray-300'}`}>
                        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                          {value || ph}
                          {isActive && value !== SCENES[scene].type && <span className="inline-block w-px h-2.5 sm:h-3.5 bg-gray-900 ml-px align-middle animate-pulse" />}
                        </span>
                        {key === 'barangay' && <ChevronDown size={12} className="text-gray-400" aria-hidden="true" />}
                        {isActive && <MousePointer2 size={16} className="absolute -right-1 top-3 sm:top-5 text-gray-900 fill-white drop-shadow" aria-hidden="true" />}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className={`relative mt-2 sm:mt-4 rounded bg-primary-600 text-white text-[9px] sm:text-sm font-medium text-center py-1 sm:py-2 transition-all duration-300 ${active === 'submit' ? 'ring-4 ring-yellow-300/80 scale-[1.02]' : ''}`}>
                Submit Request
                {active === 'submit' && <MousePointer2 size={18} className="absolute right-[30%] top-3 sm:top-5 text-gray-900 fill-white drop-shadow" aria-hidden="true" />}
              </div>
            </div>
          </div>
        )}

        {/* Scene: done */}
        {s.view === 'done' && (
          <div key="done" className="absolute inset-0 flex items-center justify-center p-[4%] animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 text-center max-w-[420px]">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-modal-in">
                <Check size={20} className="text-green-600" aria-hidden="true" />
              </div>
              <p className="mt-2 text-xs sm:text-lg font-semibold text-gray-900">Request sent</p>
              <p className="mt-1 text-[9px] sm:text-sm text-gray-500">CDRRMO reviews your request, then emails your username and password to {SAMPLE.email}.</p>
            </div>
          </div>
        )}

        {/* Start overlay */}
        {!started && (
          <button type="button" onClick={() => start(0)} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-blue-950/80 backdrop-blur-[2px] hover:bg-blue-950/75 transition-colors group" aria-label="Play tutorial: how to request an account">
            <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-primary-700 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <Play size={26} className="ml-1 fill-current" aria-hidden="true" />
            </span>
            <span className="text-white text-sm sm:text-base font-semibold drop-shadow">How to request an account</span>
            <span className="text-blue-100 text-xs">About 1 minute · with voice</span>
          </button>
        )}
      </div>

      {/* Captions — under the picture so they never cover the form */}
      <div className="min-h-[3.25rem] px-4 py-2.5 bg-black text-center flex items-center justify-center" aria-live="polite">
        <p key={started ? scene : 'idle'} className="text-xs sm:text-sm text-white leading-snug animate-fade-in">
          {started ? s.say : 'Press play to start the tutorial.'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 bg-gray-900 text-white">
        <button type="button" onClick={started ? togglePlay : () => start(0)} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <button type="button" onClick={restart} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" aria-label="Restart">
          <RotateCcw size={16} aria-hidden="true" />
        </button>

        {/* Progress: one segment per step, click to jump */}
        <div className="flex-1 flex gap-1" role="group" aria-label="Tutorial steps">
          {SCENES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => seek(i)}
              aria-label={`Step ${i + 1}`}
              aria-current={i === scene ? 'step' : undefined}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i < scene || (i === scene && started) ? 'bg-primary-400' : 'bg-white/20 hover:bg-white/35'}`}
            />
          ))}
        </div>

        <span className="text-xs text-gray-400 tabular-nums w-9 text-right">{scene + 1}/{SCENES.length}</span>
        <button
          type="button"
          onClick={toggleMute}
          disabled={!canSpeak}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-40"
          aria-label={muted ? 'Turn voice on' : 'Turn voice off'}
          title={canSpeak ? '' : 'This browser has no built-in voice — captions only.'}
        >
          {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}