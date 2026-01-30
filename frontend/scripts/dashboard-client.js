document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard Client: Active...");
  const API_BASE = "http://localhost:4000";

  // ===============================
  // 1. HELPER FUNCTIONS (Moved to Top)
  // ===============================

  function updateProfileUI(name, regNo, cgpa) {
    // Updates the sidebar profile card
    const pName = document.getElementById("profileNameDisplay");
    const pReg = document.getElementById("profileRegDisplay");
    const pCgpaText = document.getElementById("profileCgpaText");
    const pBar = document.getElementById("profileCgpaBar");

    if (pName) pName.textContent = name.toUpperCase();
    if (pReg) pReg.textContent = `Reg No: ${regNo || "N/A"}`;

    if (pCgpaText) {
      pCgpaText.textContent = `CGPA: ${cgpa}`;

      if (pBar) {
        const val = parseFloat(cgpa);
        const percentage = (val / 5) * 100;
        pBar.style.width = `${percentage}%`;

        // Color Logic
        if (val >= 4.5)
          pBar.style.background = "#28a745"; // Green
        else if (val >= 3.5)
          pBar.style.background = "#17a2b8"; // Blue
        else if (val >= 2.5)
          pBar.style.background = "#ffc107"; // Yellow
        else pBar.style.background = "#dc3545"; // Red
      }
    }
  }

  function updateTranscriptUI(results) {
    // Updates the table at the bottom of the dashboard
    const container = document.getElementById("transcriptContainer");
    if (!container) return;

    if (!results || results.length === 0) {
      container.innerHTML = "<p class='muted'>No results found yet.</p>";
      return;
    }

    const gradeInfo = {
      A: { remark: "Excellent", color: "#0a8a3a" },
      B: { remark: "Very Good", color: "#2b7ab8" },
      C: { remark: "Good", color: "#f1c40f" },
      D: { remark: "Fair", color: "#e67e22" },
      E: { remark: "Pass", color: "#95a5a6" },
      F: { remark: "Fail", color: "#e74c3c" },
    };

    let html = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="text-align: left; border-bottom: 2px solid #eee; color:#777; font-size:0.9rem;">
          <th style="padding:10px;">Course</th>
          <th>Unit</th>
          <th>Grade</th>
          <th>Remark</th>
        </tr>
      </thead>
      <tbody>`;

    results.forEach((r) => {
      const g = (r.grade || "F").toUpperCase().trim(); // Added trim() for safety
      const info = gradeInfo[g] || gradeInfo["F"];
      html += `
      <tr style="border-bottom: 1px solid #f9f9f9;">
        <td style="padding: 10px; font-weight:500;">${r.course_code}</td>
        <td>${r.unit}</td>
        <td style="font-weight: bold; color: ${info.color}">${g}</td>
        <td style="font-size: 0.85rem; color: #666;">${info.remark}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }

  // ===============================
  // 2. MAIN DATA LOADER
  // ===============================
  async function loadAllStats() {
    console.log("Loading Stats...");
    let finalCGPA = "0.00";
    let username = "Student";
    let regNo = "";

    // 1. GET TOKEN
    let token = localStorage.getItem("token");
    if (!token) return;
    token = token.replace(/['"]+/g, "").trim();

    // 2. DECODE TOKEN
    try {
      const user = JSON.parse(atob(token.split(".")[1]));

      // Safety: Handle expired token
      if (user.exp && Date.now() >= user.exp * 1000) {
        throw new Error("Token expired");
      }

      username = user.username || "Student";
      regNo = user.reg_no;

      // === CRITICAL FIX: If regNo is missing (old token), force re-login ===
      if (!regNo) {
        console.warn("Token missing RegNo. Logging out to fix...");
        localStorage.removeItem("token");
        window.location.reload();
        return;
      }
    } catch (e) {
      console.error("Token Error:", e);
      localStorage.removeItem("token");
      window.location.reload();
      return;
    }

    // 3. UPDATE NAME UI
    const nameDisplay = document.getElementById("displayUsername");
    const topbarName = document.getElementById("topbarUsername");
    const regDisplay = document.getElementById("displayRegNo");

    if (nameDisplay) nameDisplay.textContent = username;
    if (topbarName) topbarName.textContent = username.toUpperCase();
    if (regDisplay) regDisplay.textContent = `Reg No: ${regNo}`;

    // 4. FETCH RESULTS & CALCULATE CGPA
    const resultsEl = document.getElementById("stat-results"); // ID must match HTML
    const cgpaCard = document.getElementById("cgpaCard");

    try {
      const res = await fetch(
        `${API_BASE}/api/results/${encodeURIComponent(regNo)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const myResults = data.results || [];

        // Update Count
        if (resultsEl) resultsEl.textContent = myResults.length;

        // Update Transcript Table
        updateTranscriptUI(myResults);

        // Calculate CGPA
        if (myResults.length > 0) {
          const gradePoints = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
          let totalQP = 0,
            totalUnits = 0;

          myResults.forEach((r) => {
            const g = (r.grade || "F").toUpperCase().trim();
            const u = parseInt(r.unit || r.units || 0);

            // Only count valid grades
            if (gradePoints[g] !== undefined) {
              totalQP += gradePoints[g] * u;
              totalUnits += u;
            }
          });

          if (totalUnits > 0) {
            finalCGPA = (totalQP / totalUnits).toFixed(2);
          }
        }
      }
    } catch (err) {
      console.error("Results Error:", err);
    }

    // Update CGPA Cards
    if (cgpaCard) cgpaCard.textContent = finalCGPA;
    updateProfileUI(username, regNo, finalCGPA);

    // 5. FETCH FEES
    const feesEl = document.getElementById("feesPaid");
    if (feesEl) {
      try {
        const res = await fetch(
          `${API_BASE}/api/payments/total/${encodeURIComponent(regNo)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          feesEl.textContent = `₦${parseFloat(data.total || 0).toLocaleString()}`;
        }
      } catch (e) {
        console.error("Fees Error:", e);
      }
    }

    // 6. FETCH COURSES COUNT
    const coursesEl = document.getElementById("totalCourses");
    if (coursesEl) {
      try {
        const res = await fetch(
          `${API_BASE}/api/courses/registered/${username}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          coursesEl.textContent = data.length;
        }
      } catch (e) {
        console.error("Courses Error:", e);
      }
    }
  }

  // ===============================
  // 3. INIT
  // ===============================
  window.loadAllStats = loadAllStats; // Expose to global scope
  loadAllStats(); // Run immediately

  // Auto-refresh when clicking tabs (to keep data fresh)
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", () => setTimeout(loadAllStats, 500));
  });
});

// ===============================
// 4. RECEIPT GENERATOR (Global)
// ===============================
window.downloadProfessionalReceipt = function () {
  const username =
    document.getElementById("displayUsername")?.textContent || "Student";
  const regNo =
    document
      .getElementById("displayRegNo")
      ?.textContent.replace("Reg No: ", "") || "N/A";
  const feesPaid = document.getElementById("feesPaid")?.textContent || "₦0.00";
  const courseCount =
    document.getElementById("totalCourses")?.textContent || "0";
  const date = new Date().toLocaleDateString("en-NG", { dateStyle: "long" });
  const ref = "PAY-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const receiptWindow = window.open("", "_blank", "width=800,height=900");
  receiptWindow.document.write(`
        <html>
        <head>
            <title>Receipt - ${regNo}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                .receipt-card { border: 2px solid #eee; padding: 30px; max-width: 600px; margin: auto; position: relative;}
                .paid-stamp { position: absolute; top: 100px; right: 50px; border: 4px solid #28a745; color: #28a745; padding: 10px; transform: rotate(-15deg); font-weight: bold; font-size: 2rem; opacity: 0.2; }
                .row { display: flex; justify-content: space-between; margin: 15px 0; border-bottom: 1px dashed #ddd; }
                .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #777; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="receipt-card">
                <div class="paid-stamp">PAID</div>
                <h2 style="text-align:center; border-bottom:2px solid #007bff; padding-bottom:10px;">UNIVERSITY RECEIPT</h2>
                <div class="row"><strong>Reference:</strong> <span>${ref}</span></div>
                <div class="row"><strong>Date:</strong> <span>${date}</span></div>
                <div class="row"><strong>Student:</strong> <span>${username}</span></div>
                <div class="row"><strong>Reg No:</strong> <span>${regNo}</span></div>
                <div class="row"><strong>Courses Registered:</strong> <span>${courseCount}</span></div>
                <div class="row" style="font-size: 1.2rem; border-bottom: 2px solid #333; margin-top: 20px;">
                    <strong>Total Paid:</strong> <strong>${feesPaid}</strong>
                </div>
                <div class="footer">
                    <p>Verified Student Identity: ${regNo}</p>
                    <button class="no-print" onclick="window.print()">Print Receipt</button>
                </div>
            </div>
        </body>
        </html>
    `);
  receiptWindow.document.close();
};

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "downloadReceipt") {
    window.downloadProfessionalReceipt();
  }
});
