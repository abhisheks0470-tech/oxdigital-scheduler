# OxDigital Meeting Scheduler CRM

Complete first-version CRM for OxDigital meeting scheduling with:

- Role-based login for Admin, Telecaller, and Salesman
- Admin dashboard, reports, users, settings, live location placeholder
- Telecaller meeting booking flow with salesman/date/time/customer steps
- One-hour before and after slot blocking for each booked meeting
- Salesman dashboard, meeting details, call/WhatsApp/navigate actions, meeting result updates
- Follow-up management, payment proof upload placeholder, in-app notifications
- Web admin/client panel, backend API, MySQL schema, and Flutter mobile app source

## Dummy Login

- Admin: `admin@oxdigital.in` / `123456`
- Telecaller: `telecaller@oxdigital.in` / `123456`
- Salesman: `salesman@oxdigital.in` / `123456`

## Local Web/API Run

This project intentionally has no backend npm dependencies, so it can run immediately with Node.

```bash
cd backend
node src/server.js
```

Open:

```text
http://localhost:4100
```

The local API stores data in `backend/data/db.json` and uploaded proof placeholders in `backend/uploads`.

## Real Live Sync Setup

The desktop website and Android app sync through the same backend API.

1. Host the `backend` folder on a Node-capable server.
2. Keep the `web` folder beside it, because the backend serves the desktop website.
3. Open the website at your backend domain:

```text
https://oxdigital.in/scheduler
```

4. In `codemagic.yaml`, set `API_URL` to the same backend domain:

```yaml
API_URL: "https://oxdigital.in/scheduler"
```

5. Rebuild the APK/AAB in Codemagic.

Both clients call `/api/sync` every few seconds, so meetings, reports, users, follow-ups, settings, notifications, and salesman location updates stay synced.

## API Overview

- `POST /api/login`
- `GET /api/me`
- `GET /api/dashboard`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `GET /api/meetings`
- `POST /api/meetings`
- `GET /api/slots?salesmanId=&date=YYYY-MM-DD`
- `PUT /api/meetings/:id/result`
- `GET /api/followups`
- `GET /api/reports`
- `POST /api/uploads`
- `GET /api/notifications`
- `GET /api/live-locations`
- `GET /api/settings`
- `PUT /api/settings`

## Slot Blocking Rule

When a meeting is booked for `3:00 PM`, the API stores:

- `blocked_start = 2:00 PM`
- `meeting_at = 3:00 PM`
- `blocked_end = 4:00 PM`

Any overlapping booking for the same salesman is rejected with `409 Slot blocked for this salesman`. The UI also disables blocked slots.

## MySQL

Schema and starter seed are in:

- `database/schema.sql`
- `database/seed.sql`

The current runnable backend uses JSON storage for local setup speed. The schema mirrors the JSON fields so the next step can swap the store layer to MySQL using the same API routes.

## Flutter Android App

Source is in `flutter_app`.

```bash
cd flutter_app
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:4100
```

Use `10.0.2.2` for Android emulator, or your PC LAN IP for a physical Android device.

## Assets

- `assets/oxdigital-logo.svg`
- `assets/oxdigital-logo.png`
- `docs/ui-mockup.png`

The web panel and Flutter source both use the OxDigital logo clearly on login and dashboard screens.
