const tbody = document.getElementById("bookings-body");

async function loadBookings() {
  const res = await fetch("/api/bookings");
  const bookings = await res.json();

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No bookings yet — submit one from the main site.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings
    .map(
      (b) => `
    <tr data-id="${b.id}">
      <td>${new Date(b.createdAt).toLocaleString()}</td>
      <td>${b.name}<br /><small>${b.email} · ${b.phone}</small></td>
      <td>${b.petName ? b.petName + " (" + b.petType + ")" : b.petType}</td>
      <td>${b.service}${b.notes ? "<br /><small>" + b.notes + "</small>" : ""}</td>
      <td>${b.preferredDate}</td>
      <td>
        <select class="status-select" data-id="${b.id}">
          <option value="new" ${b.status === "new" ? "selected" : ""}>New</option>
          <option value="contacted" ${b.status === "contacted" ? "selected" : ""}>Contacted</option>
          <option value="confirmed" ${b.status === "confirmed" ? "selected" : ""}>Confirmed</option>
        </select>
      </td>
    </tr>
  `
    )
    .join("");

  document.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: e.target.value }),
      });
    });
  });
}

loadBookings();
