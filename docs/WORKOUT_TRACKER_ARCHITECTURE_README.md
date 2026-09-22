# Workout Tracker

A full-stack fitness and workout tracking platform built with Java,
Spring Boot microservices, Firebase Authentication, PostgreSQL, Kafka,
Redis, Angular, and Ionic.

## 1. Project Overview

Workout Tracker helps users:

-   Create and manage workouts
-   Track workout duration and calories
-   View workout history
-   Track progress over time
-   Manage nutrition information
-   Receive notifications
-   Use the application through a web or mobile frontend

The backend follows a microservices architecture with an API Gateway in
front of independently deployable services.

------------------------------------------------------------------------

## 2. Technology Stack

### Backend

-   Java 25
-   Spring Boot 3.5.x
-   Spring Cloud Gateway
-   Spring Data JPA / Hibernate
-   PostgreSQL
-   Flyway database migrations
-   Firebase Authentication
-   Apache Kafka
-   Redis
-   Maven
-   Lombok
-   Spring Boot Actuator
-   JUnit 5 and Mockito
-   Docker Compose

### Frontend

-   Angular
-   Angular Material
-   RxJS
-   Bootstrap
-   Ionic Angular for mobile

### Infrastructure

-   Docker
-   PostgreSQL
-   Kafka
-   Redis
-   Prometheus
-   Grafana, planned
-   CI/CD through Jenkins or GitHub Actions, planned

------------------------------------------------------------------------

## 3. High-Level Architecture

``` text
                         +----------------------+
                         |      Web Client      |
                         | Angular Application  |
                         +----------+-----------+
                                    |
                                    |
                         +----------v-----------+
                         |     Mobile Client    |
                         |   Ionic Angular App  |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |   Firebase Auth      |
                         | Google / Phone OTP   |
                         +----------+-----------+
                                    |
                                    | Firebase ID Token
                                    v
                         +----------------------+
                         |     API Gateway      |
                         | Spring Cloud Gateway |
                         |       Port 8080       |
                         +----------+-----------+
                                    |
              +---------------------+---------------------+
              |                     |                     |
              v                     v                     v
     +----------------+   +----------------+   +----------------+
     |  User Service  |   | Workout Service |   | Progress       |
     |    Port 8081   |   |    Port 8082    |   | Service 8083   |
     +--------+-------+   +--------+-------+   +--------+-------+
              |                    |                     |
              v                    v                     v
        user_db             workout_db             progress_db


              +---------------------+---------------------+
              |                     |                     |
              v                     v                     v
     +----------------+   +----------------+   +----------------+
     | Nutrition      |   | Notification   |   | Common Security|
     | Service 8084   |   | Service 8085   |   | Shared Module  |
     +--------+-------+   +--------+-------+   +----------------+
              |                    |
              v                    v
        nutrition_db        notification_db


                  +-----------------------------+
                  | Kafka / Redis / Monitoring   |
                  +-----------------------------+
```

------------------------------------------------------------------------

## 4. Repository Structure

``` text
workout-tracker/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile                 # multi-module image (SERVICE build-arg)
│   ├── .dockerignore
│   ├── api-gateway/
│   ├── user-service/
│   ├── workout-service/
│   ├── progress-service/
│   ├── nutrition-service/
│   ├── notification-service/
│   ├── common-security/
│   └── common-events/             # shared Kafka topics, payloads, publisher
│
├── infrastructure/
│   ├── docker-compose.yml         # infra + all Spring services
│   ├── .env.example
│   ├── up.ps1                     # build & start helper
│   ├── postgres/
│   │   └── init/
│   │       └── 01-create-databases.sql
│   └── prometheus/
│       └── prometheus.yml
│
├── postman/                       # gateway-facing API collections
│
└── frontend/
    ├── web/
    └── mobile/
```

------------------------------------------------------------------------

## 5. Microservices

### API Gateway

**Port:** `8080`

Responsibilities:

-   Single entry point for frontend clients
-   Validate Firebase ID tokens
-   Reject unauthenticated requests
-   Add authenticated user information to request headers
-   Route requests to backend services
-   Configure CORS
-   Expose health and actuator endpoints

Example routes:

