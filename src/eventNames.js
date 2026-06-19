// Canonical names for events that appear under slightly different names across years
export const CANONICAL_NAME = {
  'bomullsdott': 'Bomullsdotten',
  'dart': 'Darts',
  'kubjakt': 'Kubbjakt',
  'stein, saks og papir': 'Stein, saks, papir',
  'mayer': 'Majer',
  'hansa': 'Hansa (sanksjon)',
  'hansa, sanksjon': 'Hansa (sanksjon)',
  'sanksjon': 'Hansa (sanksjon)',
}

export function canonicalize(name) {
  return CANONICAL_NAME[name.toLowerCase()] ?? name
}
