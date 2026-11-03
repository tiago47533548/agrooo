# Implementation log

No commits, pushes, merges, or production deployments are being made. This file records reviewable changes and the evidence run for each chunk.

## Chunk 1 — Foundations — locally verified

- Restored the original 12 issue numbers and descriptions in `agents/ISSUES.md`; separated the additional agreed requirements and release gates.
- Added Vitest, fake IndexedDB, Firebase emulator, rules test, and Playwright setup with repeatable root scripts. Emulator tests use the isolated `demo-sip-misiones-tests` project.
- Configured Firestore rules and indexes against the app’s named database using Firebase CLI multi-database syntax.
- Added browser checks for production startup with no demo rows and development startup with no service worker. Emulator fixtures remain callable only when development, emulator, and fixture flags are all enabled.
- Added shared Admin SDK setup that follows the emulator project ID and configured database. Verified cloud export against the Firestore emulator and parsed its seven-collection JSON output.
- Preserved browser export controls and added repeatable install, fixture, emulator, cloud export, migration, and rollout instructions.

**Checks passed:** `npm run test` (3 tests), `npm run test:rules` (anonymous read/write denied on the named database), `npm run lint`, `npm run build`, `npm --prefix functions run build`, `npm run test:e2e:dev` (1), `npm run test:e2e` (1), `git diff --check`, Firebase JSON/database ID validation, and emulator cloud export JSON parse.

**Limitations:** Staging and deployed rules have not been inspected. Build emits the existing large-bundle and ineffective dynamic-import warnings. Emulator Functions used Node 24 because Node 20 is not installed locally; the configured deployment runtime remains Node 20.

## Chunk 2 — Authentication and access control — locally verified

- Firebase email/password sign-in checks the verified Firebase identity and current Firestore profile; reset-password and Google sign-in flows use Firebase Authentication.
- Failed Google authorization closes the Firebase session, except for the intentional unregistered/pending technician path. Logout calls Firebase sign-out and reports failures in the app.
- Online authorization ignores local profiles. Saving producer/response work requires a currently authorized profile; offline work requires a fresh cached authorization within seven days and role/municipality checks.
- Replaced permissive collection rules with default-deny access, role/municipality scoping, producer and response field validation, immutable technician ownership/assignment/validation fields, response ownership, supervisor validation limits, and client-denied user/audit writes.
- Added named-database emulator coverage for anonymous, pending, disabled, unverified, forged-local-profile, cross-municipality, protected-field, response-validation, Google cleanup, and Firebase sign-in/sign-out cases.

**Checks passed:** root unit tests (8), Auth/Firestore emulator tests (9), root TypeScript check, production build, Functions TypeScript build, and `git diff --check`.

**Limitations:** Production Firestore and Storage rules have not been deployed or inspected. Google OAuth success is covered through a mocked provider callback; the project's real OAuth client configuration is not exercised by the emulator. Chunk 4 still needs to verify session switching and stale listeners.

## Chunk 3 — Applications, invitations, and audit — implementation in progress

- Moved technician application creation, administrator approval/rejection, account active-state changes, assignment changes, invitation creation/revocation/redemption, and elevated role changes into transactions. Each actual state change writes its server audit event in the same transaction; no-op repeats do not create duplicate audit events.
- Added strict validation for applicant fields, municipality IDs, invitation expiry/use limits, and allowed email. Invitation codes remain hash-only in Firestore, are technician-only, and redemption retries are idempotent. Disabled accounts cannot be reactivated through invitation redemption.
- Added callable emulator coverage for applications, role escalation, invitation hashing and email restriction, redemption retry, disabled-account behavior, and invalid input.

**Checks passed:** `npm run check:functions`, root unit suite (8 tests), and emulator suite's existing Auth/Firestore tests plus role escalation and invitation workflows (13 tests pass in the latest run).

**Open check:** The new application review workflow test still fails with `permission-denied`, even though the application submit and review callables are reached. The current test harness shows inconsistent reads of the applicant/admin fixture from its Admin SDK app; until this named-database fixture discrepancy is fixed and the full emulator suite passes, this chunk remains open. Staging/deployed behavior is unverified.

## Chunk 4 — Account-isolated offline work — locally verified

