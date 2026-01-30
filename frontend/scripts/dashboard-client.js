document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard Client: Active...");
  const API_BASE = "http://localhost:4000";

  // ===============================
  // 1. HELPER: UPDATE UI ELEMENTS
  // ===============================
  function updateDashboardUI(
    username,
    regNo,
    cgpa,
    resultCount,
    courseCount,
    fees,
  ) {
    // A. Update Text Info
    const nameDisplay = document.getElementById("displayUsername");
    const regDisplay = document.getElementById("displayRegNo");
    const topbarName = document.getElementById("topbarUsername");

    if (nameDisplay) nameDisplay.textContent = username;
    if (topbarName) topbarName.textContent = username.toUpperCase();
    if (regDisplay) regDisplay.textContent = `Reg No: ${regNo || "N/A"}`;

    // B. Update Simple Cards
    const resultsEl = document.getElementById("stat-results");
    const coursesEl = document.getElementById("totalCourses");
    const feesEl = document.getElementById("feesPaid");
    const cgpaCard = document.getElementById("cgpaCard");

    if (resultsEl) resultsEl.textContent = resultCount;
    if (coursesEl) coursesEl.textContent = courseCount;
    if (feesEl) feesEl.textContent = `₦${fees.toLocaleString()}`;
    if (cgpaCard) cgpaCard.textContent = cgpa;

    // C. UPDATE CGPA VISUAL BAR (The Fix)
    const cgpaBar = document.getElementById("cgpaProgressBar"); // Matches your HTML
    const cgpaRemark = document.getElementById("cgpaRemark"); // Matches your HTML

    if (cgpaBar) {
      const val = parseFloat(cgpa);
      const percentage = (val / 5) * 100;

      // Animate Width
      cgpaBar.style.width = `${percentage}%`;

      // Set Color & Remark based on Class
      let color = "#dc3545"; // Red (Default)
      let remark = "Pass";

      if (val >= 4.5) {
        color = "#28a745"; // Green
        remark = "First Class (Excellent!)";
      } else if (val >= 3.5) {
        color = "#17a2b8"; // Blue
        remark = "Second Class Upper";
      } else if (val >= 2.5) {
        color = "#ffc107"; // Yellow
        remark = "Second Class Lower";
      } else if (val >= 1.5) {
        color = "#fd7e14"; // Orange
        remark = "Third Class";
      }

      cgpaBar.style.background = color;
      if (cgpaRemark) {
        cgpaRemark.textContent = remark;
        cgpaRemark.style.color = color;
      }
    }
  }

  // ===============================
  // 2. MAIN DATA LOADER
  // ===============================
  async function loadAllStats() {
    console.log("Fetching Stats...");

    // 1. GET & DECODE TOKEN
    let token = localStorage.getItem("token");
    if (!token) return;
    token = token.replace(/['"]+/g, "").trim();

    let username = "Student";
    let regNo = "";

    try {
      const user = JSON.parse(atob(token.split(".")[1]));

      if (user.exp && Date.now() >= user.exp * 1000) throw new Error("Expired");

      username = user.username || "Student";
      regNo = user.reg_no;

      if (!regNo) {
        console.warn("RegNo missing. Logging out.");
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

    // 2. FETCH ALL DATA IN PARALLEL (Faster)
    try {
      const [resResults, resCourses, resFees] = await Promise.all([
        fetch(`${API_BASE}/api/results/${encodeURIComponent(regNo)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/courses/registered/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/payments/total/${encodeURIComponent(regNo)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // 3. PROCESS RESULTS & CALCULATE CGPA
      let finalCGPA = "0.00";
      let resultCount = 0;
      let transcriptHtml = ""; // For future use

      if (resResults.ok) {
        const data = await resResults.json();
        const myResults = data.results || [];
        resultCount = myResults.length;

        // Calculate CGPA
        if (myResults.length > 0) {
          const gradePoints = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
          let totalQP = 0,
            totalUnits = 0;

          myResults.forEach((r) => {
            const g = (r.grade || "F").toUpperCase().trim();
            const u = parseInt(r.unit || r.units || 0);

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

      // 4. PROCESS COURSES
      let courseCount = 0;
      if (resCourses.ok) {
        const data = await resCourses.json();
        courseCount = data.length;
      }

      // 5. PROCESS FEES
      let feesTotal = 0;
      if (resFees.ok) {
        const data = await resFees.json();
        feesTotal = parseFloat(data.total || 0);
      }

      // 6. UPDATE EVERYTHING
      updateDashboardUI(
        username,
        regNo,
        finalCGPA,
        resultCount,
        courseCount,
        feesTotal,
      );
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    }
  }

  // ===============================
  // 3. INITIALIZE
  // ===============================
  window.loadAllStats = loadAllStats; // Make global
  loadAllStats(); // Run immediately

  // Auto-refresh when clicking tabs
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", () => setTimeout(loadAllStats, 500));
  });
});
