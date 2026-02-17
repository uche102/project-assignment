(function () {
  const API_BASE = window.API_BASE || "http://localhost:4000"; // Use global or default
  let PAYSTACK_PUBLIC_KEY = null;

  async function loadPaystackKey() {
    try {
      const res = await fetch(`${API_BASE}/api/config/paystack`);
      const data = await res.json();
      PAYSTACK_PUBLIC_KEY = data.key;
      console.log("Paystack Key Loaded:", PAYSTACK_PUBLIC_KEY ? "Yes" : "No");
    } catch (err) {
      console.error("Paystack Key Error:", err);
    }
  }

  function initPaystack() {
    console.log("Initializing Paystack Button..."); // DEBUG LOG
    const payBtn = document.getElementById("payFeesBtn");

    if (!payBtn) {
      console.log("Pay Button not found in DOM");
      return;
    }

    // Prevent double-binding
    if (payBtn.dataset.bound === "true") return;
    payBtn.dataset.bound = "true";

    // User Data Logic
    let token = localStorage.getItem("token");
    let user = {};
    try {
      if (token) user = JSON.parse(atob(token.split(".")[1]));
    } catch (e) {}
    const studentID = user.reg_no || user.username || "student";

    // CLICK HANDLER
    payBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Check if Paystack script is in index.html
      if (typeof PaystackPop === "undefined") {
        alert("Error: Paystack inline script is missing from index.html!");
        return;
      }

      if (!PAYSTACK_PUBLIC_KEY) await loadPaystackKey();

      if (!PAYSTACK_PUBLIC_KEY) {
        alert("Error: Could not load Paystack Public Key from server.");
        return;
      }

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: `${user.username || "student"}@unn.edu.ng`,
        amount: 9000 * 100, // Fixed 9000 for demo
        currency: "NGN",
        ref: "SCH_" + Math.floor(Math.random() * 1000000000),
        metadata: {
          custom_fields: [{ display_name: "Student ID", value: studentID }],
        },
        callback: function (response) {
          alert("Payment Successful! Ref: " + response.reference);
          // Verify with backend
          fetch(`${API_BASE}/api/payments/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              reference: response.reference,
              amount: 9000,
              username: studentID,
            }),
          });
        },
        onClose: function () {
          alert("Transaction cancelled.");
        },
      });
      handler.openIframe();
    });
  }

  // EXPOSE GLOBALLY so nav-loader can see it
  window.initPaystack = function () {
    loadPaystackKey().then(initPaystack);
  };

  // Run automatically on first load if button exists
  if (document.getElementById("payFeesBtn")) {
    window.initPaystack();
  }
})();
