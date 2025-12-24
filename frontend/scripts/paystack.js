// paystack.js
document.addEventListener("partials:loaded", () => {
  const payBtn = document.getElementById("paystackBtn");
  if (!payBtn) return;

  payBtn.addEventListener("click", () => {
    // Ensure Paystack library is loaded
    if (!window.PaystackPop) {
      console.error("Paystack library not loaded");
      alert("Payment system not loaded. Try refreshing the page.");
      return;
    }

    const email = localStorage.getItem("studentEmail") || "student@example.com";
    const amount = 120000 * 100; // in kobo

    const handler = PaystackPop.setup({
      key: "pk_test_c4e16bd848d604743040a2affa926731701331f1",
      email,
      amount,
      currency: "NGN",
      callback: function (response) {
        console.log("Paystack reference:", response.reference);

        // Verify payment on backend
        fetch(`http://localhost:4000/api/payments/verify/${response.reference}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              alert("Payment successful!");
              const feesEl = document.getElementById("amountDue");
              if (feesEl) feesEl.textContent = "0 NGN";
            } else {
              alert("Payment verification failed");
            }
          })
          .catch((err) => console.error("Verification error:", err));
      },
      onClose: function () {
        console.log("Payment window closed");
      },
    });

    handler.openIframe();
  });
});