``` text
/api/v1/users/**          -> http://localhost:8081
/api/v1/workouts/**       -> http://localhost:8082
/api/v1/exercises/**      -> http://localhost:8082
/api/v1/routines/**       -> http://localhost:8082
/api/v1/progress/**       -> http://localhost:8083
/api/v1/nutrition/**      -> http://localhost:8084
/api/v1/notifications/**  -> http://localhost:8085
```

### User Service

**Port:** `8081`

Responsibilities:

-   Create and manage user profiles
-   Store fitness preferences
-   Store height, weight, age, and fitness goals
-   Track onboarding status
-   Sync profile email from gateway `X-User-Email` on create/update
-   Provide user profile APIs

Identity fields such as **phone number**, **email verification**, and
**photo URL** are owned by Firebase Auth on the client. The Angular
profile page reads/writes those via the Firebase SDK and shows them
alongside the backend profile.

### Workout Service

**Port:** `8082`

Responsibilities:

-   Create workouts
-   Read workouts
-   Update workouts
-   Delete workouts
-   Enforce user ownership
-   Store workout history

Current implemented APIs:

``` text
POST   /api/v1/workouts
GET    /api/v1/workouts
GET    /api/v1/workouts/{workoutId}
PUT    /api/v1/workouts/{workoutId}
DELETE /api/v1/workouts/{workoutId}
```

### Progress Service

**Port:** `8083`

Planned responsibilities:

-   Track weight changes
-   Track body measurements
-   Track personal records
-   Calculate workout statistics
-   Generate progress summaries

### Nutrition Service

**Port:** `8084`

Responsibilities:

-   Track meals with quantity/units and meal types (including PRE/POST_WORKOUT)
-   Indian food item library (search, pick, custom foods)
-   Personalized calorie and macro targets (Mifflin–St Jeor + goals)
-   Fiber targets and weight → profile/macro sync
-   Track water intake with optional water reminders
-   Nutrition × body × training insights (8-week analytics, non-causal copy)

### Notification Service

**Port:** `8085`

Responsibilities:

-   In-app notifications (CRUD + mark read)
-   Kafka consumers for workout / user / progress / nutrition events
-   Workout, progress, nutrition, water-reminder, and system notification types

### Common Security

Shared module for:

-   Security-related DTOs
-   Common authentication utilities
-   Shared constants
-   Common error models
-   Reusable security components

------------------------------------------------------------------------

## 6. Authentication Flow

Firebase Authentication is used for user authentication.

### Supported sign-in methods

| Method | Notes |
|--------|--------|
| Email + password | **Email verification required.** Unverified password accounts stay locked (`/verify-email`); no app access and no API bearer token until verified. |
| Phone OTP | SMS via Firebase Phone Auth; OTP autofill on mobile (Web OTP + `autocomplete="one-time-code"`). |
| Google Sign-In | Popup; photo/name come from Google when present. |

### Email verification lock

1. Register with email/password → Firebase sends a verification email.
2. Until `emailVerified` is true for a password provider, the account is **locked**.
3. Angular `authGuard` redirects locked users to `/verify-email`.
4. `AuthService.idToken()` returns `null` while locked so API calls are not authorized.
5. Phone and Google sign-in are not subject to this password-email lock.

### Phone OTP

1. User enters E.164 number (UI defaults country code to `+91`).
2. Invisible reCAPTCHA + `signInWithPhoneNumber` (login) or `PhoneAuthProvider` (profile phone update).
3. User enters the 6-digit code (or mobile autofill submits it).
4. Firebase issues an ID token; gateway verification is unchanged.

**SMS region policy:** New Firebase projects allow **no SMS regions** by default.
If you see `OPERATION_NOT_ALLOWED` / *SMS unable to be sent until this region
enabled*, open **Authentication → Settings → SMS region policy**, choose
**Allow**, and add regions you need (for India: **IN**). Phone Auth also
requires the project on the **Blaze** billing plan.

### Profile photo and contact updates

-   **Photo:** Upload → pan/zoom cropper (auto-fit to circle) → Firebase Storage
    `avatars/{uid}.jpg` → `updateProfile({ photoURL })`.
-   **Avatar fallback:** If no uploaded photo and no Google `photoURL`, show
    initials from first + last name (profile display name preferred).
-   **Update email:** `verifyBeforeUpdateEmail` — email changes only after the
    user opens the link sent to the **new** address.
