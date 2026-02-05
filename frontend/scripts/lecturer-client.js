async function loadLecturers() {
  const listContainer = document.getElementById("lecturerList");
  if (!listContainer) return;

  //global API_BASE
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

    // 2. Fetch My Courses To identify "My Lecturers"
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
        // Safety check: ensure myCourses is  array
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
      
      return;
    }

    // 4. Handle Empty List
    if (lecturers.length === 0) {
      listContainer.innerHTML =
        "<p>No lecturers found in the directory.</p>";
      return;
    }

    // 5. Render List
    listContainer.innerHTML = lecturers
      .map((lec) => {
        // Handle if courses is missing or null
        const coursesArray = Array.isArray(lec.courses) ? lec.courses : [];

        // Check if lecturer exists
        const isMyLecturer = coursesArray.some((c) => myCodes.includes(c.code));

        const badge = isMyLecturer
          ? `<span>Your Lecturer</span>`
          : "";

        // Build Course Badges
        const courseBadges =
          coursesArray.length > 0
            ? coursesArray
                .map(
                  (c) =>
                    `<span>${c.code}</span>`,
                )
                .join("")
            : '<span>No courses assigned</span>';

        return `
        <div class="lecturer-item">
          <div>
            <div>
                 ${lec.name ? lec.name.charAt(0) : "L"}
            </div>

            <div>
              <div>
                 <strong>${lec.name}</strong> ${badge}
              </div>
              <p > ${lec.office || "Main Office"}</p>
              <div >${courseBadges}</div>
            </div>
          </div>
          
          <button onclick="openChat('${lec.name}', '${lec.email}')" class="primary-btn">
            Message
          </button>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Lecturer Load Error:", err);
    listContainer.innerHTML =
      "<p style='color:red;'>Unable to load directory. Is the server running?</p>";
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
