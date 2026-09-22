/**
 * Writes production environment from API_BASE_URL (no trailing slash).
 * Example: API_BASE_URL=https://abc.trycloudflare.com
 */
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
const raw = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
const apiBaseUrl = raw ? `${raw}/api/v1` : '/api/v1';

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
console.log(`Wrote environment.prod.ts apiBaseUrl=${apiBaseUrl}`);
