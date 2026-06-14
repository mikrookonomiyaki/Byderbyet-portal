const EXACT = {
  'Darts': '🎯',
  'Stein, saks, papir': '✂️',
  'Bomullsdotten': '🧶',
  'Majer': '🃏',
  'Hansa': '🍺',
  'Bowling': '🎳',
  'Golf': '⛳',
  'Discgolf': '🥏',
  'Frisbeegolf': '🥏',
  'Fotball': '⚽',
  'Basketball': '🏀',
  'Tennis': '🎾',
  'Badminton': '🏸',
  'Sjakk': '♟️',
  'Poker': '♠️',
  'Canasta': '🃏',
  'Bocce': '🎱',
  'Petanque': '🎱',
  'Curling': '🥌',
  'Svømming': '🏊',
  'Løping': '🏃',
  'Sykling': '🚴',
  'Klatring': '🧗',
  'Tautrekking': '💪',
  'Quiz': '🧠',
}

export function getEventIcon(name) {
  if (EXACT[name]) return EXACT[name]
  const l = name.toLowerCase()
  if (l.includes('dart')) return '🎯'
  if (l.includes('stein') || l.includes('saks')) return '✂️'
  if (l.includes('hansa') || l.includes('øl') || l.includes('pils')) return '🍺'
  if (l.includes('bowl')) return '🎳'
  if (l.includes('golf') || l.includes('disc') || l.includes('frisbee')) return '🥏'
  if (l.includes('fotball') || l.includes('football') || l.includes('soccer')) return '⚽'
  if (l.includes('basket')) return '🏀'
  if (l.includes('tennis')) return '🎾'
  if (l.includes('badminton')) return '🏸'
  if (l.includes('sjakk') || l.includes('chess')) return '♟️'
  if (l.includes('poker') || l.includes('majer') || l.includes('canasta') || l.includes('kort')) return '🃏'
  if (l.includes('quiz') || l.includes('trivia') || l.includes('kunnskap')) return '🧠'
  if (l.includes('løp') || l.includes('sprint') || l.includes('run')) return '🏃'
  if (l.includes('svøm')) return '🏊'
  if (l.includes('sykkel')) return '🚴'
  if (l.includes('klatr')) return '🧗'
  if (l.includes('bocce') || l.includes('petanq')) return '🎱'
  if (l.includes('bomull')) return '🧶'
  if (l.includes('tautrekk') || l.includes('styrke')) return '💪'
  if (l.includes('balanse')) return '🤸'
  return '🏅'
}
