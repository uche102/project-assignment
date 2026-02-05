/* frontend/scripts/admin.js */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin Script Loaded");
  const API_BASE = "http://localhost:4000";

  // --- SELECTORS ---
  const loginPanel = document.getElementById("adminLogin");
  const dashboard = document.getElementById("adminDashboard");
  const loginBtn = document.getElementById("adminLoginBtn");

  // --- 1. AUTH CHECK ---
  const token = localStorage.getItem("admin_token");

  if (token) {
    console.log("Token found. Unlocking dashboard...");
    unlockDashboard();
  } else {
    console.log("No token. Locking dashboard.");
    lockDashboard();
  }

  // --- 2. LOGIN LOGIC ---
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const username = document.getElementById("adminUser").value;
      const password = document.getElementById("adminPass").value;

      try {
        const res = await fetch(`${API_BASE}/api/auth/user-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reg_no: username, password: password }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("admin_token", data.token);
          location.reload(); // Reload to refresh state
        } else {
          alert("Login Failed: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        console.error(err);
        alert("Server Error. Is the backend running?");
      }
    });
  }

  function lockDashboard() {
    if (loginPanel) loginPanel.style.display = "block";
    if (dashboard) dashboard.style.display = "none";
  }

  function unlockDashboard() {
    if (loginPanel) loginPanel.style.display = "none";
    if (dashboard) dashboard.style.display = "block";

    // LOAD DATA IMMEDIATELY
    loadDropdowns();
  }

  // --- 3. DATA LOADER ---
  async function loadDropdowns() {
    console.log("Attempting to fetch Dropdown Data...");
    const courseSelect = document.getElementById("assignCourseSelect");
    const lecturerSelect = document.getElementById("assignLecturerSelect");
    const token = localStorage.getItem("admin_token");

    if (!courseSelect || !lecturerSelect) return;

    // A. FETCH COURSES
    try {
      courseSelect.innerHTML = "<option>Loading Courses...</option>";

      const res = await fetch(`${API_BASE}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Status: ${res.status}`);

      const courses = await res.json();

      if (courses.length === 0) {
        courseSelect.innerHTML =
          "<option>No Courses Found (Create one!)</option>";
      } else {
        courseSelect.innerHTML =
          '<option value="">-- Select Course --</option>' +
          courses
            .map(
              (c) =>
                `<option value="${c.code}">${c.code} - ${c.title}</option>`,
            )
            .join("");
      }
    } catch (err) {
      console.error("Course Fetch Error:", err);
      courseSelect.innerHTML = "<option>Error loading courses</option>";
    }

    // B. FETCH LECTURERS
    try {
      lecturerSelect.innerHTML = "<option>Loading Lecturers...</option>";

      const res = await fetch(`${API_BASE}/api/lecturers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Status: ${res.status}`);

      const lecturers = await res.json();

      if (lecturers.length === 0) {
        lecturerSelect.innerHTML =
          "<option>No Lecturers Found (Upload them!)</option>";
      } else {
        lecturerSelect.innerHTML =
          '<option value="">-- Select Lecturer --</option>' +
          lecturers
            .map((l) => `<option value="${l.id}">${l.name}</option>`)
            .join("");
      }
    } catch (err) {
      console.error("Lecturer Fetch Error:", err);
      lecturerSelect.innerHTML = "<option>Error loading lecturers</option>";
    }
  }

  // --- 4. ASSIGN FUNCTION (Global) ---
  window.assignCourse = async function () {
    const courseCode = document.getElementById("assignCourseSelect").value;
    const lecturerId = document.getElementById("assignLecturerSelect").value;
    const statusEl = document.getElementById("assignStatus");
    const token = localStorage.getItem("admin_token");

    if (!courseCode || !lecturerId) {
      alert("Please select both a course and a lecturer.");
      return;
    }

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
        statusEl.textContent = "Success! Course Linked.";
        statusEl.style.color = "green";
      } else {
        const data = await res.json();
        statusEl.textContent = "Failed: " + (data.error || "Unknown");
        statusEl.style.color = "red";
      }
    } catch (e) {
      console.error(e);
      statusEl.textContent = "Server Error";
    }
  };

  // --- 5. CREATE COURSE LOGIC (Moved Outside!) ---
  window.createCourse = async function () {
    const code = document.getElementById("newCourseCode").value;
    const title = document.getElementById("newCourseTitle").value;
    const unit = document.getElementById("newCourseUnit").value;
    const level = document.getElementById("newCourseLevel").value;
    const token = localStorage.getItem("admin_token");

    // Validation
    if (!code || !title) {
      alert("Please enter a Course Code and Title.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/add-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          unit: parseInt(unit) || 3,
          level: parseInt(level) || 100,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Success! Course Created: " + code);
        location.reload();
      } else {
        alert("Error: " + (data.error || "Could not create course"));
      }
    } catch (e) {
      console.error(e);
      alert("Server Error: Check your console.");
    }
  };
});
