# AgriTrack API (backend)

ITE 18 midterm project, Agriculture sector, backend track.
NestJS + TypeORM + PostgreSQL. It serves the AgriTrack frontend (Harvest Logbook for small farmers) and keeps the exact response format the frontend already uses.

- Farmers log their own crops and harvests.
- An admin can see everything (read-only for crops and harvests) and creates the farmer accounts.

## Requirements
- Node.js 20 or newer (`node -v`)
- PostgreSQL 14 or newer (or Docker, see below)

## Run it
```
npm install
cp .env.example .env        # Windows: copy .env.example .env
```
Start a database. Either install PostgreSQL and create a user and database named `agritrack` (password `agritrack`), or with Docker:
```
docker compose up -d
```
Then:
```
npm run build
npm start
```
- API: http://localhost:3001/api
- Interactive docs (Swagger): http://localhost:3001/api/docs
- On the first start the tables are created and demo data is loaded automatically.

Development with auto-reload: `npm run start:dev`.

## Demo accounts
| Role   | Email                  | Password   |
| ------ | ---------------------- | ---------- |
| Farmer | farmer@agritrack.test  | Farmer123! |
| Farmer | farmer2@agritrack.test | Farmer123! |
| Admin  | admin@agritrack.test   | Admin123!  |

## Use it with the frontend
In the frontend folder, create `.env`:
```
NUXT_PUBLIC_API_BASE=http://localhost:3001/api
```
then `npm run dev`. The frontend's CORS origin is `http://localhost:3000` by default; change `CORS_ORIGIN` in this API's `.env` if your frontend runs elsewhere.

## Try it in Swagger
1. Open `/api/docs`, run `POST /api/auth/login` with a demo account.
2. Copy the `token`, click **Authorize**, paste it, and try any route.

## Endpoints
All responses use `{ success, data, meta }`. Errors use `{ success: false, error: { code, message, details } }`.

| Method | Endpoint | What it does | Access |
| --- | --- | --- | --- |
| POST | /api/auth/login | Sign in, returns a JWT and the user | Public |
| GET | /api/auth/me | The signed-in user | Any signed-in user |
| GET | /api/crops | List crops (farmer: own, admin: all) | Farmer, Admin |
| GET | /api/crops/:id | One crop | Farmer (own), Admin |
| POST | /api/crops | Add a crop | Farmer |
| PATCH | /api/crops/:id | Edit own crop | Farmer |
| DELETE | /api/crops/:id | Delete own crop (409 while it has harvests) | Farmer |
| GET | /api/harvests | List harvests, newest first. Optional `?crop_id=` | Farmer, Admin |
| GET | /api/harvests/:id | One harvest | Farmer (own), Admin |
| POST | /api/harvests | Log a harvest for one of your crops | Farmer |
| PATCH | /api/harvests/:id | Edit own harvest | Farmer |
| DELETE | /api/harvests/:id | Delete own harvest | Farmer |
| GET | /api/users | List accounts | Admin |
| GET | /api/users/:id | One account | Admin |
| POST | /api/users | Create an account (how farmers get a login) | Admin |
| PATCH | /api/users/:id | Edit name, role or password | Admin |
| DELETE | /api/users/:id | Delete an account (409 while it owns crops) | Admin |

Status codes: 200 OK, 201 Created, 204 Deleted, 400 bad request, 401 not signed in, 403 role not allowed, 404 not found (also used for other people's data), 409 conflict, 422 validation failed, 429 too many login attempts.

Example error (validation):
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed.",
  "details": { "name": "Crop name must be at least 2 characters.", "category": "Choose a category." } } }
```

## Database
PostgreSQL, 3 tables in third normal form. See `docs/ERD.png` and `docs/ERD.md`.

| Table | Key columns |
| --- | --- |
| users | id (PK), email (unique), password_hash, role (`farmer`/`admin`) |
| crops | id (PK), user_id (FK users), category (`Vegetable`/`Fruit`/`Grain`/`Root crop`), planted_on |
| harvests | id (PK), crop_id (FK crops), harvest_date, quantity_kg (CHECK > 0) |

Decisions: deleting a crop that has harvests, or a user that owns crops, is blocked (RESTRICT, shown as 409) so no history is lost silently. Farmer accounts are created by the admin (`POST /api/users`); there is no public sign-up.

## Security
- Passwords hashed with bcrypt; never returned by the API.
- JWT (8 hours). The role is re-read from the database on every request, so deleting a user or changing a role takes effect immediately.
- Role guard on every route; farmers can only reach their own data (others' data answers 404).
- Input whitelist: unknown fields such as `user_id` or `role` are rejected, so clients cannot set them.
- Validation on every body; the database also enforces the key rules (CHECK, FK, unique).
- `helmet` security headers, CORS limited to `CORS_ORIGIN`, login rate limit (default 10 per minute per IP).
- Errors never expose SQL or stack traces.
- Secrets live in environment variables. In production the API refuses to start without a strong `JWT_SECRET`.

## Tests
```
npm run test:e2e
```
Runs 33 tests against a real PostgreSQL database named `agritrack_test` (created and wiped automatically; same user as above, so that user needs the CREATEDB permission, which `docker compose` and the setup above provide). Covers login, roles, ownership, validation, CRUD, conflicts, hashing, headers and rate limiting.

## Deploying (Render or Railway)
1. Push this folder to GitHub.
2. Create a PostgreSQL database on the platform and copy its connection URL.
3. Create a Web Service from the repo: build `npm install && npm run build`, start `npm start`.
4. Set environment variables: `DATABASE_URL` (the URL), `DB_SSL=true`, `NODE_ENV=production`, `JWT_SECRET` (random, 32+ characters), `CORS_ORIGIN` (your deployed frontend URL), and `SEED_DEMO_DATA=false` once you no longer want the demo accounts.
5. HTTPS is provided by the platform. Use the platform's database backups.

## Folder structure
```
src/
  main.ts, app.setup.ts, app.module.ts
  common/    guards, role decorator, error filter, response wrapper, helpers
  auth/      login, JWT strategy
  users/     admin account management
  crops/     entity, DTOs, service, controller
  harvests/  entity, DTOs, service, controller
  seed/      demo data
test/        end-to-end tests
```
