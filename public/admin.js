/* Pawsitive Mobile Grooming — admin dashboard.
   Rows are built with DOM nodes rather than innerHTML: this page is public on the
   demo, so booking text is untrusted input and must never be parsed as markup. */

const tbody = document.getElementById("bookings-body");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyText = document.getElementById("empty-text");
const searchInput = document.getElementById("search");
const refreshBtn = document.getElementById("refresh-btn");
const resultCount = document.getElementById("result-count");
const lastUpdated = document.getElementById("last-updated");
const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));

const STATUSES = ["new", "contacted", "confirmed"];

let bookings = [];
let activeFilter = "all";
let query = "";

/* ------------------------------------------------------------- helpers -- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function relativeTime(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";

  const diffMin = Math.round((Date.now() - then.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffMin < 1440) return `${Math.round(diffMin / 60)} hr ago`;
  if (diffMin < 10080) return `${Math.round(diffMin / 1440)} d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDate(value) {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value || "—";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function matches(booking) {
  if (activeFilter !== "all" && booking.status !== activeFilter) return false;
  if (!query) return true;
  return [booking.name, booking.petName, booking.petType, booking.service, booking.email, booking.phone]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

/* --------------------------------------------------------------- render -- */
function renderStats() {
  document.getElementById("stat-total").textContent = bookings.length;
  STATUSES.forEach((status) => {
    document.getElementById(`stat-${status}`).textContent = bookings.filter((b) => b.status === status).length;
  });
}

function buildRow(booking) {
  const tr = el("tr");
  tr.dataset.id = booking.id;

  // Requested
  const requested = el("td");
  requested.append(
    el("span", "cell-strong", relativeTime(booking.createdAt)),
    el("span", "cell-sub", new Date(booking.createdAt).toLocaleString())
  );

  // Client
  const client = el("td");
  client.append(
    el("span", "cell-strong", booking.name),
    el("span", "cell-sub", booking.email),
    el("span", "cell-sub", booking.phone)
  );

  // Pet
  const pet = el("td");
  pet.append(
    el("span", "cell-strong", booking.petName || "—"),
    el("span", "cell-sub", booking.petType)
  );

  // Service (+ notes)
  const service = el("td");
  service.append(el("span", "cell-strong", booking.service));
  if (booking.notes) service.append(el("span", "cell-note", `“${booking.notes}”`));

  // Preferred date
  const when = el("td");
  when.append(el("span", "cell-strong", formatDate(booking.preferredDate)));

  // Status: pill + control
  const status = el("td");
  const pill = el("span", `pill pill--${booking.status}`, booking.status);
  const select = el("select", "status-select");
  select.setAttribute("aria-label", `Status for ${booking.name}`);
  STATUSES.forEach((value) => {
    const option = el("option", null, value.charAt(0).toUpperCase() + value.slice(1));
    option.value = value;
    if (booking.status === value) option.selected = true;
    select.append(option);
  });
  select.addEventListener("change", (e) => updateStatus(booking, e.target, pill));
  status.append(pill, select);

  tr.append(requested, client, pet, service, when, status);
  return tr;
}

function render() {
  const visible = bookings.filter(matches);

  tbody.replaceChildren(...visible.map(buildRow));

  const isEmpty = visible.length === 0;
  emptyState.hidden = !isEmpty;
  document.querySelector(".table-scroll").hidden = isEmpty;

  if (isEmpty) {
    const filtered = bookings.length > 0;
    emptyTitle.textContent = filtered ? "Nothing matches those filters" : "No bookings yet";
    emptyText.textContent = filtered
      ? "Try clearing the search box or switching back to All."
      : "Submit one from the public site and it'll show up here instantly.";
  }

  resultCount.textContent = `Showing ${visible.length} of ${bookings.length} request${bookings.length === 1 ? "" : "s"}`;
  renderStats();
}

/* ---------------------------------------------------------------- data -- */
async function loadBookings() {
  try {
    const res = await fetch("/api/bookings");
    if (!res.ok) throw new Error("Request failed");
    bookings = await res.json();
    lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    render();
  } catch (err) {
    bookings = [];
    tbody.replaceChildren();
    document.querySelector(".table-scroll").hidden = true;
    emptyState.hidden = false;
    emptyTitle.textContent = "Couldn't load bookings";
    emptyText.textContent = "The API didn't respond. Check that the server is running, then hit Refresh.";
    resultCount.textContent = "";
  }
}

async function updateStatus(booking, select, pill) {
  const previous = booking.status;
  const next = select.value;

  // Optimistic: paint it immediately, roll back if the API disagrees.
  booking.status = next;
  pill.className = `pill pill--${next}`;
  pill.textContent = next;
  select.disabled = true;
  renderStats();

  try {
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) throw new Error("Update failed");
  } catch (err) {
    booking.status = previous;
    select.value = previous;
    pill.className = `pill pill--${previous}`;
    pill.textContent = previous;
    renderStats();
    window.alert("Couldn't save that status change. Please try again.");
  } finally {
    select.disabled = false;
    // A row can drop out of view when a status filter is active.
    if (activeFilter !== "all") render();
  }
}

/* -------------------------------------------------------------- events -- */
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeFilter = btn.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    render();
  });
});

let searchTimer;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const value = e.target.value.trim().toLowerCase();
  searchTimer = setTimeout(() => {
    query = value;
    render();
  }, 120);
});

refreshBtn.addEventListener("click", loadBookings);

loadBookings();
