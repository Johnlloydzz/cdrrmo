import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Map, Users, Waves, Bell, ShieldCheck, Building2, Home,
  ClipboardList, AlertTriangle, Lock, Phone, MapPin, ArrowRight, Menu, X, Mountain, CloudRain, Check,
} from 'lucide-react'
import CookieConsent from '../../components/CookieConsent'
import RequestAccountTutorial from '../../components/RequestAccountTutorial'
import MeetTheDevelopers from '../../components/MeetTheDevelopers'

// Public landing page for government staff (CDRRMO Personnel and Barangay
// Officials). Styled after the official LGU site: a "Republic of the
// Philippines" strip with Philippine Standard Time, an official header, then
// what PDRA does, who it's for, and how to get access. No public sign-up —
// accounts are requested and approved by CDRRMO.

// CDRRMO logo: small WebP (~35 KB, preloaded) with the PNG as a fallback.
function Seal({ className, size }) {
  return (
    <picture>
      <source srcSet="/cdrrmo-logo-256.webp" type="image/webp" />
      <img src="/cdrrmo-logo.png" alt="Gingoog City CDRRMO" width={size} height={size} decoding="async" className={className} />
    </picture>
  )
}

// Live Philippine Standard Time, like the LGU website's header.
function PhilippineTime() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const date = now.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const time = now.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit' })
  return (
    <span className="tabular-nums">
      <span className="hidden sm:inline">Philippine Standard Time: </span>
      <span className="font-semibold text-white">{time}</span>
      <span className="hidden md:inline"> · {date}</span>
    </span>
  )
}

const NAV = [
  { id: 'features', label: 'Features' },
  { id: 'roles', label: 'Who it’s for' },
  { id: 'how', label: 'How it works' },
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'contact', label: 'Contact' },
]

const FEATURES = [
  { icon: LayoutDashboard, title: 'Risk Assessment Dashboard', text: 'See which barangays, puroks and households fall inside high flood-risk zones, with the projected population at risk.' },
  { icon: Map, title: 'Hazard Map & Geofencing', text: 'Flood and landslide susceptibility on one map. Puroks inside a flood-prone area are flagged automatically.' },
  { icon: Users, title: 'Household & Population Registry', text: 'Barangays register residents and households per purok, so every family is counted where they live.' },
  { icon: Waves, title: 'Live Flood Monitoring', text: 'Rainfall and river discharge readings with PAGASA rainfall warnings, plus the flood level reported by CDRRMO.' },
  { icon: Bell, title: 'Role-based Notifications', text: 'CDRRMO and each barangay receive only the alerts meant for them: flood levels, new requests, classification updates.' },
  { icon: ShieldCheck, title: 'Secure Access', text: 'Accounts are created and approved by CDRRMO. Each official sees only their own barangay’s records.' },
]

const ROLES = [
  {
    icon: Building2,
    title: 'CDRRMO Personnel',
    lead: 'City-wide view and control',
    items: [
      'Monitor all 79 barangays on the Risk Assessment Dashboard',
      'Classify barangay and purok flood and landslide risk',
      'Report the actual flood level during an event',
      'Approve account requests and manage users',
    ],
  },
  {
    icon: Home,
    title: 'Barangay Officials',
    lead: 'Your barangay’s records',
    items: [
      'Set up puroks and draw their boundaries',
      'Register residents and households per purok',
      'Receive flood alerts for your barangay',
      'See which of your households are at risk',
    ],
  },
]

const STEPS = [
  { icon: ClipboardList, title: 'Barangays register', text: 'Puroks, residents and households are recorded by each Barangay Official.' },
  { icon: Map, title: 'CDRRMO classifies', text: 'Hazard areas and purok risk levels are set from the city’s CDRA data.' },
  { icon: Waves, title: 'Conditions are monitored', text: 'Rainfall, river levels and reported flood levels are checked every five minutes.' },
  { icon: AlertTriangle, title: 'At-risk households are flagged', text: 'Everyone sees who needs help first, before the disaster happens.' },
]

