const EXACT = {
  'Darts': '🎯',
  'Stein, saks, papir': '✂️',
  'Bomullsdotten': '☁️',
  'Gnav': '🃏',
  'Majer': '🎲',
  'Raffle': '🎲',
  'Hansa (sanksjon)': '🍺',
  'Bowling': '🎳',
  'Golf': '⛳',
  'Discgolf': '🥏',
  'Frisbeegolf': '🥏',
  'Fotball': '⚽',
  'Fyllefotball': '⚽',
  'Basketball': '🏀',
  'Bordtennis': '🏓',
  'Tennis': '🎾',
  'Volleyball': '🏐',
  'Badminton': '🏸',
  'Sjakk': '♟️',
  'Poker': '♠️',
  'Canasta': '🃏',
  'Bocce': '🎱',
  'Petanque': '⚫',
  'Curling': '🥌',
  'Svømming': '🏊',
  'Løping': '🏃',
  'Sykling': '🚴',
  'Klatring': '🧗',
  'Tautrekking': '💪',
  'Quiz': '🧠',
  'Beer pong': '⚪',
  'Papirfly': '✈️',
  'Singstar': '🎤',
  'Hot wheels race': '🏎️',
  'Halen på grisen': '🐷',
  'Ballong': '🎈',
  'Tippelappen': '📋',
  'Spikern': '🔨',
  'Kulestøt': '⚫',
  'Mario kart': '🏎️',
  'Idealtid': '⏱️',
  'Løpeskyte': '🎽',
  'Sykle sakte': '🚴',
  'Hvor mange': '❓',
  'Støvelkast': '🥾',
  'Fosstafetten': '🏃‍♀️',
  'GeoGuessr': '🌍',
  'Blåserør': '💨',
  'Ringbryting': '🤼',
  'Wii-fekting': '⚔️',
  'Kubb': '🪵',
  'Ultrakubb': '🪵',
  'Fordeleren': '🎴',
  'Bezzerwisser': '🧠',
}

export function getEventIcon(name) {
  if (EXACT[name]) return EXACT[name]
  const l = name.toLowerCase()
  if (l.includes('dart')) return '🎯'
  if (l.includes('stein') || l.includes('saks')) return '✂️'
  if (l.includes('hansa') || l.includes('sanksjon') || l.includes('øl') || l.includes('pils')) return '🍺'
  if (l.includes('beer') || l.includes('pong')) return '⚪'
  if (l.includes('bowl')) return '🎳'
  if (l.includes('golf') || l.includes('disc') || l.includes('frisbee')) return '🥏'
  if (l.includes('fotball') || l.includes('football') || l.includes('soccer')) return '⚽'
  if (l.includes('basket')) return '🏀'
  if (l.includes('bordtennis')) return '🏓'
  if (l.includes('volley')) return '🏐'
  if (l.includes('tennis')) return '🎾'
  if (l.includes('badminton')) return '🏸'
  if (l.includes('sjakk') || l.includes('chess')) return '♟️'
  if (l.includes('poker') || l.includes('majer') || l.includes('canasta') || l.includes('gnav') || l.includes('kort')) return '🎲'
  if (l.includes('raffle') || l.includes('terning') || l.includes('lykke')) return '🎲'
  if (l.includes('quiz') || l.includes('trivia') || l.includes('kunnskap') || l.includes('bezzerwiss')) return '🧠'
  if (l.includes('løp') || l.includes('sprint') || l.includes('run') || l.includes('stafet')) return '🏃'
  if (l.includes('svøm')) return '🏊'
  if (l.includes('sykl') || l.includes('sykkel')) return '🚴'
  if (l.includes('klatr')) return '🧗'
  if (l.includes('bocce')) return '🎱'
  if (l.includes('petanq')) return '⚫'
  if (l.includes('kulest')) return '⚫'
  if (l.includes('bomull')) return '☁️'
  if (l.includes('tautrekk') || l.includes('styrke')) return '💪'
  if (l.includes('balanse')) return '🤸'
  if (l.includes('singstar') || l.includes('mikrofon') || l.includes('sang')) return '🎤'
  if (l.includes('papirfly') || l.includes('papir fly')) return '✈️'
  if (l.includes('mario') || l.includes('hot wheel')) return '🏎️'
  if (l.includes('gris')) return '🐷'
  if (l.includes('ballong')) return '🎈'
  if (l.includes('spiker')) return '🔨'
  if (l.includes('støvel')) return '🥾'
  if (l.includes('idealt')) return '⏱️'
  if (l.includes('tippelapp')) return '📋'
  if (l.includes('geoguessr') || l.includes('kart') || l.includes('globus')) return '🌍'
  if (l.includes('blåserør') || l.includes('blase')) return '💨'
  if (l.includes('ringbryt') || l.includes('bryt')) return '🤼'
  if (l.includes('fekting') || l.includes('sverd') || l.includes('wii')) return '⚔️'
  if (l.includes('kubb')) return '🪵'
  return '🏅'
}
