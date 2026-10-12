export function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap ${className}`}
      style={active
        ? { background: 'var(--color-accent)', color: '#fff' }
        : { background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
    >
      {children}
    </button>
  )
}
