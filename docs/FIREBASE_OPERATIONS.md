# Firebase development, export, and migration

## Install and local checks

From the repository root:

```sh
bun install
npm run lint
npm run build
npm run check:functions
npm run test
```

Install the Functions workspace separately only if you use npm there:

```sh
cd functions
npm install
npm run build
```

Root dependencies are locked by `bun.lock`; Functions dependencies are locked by `functions/package-lock.json`.

## Emulator workflow

Use the isolated `demo-sip-misiones-tests` project ID for emulator work. It is a demo project and cannot address the production project. From the repository root, run:

```sh
npm run test:rules
```

To run the application against emulators, copy `.env.example` to `.env.local`, set `VITE_USE_FIREBASE_EMULATORS=true`, then start:

```sh
firebase emulators:start --project demo-sip-misiones-tests --only auth,firestore,functions,storage
```

Demo fixture loading is deliberately manual and requires both development mode and emulator flags. In the browser developer console while the app is running in that mode:

```js
const { seedInitialDatabaseIfEmpty } = await import('/src/db/emulatorFixtures.ts');
await seedInitialDatabaseIfEmpty();
```

Set `VITE_LOAD_DEMO_DATA=true` to enable this explicit fixture call. The app does not seed records during startup. Never enable demo fixtures against production.

## Production-like staging test

The checked-in `firebase-applet-config.json` remains the default client target. To run the app against a separate staging Firebase project, create a local `.env.local` from `.env.example` and set all required `VITE_FIREBASE_*` values plus `VITE_FIRESTORE_DATABASE_ID` from that project's web app and Firestore database. The target database must use the database ID configured in `firebase.json` unless the Firebase CLI config is updated for that target.

For Functions deploy/runtime configuration, create `functions/.env.<staging-project-id>` with:

```dotenv
FIRESTORE_DATABASE_ID=ai-studio-sipmisionessiste-84140521-dd09-4717-8340-b1ed25aa1dd7
FUNCTIONS_STORAGE_BUCKET=<staging-project-id>.firebasestorage.app
```

Authenticate the Firebase CLI for the staging account and deploy explicitly to the staging project only:

```sh
firebase deploy --only firestore,storage,functions --project <staging-project-id>
```

Then start the app with the staging `.env.local` and `VITE_USE_FIREBASE_EMULATORS=false`:

```sh
npm run dev
```

Verify the project ID in the Firebase Console before testing. Configure the staging project's authorized OAuth domains/providers and Storage rules as well. Do not use production credentials, production exports, or demo fixtures for this test. Emulator tests remain pinned to `demo-sip-misiones-tests` and are independent of these staging overrides.

Playwright browser checks use Chromium. Install it once with `npx playwright install chromium`, then run both the development service-worker check and production preview check:

```sh
npm run test:e2e:dev
npm run test:e2e
npm run test:all
```

`test:all` runs unit tests, emulator rule tests, TypeScript, production builds, the Functions build, and browser checks.

## Export browser data

As an administrator, open **Administración → Base de datos** and use both export buttons:

- **Exportar datos de esta cuenta** downloads the active UID-namespaced IndexedDB database, including pending work.
- **Exportar base local heredada** downloads the unowned legacy `SipMisionesDB` database for manual review. It is not uploaded automatically.

Keep the downloaded JSON files in a protected location; they may contain personal data.

## Export cloud data

Authenticate the Firebase Admin SDK with application default credentials for the configured Firebase project. From `functions/`, run:

```sh
npm run export-cloud -- firestore-backup.json
```

The command exports the configured Firestore collections and refuses to overwrite an existing output file. Check that the JSON file parses and contains expected collection counts before cleanup or migration.

## Review municipality migration

After saving and reviewing the cloud export, run a dry run:

```sh
cd functions
npm run migrate-municipalities
```

Review every proposed mapping and unknown municipality. Apply only after review:

```sh
npm run migrate-municipalities -- --apply
```

The script only fills missing `municipalityId` fields; it does not delete or replace records. Unknown names remain unchanged for manual review.

## Production rollout

The repository configuration is not evidence of deployed state. Before claiming the database is protected, deploy the restrictive rules through an authorized release and inspect the active Firestore and Storage rules in Firebase Console or with the Firebase CLI. Test a known anonymous read/write denial against the deployed project. Do not deploy production from this development checklist.
