import { NavLink } from 'react-router-dom'

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }

const icons = {
  today: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <path d="M12 6.5a1.6 1.6 0 1 1 1.6-1.6c0 .9-.7 1.3-1.6 1.9V8" />
      <path d="M12 8 3.6 14.2a1.3 1.3 0 0 0 .8 2.3h15.2a1.3 1.3 0 0 0 .8-2.3L12 8Z" />
      <path d="M7 20h10" />
    </svg>
  ),
  kast: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M12 3v18M10 11v2M14 11v2" />
    </svg>
  ),
  stats: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <path d="M5 20V11M12 20V5M19 20v-6" />
    </svg>
  ),
  meer: w => (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} strokeWidth={w}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth={w + 0.8} />
    </svg>
  ),
}

const tabs = [
  { to: '/', label: 'Vandaag', icon: 'today', exact: true },
  { to: '/kast', label: 'Kast', icon: 'kast' },
  { to: '/statistieken', label: 'Inzicht', icon: 'stats' },
  { to: '/meer', label: 'Meer', icon: 'meer' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom glass" style={{ boxShadow: 'var(--shadow-nav)' }}>
      <div className="flex">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            replace
            className="flex flex-col items-center justify-center flex-1 pt-2 pb-1.5 gap-0.5 text-[10px] font-medium tracking-wide"
            style={({ isActive }) => ({ color: isActive ? 'var(--color-text)' : 'var(--color-muted)' })}
          >
            {({ isActive }) => (
              <>
                <div className="w-6 h-6">{icons[tab.icon](isActive ? 1.9 : 1.5)}</div>
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
