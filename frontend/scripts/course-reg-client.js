document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:4000";

  const mockCourses = [
    { code: "CSC201", title: "Computer Programming I", unit: 3 },
    { code: "MTH201", title: "General Mathematics", unit: 3 },
    { code: "PHY201", title: "General Physics", unit: 3 },
    { code: "GST201", title: "Use of English", unit: 2 },
  ];

  async function renderCourses() {
    const list = document.getElementById("course-list");
    if (!list) return;

    // Get Token & User
    let token = localStorage.getItem("token");
    if (token) token = token.replace(/['"]+/g, "").trim();

    let user = {};
    if (token) {
      try {
        user = JSON.parse(atob(token.split(".")[1]));
      } catch (e) {}
    }

    //  FETCHS REAL COURSES FROM DATABASE (Added via Admin)
    let dbCourses = [];
    if (token) {
      try {
        // the same endpoint the Admin uses to view courses
        const res = await fetch(`${API_BASE}/api/admin/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          dbCourses = await res.json();
        }
      } catch (err) {
        console.warn("Could not fetch DB courses, showing mocks only.");
      }
    }

    // Map  prevent duplicates (if a course is in both lists, DB wins)
    const allCoursesMap = new Map();

    mockCourses.forEach((c) => allCoursesMap.set(c.code, c));

    // Add Courses from postgresql
    if (Array.isArray(dbCourses)) {
      dbCourses.forEach((c) => allCoursesMap.set(c.code, c));
    }

    // Convert to array
    const combinedCourses = Array.from(allCoursesMap.values());

    let registeredCodes = [];
    if (token) {
      try {
        const res = await fetch(
          `${API_BASE}/api/courses/registered/${user.username}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          registeredCodes = data.map((r) => r.course_code);
        }
      } catch (err) {
        console.error("Failed to fetch registered status", err);
      }
    }

    list.innerHTML = combinedCourses
      .map((c) => {
        const isRegistered = registeredCodes.includes(c.code);
        const btnText = isRegistered ? "Remove" : "Register";
        const btnColor = isRegistered ? "#dc3545" : "#007bff";
        const action = isRegistered ? "remove" : "add";

        return `
      <div class="course-item" style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <strong>${c.code}</strong> - ${c.title} 
            <span style="color:#666; font-size:0.9em;">(${c.unit} Units)</span>
        </div>
        <button 
          class="btn-reg" 
          data-code="${c.code}" 
          data-title="${c.title}"
          data-unit="${c.unit}"
          data-action="${action}"
          style="background:${btnColor}; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:4px;">
          ${btnText}
        </button>
      </div>
    `;
      })
      .join("");

    //  dataset for dynamic courses)
    list.querySelectorAll(".btn-reg").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!token) {
          alert("Please log in first.");
          return;
        }

        const code = btn.dataset.code;
        const title = btn.dataset.title;
        const unit = parseInt(btn.dataset.unit);
        const action = btn.dataset.action;

        btn.disabled = true;
        btn.textContent = action === "add" ? "Saving..." : "Removing...";

        try {
          const method = action === "add" ? "POST" : "DELETE";

          const res = await fetch(`${API_BASE}/api/courses/register`, {
            method: method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              course_code: code,
              course_title: title,
              units: unit,
            }),
          });

          const data = await res.json();

          if (res.ok) {
            alert(
              `Course ${
                action === "add" ? "registered" : "removed"
              } successfully!`,
            );
            window.dispatchEvent(new Event("statsUpdated"));
            renderCourses();
          } else {
            alert(data.error || "Operation failed");
            btn.disabled = false;
            btn.textContent = action === "add" ? "Register" : "Remove";
          }
        } catch (err) {
          console.error(err);
          btn.textContent = "Error";
          btn.disabled = false;
        }
      });
    });
  }

  renderCourses();

  //  (SPA behavior)
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const listAdded = Array.from(mutation.addedNodes).some(
          (node) =>
            node.id === "course-list" ||
            (node.querySelector && node.querySelector("#course-list")),
        );
        if (listAdded) renderCourses();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
