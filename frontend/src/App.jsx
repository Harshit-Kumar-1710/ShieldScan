import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
  Sun,
  Moon,
  Shield,
  Search,
  BarChart2,
  GraduationCap,
  History as HistoryIcon,
  BookOpen,
  Lock,
  Menu,
  X
} from 'lucide-react'
import Scanner from './pages/Scanner'
import Dashboard from './pages/Dashboard'
import LearnHub from './pages/LearnHub'
import History from './pages/History'
import Docs from './pages/Docs'

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('shieldscan_theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('shieldscan_theme', dark ? 'dark' : 'light')
  }, [dark])

  const navLinks = [
    { to: '/', label: 'Scanner', icon: Search },
    { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
    { to: '/learn', label: 'Flashcards', icon: GraduationCap },
    { to: '/history', label: 'History', icon: HistoryIcon },
    { to: '/docs', label: 'Docs', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* ── Glassmorphism Sticky Navbar ── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl border-b transition-all"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between min-h-16 py-2 gap-3">
          {/* Brand Logo & Live Engine Status */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center pulse-glow transition-transform group-hover:scale-105"
                style={{ background: 'var(--accent)' }}
              >
                <Shield size={18} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                  ShieldScan
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  XSS Detection System
                </span>
              </div>
            </NavLink>

            {/* Live Model Badge */}
            <div
              className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ml-2 border"
              style={{
                background: 'var(--accent-light)',
                color: 'var(--accent-text)',
                borderColor: 'var(--accent)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Calibrated SVM · 99.8% F1</span>
            </div>
          </div>

          {/* Navigation Links & Theme Switcher */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive ? 'active-nav shadow-sm' : 'inactive-nav hover:opacity-80'
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  })}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all btn-ghost"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? (
                <Sun size={15} style={{ color: 'var(--accent)' }} />
              ) : (
                <Moon size={15} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center btn-ghost"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t px-4 py-3 animate-fsu" style={{ borderColor: 'var(--border)', background: 'var(--nav-bg)' }}>
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold"
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--accent-light)' : 'var(--bg-subtle)',
                    color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  })}
                >
                  <Icon size={16} />{label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── Main Application Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Routes>
          <Route path="/" element={<Scanner />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn" element={<LearnHub />} />
          <Route path="/history" element={<History />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>

      {/* ── Enterprise Footer ── */}
      <footer className="mt-auto border-t py-6" style={{ borderColor: 'var(--border)', background: 'var(--nav-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-2">
            <Lock size={13} className="text-emerald-400" />
            <span className="font-medium">100% On-Premise ML Execution · Zero Third-Party Payload Transmission</span>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end gap-x-3 gap-y-1">
            <span>Calibrated Linear SVM</span><span aria-hidden="true">·</span>
            <span>Character TF-IDF (2–5 n-grams)</span><span aria-hidden="true">·</span>
            <span>18 Security Indicators</span><span aria-hidden="true">·</span><span>OWASP Aligned</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
