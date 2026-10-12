import { NavLink } from 'react-router-dom'

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }

const icons = {
  today: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  kast: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <path d="M12 7a2 2 0 1 1 2-2c0 1.1-.9 1.5-2 2.3V9" />
      <path d="M12 9 3.2 15.4A1.5 1.5 0 0 0 4.1 18h15.8a1.5 1.5 0 0 0 .9-2.6L12 9Z" />
    </svg>
  ),
  stats: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <path d="M21 21H4a1 1 0 0 1-1-1V3" />
      <path d="M7 14l4-4 4 4 5-6" />
    </svg>
  ),
  meer: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" />
    </svg>
  ),
}

const tabs = [
  { to: '/', label: 'Vandaag', icon: 'today', exact: true },
  { to: '/kast', label: 'Kast', icon: 'kast' },
  { to: '/statistieken', label: 'Statistieken', icon: 'stats' },
  { to: '/meer', label: 'Meer', icon: 'meer' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-nav)', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="flex">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            replace
            className="flex flex-col items-center justify-center flex-1 py-2.5 gap-1 text-[10px] font-medium"
            style={({ isActive }) => ({ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' })}
          >
            {({ isActive }) => (
              <>
                <div className="w-6 h-6">{icons[tab.icon](isActive ? 2.2 : 1.8)}</div>
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
