import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Sun, Moon, Shield } from 'lucide-react'
import Scanner from './pages/Scanner'
import Dashboard from './pages/Dashboard'
import History from './pages/History'

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('shieldscan_theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('shieldscan_theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center pulse-glow"
              style={{ background: 'var(--accent)' }}
            >
              <Shield size={15} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
              ShieldScan
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold border"
              style={{
                background: 'var(--accent-light)',
                color: 'var(--accent-text)',
                borderColor: 'var(--accent)',
                opacity: 0.9,
              }}
            >
              AI-Powered
            </span>
          </div>

          {/* Nav links + toggle */}
          <div className="flex items-center gap-1">
            {[
              { to: '/', label: 'Scanner' },
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/history', label: 'History' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'active-nav' : 'inactive-nav'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                })}
              >
                {label}
              </NavLink>
            ))}

            {/* Theme toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="ml-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all btn-ghost"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? (
                <Sun size={16} style={{ color: 'var(--accent)' }} />
              ) : (
                <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Pages ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Scanner />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  )
}
