import { readFile, writeFile } from 'node:fs/promises';
import { firestore } from './firebaseAdmin.js';
import { prototypeReviewFlags } from './prototypeRecordReview.js';

const isApply = process.argv.includes('--apply');
const args = process.argv.slice(2).filter((argument) => argument !== '--apply');
const exportPath = args[0];
const manifestPath = isApply ? args[1] : undefined;
const reportPath = isApply ? args[2] : args[0] || `prototype-review-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

if (isApply && (!exportPath || !manifestPath)) {
  throw new Error('Deletion requires an export and a reviewed manifest: --apply <export.json> <manifest.json> [report.json].');
}
if (isApply) await readFile(exportPath!);

const snapshot = await firestore.collection('producers').get();
const candidates = snapshot.docs.flatMap((document) => {
  const record = { id: document.id, ...document.data() };
  const flags = prototypeReviewFlags(record);
  return flags.length ? [{ id: document.id, flags, record }] : [];
});
let selectedIds = candidates.map((candidate) => candidate.id);
if (isApply) {
  const manifest = JSON.parse(await readFile(manifestPath!, 'utf8')) as { confirmedForDeletion?: unknown };
  if (!Array.isArray(manifest.confirmedForDeletion) || manifest.confirmedForDeletion.some((entry) => !entry || typeof entry !== 'object' || typeof (entry as any).id !== 'string' || typeof (entry as any).reason !== 'string' || !(entry as any).reason.trim())) {
    throw new Error('Reviewed manifest must contain confirmedForDeletion entries with an ID and a non-empty human review reason.');
  }
  selectedIds = [...new Set((manifest.confirmedForDeletion as Array<{ id: string; reason: string }>).map((entry) => entry.id))];
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (selectedIds.some((id) => !candidatesById.has(id))) throw new Error('Manifest contains an ID that is not in the current dry-run candidates.');
}
const selectedCandidates = candidates.filter((candidate) => selectedIds.includes(candidate.id));
const report = { generatedAt: new Date().toISOString(), mode: isApply ? 'apply' : 'dry-run', databaseId: firestore.databaseId, candidateCount: candidates.length, selectedIds: isApply ? selectedIds : [], candidates };
await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });

if (isApply) {
  const batch = firestore.batch();
  selectedCandidates.forEach((candidate) => batch.delete(firestore.doc(`producers/${candidate.id}`)));
  await batch.commit();
}
console.log(`${isApply ? 'Deleted' : 'Review candidates'}: ${isApply ? selectedCandidates.length : candidates.length}. Report: ${reportPath}`);
