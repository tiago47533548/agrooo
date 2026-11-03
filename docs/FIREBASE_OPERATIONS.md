# Firebase migration and export operations

Run these before any prototype cleanup or data migration.

## Export browser data

As an administrator, open **Administración → Base de datos** and use both export buttons:

- **Exportar datos de esta cuenta** downloads the active UID-namespaced IndexedDB database, including the pending queue.
- **Exportar base local heredada** downloads the unowned legacy `SipMisionesDB` database for manual review. It is not uploaded automatically.

## Export cloud data

From `functions/`, install the declared dependencies and run:

```sh
npm install
npm run export-cloud -- firestore-backup.json
```

The optional argument is the output file path. The export refuses to overwrite an existing file.

## Review producer municipality migration

After saving the cloud export, run a dry run:

```sh
cd functions
npm run migrate-municipalities
```

Review every proposed mapping and unknown municipality. Apply only after review:

```sh
npm run migrate-municipalities -- --apply
```

The script only fills missing `municipalityId` fields; it does not delete or replace records. Unknown municipality names remain unchanged for manual review.

## Local emulators

Copy `.env.example` to `.env.local` and set `VITE_USE_FIREBASE_EMULATORS=true`. Demo fixtures in `src/db/emulatorFixtures.ts` additionally require `VITE_LOAD_DEMO_DATA=true` and development mode. Run `firebase emulators:start` before using Firebase-backed application flows. Never point demo seeding at production.
