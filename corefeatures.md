# Feature checklist

`[x]` supported and verified within the stated scope · `[~]` visual reference only

## Core features

- [x] Zoom-style default-user dashboard; New Meeting, Join, Schedule, Upcoming and Recent.
- [x] Instant creation, unique meeting ID, shareable invite and room redirect.
- [x] Join by ID/link, display name, meeting existence validation.
- [x] Scheduling: title, description, date/time, duration, generated link, SQLite persistence, Upcoming integration.
- [x] Real browser audio/video, microphone/camera controls, participants, invitations, leave and end-for-everyone.

## Bonus

- [x] Responsive mobile, tablet and desktop with system light/dark appearance.
- [x] Optional signup/signin/signout; no login required for the default demo workspace.
- [x] Backend-authorized host mute-all and participant removal.

## Visual placeholders

- [~] Chat, reactions, raise hand, screen sharing and rename.
- [~] Waiting room, lock, advanced host permissions.
- [~] Profile/settings, availability/status/work location, calendar export/integration.
- [~] AI, recording, breakout rooms, unrelated products and paid upgrades.

Dashboard entry: `/` (also available at `/dashboard`). No marketing or login gate. Placeholders are labeled and do not execute their former actions. Existing backend compatibility handlers are outside the supported product interface.

## Evidence and deliverables

- Owner confirmed manual physical-device testing of all implemented features, including Mac/Android calls on the same Wi-Fi and different networks and host controls.
- Database seeded with a demo user and sample upcoming/completed meetings; SQLAlchemy relationships and Alembic migrations retained.
- README includes setup, stack, schema, deployment and assumptions.
- Vercel frontend and Railway backend deployed; dashboard homepage and typography/motion update deployed in commit `9643dc3`.
- No tested participant limit or universal network/browser compatibility is claimed.

Latest scope validation: 56 included backend tests and 16 production-browser tests passed, including core flow, optional auth, previews and light/dark layouts at 390, 768 and 1440 px. Frontend build/type/format and backend Ruff checks passed.
