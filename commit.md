# Commit and implementation log

No new commits or pushes will be made unless requested. Track reviewable changes here while implementation continues.

## Existing local commit

- `ebc0e2a fix(pwa): disable service worker in development by default` — committed locally before the request to stop committing; not pushed.

## Implementation progress

- **Chunk 1 — Foundations:** Firebase client/configuration and emulator switches added; PWA development opt-in; sample records moved to emulator-only fixtures; account/profile overwrite removed; local/cloud export commands, dry-run municipality migration, and operations instructions added. Checks pending.
- **Chunk 2 — Authentication and rules:** Firebase email/password and Google auth wired; verified-email UID-based profile checks; password reset; private Firestore rules; admin bootstrap script. Emulator authorization tests and deployment verification pending.
- **Chunk 3 — Applications and invitations:** Callable application review/status, hashed technician invitations, verified-email redemption, revocation, assignment changes, and server audit events wired. Approvals and assignment edits require administrator-selected municipalities; a new invitation's code is copyable once in the creation dialog. Functions/emulator tests remain.
- **Chunk 4 — Offline account isolation:** Per-UID IndexedDB, seven-day cached authorization, quarantine database, interrupted queue recovery, and removal of inaccessible synced cache records on startup/reconnect refresh added. Pending/error work outside current assignments is held in the account database for export/review. Account-switch acceptance checks pending.
- **Chunk 5 — Synchronization:** UUID queue IDs, per-record ordering, cloud revisions preserved in producer edits, idempotency operation IDs, undefined/local metadata stripping, scoped reconciliation, remote response downloads, and fresh server authorization checks before upload are wired. Behavior tests pending.
- **Chunk 6 — Unknown values:** Nullable coordinates and surface values, nullable activity surfaces, tenure handling, no fabricated municipality centroids or survey/import defaults, and map filtering added. Legacy dry-run review remains.
- **Chunk 7 — Questionnaires:** Callable publication, immutable version cache, and municipality-scoped response review UI added. Historical response acceptance checks pending.
- **Chunk 8 — Photos and rollout:** New captures are compressed to 1,600px/1MiB for offline storage, uploaded before Firestore writes, and represented by Storage paths; signed URLs require role/assignment checks. Binary-blob local capture, interrupted-upload tests, and legacy image migration remain.

## Checks

- Final root `npm run lint`, `npm run build`, `git diff --check`, and JSON config parsing passed after the response review UI and municipality assignment changes. The build warns that the client bundle exceeds 500 kB and some dynamic imports are ineffective.
- Firebase Functions dependencies, emulator authorization tests, staging deployment, and deployed-rule inspection have not yet been run.
- The Functions build was attempted but cannot resolve Firebase Admin, Firebase Functions, and Node type packages because dependency installation did not complete in the restricted network environment.
- Firebase emulator and staging deployments remain unavailable in this workspace; deployed access rules have not been inspected.
- Application status queries require the authenticated, verified account and return only that account's status.
- Functions SDK initialization corrected to select the named Firestore database via `getFirestore(databaseId)`; previously it passed `undefined` as an App and failed TypeScript compilation. Functions build verification pending.

## Suggested review commits (not created)

1. `chore(firebase): establish emulator and migration foundations`
2. `feat(auth): replace simulated sessions with Firebase authorization`
3. `feat(auth): centralize technician approvals and invitations`
4. `fix(offline): isolate account caches and revalidate access`
5. `fix(sync): serialize edits and preserve cloud revisions`
6. `fix(data): preserve unknown survey values`
7. `feat(questionnaires): publish immutable shared versions`
8. `feat(storage): move response photos to protected object storage`
