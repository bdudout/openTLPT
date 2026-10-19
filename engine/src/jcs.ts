// Canonicalisation JSON (RFC 8785, JCS) pour les valeurs manipulées par openTLPT :
// objets, tableaux, chaînes, nombres finis, booléens, null. Clés triées par unités UTF-16 ;
// sérialisation des primitives identique à JSON.stringify (ce que prescrit la RFC).

export type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue | undefined };

export function canonicalize(value: JsonValue): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('JCS : nombre non fini');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k] as JsonValue)}`).join(',')}}`;
}
