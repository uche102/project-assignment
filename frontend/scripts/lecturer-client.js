async function loadLecturers() {
  const listContainer = document.getElementById("lecturerList");

  if (!listContainer) {
    console.log("Lecturer List container not found yet.");
    return;
  }

  const API_BASE = window.API_BASE || "http://localhost:4000";
  const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim();

  try {
    // User decoding logic
    let user = {};
    if (token) {
      try {
        user = JSON.parse(atob(token.split(".")[1]));
      } catch (e) {}
    }

    // Fetch Lecturers
    const res = await fetch(`${API_BASE}/api/lecturers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const responseData = await res.json();
    console.log("DEBUG: Server sent this data:", responseData);

    let lecturers = [];
    if (Array.isArray(responseData)) {
      lecturers = responseData;
    } else if (responseData.rows && Array.isArray(responseData.rows)) {
      lecturers = responseData.rows;
    }

    if (lecturers.length === 0) {
      listContainer.innerHTML = "<p>No lecturers found.</p>";
      return;
    }

    // --- RENDER LIST ---
    listContainer.innerHTML = lecturers
      .map((lec) => {
        // 1. DATA EXTRACTION & SAFETY CHECKS
        const name = lec.lecturer_name || lec.name || "Unknown Lecturer";
        let office = lec.office_location || lec.office || "Main Office";
        const email = lec.email_address || lec.email || lec.lecturer_email;
        const initial = name.charAt(0);

        // 2. HANDLE COURSES (The logic goes HERE)
        const coursesArray = Array.isArray(lec.courses) ? lec.courses : [];

        const coursesHtml =
          coursesArray.length > 0
            ? `<div class="course-tags">
               ${coursesArray.map((c) => `<span class="course-badge">${c.code}</span>`).join("")}
             </div>`
            : `<span class="no-course">No courses assigned</span>`;

        const isMyLecturer = false; // Simplified
        const badge = isMyLecturer ? `<span>Your Lecturer</span>` : "";
         if (office.length <= 2) {
           office =
             "Room 10" + Math.floor(Math.random()*9) + ", CS Building";
         }

      
        return `
        <div class="lecturer-item">
          <div class="lec-avatar">${initial}</div>
          <div class="lec-info">
             <strong>${name}</strong> ${badge}
             <p>${office}</p>
             
             ${coursesHtml}
             
          </div>
          <button onclick="openChat('${name}', '${email}')" class="primary-btn">
            Message
          </button>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Lecturer Load Error:", err);
    listContainer.innerHTML =
      "<p style='color:red;'>Error loading directory.</p>";
  }
}

// Helper Functions
function openChat(name, email) {
  alert(`Messaging feature coming soon for ${name}!`);
}

// Expose globally
window.loadLecturers = loadLecturers;
window.openChat = openChat;

// Trigger immediately if page is already loaded
if (document.getElementById("lecturerList")) {
  loadLecturers();
}
