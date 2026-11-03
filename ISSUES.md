# Issue remediation checklist

This checklist tracks the 12 issues recorded during the project review and regressions exposed while implementing the security and synchronization plan. Complete each acceptance check before closing the corresponding issue.

## Chunk 1 — Development and migration foundations

- [ ] **Issue 12 — Add reproducible Firebase deployment and emulator configuration.** Add named Firestore database, Functions, Storage rules, indexes, and emulator configuration; validate deployments in staging.
- [ ] **Regression — Prevent demo data and service workers from affecting production development.** Keep demo fixtures emulator-only, remove startup seeding/profile overwrites, and make development PWA opt-in.
- [ ] **Regression — Preserve recoverable data before prototype cleanup.** Provide cloud and browser exports and a dry-run cleanup report before any deletion.

## Chunk 2 — Authentication and access control

- [ ] **Issue 1 — Replace simulated authentication with Firebase Authentication.** Use verified Google or email/password accounts, reset-password flow, and Firebase UIDs.
- [ ] **Issue 2 — Close anonymous and cross-municipality database access.** Enforce the role matrix and assigned-municipality scope in Firestore rules and test it in the emulator.
- [ ] **Issue 10 — Remove shared credentials and client-side authorization.** Remove shared passwords, email allowlists, and local profiles as permission sources.
- [ ] **Issue 11 — Prevent automatic account reactivation.** Keep disabled and pending accounts denied until an administrator changes authoritative status.
- [ ] **Regression — Bootstrap the first administrator safely.** Promote only an explicitly supplied, verified Firebase UID through the Admin SDK script.

## Chunk 3 — Applications, invitations, and audit

- [ ] **Issue 3 — Centralize application approval and assignment changes.** Submit and review requests through authenticated Cloud Functions and persist status across devices.
- [ ] **Issue 4 — Make invitations secure, single purpose, and replay safe.** Hash codes server-side; enforce expiry, email, revocation, use limits, and technician-only redemption atomically.
- [ ] **Regression — Make audit history server authoritative.** Deny client writes and record privileged actions in Functions.

## Chunk 4 — Account-isolated offline work

- [ ] **Issue 1 — Isolate offline data and revalidate authorization.** Namespace databases by UID, quarantine legacy data, and require online revalidation after seven days.
- [ ] **Issue 2 — Stop unauthorized work after reconnection.** Refresh status and assignments before uploads, stop listeners, and preserve blocked pending edits for review/export.
- [ ] **Issue 4 — Prevent account-switch queue leakage.** Close each account database on logout and never upload another account's pending queue.

## Chunk 5 — Producer synchronization

- [ ] **Issue 5 — Preserve revisions when editing synced producers.** Read queue items immediately before send, serialize per-record edits, propagate confirmed revisions, and detect real conflicts.
- [ ] **Issue 6 — Make sync retries and reconciliation safe.** Use UUID-like idempotency keys, strip local metadata, and never recreate records simply because a scoped query omitted them.

## Chunk 6 — Unknown data and prototype records

- [ ] **Issue 8 — Preserve unknown survey values.** Keep missing coordinates, GPS precision, surface, and tenure unknown; exclude unknown measurements from maps and aggregates.
- [ ] **Regression — Review legacy defaults before cleanup.** Identify possibly synthetic rows for review and require an explicit rollout action for deletion.

## Chunk 7 — Published questionnaires

- [ ] **Issue 7 — Publish immutable questionnaire versions.** Store drafts centrally, allocate versions server-side, cache published versions for offline use, and bind responses to their exact version.

## Chunk 8 — Photos and rollout

- [ ] **Issue 9 — Move photos out of Firestore documents.** Compress photos, store them locally for offline capture, upload to protected Storage paths, and keep only object metadata in records. Migrate existing base64 values explicitly.
- [ ] **Regression — Verify complete authorization and synchronization rollout.** Exercise registration, approval, assignment, offline edits, questionnaire/photo upload, review, logout, and account switching in staging.
- [ ] **Regression — Monitor failures without sensitive data.** Track upload failures, conflicts, authorization denials, and attachment failures without recording personal data or credentials.

## Release gates

- [ ] Run focused authorization and synchronization tests, TypeScript checks, and the production build.
- [ ] Validate Firestore rules, Storage rules, Functions, and indexes in staging.
- [ ] Inspect deployed rules to confirm public access is closed; repository rules alone do not prove deployment.
- [ ] Keep restrictive permissions in place during rollback.
