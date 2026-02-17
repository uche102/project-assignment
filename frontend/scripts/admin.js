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
          location.reload();
        } else {
          alert("Login Failed: " + (data.error || "Invalid credentials"));
        }
      } catch (err) {
        console.error(err);
        alert("Server Error. Check console.");
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
    loadDropdowns();
  }

  // --- 3. DATA LOADER (Courses & Lecturers) ---
  async function loadDropdowns() {
    const courseSelect = document.getElementById("assignCourseSelect");
    const lecturerSelect = document.getElementById("assignLecturerSelect");
    const token = localStorage.getItem("admin_token");

    if (!courseSelect || !lecturerSelect) return;

    // --- FETCH COURSES ---
    try {
      console.log("Fetching courses...");
      const res = await fetch(`${API_BASE}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const courses = await res.json();

      // DEBUG: Log what the server actually sent
      console.log("Server Course Response:", courses);

      if (res.ok && Array.isArray(courses)) {
        courseSelect.innerHTML =
          '<option value="">-- Select Course --</option>' +
          courses
            .map(
              (c) =>
                `<option value="${c.code}">${c.code} - ${c.title}</option>`,
            )
            .join("");
      } else {
        // ERROR HANDLING
        console.error("Failed to load courses:", courses);
        courseSelect.innerHTML =
          '<option value="">Error Loading Courses</option>';
        if (res.status === 401) {
          alert("Session expired. Please relogin.");
          localStorage.removeItem("admin_token");
          location.reload();
        }
      }
    } catch (err) {
      console.error("Course Network Error", err);
      courseSelect.innerHTML = '<option value="">Network Error</option>';
    }

    // --- FETCH LECTURERS ---
    try {
      const res = await fetch(`${API_BASE}/api/lecturers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lecturers = await res.json();

      if (Array.isArray(lecturers)) {
        lecturerSelect.innerHTML =
          '<option value="">-- Select Lecturer --</option>' +
          lecturers
            .map((l) => `<option value="${l.id}">${l.name}</option>`)
            .join("");
      }
    } catch (err) {
      console.error("Lecturer Load Error", err);
    }
  }

  // --- 4. GLOBAL FUNCTIONS (Attached to Window) ---

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
    statusEl.style.color = "blue";

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
        statusEl.textContent = "Success! Linked.";
        statusEl.style.color = "green";
      } else {
        statusEl.textContent = "Failed.";
        statusEl.style.color = "red";
      }
    } catch (e) {
      statusEl.textContent = "Error";
    }
  };

  window.createCourse = async function () {
    const code = document.getElementById("newCourseCode").value;
    const title = document.getElementById("newCourseTitle").value;
    const unit = document.getElementById("newCourseUnit").value;
    const level = document.getElementById("newCourseLevel").value;
    const token = localStorage.getItem("admin_token");

    if (!code || !title) return alert("Code and Title are required");

    // UI Feedback
    const btn = document.querySelector("button[onclick='createCourse()']");
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/admin/add-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code,
          title: title,
          unit: parseInt(unit) || 3, // Default to 3 if empty
          level: parseInt(level) || 100, // Default to 100 if empty
        }),
      });

      const data = await res.json(); // Get error message if any

      if (res.ok) {
        alert("Course Created Successfully!");
        location.reload();
      } else {
        alert("Failed: " + (data.error || "Unknown Error"));
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (e) {
      alert("Network Error: " + e.message);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };

  // --- 5. FILE UPLOADS ---
  const uploadResultsBtn = document.getElementById("uploadResultsBtn");
  if (uploadResultsBtn) {
    uploadResultsBtn.addEventListener("click", async () => {
      const fileInput = document.getElementById("resultFile");
      const file = fileInput.files[0];
      const token = localStorage.getItem("admin_token");

      if (!file) return alert("Please select a CSV file first.");

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE}/api/admin/upload-results`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        alert(
          res.ok
            ? data.message || "Upload Successful"
            : "Failed: " + data.error,
        );
      } catch (err) {
        alert("Upload Error: " + err.message);
      }
    });
  }

  const uploadLecturersBtn = document.getElementById("uploadLecturersBtn");
  if (uploadLecturersBtn) {
    uploadLecturersBtn.addEventListener("click", async () => {
      const fileInput = document.getElementById("lecturerFile");
      const file = fileInput.files[0];
      const token = localStorage.getItem("admin_token");

      if (!file) return alert("Please select a CSV file first.");

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE}/api/admin/lecturers-upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        alert(
          res.ok
            ? data.message || "Upload Successful"
            : "Failed: " + data.error,
        );
      } catch (err) {
        alert("Upload Error: " + err.message);
      }
    });
  }
});
