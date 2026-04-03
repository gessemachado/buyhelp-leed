import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/home',     icon: 'home',        label: 'Home' },
  { path: '/leads',    icon: 'leaderboard', label: 'Leads' },
  { path: '/settings', icon: 'settings',    label: 'Config.' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t border-outline-variant/20 rounded-t-3xl shadow-float"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-4">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center px-5 py-2 rounded-2xl transition-all duration-200 active:scale-90 ${
                active
                  ? 'bg-primary-fixed text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[26px] mb-0.5 ${active ? 'icon-filled' : ''}`}>
                {tab.icon}
              </span>
              <span className="font-label text-[10px] font-semibold uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
