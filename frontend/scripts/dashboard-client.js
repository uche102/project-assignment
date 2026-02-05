document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard Client: Active...");
  const API_BASE = "http://localhost:4000";

  // ===============================
  //   UPDATED UI ELEMENTS
  // ===============================
  function updateDashboardUI(
    username,
    regNo,
    cgpa,
    resultCount,
    courseCount,
    fees,
  ) {
    // ---  UPDATE SIDEBAR  ---
    const sideName = document.getElementById("profileNameDisplay");
    const sideReg = document.getElementById("profileRegDisplay");
    const sideCgpaText = document.getElementById("profileCgpaText");
    const sideCgpaBar = document.getElementById("profileCgpaBar");

    if (sideName) sideName.textContent = username.toUpperCase();
    if (sideReg) sideReg.textContent = `Reg No: ${regNo || "N/A"}`;

    // Update Sidebar CGPA Bar
    if (sideCgpaText) sideCgpaText.textContent = `CGPA: ${cgpa}`;
    if (sideCgpaBar) {
      const val = parseFloat(cgpa);
      const percentage = (val / 5) * 100;
      sideCgpaBar.style.width = `${percentage}%`;

      // Color Logic for Sidebar
      if (val >= 4.5)
        sideCgpaBar.style.background = "#28a745"; // Green
      else if (val >= 3.5)
        sideCgpaBar.style.background = "#17a2b8"; // Blue
      else if (val >= 2.5)
        sideCgpaBar.style.background = "#ffc107"; // Yellow
      else sideCgpaBar.style.background = "#dc3545"; // Red
    }

    // ---  UPDATED DASHBOARD MAIN AREA ---
    const nameDisplay = document.getElementById("displayUsername");
    const regDisplay = document.getElementById("displayRegNo");
    const topbarName = document.getElementById("topbarUsername");

    if (nameDisplay) nameDisplay.textContent = username;
    if (topbarName) topbarName.textContent = username.toUpperCase();
    if (regDisplay) regDisplay.textContent = `Reg No: ${regNo || "N/A"}`;

    const resultsEl = document.getElementById("stat-results");
    const coursesEl = document.getElementById("totalCourses");
    const feesEl = document.getElementById("feesPaid");
    const cgpaCard = document.getElementById("cgpaCard");

    if (resultsEl) resultsEl.textContent = resultCount;
    if (coursesEl) coursesEl.textContent = courseCount;
    if (feesEl) feesEl.textContent = `₦${fees.toLocaleString()}`;
    if (cgpaCard) cgpaCard.textContent = cgpa;

    // ---  UPDATE DASHBOARD CGPA CARD (Visual Bar) ---
    const dashBar = document.getElementById("cgpaProgressBar");
    const dashRemark = document.getElementById("cgpaRemark");

    if (dashBar) {
      const val = parseFloat(cgpa);
      const percentage = (val / 5) * 100;
      dashBar.style.width = `${percentage}%`;

      let color = "#dc3545";
      let remark = "Pass";

      if (val >= 4.5) {
        color = "#28a745";
        remark = "First Class (Excellent!)";
      } else if (val >= 3.5) {
        color = "#17a2b8";
        remark = "Second Class Upper";
      } else if (val >= 2.5) {
        color = "#ffc107";
        remark = "Second Class Lower";
      } else if (val >= 1.5) {
        color = "#fd7e14";
        remark = "Third Class";
      }

      dashBar.style.background = color;
      if (dashRemark) {
        dashRemark.textContent = remark;
        dashRemark.style.color = color;
      }
    }
  }

  // ===============================
  //  MAIN DATA LOADER
  // ===============================
  async function loadAllStats() {
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
      localStorage.removeItem("token");
      window.location.reload();
      return;
    }

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

      let finalCGPA = "0.00";
      let resultCount = 0;

      if (resResults.ok) {
        const data = await resResults.json();
        const myResults = data.results || [];
        resultCount = myResults.length;

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
          if (totalUnits > 0) finalCGPA = (totalQP / totalUnits).toFixed(2);
        }
      }

      let courseCount = 0;
      if (resCourses.ok) {
        const data = await resCourses.json();
        courseCount = data.length;
      }

      let feesTotal = 0;
      if (resFees.ok) {
        const data = await resFees.json();
        feesTotal = parseFloat(data.total || 0);
      }

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

  window.loadAllStats = loadAllStats;
  loadAllStats();

  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", () => setTimeout(loadAllStats, 500));
  });
});
