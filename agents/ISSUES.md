# Original review issues and remediation status

The first 12 items preserve the order and substance of the original review. An issue stays open until its behavior checks pass. A repository change alone does not prove the corresponding live Firebase setting is fixed.

## Original issues

- [ ] **Issue 1 — Restrict public Firestore access.** Locally verified on the named database: unauthenticated reads/writes are denied, role and municipality scope is enforced, protected fields are validated, draft questionnaire metadata is callable-only, and unknown collection paths are denied. Live deployed rules still need inspection.
- [x] **Issue 2 — Remove client-controlled authorization.** Locally verified: a forged SUPERADMIN localStorage profile cannot log in without an authorized cloud user record; the emulator role tests enforce server status and roles.
- [x] **Issue 3 — Validate invitation registration on the server.** Invitation redemption is server-side, transactional, technician-only, hash-backed, email/expiry/revocation/use-limit checked, and idempotent. The callable emulator workflow suite passes locally.
- [x] **Issue 4 — Share technician applications and decisions.** Application submission and review use shared Firestore state and server transactions. Application submission and approval/rejection/audit are implemented; the full callable emulator workflow suite passes locally.
- [ ] **Issue 5 — Preserve producer cloud revisions.** The technician edit path and importer retain cloud revision. Local queue tests verify revision progression; emulator tests for real remote conflict and interrupted acknowledgement remain open.
- [ ] **Issue 6 — Process queued edits in order.** Queue worker serializes each record, rereads operations before sending, propagates confirmed revisions, and stops after conflict. Local tests pass; multi-device emulator tests remain open.
- [ ] **Issue 7 — Share immutable questionnaire versions.** Publish versions centrally, cache them for offline work, and bind each response to the exact version used.
- [ ] **Issue 8 — Preserve unknown survey values.** Import forms no longer invent coordinates, area, tenure, capture metadata, or missing identity; map heat and aggregates handle unknowns explicitly. Legacy cleanup report is a review-only dry run. Remaining data-path and import/export fixtures still need broader verification.
- [ ] **Issue 9 — Store photos outside Firestore documents.** Compress photos, upload them to protected file storage, keep references in responses, and expose upload state and errors.
- [x] **Issue 10 — Clean up failed Google authorization.** Unit tests verify Firebase sign-out after unverified and unauthorized Google authentication; pending technician registration deliberately retains the session.
- [x] **Issue 11 — Close Firebase session on logout.** `App` calls Firebase-backed `AuthService.signOut`; emulator tests verify the Firebase session is cleared.
- [x] **Issue 12 — Make development service workers opt-in.** Locally verified: development browser test confirms no service worker registers by default; `VITE_ENABLE_PWA_DEV=true` remains the explicit test opt-in.

## Additional agreed requirements

- [ ] **Security and rollout:** Verify restrictive Firestore and Storage rules in emulators and staging; inspect deployed rules separately. Keep restrictive rules during rollback.
- [ ] **Accounts and offline data:** Isolate browser data and sync queues by Firebase UID; quarantine unowned legacy records; revalidate authorization after the seven-day offline window and before uploads.
- [ ] **Invitations and audit:** Enforce expiry, email binding, revocation, use limits, replay safety, technician-only access, and server-authoritative audit history.
- [ ] **Synchronization:** Use idempotent operation IDs, stop a record's queue on conflict, and do not delete or recreate data based on failed or scoped-out downloads.
- [ ] **Legacy data:** Export before cleanup, report possible prototype values for review, and make any deletion an explicit operation. Local report command requires a cloud export and per-record reviewed manifest; staging dry run remains open.
- [ ] **Photos and integration:** Preserve offline attachments, safely retry uploads, migrate embedded legacy photos explicitly, and exercise the full account-to-review workflow.
- [ ] **Observability:** Track upload, conflict, authorization, and attachment failures without logging personal data or credentials.

## Verification gates

- [ ] Focused authentication, authorization, invitation, and synchronization regression tests pass.
- [ ] Root TypeScript check, production build, and Functions TypeScript build pass.
- [ ] Firestore rules, Storage rules, callable Functions, and indexes pass emulator checks using the configured named database.
- [ ] Full browser flow passes against emulators.
- [ ] Staging configuration is validated when staging credentials are available.
- [ ] Deployed rules are inspected before claiming public access is closed.