const HAZARDS = [
  { icon: Waves, label: 'Flood' },
  { icon: Mountain, label: 'Landslide' },
  { icon: CloudRain, label: 'Storm' },
  { icon: AlertTriangle, label: 'Emergency' },
]

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [devsOpen, setDevsOpen] = useState(false)
  const go = (id) => { setMenuOpen(false); scrollToId(id) }
  const pageRef = useRef(null)

  // Start the hero entrance only when the page can actually be seen: after
  // the logo is decoded and the first frame is painted, and (if the tab was
  // opened in the background) once the tab is shown. Before, on a slow first
  // load or a background tab, the animation had already finished by the time
  // anything appeared, so it looked like there was none. Coming back with the
  // browser's Back button (page restored from cache) plays it again.
  const [ready, setReady] = useState(false)
  const [replay, setReplay] = useState(0)
  useEffect(() => {
    let cancelled = false, raf1 = 0, raf2 = 0
    const start = () => {
      raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => { if (!cancelled) setReady(true) }) })
    }
    const whenVisible = () => new Promise(resolve => {
      if (document.visibilityState === 'visible') return resolve()
      const on = () => { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', on); resolve() } }
      document.addEventListener('visibilitychange', on)
    })
    const imgs = [...(pageRef.current?.querySelectorAll('header img, .land-pop img') || [])]
    const imagesReady = Promise.all(imgs.map(img => {
      if (img.complete) return null
      const p = img.decode ? img.decode() : new Promise(r => { img.onload = img.onerror = r })
      return p.catch(() => {})
    }))
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    const giveUp = new Promise(r => setTimeout(r, 1200)) // never wait longer than this
    Promise.race([Promise.all([imagesReady, fontsReady]), giveUp]).catch(() => {}).then(whenVisible).then(start)

    const onShow = (e) => { if (e.persisted) setReplay(n => n + 1) }
    window.addEventListener('pageshow', onShow)
    return () => { cancelled = true; cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('pageshow', onShow) }
  }, [])

  // Sections slide/fade in as they scroll into view (each once), so the page
  // feels alive instead of everything appearing at once.
  useEffect(() => {
    const els = pageRef.current?.querySelectorAll('[data-reveal]') || []
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-visible')); return }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={pageRef} className={`min-h-screen bg-white text-gray-800 land-wait ${ready ? 'land-ready' : ''}`}>
      {/* Government strip */}
      <div className="bg-blue-950 text-blue-200 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-4">
          <span>Republic of the Philippines</span>
          <PhilippineTime />
        </div>
      </div>

      {/* Header */}
      <header key={`h${replay}`} className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 land-down">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0" aria-label="PDRA home">
            <Seal size={40} className="w-10 h-10 object-contain flex-shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block text-[11px] uppercase tracking-wide text-gray-500 truncate"><span className="hidden sm:inline">City Government of Gingoog</span><span className="sm:hidden">Gingoog City</span></span>
              <span className="block font-bold text-gray-900 truncate">PDRA · CDRRMO</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7" aria-label="Main">
            {NAV.map(n => (
              <button key={n.id} type="button" onClick={() => go(n.id)} className="text-sm text-gray-600 hover:text-primary-700 transition-colors">
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-primary text-sm px-4 py-2 whitespace-nowrap transition-all active:scale-[0.98]">Sign in</Link>
            <button type="button" onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-gray-100 px-4 py-2 animate-slide-down-in" aria-label="Main (mobile)">
            {NAV.map(n => (
              <button key={n.id} type="button" onClick={() => go(n.id)} className="block w-full text-left py-2.5 text-sm text-gray-700">{n.label}</button>
            ))}
          </nav>
        )}
      </header>

      <main>
        {/* Hero */}
        <section key={`s${replay}`} className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
          <svg className="absolute bottom-0 left-0 w-full h-32 md:h-48 opacity-90 pointer-events-none" viewBox="0 0 800 220" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 220 L0 150 L90 90 L160 150 L230 60 L310 150 L400 100 L470 150 L560 70 L650 150 L720 110 L800 150 L800 220 Z" fill="#0c1f4a" opacity="0.6" />
            <path d="M0 220 L0 180 L120 140 L210 180 L300 130 L390 180 L480 140 L570 180 L660 150 L800 180 L800 220 Z" fill="#0a1836" opacity="0.85" />
          </svg>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-28 md:pt-24 md:pb-40 grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div>
              <p style={{ '--d': '80ms' }} className="land-in inline-flex items-center gap-2 text-xs font-medium text-blue-100 bg-white/10 border border-white/15 rounded-full px-3 py-1">
                <Lock size={12} aria-hidden="true" /> For authorized government personnel
              </p>
              <h1 style={{ '--d': '170ms' }} className="land-in mt-5 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight [text-wrap:balance]">
                Pre-Disaster Risk Assessment for Gingoog City
              </h1>
              <p style={{ '--d': '260ms' }} className="land-in mt-5 text-blue-100 text-base md:text-lg max-w-xl leading-relaxed">
                One system for the City Disaster Risk Reduction and Management Office and every barangay — to know who is at risk, and act before disaster strikes.
              </p>
              <div style={{ '--d': '350ms' }} className="land-in mt-8 flex flex-wrap gap-3">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-900 font-semibold px-5 py-3 hover:bg-blue-50 transition-all active:scale-[0.98]">
                  Sign in to PDRA <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link to="/request-account" className="inline-flex items-center gap-2 rounded-lg border border-white/30 text-white font-medium px-5 py-3 hover:bg-white/10 transition-colors">
                  Request access
                </Link>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-center text-center">
              <div style={{ '--d': '220ms' }} className="land-pop">
                <Seal size={176} className="w-44 h-44 object-contain drop-shadow-2xl" />
              </div>
              <p style={{ '--d': '420ms' }} className="land-in mt-5 text-sm font-semibold tracking-wide">Assessing Risk. Protecting Lives.</p>
              <ul className="mt-5 flex gap-5" aria-label="Hazards covered">
                {HAZARDS.map(({ icon: Icon, label }, i) => (
                  <li key={label} style={{ '--d': `${500 + i * 80}ms` }} className="land-in flex flex-col items-center gap-1.5">
                    <span className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="text-[11px] text-blue-100">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
            <div data-reveal className="lg:sticky lg:top-28 self-start">
              <h2 className={`text-3xl md:text-4xl font-bold text-blue-950 tracking-tight`}>What PDRA does</h2>
              <p className="mt-4 text-gray-600 leading-relaxed max-w-md">
                One system for the hazard maps and the people they cover. Records stay with each barangay; the city sees the whole picture.
              </p>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-10">
              {FEATURES.map(({ icon: Icon, title, text }, i) => (
                <div key={title} data-reveal style={{ '--d': `${(i % 2) * 80}ms` }} className="py-6 border-t border-gray-200">
                  <dt className="flex items-center gap-3 font-semibold text-gray-900">
                    <Icon size={20} className="text-primary-700 flex-shrink-0" aria-hidden="true" />
                    {title}
                  </dt>
                  <dd className="mt-2 text-sm text-gray-600 leading-relaxed">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20 py-16 md:py-24 bg-slate-50 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 data-reveal className={`text-3xl md:text-4xl font-bold text-blue-950 tracking-tight max-w-3xl [text-wrap:balance]`}>Built for the people who keep Gingoog safe</h2>
            <div className="mt-10 grid md:grid-cols-2 gap-5">
              {ROLES.map(({ icon: Icon, title, lead, items }, i) => {
                const dark = i === 0
                return (
                  <div key={title} data-reveal style={{ '--d': `${i * 110}ms` }}
                    className={`rounded-2xl p-7 md:p-9 ${dark ? 'bg-blue-950 text-white' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${dark ? 'bg-white/10 text-white' : 'bg-primary-50 text-primary-700'}`}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className={`text-lg font-bold ${dark ? 'text-white' : 'text-blue-950'}`}>{title}</h3>
                        <p className={`text-sm ${dark ? 'text-blue-200' : 'text-gray-500'}`}>{lead}</p>
                      </div>
                    </div>
                    <ul className="mt-6 space-y-3">
                      {items.map(it => (
                        <li key={it} className={`flex gap-3 text-[15px] ${dark ? 'text-blue-50' : 'text-gray-700'}`}>
                          <Check size={18} className={`flex-shrink-0 mt-0.5 ${dark ? 'text-blue-300' : 'text-primary-600'}`} aria-hidden="true" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* How it works: a real sequence, so the steps are numbered */}
        <section id="how" className="scroll-mt-20 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 data-reveal className={`text-3xl md:text-4xl font-bold text-blue-950 tracking-tight max-w-3xl [text-wrap:balance]`}>From barangay records to early action</h2>
            <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 relative">
              <span aria-hidden="true" className="hidden lg:block absolute left-5 right-5 top-5 h-px bg-primary-200" />
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} data-reveal style={{ '--d': `${i * 90}ms` }} className="relative">
                  <span className={`relative z-10 w-10 h-10 rounded-full bg-blue-950 text-white font-bold flex items-center justify-center ring-8 ring-white`}>{i + 1}</span>
                  <h3 className="mt-5 font-semibold text-gray-900 flex items-center gap-2">
                    <Icon size={18} className="text-primary-700" aria-hidden="true" /> {title}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tutorial */}
        <section id="tutorial" className="scroll-mt-20 py-16 md:py-24 bg-slate-50 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_1.4fr] gap-10 items-center">
            <div data-reveal>
              <h2 className={`text-3xl md:text-4xl font-bold text-blue-950 tracking-tight`}>How to request an account</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                New Barangay Official? Watch this short recording of the request form being filled in, step by step, with a voice guide and captions.
              </p>
              <ol className="mt-6 space-y-3 text-sm text-gray-700">
                {[
                  'Click “Request access”.',
                  'Fill in your name, email, mobile number and barangay.',
                  'Submit. Once CDRRMO approves it, your login details are emailed to you.',
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
              <Link to="/request-account" className="mt-7 inline-flex items-center gap-2 btn-primary px-5 py-2.5 transition-all active:scale-[0.98]">
                Request access
              </Link>
            </div>
            <div data-reveal style={{ '--d': '120ms' }}>
              <RequestAccountTutorial />
            </div>
          </div>
        </section>

        {/* Access & privacy */}
        <section className="py-14 bg-blue-950 text-white">
          <div data-reveal className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold`}>Authorized personnel only</h2>
              <p className="mt-3 text-blue-200 max-w-2xl leading-relaxed">
                PDRA holds residents’ personal information. Access is limited to CDRRMO Personnel and Barangay Officials with an approved account, and all data is handled in accordance with the Data Privacy Act of 2012 (RA 10173).
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-950 font-semibold px-5 py-3 hover:bg-blue-50 transition-all active:scale-[0.98]">
                Sign in
              </Link>
              <Link to="/request-account" className="inline-flex items-center rounded-lg border border-white/30 px-5 py-3 font-medium hover:bg-white/10 transition-colors">
                Request access
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-20 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 data-reveal className={`text-3xl md:text-4xl font-bold text-blue-950 tracking-tight`}>Contact</h2>
            <div className="mt-8 grid md:grid-cols-3 gap-5">
              <div data-reveal className="rounded-2xl bg-red-600 text-white p-6">
                <Phone size={20} aria-hidden="true" />
                <h3 className="mt-3 font-semibold">In an emergency</h3>
                <p className="mt-1 text-sm text-red-100">Call the national emergency hotline.</p>
                <a href="tel:911" className={`mt-2 inline-block text-4xl font-extrabold hover:underline`}>911</a>
              </div>
              <div data-reveal style={{ '--d': '90ms' }} className="rounded-2xl border border-gray-200 p-6">
                <MapPin size={20} className="text-primary-700" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-gray-900">City Government of Gingoog</h3>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                  Peoples Palace, City Hall Complex<br />Brgy. 22-A, Gingoog City<br />Misamis Oriental 9014
                </p>
              </div>
              <div data-reveal style={{ '--d': '180ms' }} className="rounded-2xl border border-gray-200 p-6">
                <ShieldCheck size={20} className="text-primary-700" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-gray-900">Need access or help?</h3>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">Barangay Officials can request an account. Forgot your password? Reset it with a code sent to your email.</p>
                <div className="mt-3 flex flex-col gap-1.5 text-sm">
                  <Link to="/request-account" className="font-medium text-primary-700 hover:text-primary-800 underline-offset-4 hover:underline">Request access</Link>
                  <Link to="/forgot-password" className="font-medium text-primary-700 hover:text-primary-800 underline-offset-4 hover:underline">Reset your password</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-blue-950 text-blue-200 text-sm border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Seal size={32} className="w-8 h-8 object-contain" />
            <span>© {new Date().getFullYear()} Gingoog City CDRRMO. Pre-Disaster Risk Assessment System.</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-blue-300">
            <button type="button" onClick={() => setDevsOpen(true)} className="text-blue-100 hover:text-white transition-colors">
              Meet the Developers
            </button>
            <span aria-hidden="true">|</span>
            <span>Gingoog City, Misamis Oriental, Philippines</span>
          </div>
        </div>
      </footer>

      <MeetTheDevelopers open={devsOpen} onClose={() => setDevsOpen(false)} />
      <CookieConsent />
    </div>
  )
}