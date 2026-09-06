// Pawsitive Mobile Grooming — demo backend
// A deliberately small Express server: static frontend + a tiny JSON-file-backed
// API for booking submissions and an admin view. No database server, no build step —
// simple by design, matching the "fast, simple, not bloated" MVP pitch.

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "bookings.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readBookings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

// Create a booking
app.post("/api/bookings", (req, res) => {
  const { name, email, phone, petName, petType, service, preferredDate, notes } = req.body;

  if (!name || !email || !phone || !petType || !service || !preferredDate) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const bookings = readBookings();
  const booking = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name,
    email,
    phone,
    petName: petName || "",
    petType,
    service,
    preferredDate,
    notes: notes || "",
    status: "new",
    createdAt: new Date().toISOString(),
  };

  bookings.unshift(booking);
  writeBookings(bookings);

  res.status(201).json({ ok: true, booking });
});

// List bookings (used by the admin view)
app.get("/api/bookings", (req, res) => {
  res.json(readBookings());
});

// Update a booking's status (admin marks as contacted/confirmed)
app.patch("/api/bookings/:id", (req, res) => {
  const { status } = req.body;
  const bookings = readBookings();
  const idx = bookings.findIndex((b) => b.id === req.params.id);

  if (idx === -1) return res.status(404).json({ error: "Booking not found." });

  bookings[idx].status = status || bookings[idx].status;
  writeBookings(bookings);

  res.json({ ok: true, booking: bookings[idx] });
});

app.listen(PORT, () => {
  console.log(`Pawsitive Mobile Grooming demo running at http://localhost:${PORT}`);
  console.log(`Admin view: http://localhost:${PORT}/admin.html`);
});
