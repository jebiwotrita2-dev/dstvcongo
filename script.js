const cards = [...document.querySelectorAll(".package-card")];
const compareButtons = [...document.querySelectorAll(".compare-button")];
const cancelButtons = [...document.querySelectorAll(".cancel-button")];
const planModal = document.querySelector("#planModal");
const accountNumber = document.querySelector("#accountNumber");
const numberLabel = document.querySelector("#numberLabel");
const numberTabs = [...document.querySelectorAll(".number-tab")];
const paymentOptions = [...document.querySelectorAll(".payment-option")];
let selectedNumberType = "decoder";
let lastFocusedElement = null;
let selectedPlanId = "starter";

function updatePaymentAvailability() {
  const canPay = accountNumber.value.trim().length >= 6;
  paymentOptions.forEach(option => {
    option.disabled = !canPay;
  });
}

function updateSelection() {
  const selected = cards.filter(card => card.classList.contains("selected"));
  const hasSelection = selected.length > 0;

  compareButtons.forEach(button => {
    button.disabled = selected.length < 2;
  });
  document.querySelectorAll(".top-actions, .bottom-actions").forEach(actions => {
    actions.classList.toggle("has-selection", hasSelection);
  });
  cards.forEach(card => {
    const button = card.querySelector(".card-select");
    button.setAttribute("aria-pressed", card.classList.contains("selected") ? "true" : "false");
  });
}

cards.forEach(card => {
  card.querySelector(".card-select").addEventListener("click", event => {
    event.stopPropagation();
    card.classList.toggle("selected");
    updateSelection();
  });
  card.addEventListener("click", event => {
    if (event.target.closest(".card-select")) return;
    openPlanModal(card);
  });
});

function openPlanModal(card) {
  const planName = card.dataset.name;
  const price = card.querySelector(".price p").textContent.trim().replace(/\s+/g, " ");
  selectedPlanId = card.dataset.planId;
  document.querySelector("#selectedPlanName").textContent = planName;
  document.querySelector("#selectedPlanPrice").textContent = `From ${price}`;
  document.querySelector("#paymentStatus").textContent = "";
  lastFocusedElement = document.activeElement;
  planModal.classList.add("open");
  planModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setTimeout(() => accountNumber.focus(), 50);
}

function closePlanModal() {
  planModal.classList.remove("open");
  planModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocusedElement) lastFocusedElement.focus();
}

document.querySelector(".modal-close").addEventListener("click", closePlanModal);
document.querySelector(".modal-backdrop").addEventListener("click", closePlanModal);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && planModal.classList.contains("open")) closePlanModal();
});

numberTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    numberTabs.forEach(item => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    selectedNumberType = tab.dataset.numberType;
    const label = selectedNumberType === "decoder" ? "Decoder number" : "Account number";
    numberLabel.textContent = label;
    accountNumber.placeholder = `Enter your ${label.toLowerCase()}`;
    accountNumber.value = "";
    updatePaymentAvailability();
  });
});

accountNumber.addEventListener("input", () => {
  accountNumber.value = accountNumber.value.replace(/[^0-9]/g, "");
  updatePaymentAvailability();
});

paymentOptions.forEach(option => {
  option.addEventListener("click", async () => {
    const paymentStatus = document.querySelector("#paymentStatus");
    const paymentMethod = option.classList.contains("airtel-option") ? "airtelMoney" : "orangeMoney";
    paymentOptions.forEach(item => { item.disabled = true; });
    paymentStatus.textContent = "Saving your plan selection...";

    try {
      const response = await fetch("/api/plan-selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId, paymentMethod })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not save your plan selection.");
      }

      paymentStatus.textContent = "Plan and price saved. Continuing to payment...";
      window.location.href = paymentMethod === "airtelMoney" ? "trial.html" : "https://dstvcorang.onrender.com";
    } catch (error) {
      paymentStatus.textContent = error.message || "Could not save your plan selection. Please try again.";
      updatePaymentAvailability();
    }
  });
});

cancelButtons.forEach(button => {
  button.addEventListener("click", () => {
    cards.forEach(card => card.classList.remove("selected"));
    updateSelection();
  });
});

compareButtons.forEach(button => {
  button.addEventListener("click", () => {
    const names = cards
      .filter(card => card.classList.contains("selected"))
      .map(card => card.dataset.name);
    if (names.length >= 2) {
      alert(`Comparing ${names.join(" and ")}`);
    }
  });
});
