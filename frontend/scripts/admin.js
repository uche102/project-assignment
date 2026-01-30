document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin Manager: Loaded");
  const API_BASE = "http://localhost:4000";

  // --- UI SELECTORS ---
  const loginPanel = document.getElementById("adminLogin");
  const loginBtn = document.getElementById("adminLoginBtn");
  const loginStatus = document.getElementById("adminLoginStatus");

  // These are the sections we want to HIDE until you log in
  // We select the inputs, buttons, and panels for the dashboard features
  const protectedElements = document.querySelectorAll(
    "#resultFile, #uploadResultsBtn, #availablecourse, .panel, #lecturerFile, #uploadLecturersBtn",
  );

  // ============================================
  // 1. AUTHENTICATION LOGIC (Moved from admin-auth.js)
  // ============================================

  // Check if we are already logged in
  const existingToken = localStorage.getItem("admin_token");
  if (existingToken) {
    unlockDashboard(existingToken);
  } else {
    lockDashboard();
  }

  // Login Button Click Listener
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const username = document.getElementById("adminUser").value;
      const password = document.getElementById("adminPass").value;

      if (!username || !password) {
        setStatus("Please enter credentials.", true);
        return;
      }

      setStatus("Verifying...");

      try {
        const res = await fetch(`${API_BASE}/api/auth/user-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reg_no: username, password: password }),
        });

        const data = await res.json();

        if (res.ok) {
          // Success! Save token and unlock
          localStorage.setItem("admin_token", data.token);
          localStorage.setItem("token", data.token); // Save as 'token' too just in case

          setStatus("Login Successful!", false);
          setTimeout(() => unlockDashboard(data.token), 1000);
        } else {
          setStatus("Access Denied: " + data.error, true);
        }
      } catch (err) {
        console.error(err);
        setStatus("Server Error.", true);
      }
    });
  }

  function setStatus(msg, isError) {
    if (loginStatus) {
      loginStatus.textContent = msg;
      loginStatus.style.color = isError ? "red" : "green";
    }
  }

  function lockDashboard() {
    if (loginPanel) loginPanel.style.display = "block";
    protectedElements.forEach((el) => (el.style.display = "none"));
  }

  function unlockDashboard(token) {
    if (loginPanel) loginPanel.style.display = "none";
    protectedElements.forEach((el) => (el.style.display = "block"));

    // Initialize the Dropdowns now that we have a token
    loadAssignmentOptions(token);
  }

  // ============================================
  // 2. RESULT UPLOAD LOGIC
  // ============================================
  const resultBtn = document.getElementById("uploadResultsBtn");
  if (resultBtn) {
    resultBtn.addEventListener("click", () => {
      const fileInput = document.getElementById("resultFile");
      const statusDiv = document.getElementById("uploadStatus");
      const token = localStorage.getItem("admin_token");

      if (!fileInput.files.length) return alert("Select Result CSV file.");

      resultBtn.textContent = "Uploading...";
      statusDiv.style.display = "block";
      statusDiv.textContent = "Processing...";

      const reader = new FileReader();
      reader.onload = async function (e) {
        const rows = e.target.result
          .split("\n")
          .map((r) => r.trim())
          .filter((r) => r);
        let success = 0;

        // Skip Header (i=1)
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(",");
          if (cols.length < 3) continue;

          const data = {
            student: cols[0]?.trim(),
            course_code: cols[1]?.trim(),
            grade: cols[2]?.trim(),
            unit: parseInt(cols[3]?.trim() || "3"),
          };

          try {
            await fetch(`${API_BASE}/api/results`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(data),
            });
            success++;
          } catch (e) {}
          statusDiv.textContent = `Uploaded: ${success}`;
        }
        resultBtn.textContent = "Upload Results";
        alert("Upload Complete!");
      };
      reader.readAsText(fileInput.files[0]);
    });
  }

  // ============================================
  // 3. LECTURER UPLOAD LOGIC
  // ============================================
  const lecturerBtn = document.getElementById("uploadLecturersBtn");
  if (lecturerBtn) {
    lecturerBtn.addEventListener("click", () => {
      const fileInput = document.getElementById("lecturerFile");
      const token = localStorage.getItem("admin_token");

      if (!fileInput.files.length) return alert("Select Lecturer CSV file.");

      lecturerBtn.textContent = "Uploading...";

      const reader = new FileReader();
      reader.onload = async (e) => {
        const rows = e.target.result.split("\n").map((r) => r.split(","));
        // Filter rows and map columns
        const lecturers = rows
          .slice(1)
          .filter((r) => r.length >= 2)
          .map((cols) => ({
            name: cols[0]?.trim(),
            email: cols[1]?.trim(),
            office: cols[2]?.trim(),
            courses: cols[3]?.trim(),
          }));

        try {
          const res = await fetch(`${API_BASE}/api/admin/lecturers-upload`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ lecturers }),
          });
          if (res.ok) alert("Lecturers uploaded!");
          else alert("Upload Failed");
        } catch (err) {
          alert("Error uploading.");
        }

        lecturerBtn.textContent = "Upload Lecturers";
      };
      reader.readAsText(fileInput.files[0]);
    });
  }

  // ============================================
  // 4. ASSIGN COURSE LOGIC
  // ============================================

  // We expose this function globally so the HTML onclick="assignCourse()" can find it
  window.assignCourse = async function () {
    const courseCode = document.getElementById("assignCourseSelect").value;
    const lecturerId = document.getElementById("assignLecturerSelect").value;
    const statusEl = document.getElementById("assignStatus");
    const token = localStorage.getItem("admin_token");

    if (!courseCode || !lecturerId)
      return alert("Select both course and lecturer.");

    statusEl.textContent = "Assigning...";

    try {
      const res = await fetch(`${API_BASE}/api/admin/assign-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_code: courseCode,
          lecturer_id: parseInt(lecturerId),
        }),
      });

      if (res.ok) {
        statusEl.textContent = "Success!";
        statusEl.style.color = "green";
      } else {
        statusEl.textContent = "Failed.";
        statusEl.style.color = "red";
      }
    } catch (e) {
      console.error(e);
    }
  };

  async function loadAssignmentOptions(token) {
    const courseSelect = document.getElementById("assignCourseSelect");
    const lecturerSelect = document.getElementById("assignLecturerSelect");
    if (!courseSelect || !lecturerSelect) return;

    try {
      const [cRes, lRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/lecturers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const courses = await cRes.json();
      const lecturers = await lRes.json();

      courseSelect.innerHTML =
        '<option value="">-- Select --</option>' +
        courses
          .map((c) => `<option value="${c.code}">${c.code}</option>`)
          .join("");
      lecturerSelect.innerHTML =
        '<option value="">-- Select --</option>' +
        lecturers
          .map((l) => `<option value="${l.id}">${l.name}</option>`)
          .join("");
    } catch (e) {
      console.error("Error loading dropdowns", e);
    }
  }
});

