/* =========================================
   Paystack Client Script for Student Portal
   ========================================= */

let PAYSTACK_PUBLIC_KEY = null;
const API_BASE = "http://localhost:4000";

// 1. Load Key from Backend
async function loadPaystackKey() {
  try {
    const res = await fetch(`${API_BASE}/api/config/paystack`);
    if (!res.ok) throw new Error("Failed to load Paystack key");
    const data = await res.json();
    PAYSTACK_PUBLIC_KEY = data.key;
  } catch (err) {
    console.error("Paystack Init Error:", err);
  }
}

// 2. Initialize Button Logic
function initPaystack() {
  const payBtn = document.getElementById("payFeesBtn");

  // Safety Checks
  if (!payBtn || payBtn.dataset.bound === "true") return;
  payBtn.dataset.bound = "true";

  // Get User Info
  let token = localStorage.getItem("token");
  let user = {};
  try {
    // Handle token cleanup just in case
    if (token) token = token.replace(/['"]+/g, "").trim();
    user = JSON.parse(atob(token.split(".")[1]));
  } catch (e) {}

  payBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (typeof PaystackPop === "undefined") {
      alert("Paystack library not loaded. Check your internet.");
      return;
    }

    if (!PAYSTACK_PUBLIC_KEY) {
      alert("System loading... please wait 2 seconds and try again.");
      return;
    }

    // Get Amount
    const amountInput = document.getElementById("feeAmount");
    const amountNaira = amountInput ? parseInt(amountInput.value) : 9000;

    // 3. Open Paystack Popup
    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: `${user.username || "student"}@unn.edu.ng`,
      amount: amountNaira * 100, // Convert to Kobo
      currency: "NGN",
      ref: `SCH_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      metadata: {
        custom_fields: [
          {
            display_name: "Student",
            variable_name: "student",
            value: user.username,
          },
        ],
      },
      // ============================================================
      // 4. ON SUCCESS: Update Hybrid Storage + Backend
      // ============================================================
      callback: function (response) {
        payBtn.textContent = "Verifying...";
        payBtn.disabled = true;

        // A. HYBRID SYNC: Local fallback
        const currentTotal = parseInt(localStorage.getItem("fees_paid") || "0");
        localStorage.setItem("fees_paid", currentTotal + amountNaira);

        // B. THE SIGNAL: Use 'window' so dashboard-client.js hears it
        window.dispatchEvent(new Event("statsUpdated"));

        // C. BACKEND SYNC: Include username for the database link
        fetch(`${API_BASE}/api/payments/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reference: response.reference,
            amount: amountNaira,
            username: user.username, // Ensure backend knows WHO paid
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert("Payment Successful! Record saved to database.");
            payBtn.textContent = "Pay Again";
            payBtn.disabled = false;
            payBtn.style.background = "#16a34a"; //  Green

            // Final refresh to ensure DB data matches LocalStorage
            window.dispatchEvent(new Event("statsUpdated"));
          })
          .catch((err) => {
            console.error("Backend Sync Error:", err);
            alert("Payment recorded locally. Backend sync pending.");
            payBtn.disabled = false;
          });
      },
      onClose: function () {
        alert("Transaction cancelled.");
      },
    });

    handler.openIframe();
  });
}

// 5. Init Logic
document.addEventListener("DOMContentLoaded", async () => {
  await loadPaystackKey();
  initPaystack();
});

// Partial Loader Support
document.addEventListener("partials:loaded", initPaystack);
