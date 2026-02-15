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
      // NOTE: We send the input value as 'reg_no' because the backend login expects 'reg_no'
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
          location.reload(); // Reloads to refresh state
        } else {
          alert(
            "Login Failed: " + (data.error || "Check username (use 'admin')"),
          );
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
    loadDropdowns();
  }

  // --- 3. DATA LOADER (Courses & Lecturers) ---
  async function loadDropdowns() {
    const courseSelect = document.getElementById("assignCourseSelect");
    const lecturerSelect = document.getElementById("assignLecturerSelect");
    const token = localStorage.getItem("admin_token");

    if (!courseSelect || !lecturerSelect) return;

    // Fetch Courses
    try {
      const res = await fetch(`${API_BASE}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const courses = await res.json();

      if (Array.isArray(courses)) {
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
      console.error("Course Load Error", err);
    }

    // Fetch Lecturers
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

  // --- 4. ASSIGN COURSE FUNCTION ---
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

  // --- 5. CREATE COURSE FUNCTION ---
  window.createCourse = async function () {
    const code = document.getElementById("newCourseCode").value;
    const title = document.getElementById("newCourseTitle").value;
    const unit = document.getElementById("newCourseUnit").value;
    const level = document.getElementById("newCourseLevel").value;
    const token = localStorage.getItem("admin_token");

    if (!code || !title) return alert("Code and Title are required");

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
          unit: parseInt(unit) || 3,
          level: parseInt(level) || 100,
        }),
      });

      if (res.ok) {
        alert("Course Created!");
        location.reload();
      } else {
        alert("Failed to create course.");
      }
    } catch (e) {
      alert("Network Error");
    }
  };

  
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
        if (res.ok) alert(data.message || "Upload Successful");
        else alert("Upload Failed: " + data.error);
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
        if (res.ok) alert(data.message || "Lecturers Uploaded");
        else alert("Upload Failed: " + data.error);
      } catch (err) {
        alert("Upload Error: " + err.message);
      }
    });
  }
});
