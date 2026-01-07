document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard Client: Active and Watching...");
  const API_BASE = "http://localhost:4000";

  // --- 1. THE REFRESH FUNCTION ---
  async function loadAllStats() {
    console.log("Fetching fresh data from DB...");
    const coursesEl = document.getElementById("totalCourses");
    const resultsEl = document.getElementById("stat-results");
    const cgpaCard = document.getElementById("cgpaCard");
    const nameDisplay = document.getElementById("displayUsername");

    let token = localStorage.getItem("token");
    if (!token) return;
    token = token.replace(/['"]+/g, "").trim();

    // 2. Decode User and Define Username
    let user = {};
    let username = "";
    try {
      // Decode the JWT token payload
      user = JSON.parse(atob(token.split(".")[1]));

      // Use 'username' or 'name' depending on your JWT structure
      username = (user.username || user.name || "Student").toLowerCase();

      // Update the Dashboard Welcome Name
      if (nameDisplay) {
        nameDisplay.textContent = user.username || user.name || "Student";
      }

      // Update the Topbar Name (if you have one)
      const topbarName = document.getElementById("topbarUsername");
      if (topbarName) {
        topbarName.textContent = (
          user.username ||
          user.name ||
          "Student"
        ).toUpperCase();
      }
    } catch (e) {
      console.error("Token decoding failed:", e);
      return;
    }
    // FETCH RESULTS & CGPA
    try {
      const res = await fetch(`${API_BASE}/api/results/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const myResults = data.results || [];
        if (resultsEl) resultsEl.textContent = myResults.length;

        if (cgpaCard && myResults.length > 0) {
          const gradePoints = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
          let totalQP = 0,
            totalUnits = 0;
          myResults.forEach((r) => {
            const grade = (r.grade || "F").toUpperCase();
            const unit = parseInt(r.unit || r.units || 0);
            totalQP += (gradePoints[grade] || 0) * unit;
            totalUnits += unit;
          });
          cgpaCard.textContent =
            totalUnits > 0 ? (totalQP / totalUnits).toFixed(2) : "0.00";
        }
      }
    } catch (err) {
      console.warn("Fetch failed");
    }

    // FETCH COURSE COUNT
    // --- UPDATED FETCH COURSE COUNT (Local First) ---
    try {
      const coursesEl = document.getElementById("totalCourses");
      if (coursesEl) {
        // 1. Check LocalStorage first (The Borrow Page data)
        const localBorrowed = JSON.parse(
          localStorage.getItem("borrowed_courses") || "[]"
        );

        // 2. Try to fetch from DB for permanent records
        const res = await fetch(
          `${API_BASE}/api/courses/registered/${username}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          const registeredFromDB = await res.json();
          // Combine both or prioritize DB
          coursesEl.textContent =
            registeredFromDB.length + localBorrowed.length;
        } else {
          // Fallback: If DB is down, just show what's in LocalStorage
          coursesEl.textContent = localBorrowed.length;
        }
      }
    } catch (e) {
      console.warn("DB offline, using LocalStorage for course count.");
      const localBorrowed = JSON.parse(
        localStorage.getItem("borrowed_courses") || "[]"
      );
      if (coursesEl) coursesEl.textContent = localBorrowed.length;
    }
    // FETCH FEES PAID
    try {
      const feesEl = document.getElementById("feesPaid");
      if (feesEl) {
        const res = await fetch(`${API_BASE}/api/payments/total/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          // Assuming your backend returns { total: 50000 }
          feesEl.textContent = `₦${parseFloat(
            data.total || 0
          ).toLocaleString()}`;
        } else {
          // Fallback to LocalStorage if DB fetch fails
          const localFees = localStorage.getItem("fees_paid") || "0";
          feesEl.textContent = `₦${parseFloat(localFees).toLocaleString()}`;
        }
      }
    } catch (e) {
      console.error("Fees fetch error:", e);
    }
    async function syncLocalToDatabase() {
      const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim();
      if (!token) return;

      // 1. Get the local data
      const localBorrowed = JSON.parse(
        localStorage.getItem("borrowed_courses") || "[]"
      );

      if (localBorrowed.length === 0) return; // Nothing to sync

      console.log("Auto-Sync: Found local data, pushing to server...");

      try {
        const response = await fetch(`${API_BASE}/api/courses/sync-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ courses: localBorrowed }),
        });

        if (response.ok) {
          console.log("Auto-Sync: Success! Database is now up to date.");
          // Optional: Clear local storage once it's safely in the DB
          // localStorage.removeItem("borrowed_courses");
        }
      } catch (err) {
        console.warn(
          "Auto-Sync: Server still unreachable. Keeping data in LocalStorage."
        );
      }
    }

    // Run sync attempt every time the dashboard loads
    // syncLocalToDatabase();
  }

  // --- 2. THE INITIAL LOAD ---
  loadAllStats();

  // --- 3. THE GLOBAL SIGNAL LISTENER ---
  // (Moved inside the block so it can see loadAllStats)
  window.addEventListener("statsUpdated", () => {
    console.log("Dashboard: Signal received, refreshing...");
    loadAllStats();
  });

  // --- 4. THE NAVIGATION OBSERVER ---
  // (Moved inside the block so it can see loadAllStats)
  const navObserver = new MutationObserver(() => {
    const dashboardCard = document.getElementById("totalCourses");
    if (dashboardCard && !dashboardCard.dataset.updated) {
      loadAllStats();
      dashboardCard.dataset.updated = "true";
    } else if (!dashboardCard) {
      // Reset flag when we leave the dashboard page
      const tagged = document.querySelector('[data-updated="true"]');
      if (tagged) tagged.removeAttribute("data-updated");
    }
  });

  navObserver.observe(document.body, { childList: true, subtree: true });
});
// ADD THIS TO YOUR DASHBOARD-CLIENT.JS
window.addEventListener("storage", (event) => {
  if (event.key === "borrowed_courses") {
    console.log("Detected change in borrowed courses. Updating Dashboard...");
    // Call your function that updates the numbers/table on your dashboard
    if (typeof updateDashboardUI === "function") {
      updateDashboardUI();
    } else {
      location.reload(); // Simple fix: refresh page to show new data
    }
  }
});

