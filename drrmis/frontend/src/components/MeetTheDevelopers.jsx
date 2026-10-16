import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Facebook } from 'lucide-react'

// "Meet the Developers" — full-screen panel opened from the landing page
// footer. To update a member: edit the TEAM list below.
//  - photo:    put the picture in drrmis/frontend/public/team/ (e.g.
//              public/team/loyd.jpg) and write '/team/loyd.jpg'. Leave it
//              blank ('') to show the person's initials instead.
//  - facebook: full link to the Facebook profile, or '' to hide the button.
const TEAM = [
  {
    name: 'Lourynz Glier Alicer',
    role: 'Project Manager',
    text: 'Plans the project and keeps the team on schedule.',
    photo: '/team/lourynz.jpg',
    facebook: ''
  },
  {
    name: 'John Lloyd Obligacion',
    role: 'Technical Lead',
    text: 'Builds the system, the database and the hazard map.',
    photo: '/team/loyd.jpg',
    facebook: ''
  },
  {
    name: 'Januarene Fernandez',
    role: 'Research Lead',
    text: 'Gathers the data and studies the hazard maps and related works.',
    photo: '/team/januarene.jpg',
    facebook: ''
  },
  {
    name: 'Tristan Jan Enriquez',
    role: 'Documentation Lead',
    text: 'Writes the paper, the user manual and the system guides.',
    photo: '/team/tristan.jpg',
    facebook: ''
  },
]

const initials = (name) => name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()

// Small dots that slowly drift and twinkle in the background (CSS only;
// stops for users who turned on "reduce motion").
const DOTS = [
  [8, 12, 4], [22, 70, 3], [35, 18, 5], [48, 85, 3], [62, 8, 4], [74, 55, 3],
  [86, 22, 5], [93, 78, 3], [15, 45, 3], [55, 40, 2], [80, 92, 4], [4, 88, 3],
  [28, 35, 2], [42, 60, 3], [68, 30, 2], [90, 50, 3], [12, 62, 2], [58, 72, 3],
]

function Avatar({ person }) {
  const [failed, setFailed] = useState(!person.photo)
  return (
    <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full p-[3px] bg-white/90 shadow-[0_0_28px_rgba(147,197,253,.35)]">
      {failed ? (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-700 to-blue-950 flex items-center justify-center text-4xl font-bold text-white">
          {initials(person.name)}
        </div>
      ) : (
        <img
          src={person.photo}
          alt={person.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full rounded-full object-cover"
        />
      )}
    </div>
  )
}

export default function MeetTheDevelopers({ open, onClose }) {
  // Close with Esc, and stop the page behind from scrolling while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="devs-title"
      className="fixed inset-0 z-[3000] overflow-y-auto bg-gradient-to-b from-blue-950 via-blue-900 to-blue-800 text-white animate-fade-in"
    >
      {/* soft glow + dots */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <svg className="absolute bottom-0 left-0 w-full h-40 md:h-56 opacity-90" viewBox="0 0 800 220" preserveAspectRatio="none">
          <path d="M0 220 L0 150 L90 90 L160 150 L230 60 L310 150 L400 100 L470 150 L560 70 L650 150 L720 110 L800 150 L800 220 Z" fill="#0c1f4a" opacity="0.6" />
          <path d="M0 220 L0 180 L120 140 L210 180 L300 130 L390 180 L480 140 L570 180 L660 150 L800 180 L800 220 Z" fill="#0a1836" opacity="0.85" />
        </svg>
        <style>{`
          @keyframes dev-float { 0%,100% { transform: translate(0,0); opacity:.35 } 50% { transform: translate(var(--dx),var(--dy)); opacity:.9 } }
          @keyframes dev-glow  { 0%,100% { transform: translate(-50%,0) scale(1); opacity:.5 } 50% { transform: translate(-50%,30px) scale(1.12); opacity:.8 } }
          .dev-dot  { animation: dev-float var(--t) ease-in-out var(--delay) infinite; }
          .dev-glow { animation: dev-glow 12s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .dev-dot, .dev-glow { animation: none; } }
        `}</style>
        <div className="dev-glow absolute -top-40 left-1/2 w-[900px] h-[600px] rounded-full bg-blue-500/20 blur-3xl" />
        {DOTS.map(([x, y, s], i) => (
          <span
            key={i}
            className="dev-dot absolute rounded-full bg-blue-200/60"
            style={{
              left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2,
              '--dx': `${(i % 2 ? 1 : -1) * (12 + (i * 7) % 20)}px`,
              '--dy': `${-(30 + (i * 13) % 40)}px`,
              '--t': `${7 + (i % 5) * 2}s`,
              '--delay': `${-(i * 1.3)}s`,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 sm:top-6 sm:right-8 z-10 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={30} />
      </button>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center">
          <h2 id="devs-title" className="land-in text-4xl sm:text-6xl font-extrabold leading-tight text-white">
            System<br />Developers
          </h2>
          <p style={{ '--d': '100ms' }} className="land-in mt-5 max-w-xl mx-auto text-blue-200 leading-relaxed">
            We are a group of IT students from Gingoog City Colleges, Inc. who built PDRA, the Pre-Disaster Risk Assessment System for the Gingoog City CDRRMO.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((p, i) => (
            <div
              key={p.name}
              style={{ '--d': `${180 + i * 90}ms` }}
              className="land-in rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm px-5 py-8 flex flex-col items-center text-center"
            >
              <Avatar person={p} />
              <h3 className="mt-6 text-lg font-semibold">{p.name}</h3>
              <p className="mt-3 text-sm font-semibold tracking-[.15em] uppercase text-blue-200">{p.role}</p>
              <p className="mt-4 text-sm text-blue-100/80 leading-relaxed flex-1">{p.text}</p>
              {p.facebook && (
                <a
                  href={p.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${p.name} on Facebook`}
                  className="mt-6 w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Facebook size={18} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}