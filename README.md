# Pawsitive Mobile Grooming — Local Service Business Starter Kit

A small, complete example of the kind of MVP I build for small businesses and solo
founders: a polished landing page, a working booking form backed by a real API, and
an admin dashboard to manage incoming requests — shipped fast, with no unnecessary
complexity.

This is a demo project built around a fictional mobile pet grooming business, meant
to stand in for the flat-rate offer described below.

**The pitch this demonstrates:** $400 flat — a simple booking/tracking app MVP,
built in about 2 weeks, fixed scope, no surprise hours.

> **Live demo:** _add your deployed URL here after the first deploy._

## What's in it

- **Landing page** (`public/index.html`) — hero, services and pricing, how-it-works,
  reviews, FAQ, and a booking form with inline validation and a real success state.
- **Booking API** (`server.js`) — a small Express server that validates, stores, and
  serves booking submissions. Rate limited and input-capped so it can sit on a
  public URL.
- **Admin dashboard** (`public/admin.html`) — status counts, search, status filters,
  and one-click status changes (new / contacted / confirmed) that save immediately.

Both pages share one stylesheet built on CSS custom properties, are responsive down
to 375px, and follow the visitor's light/dark system preference.

## Why this stack

Deliberately minimal: plain HTML/CSS/JS on the frontend (no build step, no framework
overhead) and a small Express server with JSON-file storage instead of a full
database. Express is the only runtime dependency — validation, rate limiting and
security headers are all hand-rolled in a few lines each.

For a business that just needs a working booking form — not a 30-screen app — this
is the right amount of engineering, and it's exactly the "simple, fast, not bloated"
positioning I build around.

For a production version, swapping the JSON file for Postgres/SQLite, putting auth
in front of the admin view, and adding email notifications on new bookings would be
the natural next steps — all quick additions on top of this foundation.

## Running it locally

```bash
npm install
npm start
```

Then open:

- `http://localhost:3000` — the public booking page
- `http://localhost:3000/admin.html` — the admin dashboard

The server seeds a few sample bookings the first time it starts with an empty store,
so the dashboard has something to show.

## API

| Method  | Route               | Notes                                              |
| ------- | ------------------- | -------------------------------------------------- |
| `POST`  | `/api/bookings`     | Create a booking. Validated; 20/hour per IP.        |
| `GET`   | `/api/bookings`     | List all bookings, newest first.                    |
| `PATCH` | `/api/bookings/:id` | Update status — `new`, `contacted`, or `confirmed`. |
| `GET`   | `/api/health`       | Uptime check: booking count and storage mode.       |

### Configuration

| Variable        | Default              | Purpose                                   |
| --------------- | -------------------- | ----------------------------------------- |
| `PORT`          | `3000`               | Port to listen on.                        |
| `DATA_FILE`     | `data/bookings.json` | Where bookings are stored.                |
| `MAX_BOOKINGS`  | `200`                | Cap on stored records (demo hygiene).     |
| `NODE_ENV`      | —                    | Set to `production` to enable static caching. |

## Deploying it

The app is a plain Node server, so most free tiers will run it as-is.

**Render (easiest free option).** Push this repo to GitHub, then in Render create a
new **Blueprint** and point it at the repo — `render.yaml` supplies the build
command, start command and health check. Free instances sleep after ~15 minutes of
inactivity, so the first request after a nap takes 30–50 seconds to wake up.

**Anywhere else.** `Dockerfile` is included for hosts that want a container
(Fly.io, Railway, Cloud Run). Nothing else needs to change.

**One caveat on free tiers:** the filesystem is ephemeral, so bookings reset when
the instance restarts and the server re-seeds its sample data. That's fine for a
demo — visitors can still submit a booking and watch it appear in the dashboard. To
persist for real, attach a disk and point `DATA_FILE` at it, or swap in a database.

**Before sharing the link:** replace `public/og-image.svg` with a PNG screenshot and
point `og:image` at its absolute URL — most link-preview scrapers ignore SVG.

## Note on the admin view

The dashboard is intentionally unauthenticated so anyone can click through the demo,
and both pages say so in the banner. Booking text is rendered as DOM text nodes
rather than HTML, so untrusted input can't execute. In a real deployment this page
goes behind a login.

## Tech

Node.js, Express, vanilla HTML/CSS/JS. No database server or build tooling required
— clone it and run it in under a minute.
