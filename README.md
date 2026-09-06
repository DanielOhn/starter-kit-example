# Pawsitive Mobile Grooming — Local Service Business Starter Kit

A small, complete example of the kind of MVP I build for small businesses and solo
founders: a clean landing page, a working booking form backed by a real API, and an
admin view to manage incoming requests — all shipped fast, with no unnecessary
complexity.

This is a demo project built around a fictional mobile pet grooming business, meant
to stand in for the flat-rate offer described below.

**The pitch this demonstrates:** $400 flat — a simple booking/tracking app MVP,
built in about 2 weeks, fixed scope, no surprise hours.

## What's in it

- **Landing page** (`public/index.html`) — services, pricing, and a booking form.
- **Booking API** (`server.js`) — a small Express server that accepts booking
  submissions and stores them.
- **Admin view** (`public/admin.html`) — lists all booking requests and lets you
  update their status (new / contacted / confirmed).

## Why this stack

Deliberately minimal: plain HTML/CSS/JS on the frontend (no build step, no
framework overhead) and a small Express server with JSON-file storage instead of a
full database. For a business that just needs a working booking form — not a
30-screen app — this is the right amount of engineering, and it's exactly the
"simple, fast, not bloated" positioning I build around.

For a production version, swapping the JSON file for Postgres/SQLite and adding
email notifications on new bookings would be the natural next step — both are quick
additions on top of this foundation.

## Running it locally

```bash
npm install
npm start
```

Then open:
- `http://localhost:3000` — the public booking page
- `http://localhost:3000/admin.html` — the admin view

## Tech

Node.js, Express, vanilla HTML/CSS/JS. No database server or build tooling
required — clone it and run it in under a minute.
