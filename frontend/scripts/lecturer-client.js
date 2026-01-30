async function loadLecturers() {
  const listContainer = document.getElementById("lecturerList");
  if (!listContainer) return;

  // Use global API_BASE
  const API_BASE = window.API_BASE || "http://localhost:4000";
  const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim();

  try {
    // 1. Decode User
    let user = {};
    if (token) {
      try {
        user = JSON.parse(atob(token.split(".")[1]));
      } catch (e) {}
    }
    const username = user.username || "student";

    // 2. Fetch My Courses (To identify "My Lecturers")
    let myCodes = [];
    try {
      const coursesRes = await fetch(
        `${API_BASE}/api/courses/registered/${username}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (coursesRes.ok) {
        const myCourses = await coursesRes.json();
        // Safety check: ensure myCourses is an array
        if (Array.isArray(myCourses)) {
          myCodes = myCourses.map((c) => c.course_code);
        }
      }
    } catch (e) {
      console.warn("Could not fetch my courses", e);
    }

    // 3. Fetch Lecturers
    const res = await fetch(`${API_BASE}/api/lecturers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // === DEBUGGING MOMENT ===
    const responseData = await res.json();
    console.log("DEBUG: Server sent this data:", responseData);

    // === THE FIX FOR "MAP IS NOT A FUNCTION" ===
    // If server sent an array: use it.
    // If server sent an object with .rows: use .rows.
    // Otherwise: default to empty array [].
    let lecturers = [];
    if (Array.isArray(responseData)) {
      lecturers = responseData;
    } else if (responseData.rows && Array.isArray(responseData.rows)) {
      lecturers = responseData.rows;
    } else {
      console.error("Data format error: Expected Array, got", responseData);
      listContainer.innerHTML =
        "<p style='color:red; padding:20px;'>Error: Server data format is invalid.</p>";
      return;
    }

    // 4. Handle Empty List
    if (lecturers.length === 0) {
      listContainer.innerHTML =
        "<p style='padding:20px; color:#666;'>No lecturers found in the directory.</p>";
      return;
    }

    // 5. Render List
    listContainer.innerHTML = lecturers
      .map((lec) => {
        // Handle if courses is missing or null
        const coursesArray = Array.isArray(lec.courses) ? lec.courses : [];

        // Check if this lecturer teaches any of my courses
        const isMyLecturer = coursesArray.some((c) => myCodes.includes(c.code));

        const badge = isMyLecturer
          ? `<span style="background:#e9f6ec; color:#0a8a3a; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">Your Lecturer</span>`
          : "";

        // Build Course Badges
        const courseBadges =
          coursesArray.length > 0
            ? coursesArray
                .map(
                  (c) =>
                    `<span style="background:#f3f4f6; color:#555; padding:2px 6px; border-radius:4px; font-size:0.75rem; margin-right:4px; border:1px solid #eee;">${c.code}</span>`,
                )
                .join("")
            : '<span style="color:#999; font-size:0.8rem;">No courses assigned</span>';

        return `
        <div class="lecturer-item" style="display: flex; align-items: center; justify-content: space-between; padding: 15px; border-bottom: 1px solid #eee;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background:#0a8a3a; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem;">
                 ${lec.name ? lec.name.charAt(0) : "L"}
            </div>

            <div>
              <div style="display:flex; align-items:center;">
                 <strong style="color: #333;">${lec.name}</strong> ${badge}
              </div>
              <p style="font-size: 0.85rem; color: #666; margin: 2px 0;">📍 ${lec.office || "Main Office"}</p>
              <div style="margin-top:4px;">${courseBadges}</div>
            </div>
          </div>
          
          <button onclick="openChat('${lec.name}', '${lec.email}')" class="primary-btn" style="padding: 5px 15px; font-size: 0.8rem; cursor: pointer; background:#007bff; color:white; border:none; border-radius:4px;">
            Message
          </button>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Lecturer Load Error:", err);
    listContainer.innerHTML =
      "<p style='color:red; padding:20px;'>Unable to load directory. Is the server running?</p>";
  }
}

// Helper Functions
function openChat(lecturerName, lecturerEmail) {
  const email =
    lecturerEmail && lecturerEmail !== "null"
      ? lecturerEmail
      : "helpdesk@unn.edu.ng";
  const subject = encodeURIComponent(
    `Inquiry from Student (Portal): ${lecturerName}`,
  );
  window.location.href = `mailto:${email}?subject=${subject}`;
}

// EXPORT
window.loadLecturers = loadLecturers;
window.openChat = openChat;
