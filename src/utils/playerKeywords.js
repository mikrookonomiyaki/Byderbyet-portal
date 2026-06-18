const ELITE = 2.5
// GOOD threshold is dynamic (avg ≤ field median), but falls back to this if no count available
const GOOD_FALLBACK_FIELD = 12

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

// Catch-all for events that don't match any named category
export const ALLROUND_CAT = { key: 'allround', label: 'Allround', elite: 'Mester', good: 'Allrounder' }

export const ALL_CATEGORIES = [...CATEGORIES, DUEL_CAT, ALLROUND_CAT]

export function getCategoryByKey(key) {
  return ALL_CATEGORIES.find(c => c.key === key) ?? null
}

// Returns a category for any event name; never returns null (falls back to ALLROUND_CAT)
export function getCategory(eventName) {
  const lower = eventName.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.patterns.some(p => lower.includes(p))) return cat
  }
  return ALLROUND_CAT
}

// results:       array of { event: { id, name, is_duel, is_hansa }, placement }
// countByEvent:  optional { [eventId]: number } — participant count per event for relative threshold
// Returns: { adjective, isElite, categoryKey, sortKey }[] (up to 3, best first)
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
    const placements = entries.map(e => e.placement)
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
      // "Good" threshold = above the median for this category's field sizes.
      // Uses actual participant counts when available, falls back to GOOD_FALLBACK_FIELD.
      const fieldSizes = entries.map(e => countByEvent[e.eventId] ?? GOOD_FALLBACK_FIELD)
      const avgField = fieldSizes.reduce((s, n) => s + n, 0) / fieldSizes.length
      const goodThreshold = avgField / 2

      if (avg <= ELITE) { adjective = cat.elite; isElite = true }
      else if (avg <= goodThreshold) { adjective = cat.good }
    }

    if (adjective) keywords.push({ adjective, isElite, categoryKey: cat.key, sortKey })
  }

  return keywords
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, 3)
}
