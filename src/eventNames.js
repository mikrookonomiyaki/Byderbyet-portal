// Canonical names for events that appear under slightly different names across years
export const CANONICAL_NAME = {
  'bomullsdott': 'Bomullsdotten',
  'dart': 'Darts',
  'stein, saks og papir': 'Stein, saks, papir',
  'mayer': 'Majer',
}

export function canonicalize(name) {
  return CANONICAL_NAME[name.toLowerCase()] ?? name
}
