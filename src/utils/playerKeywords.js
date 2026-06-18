// Raised from 2.5 to 3.5 to account for regularization shrinkage and increase elite count ~50%
export const ELITE = 3.5
// Fallback field size when participant counts are unavailable
const GOOD_FALLBACK_FIELD = 12
// Minimum number of results in a category before any adjective is awarded
export const MIN_ENTRIES = 3
// Bayesian regularization strength: blends observed avg with prior based on sample size.
// Higher k = more shrinkage for small samples (k=3 means 3 exercises → 50/50 prior/observed).
export const REGULARIZATION = 3

export const CATEGORIES = [
  {
    key: 'presisjon',
    label: 'Presisjon',
    patterns: ['dart', 'bue', 'pil', 'skyting', 'blink', 'pong', 'blåser'],
    elite: 'Snikskytter',
    good:  'Presisjonsskytter',
  },
  {
    key: 'strategi',
    label: 'Strategi',
    // spikern before 'ball' in ballsport so Spikern routes here, not ballsport
    patterns: ['sjakk', 'chess', 'poker', 'majer', 'canasta', 'bridge', 'stein', 'saks',
               'kortspill', 'gnav', 'mario', 'fordeler', 'spikern', 'hot wheel'],
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
    patterns: ['golf', 'disc', 'frisbee', 'bocce', 'petanq', 'støvel', 'kast', 'kubb'],
    elite: 'Mesterkaster',
    good:  'Kastetalent',
  },
  {
    key: 'kunnskap',
    label: 'Kunnskap',
    patterns: ['quiz', 'trivia', 'geografi', 'kunnskap', 'tippelapp', 'tippe', 'ord',
               'bezzer', 'geo', 'idealtid', 'mange'],
    elite: 'Allviter',
    good:  'Kunnskapsrik',
  },
  {
    key: 'koordinasjon',
    label: 'Koordinasjon',
    // papirfly, sykle, ballong, halen all explicitly listed; 'wheels' removed (Hot Wheels → strategi)
    patterns: ['bomull', 'balanse', 'akrobat', 'ballongl', 'balloon', 'hopp', 'hinderbane',
               'papirfly', 'ballong', 'halen', 'wii', 'sykle'],
    elite: 'Akrobat',
    good:  'Koordinert',
  },
  {
    key: 'utholdenhet',
    label: 'Utholdenhet',
    patterns: ['løp', 'sprint', 'sykkel', 'svøm', 'klatr', 'maraton', 'potet', 'vandring', 'staffet'],
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
    patterns: ['tautrekk', 'vektløft', 'arm', 'styrke', 'bryting', 'kamp', 'kule'],
    elite: 'Kraftkar',
    good:  'Sterk',
  },
]

export const DUEL_CAT = { key: 'duell', label: 'Duell', elite: 'Gladiator', good: 'Duellant' }

// Catch-all for exercises that don't match any named category
export const ALLROUND_CAT = { key: 'allround', label: 'Allround', elite: 'Mester', good: 'Allrounder' }

export const ALL_CATEGORIES = [...CATEGORIES, DUEL_CAT, ALLROUND_CAT]

export function getCategoryByKey(key) {
  return ALL_CATEGORIES.find(c => c.key === key) ?? null
}

// Returns the category for an event name; never returns null (falls back to ALLROUND_CAT)
export function getCategory(eventName) {
  const lower = eventName.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.patterns.some(p => lower.includes(p))) return cat
  }
  return ALLROUND_CAT
}

// results:       array of { event: { id, name, is_duel, is_hansa }, placement }
// countByEvent:  optional { [eventId]: number } — participant count per event
// Returns up to 3 adjectives, best category first.
// An adjective requires MIN_ENTRIES results in the category to be statistically valid.
// The "good" threshold is relative: avg placement ≤ median of the field.
export function computeKeywords(results, countByEvent = {}) {
  const stats = {}

  for (const r of results) {
    if (r.event.is_hansa) continue
    const cat = r.event.is_duel ? DUEL_CAT : getCategory(r.event.name)
    const k = cat.key
    if (!stats[k]) stats[k] = { cat, entries: [] }
    stats[k].entries.push({ placement: r.placement, eventId: r.event.id })
  }

  const keywords = []

  for (const { cat, entries } of Object.values(stats)) {
    if (cat.key !== 'duell' && entries.length < MIN_ENTRIES) continue

    const placements = entries.map(e => e.placement)
    const avg = placements.reduce((s, p) => s + p, 0) / placements.length
    let adjective = null
    let isElite = false
    let sortKey

    if (cat.key === 'duell') {
      const winRate = placements.filter(p => p === 1).length / placements.length
      if (winRate >= 0.6) { adjective = cat.elite; isElite = true }
      else if (winRate >= 0.4) { adjective = cat.good }
      sortKey = 1 - winRate
    } else {
      const n = entries.length
      const fieldSizes = entries.map(e => countByEvent[e.eventId] ?? GOOD_FALLBACK_FIELD)
      const avgField = fieldSizes.reduce((s, f) => s + f, 0) / fieldSizes.length
      // Prior: expected placement with no skill = midpoint of the field
      const priorMean = (avgField + 1) / 2
      const goodThreshold = avgField / 2
      // Regularized average: shrinks toward prior for small samples, converges to raw avg as n grows.
      // This corrects the bias where fewer exercises gives a better-looking average.
      const regAvg = (n * avg + REGULARIZATION * priorMean) / (n + REGULARIZATION)

      if (regAvg <= ELITE) { adjective = cat.elite; isElite = true }
      else if (regAvg <= goodThreshold) { adjective = cat.good }
      sortKey = regAvg
    }

    if (adjective) keywords.push({ adjective, isElite, categoryKey: cat.key, sortKey })
  }

  return keywords
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, 3)
}
