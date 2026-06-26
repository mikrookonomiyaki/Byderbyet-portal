// Fallback field size when participant counts are unavailable
export const GOOD_FALLBACK_FIELD = 12
// Minimum number of results in a category before any adjective is awarded
export const MIN_ENTRIES = 2
// Bayesian regularization strength: blends observed avg with prior based on sample size.
// Higher k = more shrinkage for small samples (k=3 means 3 exercises → 50/50 prior/observed).
export const REGULARIZATION = 3
// Exactly this many qualified players receive the elite badge (when enough players exist)
export const ELITE_COUNT = 2
// Fraction of qualified players who receive the good badge (after the elite slots)
export const GOOD_FRAC = 0.35

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
               'kortspill', 'gnav', 'mario', 'fordeler', 'spikern', 'raffle'],
    elite: 'Mesterstrateg',
    good:  'Strateg',
  },
  {
    key: 'utholdenhet',
    label: 'Utholdenhet',
    // fylle/fyllefotball and fosstafett/tafet checked before 'fotball'/'ball' in ballsport below
    patterns: ['fylle', 'foss', 'fosstafet', 'tafet', 'løp', 'sprint', 'sykkel', 'svøm', 'klatr', 'maraton', 'potet', 'vandring', 'stafet'],
    elite: 'Marathonløper',
    good:  'Utholdende',
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
    patterns: ['golf', 'disc', 'frisbee', 'bocce', 'petanq', 'støvel', 'kast', 'kubb', 'kubjakt'],
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
    patterns: ['bomull', 'balanse', 'akrobat', 'ballongl', 'balloon', 'hopp', 'hinderbane',
               'papirfly', 'ballong', 'halen', 'wii', 'sykle'],
    elite: 'Akrobat',
    good:  'Koordinert',
  },
  {
    key: 'kreativitet',
    label: 'Kreativitet',
    patterns: ['dans', 'musikk', 'sang', 'tegn', 'mal', 'beats', 'sing', 'hot wheel'],
    elite: 'Scenekunstner',
    good:  'Kreativ',
  },
  {
    key: 'styrke',
    label: 'Styrke',
    patterns: ['tautrekk', 'vektløft', 'arm', 'styrke', 'bryting', 'kamp', 'kule'],
    elite: 'Strongman',
    good:  'Sterk',
  },
]

export const DUEL_CAT = { key: 'duell', label: 'Duell', elite: 'Gladiator', good: 'Duellant' }

// Internal catch-all — not exposed as a navigable category
const ALLROUND_CAT = { key: 'allround', label: 'Allround', elite: 'Mester', good: 'Allrounder' }

export const ALL_CATEGORIES = [...CATEGORIES, DUEL_CAT]

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

// Compute Bayesian-regularized average placement for a set of entries
function computeRegAvg(entries, countByEvent) {
  const n = entries.length
  const placements = entries.map(e => e.placement)
  const avg = placements.reduce((s, p) => s + p, 0) / n
  const fieldSizes = entries.map(e => countByEvent[e.eventId] ?? GOOD_FALLBACK_FIELD)
  const avgField = fieldSizes.reduce((s, f) => s + f, 0) / fieldSizes.length
  const priorMean = (avgField + 1) / 2
  return (n * avg + REGULARIZATION * priorMean) / (n + REGULARIZATION)
}

// Assign elite/good badge based on rank among qualified players.
// Always exactly ELITE_COUNT elite badges (fewer only if not enough players).
function assignBadge(rank, total, cat) {
  const eliteCount = Math.min(total, ELITE_COUNT)
  const goodCount  = Math.min(total - eliteCount, Math.round(total * GOOD_FRAC))
  if (rank <= eliteCount) return { adjective: cat.elite, isElite: true }
  if (rank <= eliteCount + goodCount) return { adjective: cat.good, isElite: false }
  return { adjective: null, isElite: false }
}

// Rank-based keyword computation using raw DB results and lookup maps.
//
// targetName:      string — player's name as stored in DB
// allResults:      raw array of { event_id, participant_id, placement } from Supabase
// eventById:       { [id]: event object with name, is_duel, is_hansa }
// participantById: { [id]: { name, ... } }
// countByEvent:    { [event_id]: number } participant counts
export function computeKeywordsFromAllResults(targetName, allResults, eventById, participantById, countByEvent = {}) {
  const targetLower = targetName.toLowerCase()

  // Group entries by (catKey, playerName)
  const catStats = {} // { catKey: { [nameLower]: { name, entries[] } } }
  for (const r of allResults) {
    const event = eventById[r.event_id]
    if (!event) continue
    // Exclude Hansa sanction events by name rather than flag — the flag can be
    // incorrectly set on legitimate events (e.g. Fosstafetten)
    if (event.name.toLowerCase().includes('sanksjon')) continue
    const participant = participantById[r.participant_id]
    if (!participant) continue
    const cat = event.is_duel ? DUEL_CAT : getCategory(event.name)
    const k = cat.key
    const nl = participant.name.toLowerCase()
    if (!catStats[k]) catStats[k] = {}
    if (!catStats[k][nl]) catStats[k][nl] = { name: participant.name, entries: [] }
    catStats[k][nl].entries.push({ placement: r.placement, eventId: r.event_id })
  }

  const keywords = []

  for (const [catKey, byNameLower] of Object.entries(catStats)) {
    const targetData = byNameLower[targetLower]
    if (!targetData) continue
    const cat = getCategoryByKey(catKey)
    if (!cat) continue

    if (catKey === 'duell') {
      const entries = targetData.entries
      if (entries.length < MIN_ENTRIES) continue
      const winRate = entries.filter(e => e.placement === 1).length / entries.length
      let adjective = null, isElite = false
      if (winRate >= 0.6) { adjective = cat.elite; isElite = true }
      else if (winRate >= 0.4) { adjective = cat.good }
      if (adjective) keywords.push({ adjective, isElite, categoryKey: catKey, sortKey: 1 - winRate })
      continue
    }

    // Only rank qualified players
    const qualified = Object.values(byNameLower)
      .filter(p => p.entries.length >= MIN_ENTRIES)
      .map(p => ({ name: p.name, regAvg: computeRegAvg(p.entries, countByEvent) }))
      .sort((a, b) => a.regAvg - b.regAvg)

    if (qualified.length === 0) continue

    const targetEntry = qualified.find(p => p.name.toLowerCase() === targetLower)
    if (!targetEntry) continue // target didn't meet MIN_ENTRIES

    // Rank: how many qualified players have strictly lower regAvg
    const rank = qualified.filter(p => p.regAvg < targetEntry.regAvg).length + 1
    const { adjective, isElite } = assignBadge(rank, qualified.length, cat)
    if (adjective) keywords.push({ adjective, isElite, categoryKey: catKey, sortKey: targetEntry.regAvg })
  }

  // Elite badges always rank above good badges; within each tier, lower sortKey wins.
  return keywords.sort((a, b) => {
    if (a.isElite !== b.isElite) return a.isElite ? -1 : 1
    return a.sortKey - b.sortKey
  }).slice(0, 3)
}
