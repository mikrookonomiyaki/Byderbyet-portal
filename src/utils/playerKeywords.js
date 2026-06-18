const ELITE = 2.5
const GOOD  = 5.5

export const CATEGORIES = [
  {
    key: 'presisjon',
    label: 'Presisjon',
    patterns: ['dart', 'bue', 'pil', 'skyting', 'blink', 'pong', 'spiker'],
    elite: 'Snikskytter',
    good:  'Presisjonsskytter',
  },
  {
    key: 'strategi',
    label: 'Strategi',
    patterns: ['sjakk', 'chess', 'poker', 'majer', 'canasta', 'bridge', 'stein', 'saks', 'kortspill'],
    elite: 'Stormester',
    good:  'Strateg',
  },
  {
    key: 'ballsport',
    label: 'Ballsport',
    patterns: ['fotball', 'basket', 'tennis', 'badminton', 'volleyball', 'håndball', 'padel',
               'squash', 'bordtennis', 'spikeball', 'slåball', 'ball'],
    elite: 'Ballkunstner',
    good:  'Ballspiller',
  },
  {
    key: 'kasting',
    label: 'Kasting',
    patterns: ['golf', 'disc', 'frisbee', 'bocce', 'petanq', 'støvel', 'papirfly', 'kast'],
    elite: 'Mesterkaster',
    good:  'Kastetalent',
  },
  {
    key: 'kunnskap',
    label: 'Kunnskap',
    patterns: ['quiz', 'trivia', 'geografi', 'kunnskap', 'tippelapp', 'tippe', 'ord'],
    elite: 'Allviter',
    good:  'Kunnskapsrik',
  },
  {
    key: 'koordinasjon',
    label: 'Koordinasjon',
    patterns: ['bomull', 'balanse', 'akrobat', 'ballongl', 'balloon', 'wheels', 'hopp', 'hinderbane'],
    elite: 'Akrobat',
    good:  'Koordinert',
  },
  {
    key: 'utholdenhet',
    label: 'Utholdenhet',
    patterns: ['løp', 'sprint', 'sykkel', 'svøm', 'klatr', 'maraton', 'potet', 'vandring'],
    elite: 'Jernmann',
    good:  'Utholdende',
  },
  {
    key: 'kreativitet',
    label: 'Kreativitet',
    patterns: ['dans', 'musikk', 'sang', 'tegn', 'mal', 'beats', 'sing'],
    elite: 'Scenekunstner',
    good:  'Kreativ',
  },
  {
    key: 'styrke',
    label: 'Styrke',
    patterns: ['tautrekk', 'vektløft', 'arm', 'styrke', 'bryting', 'kamp'],
    elite: 'Kraftkar',
    good:  'Sterk',
  },
]

export const DUEL_CAT = { key: 'duell', label: 'Duell', elite: 'Gladiator', good: 'Duellant' }

export const ALL_CATEGORIES = [...CATEGORIES, DUEL_CAT]

export function getCategoryByKey(key) {
  return ALL_CATEGORIES.find(c => c.key === key) ?? null
}

export function getCategory(eventName) {
  const lower = eventName.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.patterns.some(p => lower.includes(p))) return cat
  }
  return null
}

// results: array of { event: { name, is_duel }, placement }
// Returns: { adjective, isElite, categoryKey }[]
export function computeKeywords(results) {
  const stats = {}

  for (const r of results) {
    const cat = r.event.is_duel ? DUEL_CAT : getCategory(r.event.name)
    if (!cat) continue
    if (!stats[cat.key]) stats[cat.key] = { cat, placements: [] }
    stats[cat.key].placements.push(r.placement)
  }

  const keywords = []

  for (const { cat, placements } of Object.values(stats)) {
    const avg = placements.reduce((s, p) => s + p, 0) / placements.length
    let adjective = null
    let isElite = false
    let sortKey = avg

    if (cat.key === 'duell') {
      const winRate = placements.filter(p => p === 1).length / placements.length
      if (winRate >= 0.6) { adjective = cat.elite; isElite = true }
      else if (winRate >= 0.4) { adjective = cat.good }
      sortKey = 1 - winRate
    } else {
      if (avg <= ELITE) { adjective = cat.elite; isElite = true }
      else if (avg <= GOOD) { adjective = cat.good }
    }

    if (adjective) keywords.push({ adjective, isElite, categoryKey: cat.key, sortKey })
  }

  return keywords
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, 3)
}
