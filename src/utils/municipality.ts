import { MISIONES_MUNICIPALITIES } from '../db/misionesCatalog';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function municipalityId(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const normalized = normalize(value);
  const match = MISIONES_MUNICIPALITIES.find((municipality) => {
    const id = normalize(municipality.id);
    const name = normalize(municipality.name);
    return normalized === id || normalized === name || normalized.startsWith(`${name}_`) || name.startsWith(`${normalized}_`);
  });
  return match?.id || normalized;
}
