import defaultConfig from '../../firebase-applet-config.json';

const env = import.meta.env;
const projectId = env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId;
const isDefaultProject = projectId === defaultConfig.projectId;

// Firebase web API keys and app IDs are public client configuration. Keep the
// checked-in project as the default while allowing local/staging overrides.
const firebaseConfig = {
  ...defaultConfig,
  apiKey: env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  appId: env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? (isDefaultProject ? defaultConfig.measurementId : ''),
  oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || (isDefaultProject ? defaultConfig.oAuthClientId : ''),
  recaptchaSiteKey: env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || (isDefaultProject ? defaultConfig.recaptchaSiteKey : ''),
  firestoreDatabaseId: env.VITE_FIRESTORE_DATABASE_ID || defaultConfig.firestoreDatabaseId
};

export default firebaseConfig;
