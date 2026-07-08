import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Button } from '../ui/Button'

export function AppLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-ink-50 dark:from-ink-950 dark:to-ink-900 text-ink-900 dark:text-ink-100">
      <header className="glass sticky top-0 z-20 flex items-center justify-between px-6 py-3">
        <Link to="/trees" className="text-lg font-semibold tracking-tight">
          🌳 <span className="ml-1">Family Tree</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-full p-2 text-lg hover:bg-ink-200/60 dark:hover:bg-ink-800/60"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user && (
            <>
              <span className="hidden text-sm text-ink-500 dark:text-ink-400 sm:inline">
                {user.full_name || user.email}
              </span>
              <Button variant="secondary" onClick={logout}>
                Log out
              </Button>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
