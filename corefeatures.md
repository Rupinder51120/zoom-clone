# Feature checklist

Legend: `[x]` implemented and verified within the stated scope · `[~]` partially verified or incomplete · `[ ]` pending

**Verification — 9 October 2026:** 62 backend pytest tests and 10 Playwright cases passed in the latest local
acceptance run. Browser tests used a production build, disposable SQLite data and synthetic media devices.
One browser case covers multiple features; this is not a one-test-per-checkbox claim. Comprehensive test sources/configuration and reports remain gitignored. CI runs the included smoke
verification and formatting/type/build checks, not the full local acceptance suite.

## Core features (must have)

### 1. Landing Dashboard

- [x] New Meeting action creates a meeting and opens the host room.
- [x] Join and Schedule actions navigate to their modal workflows.
- [x] Upcoming and Recent sections load meeting data from SQLite.
- [x] Empty sections display an appropriate empty state.
- [x] Navbar/profile controls and settings navigation are present.
- [~] Zoom UI similarity: reference layout, colors and navigation retained; exact spacing, typography and assets differ.

### 2. Instant Meeting Creation

- [x] Create an instant meeting without requiring login.
- [x] Generate a unique 11-digit meeting ID; backend tests create 50 distinct IDs/host credentials.
- [x] Generate a shareable invitation and copy invitations to the clipboard.
- [x] Redirect the creating browser to the host room.
- [x] Host refresh preserves access and allows a new admission.
- [x] Disconnected host rejoin opens a fresh room and retains host controls in the same browser session.
- [x] Duplicate socket rejection leaves the original connection intact.
- [x] Resetting host credentials invalidates old pending host admissions.

### 3. Join Meeting

- [x] Join by meeting ID in a fresh browser context.
- [x] Resolve an invitation URL to the correct meeting room.
- [x] Require a nonempty display name before room admission.
- [x] Reject nonexistent meetings and malformed IDs/invitations.
- [x] Disable the empty meeting-ID submission.
- [x] Reject joining an ended meeting.
- [x] Direct room navigation and refresh work in the tested local browser environment.
- [x] Initial audio/video options and device preview are implemented; received media is tested with synthetic devices.

### 4. Schedule Meetings

- [x] Save title and optional description.
- [x] Select date, time, IANA timezone and duration.
- [x] Validate future dates, timezone, title and duration on the backend.
- [x] Normalize scheduled time to UTC while retaining the selected timezone.
- [x] Generate and copy the invitation link.
- [x] Persist scheduled details in SQLite.
- [x] Show saved meetings in the upcoming meetings list.
- [x] Preserve details after page reload and API-process restart.

## Meeting room functionality

- [x] Two local browser participants receive remote video frames and audio RTP packets.
- [x] Camera off/on changes the remote participant's video visibility.
- [x] Host mute-all changes the guest microphone state; individual mute is backend-authorized and covered by integration tests.
- [x] Waiting-room guests have no peer signaling/chat access until admitted by the host.
- [x] Meeting lock rejects new guest socket admissions.
- [x] Live permissions for unmuting, video, chat, renaming and sharing; guests cannot change host policy.
- [x] Advanced hide-avatar setting, responsive host panel and light/dark appearance.
- [x] Unsupported browser screen capture has an explanatory control/message; Android can receive a desktop share.
- [x] Share and stop sharing a screen; sharing state appears on the guest.
- [x] Show participants and authorize host commands on the backend.
- [x] Remove a participant and invalidate that participant admission.
- [x] End-for-everyone persists the ended state and closes the call.
- [x] Ended calls do not offer a rejoin link.
- [~] Leave/media permission/device-choice behavior: implemented with existing local coverage; full physical-device acceptance remains pending.
- [x] Owner-reported Mac + Android same-Wi-Fi call with real devices; screenshots show Android receiving the Mac’s shared screen.
- [ ] Cross-network connectivity through a configured TURN relay.
- [ ] Tested participant capacity/load limit; no limit is claimed.

## Bonus (optional)

- [x] Responsive Home, Join and Schedule at 390, 768 and 1440 CSS-pixel widths in light/dark modes without horizontal overflow.
- [x] Optional signup, signin and signout; mandatory workflows remain accessible without login.
- [x] Fresh personal-account dashboard shows empty meeting sections.
- [x] Password/session validation and revocation covered by backend tests.
- [x] Backend-authorized host mute-all and removal, also exercised in the browser.
- [~] Chat, six reactions and raise/lower hand: implemented and covered by backend room-event tests; complete browser interaction was not rerun in the latest acceptance suite.
- [~] Calendar/agenda, `.ics` export, profile availability/status/work location: implemented with earlier local verification; not fully rerun in the latest suite.

## Reference-only placeholders

These entries describe UI placeholders, not implemented product capabilities.

- [~] Paid upgrades, ZoomMate/AI and unrelated workspace products show preview notices.
- [~] Recording, breakout rooms, connected calendars and unsupported meeting options are previews/disabled options.
- [ ] Recording, AI services, breakout rooms, waiting rooms, whiteboards and calendar integrations as real services.
- [ ] OAuth/social login, email verification, email password recovery and MFA.

## Important notes and deliverables

- [x] Required Next.js frontend, FastAPI backend and SQLite database.
- [x] Demo user and three upcoming/two completed sample meetings seeded on a fresh database.
- [x] Four application tables with primary/foreign keys, unique meeting codes and credential hashes.
- [x] Four Alembic migrations; latest adds host-admission binding.
- [x] SQLite integrity check passes; no foreign-key violations or duplicate meeting codes in the isolated acceptance database.
- [x] README includes setup, stack, features, environment variables, architecture, schema, API, testing, deployment, assumptions and limitations.
- [x] Public GitHub repository: [Rupinder51120/zoom-clone](https://github.com/Rupinder51120/zoom-clone), visibility verified during the audit.
- [x] Production frontend build, TypeScript, Prettier, Ruff and backend CI smoke verification passed locally.
- [x] Railway/Vercel deployment configuration and GitHub Actions workflows exist.
- [x] Application fixes and submission documentation committed/pushed; deployment documentation updated with public URLs.
- [x] Railway persistent volume at `/data`, public domain, and configured server gateway key verified through deployed host admission.
- [x] Vercel/Railway deployment completed: dashboard data, instant creation, host admission, secure WebSocket connection and end-for-everyone verified without media.
- [x] Working deployed application URL included in README: https://zoom-clone-bice-mu.vercel.app
- [ ] Author's interview readiness: explain each implementation decision and submitted code.

**Submission readiness:** local mandatory workflows and hosted smoke flow verified. Physical-device media, cross-network TURN and full hosted acceptance remain pending. GitHub Actions production release automation is configured in source but not verified with cloud credentials.
