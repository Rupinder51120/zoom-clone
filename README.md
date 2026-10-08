# Zoom web meeting clone

An original fullstack assignment implementation using Next.js App Router, TypeScript, Tailwind CSS, FastAPI, SQLAlchemy, Alembic and SQLite. The portal and Join screen follow the supplied Zoom screenshots: white navigation, navy utility bar, pale sidebar, blue controls, generous whitespace, and dropdown menus.

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

Seeds are inserted once on a fresh database: the default user, three upcoming meetings and two completed meetings. Seed dates are relative to initial startup. A restart never overwrites existing meetings. SQLite files are excluded from version control.

## Implemented workflows

- Dashboard with instant meeting creation, Join, Schedule, upcoming and recent meetings.
- Unique 11-digit IDs, invite links, copyable invitations, meeting detail pages.
- Join by ID or invite URL, existence/ended validation, display name, media preview and device selection.
- Scheduling: topic, optional description, date/time, IANA timezone, duration, host video preference.
- Real browser WebRTC audio/video through a peer mesh; FastAPI WebSockets carry signaling and participant events.
- Microphone/camera controls, participant list, browser screen sharing, invite, leave.
- Server-authorized host commands: mute all, remove participant, end for everyone.
- Editable default user's display name and timezone; responsive portal and meeting room.
- SQLite participant join/leave/removal history and meeting status/start/end timestamps.

## Architecture and interview explanation

Local architecture notes and verification results are in `docs/architecture.md` and `docs/verification.md`. Planning documents, screenshots, agent instructions, and existing test files are excluded from the GitHub submission through `.gitignore`; they remain available in the development workspace.

The frontend's server-side API proxy injects a server API key. That key is never sent to browser JavaScript. Because the assignment assumes one logged-in user, **every portal visitor acts as that same default user**. This is not a multi-user authentication system. Browser guest joining still receives only guest privileges; host commands require a separately issued room credential and are checked by FastAPI.

## Verification

The commands below apply to the local development workspace. The existing test suites and Playwright configuration are intentionally excluded from the GitHub submission. Production build and type checks are available in a fresh checkout.

Backend:

```bash
cd backend
.venv/bin/python -m pytest tests -q
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser integration tests expect both servers already running on ports 3000/8000. They use synthetic camera/microphone streams and create real test meetings in the local database. They check ID validation, scheduling persistence across reload, mobile overflow, remote video frames and incoming audio packets, camera toggles, screen sharing, mute-all, removal and end-for-everyone. Do not run them against a live user database.

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
- No signup, OAuth, verification email, recording, phone dialing, recurring meetings, waiting rooms, calendar email delivery, chat or whiteboard. Unrelated reference navigation is decorative/disabled with a scope label.
- All calls happen in the browser. Camera/microphone access needs HTTPS (localhost is allowed); browser screen sharing requires a user action and may not be supported on mobile.
- Host mute requests are honored by this client; no peer mesh implementation can prevent a modified malicious client from transmitting audio. Hosts cannot remotely enable another person's microphone.
- Removing a participant invalidates that participant session. With anonymous names and a shared invitation, a person can join again with a new guest session; persistent identity-based bans require authentication.
- Leaving as host does not end the meeting. The default user can reclaim host access from the portal. End-for-everyone permanently closes that meeting.
- Duration describes the planned meeting length; it does not automatically terminate a live call or enforce subscription limits.
- Socket disconnection closes the call and offers rejoin. There is no automatic reconnection that silently reuses a closed participant session.
- Brand visuals are used for an assignment demo. Footer identifies this implementation as a clone.
- Deployment configuration is included; provisioning accounts, a public repository and a hosted URL is a separate step requiring your accounts.
