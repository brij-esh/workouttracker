/**
 * Writes production environment from API_BASE_URL (no trailing slash).
 * Example: API_BASE_URL=https://abc.trycloudflare.com
 *
 * If API_BASE_URL is unset, keeps any existing absolute apiBaseUrl in
 * environment.prod.ts so APK builds do not silently fall back to `/api/v1`
 * (which resolves to https://localhost inside Capacitor and breaks the app).
 */
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

function readExistingApiBase() {
  try {
    const prev = fs.readFileSync(out, 'utf8');
    const match = prev.match(/apiBaseUrl:\s*'([^']+)'/);
    return match?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

const fromEnv = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
const existing = readExistingApiBase();
const existingIsAbsolute = /^https?:\/\//i.test(existing);

let apiBaseUrl;
if (fromEnv) {
  apiBaseUrl = `${fromEnv}/api/v1`;
} else if (existingIsAbsolute) {
  apiBaseUrl = existing;
} else {
  apiBaseUrl = '/api/v1';
}

const contents = `export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
  firebase: {
    apiKey: 'AIzaSyB2yveG-2NCetuyXlu-QgLsOGvamVQ15nQ',
    authDomain: 'workouttracker-d526e.firebaseapp.com',
    projectId: 'workouttracker-d526e',
    storageBucket: 'workouttracker-d526e.firebasestorage.app',
    messagingSenderId: '115690399449699381472',
    appId: '1:115690399449699381472:web:workouttracker'
  }
};
`;

fs.writeFileSync(out, contents, 'utf8');
const source = fromEnv ? 'API_BASE_URL' : existingIsAbsolute ? 'existing environment.prod.ts' : 'relative fallback';
console.log(`Wrote environment.prod.ts apiBaseUrl=${apiBaseUrl} (from ${source})`);
