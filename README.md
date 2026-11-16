# GlobalRecruit-Hub
Athlete first college recruiting platform.

## Local setup

Use Node.js 22 or later. Run `npm ci`, copy `.env.example` to `.env`, and set your own database URL and a random session secret of at least 32 characters. Never commit `.env`.

Run `npm run db:migrate` only against the intended development database, then `npm run dev`. The migration creates the athlete table; PostgreSQL sessions are created automatically by the session store. Use an isolated Neon development branch for schema work.

For production, set `NODE_ENV=production` and `APP_ORIGIN` to the exact HTTPS site origin without a trailing slash. The app expects one trusted reverse proxy, as on Render. Development defaults to direct HTTP with no trusted proxy.

## Authentication

Register at `/register.html`, sign in at `/login.html`, and view your account at `/dashboard.html`. API routes are `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.

Passwords require at least 8 characters and at most 72 UTF-8 bytes and are hashed with bcrypt (cost 12). Registration and login rotate the session ID; session cookies are HttpOnly, SameSite=Lax, and Secure in production. Sessions expire after 24 hours. API responses disable caching. Mutations reject cross-origin browser requests.

Login and registration share a limit of 20 requests per IP per 15 minutes. The limiter is bounded and stored per process: it resets on restart. Use a shared rate-limit store before scaling to multiple application instances.

## Tests

Run `npm test -- --coverage` for the complete suite. Tests use mocked database operations and in-memory sessions, with no Neon credentials or database changes. HTTP integration tests exercise the real Express middleware stack and require permission to connect to localhost. Controller, model, and security middleware tests run without opening sockets.

GitHub Actions runs the full suite on pull requests and authentication branch pushes. Deployment smoke tests must still confirm production database sessions, HTTPS cookies, register/login/logout, and protected API access before GH-1 is marked Done.

## Athlete profile

After signing in, open `/profile.html` from the dashboard. `GET /api/profile` retrieves the current athlete's saved details and `PUT /api/profile` creates or updates them. Both routes require a session and derive ownership from it. Run the migrations on an isolated Neon branch before testing profile persistence. The second migration creates the athlete-owned profile table; the migration script applies numbered SQL files in order.
