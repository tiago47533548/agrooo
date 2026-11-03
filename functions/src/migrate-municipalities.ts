import { databaseId, firestore } from './firebaseAdmin.js';
const aliases: Record<string, string> = {
  obera: 'obera', obera_misiones: 'obera',
  posadas: 'posadas', 'posadas_zona_rural_periurbana': 'posadas',
  eldorado: 'eldorado', 'san_vicente': 'san_vicente', apostoles: 'apostoles',
  'leandro_n_alem': 'leandro_n_alem', 'leandro_nicolas_alem': 'leandro_n_alem',
  'puerto_rico': 'puerto_rico', 'aristobulo_del_valle': 'aristobulo', aristobulo: 'aristobulo',
  'san_pedro': 'san_pedro', montecarlo: 'montecarlo', 'campo_viera': 'campo_viera',
  'campo_grande': 'campo_grande', 'jardin_america': 'jardin_america', 'dos_de_mayo': 'dos_de_mayo',
  'san_ignacio': 'san_ignacio', 'bernardo_de_irigoyen': 'bernardo_de_irigoyen',
  'comandante_andresito': 'andresito', andresito: 'andresito', 'el_soberbio': 'el_soberbio',
  wanda: 'wanda', 'colonia_wanda': 'wanda', 'alba_posse': 'alba_posse',
  'concepcion_de_la_sierra': 'concepcion_de_la_sierra', 'san_javier': 'san_javier',
  '25_de_mayo': 'veinticinco_de_mayo', veinticinco_de_mayo: 'veinticinco_de_mayo',
  capiovi: 'capiovi', 'puerto_esperanza': 'puerto_esperanza'
};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const apply = process.argv.includes('--apply');
const snapshot = await firestore.collection('producers').get();
const changes: Array<{ id: string; municipality: string; municipalityId: string }> = [];
const unknown = new Map<string, number>();
for (const document of snapshot.docs) {
  const data = document.data();
  if (data.municipalityId || typeof data.municipality !== 'string') continue;
  const key = normalize(data.municipality);
  const municipalityId = aliases[key];
  if (!municipalityId) { unknown.set(data.municipality, (unknown.get(data.municipality) || 0) + 1); continue; }
  changes.push({ id: document.id, municipality: data.municipality, municipalityId });
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', scanned: snapshot.size, updates: changes, unknownMunicipalities: Object.fromEntries(unknown) }, null, 2));
if (apply) {
  for (let offset = 0; offset < changes.length; offset += 400) {
    const batch = firestore.batch();
    for (const change of changes.slice(offset, offset + 400)) batch.update(firestore.doc(`producers/${change.id}`), { municipalityId: change.municipalityId, municipalityMigrationAt: new Date().toISOString() });
    await batch.commit();
  }
}
