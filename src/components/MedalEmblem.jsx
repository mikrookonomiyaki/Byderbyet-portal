export default function MedalEmblem({ year, type }) {
  const id = `medal-${type}-${year}`

  const colors = type === 'solv' ? {
    ribbonA: '#94a3b8',
    ribbonB: '#64748b',
    gradHigh: '#f1f5f9',
    gradMid: '#cbd5e1',
    gradBase: '#94a3b8',
    rim: '#64748b',
    inner: '#475569',
    text: '#1e293b',
  } : {
    ribbonA: '#c2956c',
    ribbonB: '#92400e',
    gradHigh: '#fef3c7',
    gradMid: '#f59e0b',
    gradBase: '#cd7f32',
    rim: '#92400e',
    inner: '#92400e',
    text: '#451a03',
  }

  return (
    <svg viewBox="0 0 44 64" width="44" height="64" xmlns="http://www.w3.org/2000/svg" aria-label={`${type === 'solv' ? 'Sølv' : 'Bronse'} ${year}`}>
      <defs>
        <radialGradient id={`${id}-grad`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={colors.gradHigh} />
          <stop offset="45%" stopColor={colors.gradMid} />
          <stop offset="100%" stopColor={colors.gradBase} />
        </radialGradient>
      </defs>
      <rect x="14" y="0" width="7" height="22" rx="2" fill={colors.ribbonA} />
      <rect x="23" y="0" width="7" height="22" rx="2" fill={colors.ribbonB} />
      <circle cx="22" cy="45" r="19" fill="rgba(0,0,0,0.07)" />
      <circle cx="22" cy="43" r="19" fill={`url(#${id}-grad)`} />
      <circle cx="22" cy="43" r="14" fill="none" stroke={colors.inner} strokeWidth="0.8" opacity="0.3" />
      <circle cx="22" cy="43" r="19" fill="none" stroke={colors.rim} strokeWidth="1.5" />
      <text
        x="22"
        y="43"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        fontWeight="800"
        fill={colors.text}
        fontFamily="system-ui, sans-serif"
      >
        {year}
      </text>
    </svg>
  )
}