-   **Update phone:** OTP verification via `updatePhoneNumber` (same SMS region rules).

### Authentication sequence

``` text
1. User logs in through Angular (email, phone OTP, or Google).
2. Firebase authenticates the user (and enforces email verification for password accounts).
3. Firebase returns an ID token.
4. Frontend sends the token to API Gateway.
5. Gateway reads the Authorization header.
6. Gateway verifies the token with Firebase Admin SDK.
7. Gateway extracts the Firebase user UID and email.
8. Gateway adds trusted user headers:
      X-User-Id
      X-User-Email
9. Gateway forwards the request to the target service.
10. The service uses X-User-Id for data ownership.
```

Example request:

``` http
GET /api/v1/workouts HTTP/1.1
Host: localhost:8080
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

The frontend should never manually control `X-User-Id`. That header must
be added by the trusted API Gateway after token verification.

------------------------------------------------------------------------

## 7. Workout Request Flow

### Create workout

``` text
Frontend
   |
   | POST /api/v1/workouts
   | Authorization: Bearer <Firebase Token>
   v
API Gateway :8080
   |
   | Verify Firebase ID Token
   | Add X-User-Id
   v
Workout Service :8082
   |
   | Validate request
   | Create Workout entity
   | Set authenticated user ID
   v
Workout Repository
   |
   v
PostgreSQL workout_db
   |
   v
WorkoutResponse
   |
   v
Frontend
```

### Create workout request

``` json
{
  "name": "Push Day",
  "description": "Chest and triceps",
  "workoutDate": "2026-09-17",
  "durationMinutes": 60,
  "caloriesBurned": 350
}
```

### Example response

``` json
{
  "id": "generated-uuid",
  "userId": "firebase-user-uid",
  "name": "Push Day",
  "description": "Chest and triceps",
  "workoutDate": "2026-09-17",
  "durationMinutes": 60,
  "caloriesBurned": 350
}
```

------------------------------------------------------------------------

## 8. Workout Data Model

The `workouts` table contains:

  Column               Description
  -------------------- ---------------------------------
  `id`                 UUID primary key
  `user_id`            Firebase authenticated user UID
  `name`               Workout name
  `description`        Optional workout description
  `workout_date`       Date of workout
  `duration_minutes`   Workout duration
  `calories_burned`    Estimated calories burned
  `created_at`         Creation timestamp
  `updated_at`         Last update timestamp

Important indexes:

-   Index on `user_id`
-   Index on workout date
-   User-scoped query support

The service uses user-scoped repository methods such as:

``` java
Optional<Workout> findByIdAndUserId(UUID id, String userId);
```

This prevents one user from updating, reading, or deleting another
user's workout.

------------------------------------------------------------------------

## 9. Database Strategy

Each microservice should own its database or schema.

``` text
user_db
workout_db
progress_db
nutrition_db
notification_db
```

Database migrations are managed using Flyway.

Recommended rules:

-   Do not use `ddl-auto=create` in production
-   Use `ddl-auto=validate`
-   Add schema changes through Flyway migrations
-   Keep migrations versioned
-   Do not allow one service to directly modify another service's tables
-   Use APIs or Kafka events for cross-service communication

------------------------------------------------------------------------

## 10. Communication Strategy

### Synchronous communication

Use REST APIs for:

-   Reading user profiles
-   Creating workouts
-   Fetching workout history
-   Fetching progress dashboards
-   Reading nutrition data

### Asynchronous communication

Use Kafka for domain events. Shared contracts live in `backend/common-events`.

| Topic | Publisher | Consumer | Payload |
| --- | --- | --- | --- |
| `workout-events` | workout-service | notification-service | `WorkoutLifecycleEvent` |
| `user-events` | user-service | notification-service | `UserRegisteredEvent` |
| `progress-events` | progress-service | notification-service | `ProgressUpdatedEvent` |
| `nutrition-events` | nutrition-service | notification-service | `NutritionLoggedEvent` |

Toggle with `KAFKA_ENABLED` / `workout.kafka.enabled` (NoOp publisher + no listeners when `false`).

Example event flow:

``` text
Workout Service
      |
      | WorkoutLifecycleEvent (CREATED / UPDATED / DELETED)
      v
Kafka Topic: workout-events
      |
      v
