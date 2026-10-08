# ZOOM-CLONE

An original fullstack assignment implementation using Next.js App Router, TypeScript, Tailwind CSS, FastAPI, SQLAlchemy, Alembic and SQLite. The interface follows the supplied Zoom Workplace references: compact chrome, a narrow navigation rail, centered clock and meeting actions, rounded workspace surfaces, modal Join/Schedule flows and a compact call toolbar.

## Run locally

Requirements: Node.js 20.9+ and Python 3.11+.

Backend (first terminal):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

Frontend (second terminal):

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Health: http://localhost:8000/health. Interactive API docs: http://localhost:8000/docs.

Seeds are inserted once on a fresh database: a demo user, three upcoming meetings and two completed meetings. Seed dates are relative to initial startup. A restart never overwrites existing meetings. SQLite files are excluded from version control.

## Implemented workflows

- Dashboard with instant meeting creation, Join, Schedule, upcoming and recent meetings.
- Unique 11-digit IDs, invite links, copyable invitations, meeting detail pages.
- Join by ID or invite URL, existence/ended validation, display name, media preview and device selection.
- Scheduling: topic, optional description, date/time, IANA timezone, duration, host video preference.
- Real browser WebRTC audio/video through a peer mesh; FastAPI WebSockets carry signaling and participant events.
- Microphone/camera controls, participant list, browser screen sharing, invite, leave.
- Meeting-wide live text chat, six emoji reactions and raise/lower hand indicators.
- Server-authorized host commands: mute all, remove participant, end for everyone.
- Signup/signin/signout, account settings and password changes; account-owned meetings and responsive portal/meeting room.
- SQLite participant join/leave/removal history and meeting status/start/end timestamps.

## Architecture and interview explanation

```text
frontend/
  src/app/          Pages, portal layouts, and the server API proxy
  src/components/   Dashboard, navigation, forms, and meeting room UI
  src/hooks/        Browser media lifecycle and WebRTC signaling
  src/lib/          API contracts, invitations, and client helpers
backend/
  app/main.py       HTTP routes and WebSocket admission/events
  app/services/     Meeting creation and ID allocation
  app/models.py     SQLAlchemy users, meetings, and participant history
  app/schemas.py    Request validation
  app/rooms.py      In-memory connected-room registry
  migrations/       Versioned SQLite schema
render.yaml         Backend deployment and persistent disk configuration
```

Meeting creation lives in a service so HTTP handling stays separate from database allocation. IDs are generated with Python's `secrets`, checked for existing records, and enforced by a unique database constraint. An insertion collision rolls back and retries, with a bounded attempt limit; unrelated integrity errors are not masked. The host credential is returned once during creation and stored as a hash in SQLite.

Planning documents, screenshots, agent instructions, test reports, and existing test files stay local through `.gitignore`. They are intentionally excluded from this submission.

## Authentication

Login is optional. Open `/` to use the full meeting workflow without an account: create, schedule, host, share invitations, and join calls. Anonymous visitors use the shared seeded demo workspace, including its profile and meetings. All anonymous visitors therefore share that identity and can reclaim its meetings' host access. This is demo behavior, not isolation between anonymous visitors.

Open `/signup` or `/signin` for a personal account with its own profile and meetings. Valid sessions use that account; missing, expired or revoked sessions fall back to the demo workspace for meeting workflows. Strict account operations (session identity and password changes) still require login. Anonymous demo visitors cannot obtain host credentials for personal-account meetings. Signup/signin pages offer Continue without an account.

Passwords require 12–128 characters and use salted scrypt hashes. SQLite stores hashed, random session credentials with a seven-day expiry. The Next.js server proxy forwards the session to FastAPI; the browser receives an HttpOnly, SameSite=Lax cookie (Secure in production), never a session token in JSON or localStorage. The gateway key remains server-only and does not itself authorize a user. Signout revokes the current session and returns to the public demo dashboard. Changing a password revokes all account sessions and returns to signin. Room participant credentials remain separate capabilities for the lifetime of a meeting; password changes do not terminate already connected calls.

Signup/signin are limited to ten attempts per normalized email per minute in the single-process API. This is a basic demo throttle, not a distributed abuse-prevention service. Signup conflicts return a generic account-creation error; signin failures do not disclose whether an account exists. Non-GET proxy requests check browser Origin against the configured application origin. Configure `APP_ORIGIN` and HTTPS in production.

