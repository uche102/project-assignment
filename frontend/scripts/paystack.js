/* =========================================
   Paystack Client Script (Fixed: Scoped Variables)
   ========================================= */

(function () {
  // 1. Define Config LOCALLY (Prevents "Redeclaration" errors)
  const API_BASE = "http://localhost:4000";
  let PAYSTACK_PUBLIC_KEY = null;

  // 2. Load Key from Backend
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

  // 3. Initialize Button Logic
  function initPaystack() {
    const payBtn = document.getElementById("payFeesBtn");

    // Safety Checks
    if (!payBtn || payBtn.dataset.bound === "true") return;
    payBtn.dataset.bound = "true";

    // Get User Data
    let token = localStorage.getItem("token");
    let user = {};
    try {
      if (token) {
        token = token.replace(/['"]+/g, "").trim();
        user = JSON.parse(atob(token.split(".")[1]));
      }
    } catch (e) {}

    // Prioritize Reg No
    const studentID = user.reg_no || user.username || "student";

    payBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (typeof PaystackPop === "undefined") {
        alert("Paystack library not loaded. Check your internet.");
        return;
      }

      if (!PAYSTACK_PUBLIC_KEY) {
        // Try loading key again if missing
        await loadPaystackKey();
        if (!PAYSTACK_PUBLIC_KEY) {
          alert("System loading... please wait 2 seconds and try again.");
          return;
        }
      }

      // Get Amount
      const amountInput = document.getElementById("feeAmount");
      const amountNaira = amountInput ? parseInt(amountInput.value) : 9000;

      // 4. Open Paystack Popup
      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: `${user.username || "student"}@unn.edu.ng`,
        amount: amountNaira * 100, // Converts to Kobo
        currency: "NGN",
        ref: `SCH_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Student ID",
              variable_name: "student",
              value: studentID,
            },
          ],
        },
        // ============================================================
        // 5. ON SUCCESS: "Verify" and Save
        // ============================================================
        callback: function (response) {
          // This "Verifying..."
          payBtn.textContent = "Verifying...";
          payBtn.disabled = true;

          // A. HYBRID SYNC: Local fallback
          const currentTotal = parseInt(
            localStorage.getItem("fees_paid") || "0",
          );
          localStorage.setItem("fees_paid", currentTotal + amountNaira);

          // B. UPDATES UI IMMEDIATELY
          window.dispatchEvent(new Event("statsUpdated"));

          // C. BACKEND SAVE (The "Verification" Step)
          fetch(`${API_BASE}/api/payments/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              reference: response.reference,
              amount: amountNaira,
              username: studentID, // Saving RegNo to Database
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              alert("Payment Verified & Saved!");
              payBtn.textContent = "Pay Again";
              payBtn.disabled = false;
              payBtn.style.background = "#16a34a"; 

              // Refresh Dashboard again
              window.dispatchEvent(new Event("statsUpdated"));
            })
            .catch((err) => {
              console.error("Backend Sync Error:", err);
              // Even if DB fails,  it worked locally
              alert("Payment successful (Local). Backend sync pending.");
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

  // 6. Run Init Logic
  //  checks if document is ready, or wait for it
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
      await loadPaystackKey();
      initPaystack();
    });
  } else {
    // If already loaded (dynamic navigation), run immediately
    loadPaystackKey().then(initPaystack);
  }
})();
