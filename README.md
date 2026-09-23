# Workout Tracker

Full-stack fitness platform for logging workouts, tracking progress and nutrition, and receiving reminders — built with Spring Boot microservices, Firebase Auth, and Angular.

## Features

- Workout plans, sessions, exercise library, and calendar scheduling
- Progress tracking (history, consistency, calories)
- Nutrition logging (meals, water, macro targets)
- Notifications and daily motivational quotes
- Web app with email/password, Google, and phone OTP sign-in

## Architecture

```text
Angular (web) ──► API Gateway (:8080) ──► microservices
                         │
              Firebase Auth (ID tokens)
                         │
         PostgreSQL · Kafka · Redis · Prometheus
```

| Service | Port | Responsibility |
|---------|------|----------------|
| api-gateway | 8080 | Auth, routing, token relay |
| user-service | 8081 | Profiles and accounts |
| workout-service | 8082 | Workouts, plans, library |
| progress-service | 8083 | Progress analytics |
| nutrition-service | 8084 | Meals, water, targets |
| notification-service | 8085 | In-app notifications |

Shared modules: `common-security`, `common-events`.

## Tech stack

- **Backend:** Java, Spring Boot 3.5, Spring Cloud Gateway, JPA, Flyway, Kafka, Redis, Maven
- **Frontend:** Angular 19, Firebase, RxJS
- **Infra:** Docker Compose, PostgreSQL 16, Kafka, Redis, Prometheus

## Repository layout

```text
backend/           Microservices and shared libraries
frontend/web/      Angular web app
infrastructure/    Docker Compose, Postgres init, Prometheus
docs/              Architecture notes
postman/           API collections
```

## Prerequisites

- Docker Desktop
- JDK 21+ and Maven (for host builds via `up.ps1`)
- Node.js 20+ (for the Angular app)
- A Firebase project (Auth + optional Storage for avatars)

## Quick start

### 1. Backend stack (local)

```powershell
cd infrastructure
copy .env.example .env
.\up.ps1
```

This builds backend JARs on the host, builds images, and starts Postgres, Redis, Kafka, Prometheus, the gateway, and all services.

Gateway: `http://localhost:8080`

First boot can take several minutes while Java services warm up.

### 2. Firebase for the gateway

Place your service account JSON at:

```text
backend/api-gateway/src/main/resources/firebase-service-account.json
```

Do not commit this file — it is gitignored. See `docs/WORKOUT_TRACKER_ARCHITECTURE_README.md` for setup details.

### 3. Frontend (local)

```powershell
cd frontend\web
npm install
npm start
```

App: `http://localhost:4200` (proxies `/api` → gateway `:8080`).

Configure Firebase web credentials in `frontend/web/src/environments/environment.ts`.

## Vercel frontend + local backend

The Angular app can run on Vercel while the API stays on your machine. A Cloudflare quick tunnel publishes `localhost:8080` to a public HTTPS URL; the frontend calls that URL.

1. Start the backend (`infrastructure\up.ps1`) and wait until `http://localhost:8080/actuator/health` returns UP.
2. In a separate terminal, keep this running:

```powershell
.\infrastructure\tunnel-api.ps1
```

Copy the `https://*.trycloudflare.com` URL it prints.

3. Deploy the frontend (builds with that tunnel as `API_BASE_URL`):

```powershell
.\infrastructure\deploy-frontend-vercel.ps1 -ApiBaseUrl https://YOUR-SUBDOMAIN.trycloudflare.com
```

Or set `API_BASE_URL` in the Vercel project and run `vercel --prod` from `frontend/web`.

4. In Firebase Console → Authentication → Settings → Authorized domains, add your Vercel domain (for example `web-three-bay-29.vercel.app`).

Notes:

- Keep Docker + the tunnel process running while you use the Vercel site.
- Quick tunnels get a new hostname each restart — update `API_BASE_URL` and redeploy (or rerun the deploy script).
- Gateway CORS allows `https://*.vercel.app` and Capacitor WebView origins (`https://localhost`, `capacitor://localhost`).
- Android APK builds use CapacitorHttp (native networking) so they are not blocked by WebView CORS. Build with:
  `$env:API_BASE_URL="https://YOUR-SUBDOMAIN.trycloudflare.com"; npm run android:apk` from `frontend/web`.
  If `API_BASE_URL` is omitted, the last absolute URL in `environment.prod.ts` is kept.

## API testing

Import `postman/Workout-Tracker.gateway.postman_collection.json` and the local environment file under `postman/`.

## Documentation

- [Architecture README](docs/WORKOUT_TRACKER_ARCHITECTURE_README.md) — services, auth flow, DB layout, Firebase setup
- [Frontend README](frontend/web/README.md) — Angular app, auth providers, profile notes

## License

Private / unpublished unless stated otherwise.