// Also run it once on load
document.addEventListener("DOMContentLoaded", () => {
  // Your logic to read localStorage and display it
});
function downloadProfessionalReceipt() {
  const username =
    document.getElementById("displayUsername")?.textContent || "Student";
  const feesPaid = document.getElementById("feesPaid")?.textContent || "₦0.00";
  const courseCount =
    document.getElementById("totalCourses")?.textContent || "0";
  const date = new Date().toLocaleDateString("en-NG", { dateStyle: "long" });
  const ref = "PAY-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const receiptWindow = window.open("", "_blank", "width=800,height=900");

  receiptWindow.document.write(`
        <html>
        <head>
            <title>Receipt - ${username}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                .receipt-card { border: 2px solid #eee; padding: 30px; position: relative; max-width: 600px; margin: auto; }
                .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
                .paid-stamp { 
                    position: absolute; top: 100px; right: 50px; 
                    border: 4px solid #28a745; color: #28a745; 
                    padding: 10px; transform: rotate(-15deg); 
                    font-weight: bold; font-size: 2rem; opacity: 0.2; 
                }
                .row { display: flex; justify-content: space-between; margin: 15px 0; border-bottom: 1px dashed #ddd; padding-bottom: 5px; }
                .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #777; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="receipt-card">
                <div class="paid-stamp">PAID</div>
                <div class="header">
                    <h2>STUDENT PORTAL</h2>
                    <p>Official Payment Acknowledgment</p>
                </div>
                
                <div class="row"><strong>Reference:</strong> <span>${ref}</span></div>
                <div class="row"><strong>Date:</strong> <span>${date}</span></div>
                <div class="row"><strong>Student Name:</strong> <span>${username.toUpperCase()}</span></div>
                <div class="row"><strong>Description:</strong> <span>School Fees / Course Registration</span></div>
                <div class="row"><strong>Courses Enrolled:</strong> <span>${courseCount}</span></div>
                <div class="row" style="font-size: 1.2rem; border-bottom: 2px solid #333;">
                    <strong>Total Amount:</strong> <strong>${feesPaid}</strong>
                </div>

                <div class="footer">
                    <p>This is an electronically generated receipt and requires no signature.</p>
                    <p>Generated via Paystack Integration</p>
                    <button class="no-print" onclick="window.print()" style="margin-top:20px; padding:10px; cursor:pointer;">Confirm Print</button>
                </div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
  receiptWindow.document.close();
}
// Use Event Delegation to catch clicks on the dynamic button
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "downloadReceipt") {
    console.log("Receipt Button Clicked!");
    // Call the function we wrote earlier
    if (typeof downloadProfessionalReceipt === "function") {
      downloadProfessionalReceipt();
    } else {
      console.error("The function downloadProfessionalReceipt is not defined.");
    }
  }
});
// --- GLOBAL CALENDAR DOWNLOADER ---
document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "calendarDownloadLink") {
    e.preventDefault();
    console.log("Linux Mint: Exporting CSV...");

    const container = document.getElementById("calendar-table-container");
    if (!container) {
      alert("Please open the Academic Calendar tab first!");
      return;
    }

    // 1. Scraping data manually to avoid HTML garbage
    let csvData = "\ufeffDATE,EVENT\n"; // Added \ufeff for LibreOffice encoding
    const rows = container.querySelectorAll("table tbody tr");

    rows.forEach((row) => {
      const cols = row.querySelectorAll("td");
      if (cols.length === 2) {
        // Clean commas so CSV doesn't break
        const date = cols[0].innerText.trim().replace(/,/g, " ");
        const event = cols[1].innerText.trim().replace(/,/g, " ");
        csvData += `${date},${event}\n`;
      }
    });

    // 2. Create the file
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // 3. Forced download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "UNN_Academic_Calendar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
});
