const CATEGORIES = [
  { trait: 'Strateg',           patterns: ['sjakk', 'chess', 'poker', 'majer', 'canasta', 'stein', 'saks'] },
  { trait: 'Presisjonsskytter', patterns: ['dart', 'bue', 'pil'] },
  { trait: 'Atlet',             patterns: ['løp', 'sprint', 'svøm', 'sykkel', 'klatr', 'tautrekk', 'hopp'] },
  { trait: 'Ballekspert',       patterns: ['fotball', 'basket', 'tennis', 'badminton', 'volleyball', 'håndball'] },
  { trait: 'Mesterkaster',      patterns: ['golf', 'disc', 'frisbee', 'bowl', 'bocce', 'petanq', 'kast'] },
  { trait: 'Festløve',          patterns: ['hansa', 'øl', 'pils', 'drink'] },
  { trait: 'Kunnskapsrik',      patterns: ['quiz', 'trivia', 'geografi', 'kunnskap'] },
  { trait: 'Koordinert',        patterns: ['bomull', 'balanse', 'akrobat'] },
]

function getCategory(name) {
  const lower = name.toLowerCase()
  for (const { trait, patterns } of CATEGORIES) {
    if (patterns.some(p => lower.includes(p))) return trait
  }
  return null
}

// results: array of { event: { name }, placement }
export function computeKeywords(results) {
  const stats = {}
  for (const r of results) {
    const cat = getCategory(r.event.name)
    if (!cat) continue
    if (!stats[cat]) stats[cat] = { total: 0, count: 0 }
    stats[cat].total += r.placement
    stats[cat].count++
  }
  return Object.entries(stats)
    .sort(([, a], [, b]) => (a.total / a.count) - (b.total / b.count))
    .slice(0, 3)
    .map(([trait]) => trait)
}