- Added an explicit local database session `{uid, db, generation}`. Account switches invalidate prior generations and keep old databases reachable only through their captured session while an upload settles.
- Bound sync cycles and status counts to one UID/database/generation. A late upload result cannot write into the next account's database; its old queue item returns to pending for a later retry under the same account.
- App auth transitions now clear displayed user data immediately, cancel stale initialization/listeners, reject out-of-order completions, and move unauthorized users back to quarantine.
- Added tests for UID database isolation, generation invalidation, quarantined legacy storage, and switching accounts during an in-flight upload.

**Checks passed:** `npm run test` (13 tests at implementation time), `npm run lint`, production build, Functions build, and `git diff --check`.

**Limitations:** The Functions emulator suite still has a failing Chunk 3 application-review fixture. Full browser account-switch/revocation flow remains for Chunk 8.

## Chunk 5 — Producer queue ordering and reconciliation — locally verified

- Queue operations now have stable operation IDs, explicit predecessor links, and a migration index. The worker sends only the earliest pending operation per record, rereads it immediately before upload, advances the next operation's base revision after confirmation, and blocks later work after conflicts or terminal failures.
- Idempotency is checked before photo upload and again in the Firestore transaction. Import edits preserve `cloudRevision`.
- Reconciliation records producer query success and never deletes records after a failed query. Missing records outside current scope are quarantined; scoped, successfully downloaded omissions can be reconciled without replacing pending local edits.
- Added unit tests for multi-edit order/revision propagation, conflict blocking, and failed/out-of-scope reconciliation.

**Checks passed:** `npm run test` (14 tests), `npm run lint`, production build, Functions build, and `git diff --check`.

**Limitations:** Emulator tests for true concurrent-device conflicts, interrupted cloud acknowledgments, reassignment during upload, and download failures remain open.

## Chunk 6 — Unknown values and legacy review — locally verified

- Removed fabricated coordinates, surface, tenure, location capture timestamps, and GPS metadata from imports. Missing identity fields are rejected rather than invented; missing activity stays empty, and explicit zero surface/coordinates are preserved.
- New survey locations remain unknown until a user selects GPS/map/shared coordinates; map viewport defaults do not become saved coordinates. Existing captured locations remain available for review.
- Map heat areas omit unknown surfaces. Analytics sum known measurements and show how many producer measurements are known.
- Added dry-run prototype-value report. Values matching old defaults are review clues only; deletion requires a preserved cloud export, an explicit per-ID reviewed manifest with reasons, and a separate `--apply` command.
- Added regression coverage for legacy-review flag behavior and missing-value reconciliation.

**Checks passed:** `npm run test` (16 tests), `npm run lint`, production build, Functions build, and `git diff --check`.

**Limitations:** Review-report command has been type-checked but not run against a staging project. No cleanup has been applied.

## Remaining chunks

- **Chunk 3 — Applications, invitations, and audit:** implementation in progress; one application-review callable emulator test still fails and blocks closure.
- **Chunk 7 — Published questionnaires:** open; enforce draft/publication separation, immutable versions, offline cache, and exact response references.
- **Chunk 8 — Photos and rollout:** open; persist offline blobs, protect paths consistently, migrate legacy images, add monitoring, and complete integration.

## Deployment-only gates

- Staging Functions, Firestore, and Storage validation has not run; staging credentials are not configured here.
- Production deployment and live rule inspection have not run. No production deployment was performed.

## Issue 1 follow-up — Restrictive Firestore rules — locally verified

- Tightened `/questionnaires/{id}` so only administrator accounts can read draft metadata and no client can write draft/publication metadata. Trusted callable Functions use the Admin SDK and remain the write path. Published immutable versions remain readable to approved accounts and client writes stay denied.
- Added named-database emulator assertions for admin-only draft reads, client-denied draft/version writes, published-version reads, and default-deny unknown collection paths.
- **Checks passed:** focused Auth/Firestore emulator test `npx firebase emulators:exec --config firebase.emulators.json --project demo-sip-misiones-tests --only auth,firestore 'npx vitest run --config vitest.rules.config.ts tests/rules/firestore.rules.test.ts'` (6 tests); `npm run lint`; `npm run build`; `git diff --check`.
- The broader `npm run test:rules` run remains red on two pre-existing Chunk 3 callable workflow tests, unrelated to Issue 1; the focused rule suite passes. Local emulator startup through `firebase.json` also emits existing Functions config schema warnings, though the focused tests execute successfully.
- Production rules were not deployed or inspected; Issue 1 remains open for that deployment gate.