To sign in explicitly as the seeded demo account, optionally set `DEMO_PASSWORD` (at least 12 characters) in the backend environment before startup, then sign in as `demo@example.com`. There is no built-in demo password. Anonymous use of the demo workspace does not create a login session. A pre-existing seed user's missing password is provisioned only through this trusted environment setting; existing credentials are never overwritten. Alternatively, use your own new account. Existing meeting ownership is preserved by Alembic migration 002.

Email/password authentication is implemented. Email verification, forgotten-password email recovery, OAuth/social login and MFA are not implemented. No verification or recovery emails are sent. These require a separately configured workflow/provider; the reference social-login buttons and email-code screens are not presented as working features.

## Database design and assignment checklist

| Table | Purpose and relationships |
| --- | --- |
| `users` | Unique email, display name, timezone, optional password hash for the seeded demo identity. |
| `meetings` | Unique indexed 11-digit code; `host_user_id` references `users`; scheduling metadata, host credential hash and lifecycle timestamps. |
| `participants` | Per-admission UUID and unique credential hash; references a meeting and optionally its signed-in host user; join, leave and removal history. |
| `auth_sessions` | Unique session credential hash; references `users`; expiry enables revocation and account-session validation. |

Foreign keys are enabled on every SQLite connection. Meeting participant records belong to their meeting; connected sockets are kept separately in the single-worker registry. Alembic migration 001 creates the meeting schema; 002 adds optional password credentials and account sessions. Seeds are inserted on fresh startup and never overwrite existing meetings or account credentials.

The application supports optional Login/Signup, default-user access without login, and host-only mute-all/removal. Portal, forms and call controls adapt to mobile/tablet/desktop sizes. UI styling follows the supplied Zoom references, with unsupported product controls shown as explicit previews. This is an original assignment implementation using the listed framework dependencies, not Zoom's source code.

Local acceptance tests cover two synthetic browser participants receiving remote video and audio packets, camera toggles, screen sharing, mute-all, removal and end-for-everyone. This does not certify real-device/cross-network connectivity or exact pixel equality with Zoom. Test suites and reports stay local according to the requested Git ignore policy.

## Verification

The commands below apply to the local development workspace. The existing test suites and Playwright configuration are intentionally excluded from the GitHub submission. Production build, type checks, and formatting checks are available in a fresh checkout. Python lint/format checks require installing Ruff separately.

Backend:

```bash
cd backend
.venv/bin/python -m pytest tests -q
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
```

Run `npm run format` to apply the frontend formatting conventions. `.editorconfig` sets shared whitespace rules. With Ruff installed, use `ruff check app migrations` and `ruff format --check app migrations` from `backend`.

Browser integration tests expect both servers already running on ports 3000/8000. The auth suite creates and removes isolated test accounts; older feature suites reflect earlier navigation and may need fixture updates. Historical results for the earlier default-user mode are not a claim that those browser fixtures were rerun unchanged. They use synthetic camera/microphone streams and create real test meetings in the local database. They check ID validation, scheduling persistence across reload, mobile overflow, remote video frames and incoming audio packets, camera toggles, screen sharing, mute-all, removal and end-for-everyone. Do not run them against a live user database.

Manual acceptance: open two browser profiles/devices, start a meeting, copy its invitation, join as a guest, speak, toggle cameras, share a screen, stop sharing, mute all, remove a participant and end the meeting. Test denied permissions and different networks before submission.

## Deployment: Vercel frontend + Render backend

1. Push this repository to a public GitHub repository (exclude `.env`, `.env.local`, databases and secrets).
2. Create a Render Blueprint using `render.yaml`. It specifies a paid web service with a persistent disk. SQLite lives at `/var/data/zoom.db`; the Docker start command runs Alembic before Uvicorn.
3. Create the Vercel project with root directory `frontend`, framework Next.js, build command `npm run build`.
4. Configure Vercel:
   - `BACKEND_URL=https://your-api.onrender.com`
   - `NEXT_PUBLIC_WS_URL=wss://your-api.onrender.com`
   - `HOST_API_KEY`: the generated Render secret, identical on both services
   - `APP_ORIGIN=https://your-app.vercel.app`
5. Configure Render:
   - `FRONTEND_URL=https://your-app.vercel.app`
   - `ALLOWED_ORIGINS=https://your-app.vercel.app` (exact origins, comma-separated if needed)
   - `ICE_SERVERS_JSON`: STUN plus your TURN server's credentials
