const form = document.getElementById("booking-form");
const message = document.getElementById("form-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    petName: form.petName.value.trim(),
    petType: form.petType.value,
    service: form.service.value,
    preferredDate: form.preferredDate.value,
    notes: form.notes.value.trim(),
  };

  message.textContent = "Submitting...";
  message.className = "form-message";

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Request failed");

    message.textContent = "Thanks! We'll confirm your appointment shortly.";
    message.className = "form-message success";
    form.reset();
  } catch (err) {
    message.textContent = "Something went wrong — please try again.";
    message.className = "form-message error";
  }
});
