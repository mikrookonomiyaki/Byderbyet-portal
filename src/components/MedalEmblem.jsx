export default function MedalEmblem({ year, type }) {
  const id = `medal-${type}-${year}`

  const colors = type === 'solv' ? {
    ribbonA: '#6c757d',
    ribbonB: '#495057',
    gradHigh: '#e2e6ea',
    gradMid: '#adb5bd',
    gradBase: '#6c757d',
    rim: '#495057',
    inner: '#495057',
    text: '#212529',
  } : {
    ribbonA: '#a07828',
    ribbonB: '#6b4f10',
    gradHigh: '#e8cfa0',
    gradMid: '#b8860b',
    gradBase: '#8b6914',
    rim: '#6b4f10',
    inner: '#6b4f10',
    text: '#3d2b00',
  }

  return (
    <svg viewBox="0 0 44 64" width="57.75" height="84.15" xmlns="http://www.w3.org/2000/svg" aria-label={`${type === 'solv' ? 'Sølv' : 'Bronse'} ${year}`}>
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
