import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Map, Users, Waves, Bell, ShieldCheck, Building2, Home,
  ClipboardList, AlertTriangle, Lock, Phone, MapPin, ArrowRight, Menu, X, Mountain, CloudRain,
} from 'lucide-react'
import CookieConsent from '../../components/CookieConsent'
import RequestAccountTutorial from '../../components/RequestAccountTutorial'

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
  { icon: Bell, title: 'Role-based Notifications', text: 'CDRRMO and each barangay receive only the alerts meant for them — flood levels, new requests, classification updates.' },
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
  { icon: Waves, title: 'Conditions are monitored', text: 'Rainfall, river levels and reported flood levels are checked continuously.' },
  { icon: AlertTriangle, title: 'At-risk households are flagged', text: 'Everyone sees who needs help first — before the disaster happens.' },
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
  const go = (id) => { setMenuOpen(false); scrollToId(id) }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Government strip */}
      <div className="bg-blue-950 text-blue-200 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-4">
          <span>Republic of the Philippines</span>
          <PhilippineTime />
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
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
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
          <svg className="absolute bottom-0 left-0 w-full h-32 md:h-48 opacity-90 pointer-events-none" viewBox="0 0 800 220" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 220 L0 150 L90 90 L160 150 L230 60 L310 150 L400 100 L470 150 L560 70 L650 150 L720 110 L800 150 L800 220 Z" fill="#0c1f4a" opacity="0.6" />
            <path d="M0 220 L0 180 L120 140 L210 180 L300 130 L390 180 L480 140 L570 180 L660 150 L800 180 L800 220 Z" fill="#0a1836" opacity="0.85" />
          </svg>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-28 md:pt-24 md:pb-40 grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div className="animate-login-rise">
              <p className="inline-flex items-center gap-2 text-xs font-medium text-blue-100 bg-white/10 border border-white/15 rounded-full px-3 py-1">
                <Lock size={12} aria-hidden="true" /> For authorized government personnel
              </p>
              <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight [text-wrap:balance]">
                Pre-Disaster Risk Assessment for Gingoog City
              </h1>
              <p className="mt-5 text-blue-100 text-base md:text-lg max-w-xl leading-relaxed">
                One system for the City Disaster Risk Reduction and Management Office and every barangay — to know who is at risk, and act before disaster strikes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-900 font-semibold px-5 py-3 hover:bg-blue-50 transition-all active:scale-[0.98]">
                  Sign in to PDRA <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link to="/request-account" className="inline-flex items-center gap-2 rounded-lg border border-white/30 text-white font-medium px-5 py-3 hover:bg-white/10 transition-colors">
                  Request access
                </Link>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-center text-center animate-login-rise-late">
              <Seal size={176} className="w-44 h-44 object-contain drop-shadow-2xl" />
              <p className="mt-5 text-sm font-semibold tracking-wide">Assessing Risk. Protecting Lives.</p>
              <ul className="mt-5 flex gap-5" aria-label="Hazards covered">
                {HAZARDS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex flex-col items-center gap-1.5">
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary-700">What PDRA does</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">Everything disaster preparedness needs, in one place</h2>
            </div>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <span className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20 py-16 md:py-24 bg-gray-50 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary-700">Who it’s for</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">Built for the people who keep Gingoog safe</h2>
            </div>
            <div className="mt-10 grid md:grid-cols-2 gap-5">
              {ROLES.map(({ icon: Icon, title, lead, items }) => (
                <div key={title} className="rounded-2xl bg-white border border-gray-100 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl bg-blue-900 text-white flex items-center justify-center">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900">{title}</h3>
                      <p className="text-sm text-gray-500">{lead}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {items.map(it => (
                      <li key={it} className="flex gap-2.5 text-sm text-gray-700">
                        <ShieldCheck size={16} className="text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary-700">How it works</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">From barangay records to early action</h2>
            </div>
            <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative rounded-2xl border border-gray-100 p-6">
                  <span className="absolute top-5 right-5 text-3xl font-bold text-gray-100 select-none" aria-hidden="true">{i + 1}</span>
                  <Icon size={22} className="text-primary-700" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tutorial */}
        <section id="tutorial" className="scroll-mt-20 py-16 md:py-24 bg-gray-50 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_1.4fr] gap-10 items-center">
            <div>
              <p className="text-sm font-semibold text-primary-700">Tutorial</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">How to request an account</h2>
              <p className="mt-3 text-gray-600 leading-relaxed">
                New Barangay Official? Watch this short guide — it walks you through the request form step by step, with voice and captions.
              </p>
              <ol className="mt-6 space-y-3 text-sm text-gray-700">
                {[
                  'Click “Request access”.',
                  'Fill in your name, email, mobile number and barangay.',
                  'Submit — once CDRRMO approves it, your login details are emailed to you.',
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
              <Link to="/request-account" className="mt-7 inline-flex items-center gap-2 btn-primary px-5 py-2.5 transition-all active:scale-[0.98]">
                Request access <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <RequestAccountTutorial />
          </div>
        </section>

        {/* Access & privacy */}
        <section className="py-14 bg-blue-950 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Authorized personnel only</h2>
              <p className="mt-2 text-blue-200 max-w-2xl leading-relaxed">
                PDRA holds residents’ personal information. Access is limited to CDRRMO Personnel and Barangay Officials with an approved account, and all data is handled in accordance with the Data Privacy Act of 2012 (RA 10173).
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-900 font-semibold px-5 py-3 hover:bg-blue-50 transition-all active:scale-[0.98]">
                Sign in <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to="/request-account" className="inline-flex items-center rounded-lg border border-white/30 px-5 py-3 font-medium hover:bg-white/10 transition-colors">
                Request access
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-20 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
              <Phone size={20} className="text-red-600" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-gray-900">In an emergency</h3>
              <p className="mt-1 text-sm text-gray-600">Call the national emergency hotline.</p>
              <a href="tel:911" className="mt-3 inline-block text-2xl font-bold text-red-600 hover:text-red-700">911</a>
            </div>
            <div className="rounded-2xl border border-gray-100 p-6">
              <MapPin size={20} className="text-primary-700" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-gray-900">City Government of Gingoog</h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                Peoples Palace, City Hall Complex<br />Brgy. 22-A, Gingoog City<br />Misamis Oriental 9014
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-6">
              <ShieldCheck size={20} className="text-primary-700" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-gray-900">Need access or help?</h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">Barangay Officials can request an account. Forgot your password? Reset it with a code sent to your email.</p>
              <div className="mt-3 flex flex-col gap-1.5 text-sm">
                <Link to="/request-account" className="font-medium text-primary-700 hover:text-primary-800">Request access →</Link>
                <Link to="/forgot-password" className="font-medium text-primary-700 hover:text-primary-800">Reset your password →</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Seal size={32} className="w-8 h-8 object-contain" />
            <span>© {new Date().getFullYear()} Gingoog City CDRRMO · PDRA</span>
          </div>
          <span className="text-xs text-gray-500">Gingoog City, Misamis Oriental, Philippines</span>
        </div>
      </footer>

      <CookieConsent />
    </div>
  )
}