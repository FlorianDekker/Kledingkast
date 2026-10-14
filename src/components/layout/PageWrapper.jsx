/**
 * Pagina met een grote titel zoals in iOS-apps. `eyebrow` staat klein boven de
 * titel, `right` rechts ernaast (knoppen).
 */
export function PageWrapper({ children, title, eyebrow, right, className = '' }) {
  return (
    <div className={`flex flex-col min-h-full pb-28 animate-fade-in overflow-x-hidden ${className}`}>
      {title && (
        <div className="safe-top px-5 pb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            <h1 className="font-display text-[34px] leading-none m-0" style={{ color: 'var(--color-text)' }}>{title}</h1>
          </div>
          {right}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  )
}
