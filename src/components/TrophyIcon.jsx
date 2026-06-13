export default function TrophyIcon({ className, outline = false }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={outline ? 'none' : 'currentColor'}
      stroke={outline ? 'currentColor' : 'none'}
      strokeWidth={outline ? '1.5' : undefined}
      strokeLinejoin={outline ? 'round' : undefined}
      className={className}
      aria-hidden="true"
    >
      <path d="M5 2h10v5a5 5 0 01-10 0V2z"/>
      <path d="M5 3H3a2.5 2.5 0 000 5h2V3z"/>
      <path d="M15 3h2a2.5 2.5 0 010 5h-2V3z"/>
      <rect x="8.5" y="10" width="3" height="4"/>
      <rect x="5" y="14" width="10" height="2.5"/>
    </svg>
  )
}
