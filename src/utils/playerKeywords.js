// 10 skill categories × 2 performance tiers = 20 possible adjectives.
// Each category matches event names by keyword patterns.
// Duel events are matched by is_duel flag, not name patterns.
//
// Thresholds for regular events:
//   elite: avg placement ≤ 2.5  (consistently top 2–3 out of ~13)
//   good:  avg placement ≤ 5.5  (consistently top half)
//
// Thresholds for duels:
//   elite: win rate ≥ 60 %
//   good:  win rate ≥ 40 %

const ELITE = 2.5
const GOOD  = 5.5

const CATEGORIES = [
  {
    key: 'presisjon',
    patterns: ['dart', 'bue', 'pil', 'skyting', 'blink', 'pong', 'spiker'],
    elite: 'Snikskytter',
    good:  'Presisjonsskytter',
  },
  {
    key: 'strategi',
    patterns: ['sjakk', 'chess', 'poker', 'majer', 'canasta', 'bridge', 'stein', 'saks', 'kortspill'],
    elite: 'Stormester',
    good:  'Strateg',
  },
  {
    key: 'ballsport',
    patterns: ['fotball', 'basket', 'tennis', 'badminton', 'volleyball', 'håndball', 'padel',
               'squash', 'bordtennis', 'spikeball', 'slåball', 'ball'],
    elite: 'Ballkunstner',
    good:  'Ballspiller',
  },
  {
    key: 'kasting',
    patterns: ['golf', 'disc', 'frisbee', 'bocce', 'petanq', 'støvel', 'papirfly', 'kast'],
    elite: 'Mesterkaster',
    good:  'Kastetalent',
  },
  {
    key: 'kunnskap',
    patterns: ['quiz', 'trivia', 'geografi', 'kunnskap', 'tippelapp', 'tippe', 'ord'],
    elite: 'Allviter',
    good:  'Kunnskapsrik',
  },
  {
    key: 'koordinasjon',
    patterns: ['bomull', 'balanse', 'akrobat', 'ballongl', 'balloon', 'wheels', 'hopp', 'hinderbane'],
    elite: 'Akrobat',
    good:  'Koordinert',
  },
  {
    key: 'utholdenhet',
    patterns: ['løp', 'sprint', 'sykkel', 'svøm', 'klatr', 'maraton', 'potet', 'vandring'],
    elite: 'Jernmann',
    good:  'Utholdende',
  },
  {
    key: 'kreativitet',
    patterns: ['dans', 'musikk', 'sang', 'tegn', 'mal', 'beats', 'sing'],
    elite: 'Scenekunstner',
    good:  'Kreativ',
  },
  {
    key: 'styrke',
    patterns: ['tautrekk', 'vektløft', 'arm', 'styrke', 'bryting', 'kamp'],
    elite: 'Kraftkar',
    good:  'Sterk',
  },
]

const DUEL_CAT = { key: 'duell', elite: 'Gladiator', good: 'Duellant' }

function getCategory(eventName) {
  const lower = eventName.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.patterns.some(p => lower.includes(p))) return cat
  }
  return null
}

// results: array of { event: { name, is_duel }, placement }
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
    let sortKey = avg

    if (cat.key === 'duell') {
      const winRate = placements.filter(p => p === 1).length / placements.length
      if (winRate >= 0.6) adjective = cat.elite
      else if (winRate >= 0.4) adjective = cat.good
      sortKey = 1 - winRate  // higher win rate sorts first
    } else {
      if (avg <= ELITE) adjective = cat.elite
      else if (avg <= GOOD) adjective = cat.good
    }

    if (adjective) keywords.push({ adjective, sortKey })
  }

  // Return top 3, best performance first
  return keywords
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, 3)
    .map(k => k.adjective)
}