Notification Service  -->  in-app notification row
```

### Redis use cases

Redis can be used for:

-   Caching user profile data
-   Caching workout summaries
-   Rate limiting
-   Temporary OTP-related data
-   Frequently accessed dashboard data

------------------------------------------------------------------------

## 11. API Security Rules

1.  All business APIs should be accessed through the API Gateway.
2.  Firebase ID tokens must be verified server-side.
3.  Services must use the authenticated UID for ownership.
4.  Never trust a user-provided `X-User-Id`.
5.  Validate all request DTOs.
6.  Return safe error messages.
7.  Do not expose internal stack traces.
8.  Use HTTPS outside local development.
9.  Store Firebase service-account credentials securely.
10. Never commit service-account JSON files to Git.

Recommended `.gitignore` entry:

``` gitignore
firebase-service-account.json
.env
*.log
target/
.idea/
.vscode/
```

------------------------------------------------------------------------

## 12. Local Development Setup

### Prerequisites

Install:

-   JDK 25
-   Maven
-   Docker Desktop (WSL 2 backend on Windows)
-   Node.js / Angular CLI / Ionic CLI, when frontend work begins

On Windows, Docker Desktop needs:

1.  **Docker Desktop** installed
2.  **WSL** + **Virtual Machine Platform** Windows features enabled
3.  A **reboot** after those features are first enabled
4.  Docker Desktop started and showing the engine as running

Verify Java / Maven (for IDE runs):

``` powershell
java -version
mvn -version
```

Verify Docker:

``` powershell
docker version
docker compose version
```

### Configure Firebase

1.  Create a Firebase project (or use the existing project).
2.  Enable Firebase Authentication providers:
    -   **Email/Password**
    -   **Google**
    -   **Phone**
3.  **SMS region policy** (required for OTP):
    -   Authentication → Settings → SMS region policy
    -   Policy type: **Allow** (allowlist)
    -   Add regions you serve (e.g. **IN** for India)
4.  Upgrade the project to the **Blaze** plan (SMS is not available on Spark).
5.  Add authorized domains (e.g. `localhost`) under Authentication → Settings.
6.  Enable **Firebase Storage** for profile photos and use rules such as:

``` text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}.jpg {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

7.  Download Firebase Admin service-account credentials for the gateway.
8.  Place the file at `backend/api-gateway/src/main/resources/firebase-service-account.json`.
9.  Keep the file out of source control (root `.gitignore` covers secrets / `infrastructure/.env`).
10. Frontend Firebase web config lives in
    `frontend/web/src/environments/environment.ts` (and `.prod.ts`).

Optional for local OTP testing without SMS charges: Authentication →
Sign-in method → Phone → **Phone numbers for testing**.

### Run the full stack with Docker (recommended)

Compose starts Postgres, Redis, Kafka, Kafka UI, Prometheus, Grafana, and all six Spring apps.

**Fast path (used by `up.ps1`):** Maven builds jars on the host (~1–2 min), then Docker only packs runtime images. Avoids six parallel in-container Maven downloads.

``` powershell
cd infrastructure

# First time only: copy env if missing
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# Build jars + images and start everything
.\up.ps1

# Or step-by-step:
# cd ..\backend
# mvn -pl api-gateway,user-service,workout-service,progress-service,nutrition-service,notification-service -am package -DskipTests
# cd ..\infrastructure
# docker compose up -d --build
```

Useful commands:

``` powershell
cd infrastructure
docker compose ps
docker compose logs -f api-gateway
docker compose down
```

**Published ports**

| Service | Port |
| --- | --- |
| API Gateway | `8080` |
| user-service | `8081` |
| workout-service | `8082` |
| progress-service | `8083` |
| nutrition-service | `8084` |
| notification-service | `8085` |
| Kafka (host / EXTERNAL listener) | `9092` |
| Kafka UI | `8089` |
| Postgres | `5432` |
| Redis | `6379` |
| Prometheus | `9090` |
| Grafana | `3000` |

**Docker networking notes**

-   In-compose services talk to Kafka at `kafka:29092` (PLAINTEXT listener).
-   Host tools use `localhost:9092` (EXTERNAL listener).
-   JDBC URLs use hostname `postgres` and credentials from `.env` (`POSTGRES_USER` / `POSTGRES_PASSWORD`).
-   Gateway routes use `USER_SERVICE_URL`, `WORKOUT_SERVICE_URL`, etc. (Docker DNS names in `.env`).
-   Shared gateway token: `GATEWAY_INTERNAL_TOKEN` (must match on gateway + all services).

Health check:

``` powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

### IDE / Maven alternative (infra in Docker only)

If you prefer running Spring Boot from the IDE:

``` powershell
cd infrastructure
docker compose up -d postgres redis kafka kafka-ui
```

Then override locals (examples):

``` powershell
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/workout_db"
$env:SPRING_DATASOURCE_USERNAME = "workout_user"
$env:SPRING_DATASOURCE_PASSWORD = "postgres"
$env:KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
$env:KAFKA_ENABLED = "true"
```

Build and run modules:

``` powershell
cd backend
mvn clean install
mvn -pl api-gateway spring-boot:run
mvn -pl user-service spring-boot:run
mvn -pl workout-service spring-boot:run
mvn -pl progress-service spring-boot:run
mvn -pl nutrition-service spring-boot:run
mvn -pl notification-service spring-boot:run
```

For IDE runs, gateway defaults already point at `http://localhost:8081`…`8085`.

------------------------------------------------------------------------

## 13. Testing the Workout APIs

Set the Firebase token in PowerShell:

``` powershell
$token = "<FIREBASE_ID_TOKEN>"
```

### Get workouts

``` powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8080/api/v1/workouts" `
  -Headers @{
      Authorization = "Bearer $token"
  }
```

### Create workout

``` powershell
$body = @{
    name            = "Push Day"
    description     = "Chest and triceps"
    workoutDate     = "2026-09-17"
    durationMinutes = 60
    caloriesBurned  = 350
} | ConvertTo-Json -Compress

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/v1/workouts" `
  -Headers @{
      Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body $body
```

### Update workout

``` powershell
$workoutId = "<WORKOUT_UUID>"

$updateBody = @{
    name            = "Push Day - Updated"
    description     = "Chest, shoulders and triceps"
    workoutDate     = "2026-09-17"
    durationMinutes = 75
    caloriesBurned  = 450
} | ConvertTo-Json -Compress

Invoke-RestMethod `
  -Method Put `
  -Uri "http://localhost:8080/api/v1/workouts/$workoutId" `
  -Headers @{
      Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body $updateBody
```

### Delete workout

``` powershell
Invoke-RestMethod `
  -Method Delete `
  -Uri "http://localhost:8080/api/v1/workouts/$workoutId" `
  -Headers @{
      Authorization = "Bearer $token"
  }
```

------------------------------------------------------------------------

## 14. Error Handling

The backend uses structured HTTP errors.

Typical responses:

  Status                        Meaning
  ----------------------------- ----------------------------------------------------
  `200 OK`                      Request successful
  `201 Created`                 Resource created
  `204 No Content`              Resource deleted
  `400 Bad Request`             Invalid request or validation error
  `401 Unauthorized`            Missing or invalid Firebase token
  `403 Forbidden`               Access denied
  `404 Not Found`               Resource does not exist or belongs to another user
  `500 Internal Server Error`   Unexpected server error

------------------------------------------------------------------------

## 15. Observability

Spring Boot Actuator should expose:

``` text
/actuator/health
/actuator/info
/actuator/metrics
```

Planned monitoring stack:

``` text
Microservices
     |
     v
Actuator Metrics
     |
     v
Prometheus
     |
     v
Grafana
```

Important metrics:

-   Request count
-   Request latency
-   Error rate
-   JVM memory
-   CPU usage
-   Database connection pool
-   Kafka consumer lag
-   Redis availability

------------------------------------------------------------------------

## 16. Deployment Architecture

A future production deployment may look like:

``` text
                    Internet
                       |
                 Load Balancer
                       |
                 API Gateway
                       |
       +---------------+----------------+
       |               |                |
       v               v                v
  User Service   Workout Service   Progress Service
       |               |                |
       v               v                v
    User DB        Workout DB       Progress DB

       +-------------------------------+
       | Kafka | Redis | Monitoring    |
       +-------------------------------+
```

Possible deployment platforms:

-   Docker Compose for local development
-   Kubernetes for production
-   AWS, Azure, or GCP
-   Managed PostgreSQL
-   Managed Kafka
-   Firebase Authentication

------------------------------------------------------------------------

## 17. Development Roadmap

### Completed

-   Project monorepo structure
-   Maven multi-module backend
-   API Gateway
-   Firebase token validation
-   Gateway routing
-   Workout / Progress / Nutrition / Notification / User services
-   Email/password, Google, and Phone OTP sign-in (Angular)
-   Mandatory email verification lock for password accounts
-   Profile photo upload with cropper + Firebase Storage
-   Profile email/phone update with verification
-   Nutrition targets, Indian food DB, water reminders, insights panels
-   Basic manual API verification

### Next

-   Add controller integration tests / broaden unit coverage
-   Add OpenAPI/Swagger documentation
-   Add pagination and sorting where lists grow
-   Wire Redis caching (Compose already provisions Redis)
-   Expand Prometheus scrape + Grafana dashboards
-   Build Ionic mobile app
-   Add CI/CD pipeline
-   Add centralized logging

------------------------------------------------------------------------

## 18. Engineering Principles

-   Keep each service independently deployable.
-   Keep business logic inside service classes.
-   Keep controllers thin.
-   Use DTOs instead of exposing entities directly.
-   Use constructor injection.
-   Keep database migrations version-controlled.
-   Apply authentication at the gateway.
-   Apply authorization and ownership checks inside services.
-   Prefer immutable request and response records.
-   Write tests for business rules.
-   Use meaningful package names.
-   Keep secrets outside Git.
-   Document APIs and architectural decisions.

------------------------------------------------------------------------

## 19. Current Status

``` text
Firebase Authentication       Completed (email/password + Google + Phone OTP; email verify lock)
Firebase Storage              Completed (avatar uploads under avatars/{uid}.jpg)
API Gateway                   Completed (:8080, Firebase + X-Gateway-Token relay)
User Service                  Completed (:8081, Flyway, profile CRUD, email sync on update)
Workout Service               Completed (:8082, workouts / exercises / routines)
Progress Service              Completed (:8083, weight / measurements / PRs)
Nutrition Service             Completed (:8084, meals / water / targets / food DB / insights)
Notification Service          Completed (:8085, in-app + water reminders)
Common Security               Completed (gateway-token filter for services)
Common Events                 Completed (topics, payloads, DomainEventPublisher)
Kafka wiring                  Completed (producers + notification consumer)
Docker Compose stack          Completed (infra + all app services on Apache Kafka 3.9)
PostgreSQL + Flyway           Completed (per-service DBs via init script)
Redis                         Provisioned in Compose (not wired in app code yet)
Prometheus / Grafana          Provisioned in Compose (basic scrape config)
Postman collections           Completed (gateway-facing APIs)
Angular Frontend              Completed (auth, profile, workouts, progress, nutrition; badge sync, session recover, history pagination)
Ionic Mobile App              Planned
CI/CD                         Planned
Web deploy (free platforms)   Planned (next after product polish)
```

**Product polish (2026-09-20):** Unread badge stays in sync; live workout timer reattaches after refresh/new tab (localStorage + server recover); rest timer survives refresh; notifications have clearer labels/empty copy and deep links; workout history is paginated (`GET /workouts?page&size`).

**Windows Docker note (as of 2026-09-19):** Docker Desktop + WSL2 are working after BIOS VT-x/VT-d and Windows features. Kafka image is official `apache/kafka` (Bitnami Hub tags are no longer free/`latest`). WSL2 memory is capped at **5GB** via `%USERPROFILE%\.wslconfig` (good for an 8GB host).

**Angular frontend:** `cd frontend/web && npm start` — proxies `/api` to gateway `:8080`.

**Auth checklist (Firebase Console):**

1. Enable Email/Password, Google, and Phone providers.
2. SMS region policy → allow **IN** (and any other regions you need).
3. Blaze billing for SMS.
4. Storage rules for `avatars/{userId}.jpg` (see Configure Firebase above).
5. Authorized domains include `localhost` for local OTP/recaptcha.

------------------------------------------------------------------------

## 20. Maintainer

**Project:** Workout Tracker (Repwise)\
**Backend:** Java / Spring Boot Microservices\
**Frontend:** Angular / Ionic\
**Authentication:** Firebase Authentication (email, phone OTP, Google)\
**Database:** PostgreSQL\
**Architecture:** API Gateway + Microservices + Event-Driven Extensions