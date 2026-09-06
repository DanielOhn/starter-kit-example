// Pawsitive Mobile Grooming — demo backend
//
// A deliberately small Express server: static frontend plus a JSON-file-backed API
// for booking submissions and the admin view. No database server, no build step —
// simple by design, matching the "fast, simple, not bloated" MVP pitch.
//
// It is also meant to sit on a public URL as a portfolio piece, so anything that
// takes untrusted input is validated, capped, and rate limited. Zero extra deps.

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "bookings.json");

const STATUSES = ["new", "contacted", "confirmed"];
const PET_TYPES = ["Dog", "Cat", "Other"];
const SERVICES = ["Bath & Brush", "Full Groom", "Nail Trim Only"];

// A public demo shouldn't accumulate forever, or accept a novel in the notes field.
const MAX_BOOKINGS = Number(process.env.MAX_BOOKINGS || 200);
const MAX_LEN = { name: 80, email: 120, phone: 30, petName: 60, notes: 600 };

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  next();
});

/* ------------------------------------------------------------------ store -- */
// Writes go to disk when the filesystem allows it. On ephemeral/read-only hosts we
// fall back to memory so the demo keeps working instead of 500-ing the booking form.
let memoryStore = null;

function readBookings() {
  if (memoryStore) return memoryStore;
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeBookings(bookings) {
  if (memoryStore) {
    memoryStore = bookings;
    return;
  }
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
  } catch (err) {
    console.warn(`Storage is not writable (${err.code}) — falling back to in-memory store.`);
    memoryStore = bookings;
  }
}

/* ----------------------------------------------------------------- seeding -- */
// An empty dashboard is a bad first impression for a demo, so seed a few sample
// requests dated relative to today. Only ever runs when the store is empty.
function seedIfEmpty() {
  if (readBookings().length > 0) return;

  const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const hoursAgo = (n) => new Date(Date.now() - n * 3600 * 1000).toISOString();

  const samples = [
    { name: "Marisol Reyes", email: "marisol.r@example.com", phone: "(928) 555-0117", petName: "Biscuit",
      petType: "Dog", service: "Full Groom", preferredDate: daysFromNow(2),
      notes: "Golden retriever, hates the dryer. Gate code 4412.", status: "confirmed", createdAt: hoursAgo(50) },
    { name: "James Tran", email: "j.tran@example.com", phone: "(928) 555-0163", petName: "Miso",
      petType: "Cat", service: "Nail Trim Only", preferredDate: daysFromNow(1),
      notes: "Senior cat, needs to stay indoors if possible.", status: "contacted", createdAt: hoursAgo(26) },
    { name: "Dana Kowalski", email: "dana.k@example.com", phone: "(928) 555-0188", petName: "Pepper",
      petType: "Dog", service: "Bath & Brush", preferredDate: daysFromNow(4),
      notes: "", status: "new", createdAt: hoursAgo(5) },
    { name: "Andre Willis", email: "awillis@example.com", phone: "(928) 555-0134", petName: "Nugget",
      petType: "Dog", service: "Full Groom", preferredDate: daysFromNow(6),
      notes: "First groom ever — he's nine months old and very wiggly.", status: "new", createdAt: hoursAgo(1) },
  ];

  writeBookings(samples.map((s) => ({ id: makeId(), ...s })));
  console.log(`Seeded ${samples.length} sample bookings.`);
}

/* -------------------------------------------------------------- validation -- */
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validateBooking(body) {
  const errors = [];
  const booking = {
    name: clean(body.name, MAX_LEN.name),
    email: clean(body.email, MAX_LEN.email),
    phone: clean(body.phone, MAX_LEN.phone),
    petName: clean(body.petName, MAX_LEN.petName),
    petType: clean(body.petType, 20),
    service: clean(body.service, 40),
    preferredDate: clean(body.preferredDate, 10),
    notes: clean(body.notes, MAX_LEN.notes),
  };

  if (booking.name.length < 2) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(booking.email)) errors.push("email");
  if (booking.phone.replace(/\D/g, "").length < 10) errors.push("phone");
  if (!PET_TYPES.includes(booking.petType)) errors.push("petType");
  if (!SERVICES.includes(booking.service)) errors.push("service");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.preferredDate)) errors.push("preferredDate");

  return { booking, errors };
}

/* ----------------------------------------------------------- rate limiting -- */
// Small fixed-window limiter. Enough to keep a public demo from being hammered
// without pulling in a dependency.
function rateLimit({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else if (++entry.count > max) {
      return res.status(429).json({ error: "Too many requests — please slow down." });
    }

    // Opportunistic cleanup; this map only ever holds recent callers.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    next();
  };
}

/* ---------------------------------------------------------------- the API -- */
app.post("/api/bookings", rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }), (req, res) => {
  const { booking, errors } = validateBooking(req.body || {});

  if (errors.length) {
    return res.status(400).json({ error: "Some fields are missing or invalid.", fields: errors });
  }

  const bookings = readBookings();
  const record = { id: makeId(), ...booking, status: "new", createdAt: new Date().toISOString() };

  bookings.unshift(record);
  writeBookings(bookings.slice(0, MAX_BOOKINGS));

  res.status(201).json({ ok: true, booking: record });
});

app.get("/api/bookings", (req, res) => {
  res.json(readBookings());
});

app.patch("/api/bookings/:id", rateLimit({ windowMs: 60 * 1000, max: 60 }), (req, res) => {
  const status = (req.body || {}).status;

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}.` });
  }

  const bookings = readBookings();
  const idx = bookings.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found." });

  bookings[idx].status = status;
  writeBookings(bookings);

  res.json({ ok: true, booking: bookings[idx] });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, bookings: readBookings().length, storage: memoryStore ? "memory" : "file" });
});

/* ------------------------------------------------------------------ static -- */
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    extensions: ["html"],
  })
);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

seedIfEmpty();

app.listen(PORT, () => {
  console.log(`Pawsitive Mobile Grooming running at http://localhost:${PORT}`);
  console.log(`Admin dashboard:                    http://localhost:${PORT}/admin.html`);
});
