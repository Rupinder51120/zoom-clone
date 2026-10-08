# GitHub Actions → Railway API + Vercel web

## What runs

`.github/workflows/ci.yml` runs on pushes, pull requests and manual dispatch:

- Frontend: `npm ci`, Prettier, TypeScript, production build (Node 22).
- Backend: locked dependencies, Ruff, Alembic on a temporary SQLite database and core API verification (Python 3.11).
- Production: after both checks succeed, calls `deploy.yml` on `main` when enabled. Railway deploys first and waits for deployment; Vercel then pulls production settings, builds and deploys prebuilt output.

Comprehensive test sources, browser configurations and generated results remain gitignored. CI runs the included `backend/ci/verify.py` smoke verification, not the full local suites or browser/device tests. The script creates and removes its own temporary database.

## Current deployed services

- Frontend: https://zoom-clone-bice-mu.vercel.app
- Backend: https://zoom-clone-production-8be6.up.railway.app
- Verified on 9 October 2026: public health 200 OK, seeded dashboard data, instant creation, host WebSocket admission and end-for-everyone (media disabled). Physical-device and TURN verification remain pending.
- The current GitHub-imported Railway service uses `/backend` as Root Directory and `Dockerfile` as its build path, with one replica and a `/data` volume. Vercel uses `frontend`.
- The CLI archive workflow below expects an empty Railway Root Directory. Do not enable that workflow against the current `/backend` service without first reconciling the upload root. Production Actions credentials/automation have not been verified.

## 1. Create Railway backend

Create a Railway project with a backend service and a production environment. Generate a public domain. The workflow uploads **only `backend/` as the archive root**; keep the Railway service Root Directory empty (`/`), use `railway.json` at that archive root, and do not set a conflicting dashboard start command.

Attach a persistent volume at `/data` before deploying. Configure:

| Railway variable | Value |
| --- | --- |
| `DATABASE_URL` | `sqlite:////data/zoom.db` |
| `HOST_API_KEY` | A long random secret, identical to Vercel's server-only secret |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (no trailing slash) |
| `ICE_SERVERS_JSON` | Your STUN/TURN JSON configuration |

Keep one replica, one region and one Uvicorn worker. The Docker startup command applies migrations while the volume is mounted and then starts Uvicorn on Railway's `PORT`. Railway checks `/health`. Do not move migrations into a pre-deploy command that lacks the volume. Back up the volume before schema changes. Deployments restart live meeting sockets.

Create an **environment-scoped project token** for production; use it as `RAILWAY_TOKEN`. Copy the backend service ID as `RAILWAY_SERVICE_ID`. The workflow explicitly selects that service; the project token selects its project/environment.

## 2. Create Vercel frontend

Create/link a Vercel project for this repository. Set:

- Framework: Next.js
- Root Directory: `frontend`
- Node.js: 22.x
- Install command: `npm ci`
- Build command: `npm run build`

The Actions CLI commands run from the repository root so Vercel's configured `frontend` root is applied once. Configure these **Production** environment variables in Vercel:

| Vercel variable | Value |
| --- | --- |
| `BACKEND_URL` | `https://your-api.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | `wss://your-api.up.railway.app` |
| `HOST_API_KEY` | The same server-only secret as Railway |
| `APP_ORIGIN` | `https://your-app.vercel.app` |

Never prefix `HOST_API_KEY` with `NEXT_PUBLIC_`. Obtain `VERCEL_TOKEN` from your Vercel account. `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` come from the linked project's `.vercel/project.json`; this metadata is gitignored. Configure the permanent frontend origin on Railway before testing calls.

## 3. Configure GitHub

In repository **Settings → Secrets and variables → Actions**, add:

| Type | Name | Purpose |
| --- | --- | --- |
| Secret | `RAILWAY_TOKEN` | Railway production project token |
| Variable | `RAILWAY_SERVICE_ID` | Backend service ID |
| Secret | `VERCEL_TOKEN` | Vercel deployment token |
| Secret | `VERCEL_ORG_ID` | Vercel team/account ID |
| Secret | `VERCEL_PROJECT_ID` | Vercel frontend project ID |
| Variable | `ENABLE_PRODUCTION_DEPLOYMENTS` | Set `true` to deploy automatically on successful pushes to `main` |

Create a GitHub environment named `production`. You can store deployment credentials there instead; keep the enable flag as a repository variable because it is evaluated before environment jobs start. Optional environment reviewer rules apply to deployment jobs.

Disable Railway/Vercel Git autodeploys if Actions should control release ordering; otherwise their independent deployments can start before CI passes. Keep the enable flag unset while configuring services.

## 4. First deployment

Push the workflows and application source to GitHub. In **Actions → CI and deployment → Run workflow**, select `main` and check `deploy`. This runs the same checks before deploying. Missing credentials produce explicit configuration errors. After the first deployment works, set `ENABLE_PRODUCTION_DEPLOYMENTS=true` for subsequent `main` pushes. Pull requests and other branches never deploy production.

Verify the public API `/health`, optional-login dashboard, scheduling persistence after a backend restart, and a host/guest call across two physical devices and different networks. Provide working TURN before claiming reliable cross-network calling. These workflows do not provision cloud accounts, volumes, domains, credentials or TURN and have not been run against your cloud accounts locally.

## References

- [Railway CLI deployment and archive roots](https://docs.railway.com/cli/up)
- [Railway project token authentication](https://docs.railway.com/cli)
- [Railway health checks/configuration](https://docs.railway.com/config-as-code/reference)
- [Vercel GitHub Actions deployment](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
