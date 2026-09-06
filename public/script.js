/* Pawsitive Mobile Grooming — landing page behaviour.
   Plain JS, no framework: inline validation, submit handling, and a couple of
   small progressive-enhancement touches. */

/* ------------------------------------------------------- sticky header -- */
const header = document.getElementById("site-header");
if (header) {
  const setStuck = () => header.classList.toggle("is-stuck", window.scrollY > 8);
  setStuck();
  window.addEventListener("scroll", setStuck, { passive: true });
}

/* ------------------------------------------------------ reveal on scroll -- */
const revealables = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && revealables.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("is-in"));
}

/* ------------------------------------------------------------ the form -- */
const form = document.getElementById("booking-form");
const message = document.getElementById("form-message");
const successPanel = document.getElementById("form-success");
const successSummary = document.getElementById("success-summary");
const submitBtn = document.getElementById("submit-btn");
const bookAnother = document.getElementById("book-another");

// Nobody should be requesting a groom for last Tuesday.
const dateInput = document.getElementById("preferredDate");
if (dateInput) {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  dateInput.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

const VALIDATORS = {
  name: (v) => (v.length >= 2 ? "" : "Please tell us your name."),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "That email doesn't look right."),
  phone: (v) => (v.replace(/\D/g, "").length >= 10 ? "" : "We need a 10-digit phone number."),
  petType: (v) => (v ? "" : "Pick a pet type."),
  service: (v) => (v ? "" : "Pick a service."),
  preferredDate: (v) => (v ? "" : "Choose a preferred date."),
};

function setFieldError(name, text) {
  const input = form.elements[name];
  if (!input) return;
  const field = input.closest(".field");
  const slot = form.querySelector(`[data-error-for="${name}"]`);

  field.classList.toggle("has-error", Boolean(text));
  input.setAttribute("aria-invalid", text ? "true" : "false");
  if (slot) {
    slot.textContent = text;
    slot.hidden = !text;
  }
}

function validateField(name) {
  const validate = VALIDATORS[name];
  if (!validate) return true;
  const error = validate(form.elements[name].value.trim());
  setFieldError(name, error);
  return !error;
}

function validateAll() {
  return Object.keys(VALIDATORS).map(validateField).every(Boolean);
}

function showMessage(text, kind) {
  if (!message) return;
  message.textContent = text;
  message.className = `form-message ${kind}`;
  message.hidden = false;
}

function clearMessage() {
  if (!message) return;
  message.hidden = true;
  message.textContent = "";
}

if (form) {
  // Validate on blur, then keep it live once a field has been flagged.
  Object.keys(VALIDATORS).forEach((name) => {
    const input = form.elements[name];
    if (!input) return;
    input.addEventListener("blur", () => validateField(name));
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("has-error")) validateField(name);
    });
    input.addEventListener("change", () => {
      if (input.closest(".field").classList.contains("has-error")) validateField(name);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    if (!validateAll()) {
      const firstBad = form.querySelector(".field.has-error input, .field.has-error select");
      if (firstBad) firstBad.focus();
      showMessage("A few fields need a second look.", "error");
      return;
    }

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

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    showMessage("Sending your request…", "pending");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Request failed");
      }

      renderSuccess(payload);
    } catch (err) {
      showMessage(
        err.message === "Failed to fetch"
          ? "Couldn't reach the server. Check your connection and try again."
          : "Something went wrong — please try again, or call (928) 555-0142.",
        "error"
      );
      submitBtn.disabled = false;
      submitBtn.textContent = "Request appointment";
    }
  });
}

function renderSuccess(payload) {
  const prettyDate = new Date(`${payload.preferredDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const rows = [
    ["Pet", payload.petName ? `${payload.petName} (${payload.petType})` : payload.petType],
    ["Service", payload.service],
    ["Preferred date", prettyDate],
    ["We'll contact", payload.phone],
  ];

  successSummary.replaceChildren(
    ...rows.map(([label, value]) => {
      const li = document.createElement("li");
      const l = document.createElement("span");
      const v = document.createElement("b");
      l.textContent = label;
      v.textContent = value;
      li.append(l, v);
      return li;
    })
  );

  form.hidden = true;
  successPanel.hidden = false;
  successPanel.scrollIntoView({ block: "center", behavior: "smooth" });
}

if (bookAnother) {
  bookAnother.addEventListener("click", () => {
    form.reset();
    Object.keys(VALIDATORS).forEach((name) => setFieldError(name, ""));
    clearMessage();
    submitBtn.disabled = false;
    submitBtn.textContent = "Request appointment";
    successPanel.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
}