6. Redeploy the frontend after public environment variables change. Verify `/health`, meeting persistence after backend restart, and a call across different networks.

Use one backend instance and one worker. The room registry is in memory. Multiple instances would need shared signaling coordination. Persistent disks also require a supported paid service. TURN must be supplied for reliable connectivity across restrictive networks; the example configuration contains only public STUN.

For a temporary test-browser install location:

```bash
cd frontend
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/zoom-playwright npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/zoom-playwright npm run test:e2e
```

## Assumptions and limitations

- Small demo meetings; no Zoom-scale participant or reliability claim. Peer mesh bandwidth grows with participant count.
- No OAuth, email verification/recovery, MFA, recording, phone dialing, recurring meetings, waiting rooms, calendar email delivery or whiteboard. Reference-only controls open a Preview only notice; unsupported scheduling options are disabled and never submitted.
- All calls happen in the browser. Camera/microphone access needs HTTPS (localhost is allowed); browser screen sharing requires a user action and may not be supported on mobile.
- Host mute requests are honored by this client; no peer mesh implementation can prevent a modified malicious client from transmitting audio. Hosts cannot remotely enable another person's microphone.
- Removing a participant invalidates that participant session. With anonymous names and a shared invitation, a person can join again with a new guest session; persistent identity-based bans require authentication.
- Leaving as host does not end the meeting. The meeting owner can reclaim host access from the portal. End-for-everyone permanently closes that meeting.
- Duration describes the planned meeting length; it does not automatically terminate a live call or enforce subscription limits.
- Socket disconnection closes the call and offers rejoin. There is no automatic reconnection that silently reuses a closed participant session.
- Brand visuals are used for an assignment demo. Footer identifies this implementation as a clone.
- Deployment configuration is included; provisioning accounts, a public repository and a hosted URL is a separate step requiring your accounts.

## Meeting collaboration

Chat, emoji reactions and raised hands travel over the admitted participant WebSocket, separately from WebRTC media. The server supplies sender IDs/names; clients cannot select another sender. Chat messages are plain text (1–2000 characters), rendered with React text escaping. A room retains its latest 100 messages for late joiners while anyone remains connected; history is discarded when the room empties or the backend restarts. There are no private messages or durable chat archives.

Each participant can raise/lower their own hand; the state appears on their video tile and in Participants. Six supported reactions appear on the sender's tile for five seconds. Chat has a half-second send interval and reactions a one-second interval per connected participant. These limits bound routine traffic; anonymous guests can obtain new sessions.

## Appearance and workspace navigation

The application is named ZOOM-CLONE. CSS `prefers-color-scheme` follows the operating system's light/dark setting, including changes made while the page is open. Shared surface/text/border variables style workspace pages, forms, menus, authentication, previews and live calls without a saved theme override or hydration flash. `workspace.css` contains the reference layout and theme styling.

Join and Schedule use native modal dialogs with focus containment and Escape/close navigation back home. Join options select the initial audio/video state in the media preview; users can enable devices afterward. Search filters the user's upcoming/previous meetings by title or ID. Scheduling confirmation and meeting details open over the home workspace. In-call More offers meeting information, device settings and copying invitations; Host tools exposes the existing authorized controls. Unsupported screenshot products, paid upgrades, recording, AI tools, calendar connections and breakout rooms are not presented as working buttons.

The Meetings workspace includes a mini month calendar, day navigation, Upcoming/Previous filters, refresh, and an iCalendar (`.ics`) download. It defaults to Upcoming so future meetings remain easy to find; choosing a date opens that day's agenda. Calendar dates follow the browser's time zone; meeting cards retain their saved meeting time zone. Export is a downloaded calendar file, not a connected Google/Outlook account.

The profile menu saves availability, a status message, and work location in SQLite (migration `003`). Availability is manually selected, not inferred presence. Anonymous visitors share demo-user preferences; optional signed-in accounts save their own preferences. Subscription upgrades and native-app update/download controls are visual placeholders only.

## GitHub Actions: Railway + Vercel

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Railway volume, Vercel project, environment variables and GitHub credentials setup. CI checks frontend formatting/types/build and backend lint/migrations/API smoke behavior on every push or pull request. After setup, successful `main` pushes deploy the Railway backend followed by the Vercel frontend when `ENABLE_PRODUCTION_DEPLOYMENTS=true`. Manual deployment is available through **Actions → CI and deployment → Run workflow**. Full local suites remain ignored; CI's tracked smoke verification does not replace real-device testing.
