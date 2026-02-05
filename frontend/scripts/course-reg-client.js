document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:4000";

  // Mock List of Regular Courses
  const availableCourses = [
    { code: "CSC201", title: "Computer Programming I", unit: 3 },
    { code: "MTH201", title: "General Mathematics", unit: 3 },
    { code: "PHY201", title: "General Physics", unit: 3 },
    { code: "GST201", title: "Use of English", unit: 2 },
  ];

  async function renderCourses() {
    const list = document.getElementById("course-list");
    if (!list) return;
    if (list.dataset.loaded === "true") return;

    // 1. Get Token & User
    let token = localStorage.getItem("token");
    if (token) token = token.replace(/['"]+/g, "").trim();

    let user = {};
    if (token) {
      try {
        user = JSON.parse(atob(token.split(".")[1]));
      } catch (e) {}
    }

    // 2. Fetchs ALREADY REGISTERED courses from Database
    let registeredCodes = [];
    if (token) {
      try {
        const res = await fetch(
          `${API_BASE}/api/courses/registered/${user.username}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          // Extract course codes
          registeredCodes = data.map((r) => r.course_code);
        }
      } catch (err) {
        console.error("Failed to fetch existing courses", err);
      }
    }

    // 3. Render the List
    list.innerHTML = availableCourses
      .map((c) => {
        // Check if user already has this course
        const isRegistered = registeredCodes.includes(c.code);

        // Button Logic: Green/Red based on status
        const btnText = isRegistered ? "Remove" : "Register";
        const btnColor = isRegistered ? "#dc3545" : "#007bff"; 

        return `
      <div class="course-item" style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
        <div><strong>${c.code}</strong> - ${c.title} (${c.unit} Units)</div>
        <button 
          class="btn-reg" 
          data-code="${c.code}" 
          data-action="${isRegistered ? "remove" : "add"}"
          style="background:${btnColor}; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:4px;">
          ${btnText}
        </button>
      </div>
    `;
      })
      .join("");

    // 4. Add Event Listeners
    list.querySelectorAll(".btn-reg").forEach((btn, index) => {
      btn.addEventListener("click", async () => {
        if (!token) {
          alert("Please log in first.");
          return;
        }

        const course = availableCourses[index];
        const action = btn.dataset.action; // 'add' or 'remove'

        btn.disabled = true;
        btn.textContent = action === "add" ? "Saving..." : "Removing...";

        try {
          const method = action === "add" ? "POST" : "DELETE"; // Toggle Method

          const res = await fetch(`${API_BASE}/api/courses/register`, {
            method: method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              course_code: course.code,
              course_title: course.title,
              units: course.unit,
            }),
          });

          const data = await res.json();

          if (res.ok) {
            alert(
              `Course ${
                action === "add" ? "registered" : "removed"
              } successfully!`
            );

            //   Dashboard  refresh 
            window.dispatchEvent(new Event("statsUpdated"));

            // 2. RE-RENDER: Update the local button colors (Register -> Remove)
            // clear  flag so it fetches the fresh list from the DB
            list.dataset.loaded = "false";
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

    list.dataset.loaded = "true";
  }

  // Init Logic
  renderCourses();

  // Watch for navigation
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const listAdded = Array.from(mutation.addedNodes).some(
          (node) =>
            node.id === "course-list" ||
            (node.querySelector && node.querySelector("#course-list"))
        );
        if (listAdded) renderCourses();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
