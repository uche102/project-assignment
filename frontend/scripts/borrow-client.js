document.addEventListener("DOMContentLoaded", () => {
  console.log("Borrow Client: Active");

  
  //  MOCK DATA
  
  const borrowableCourses = [
    {
      code: "PSY101",
      title: "Introduction to Psychology",
      unit: 2,
      dept: "Social Sciences",
    },
    { code: "FRE101", title: "Basic French I", unit: 2, dept: "Arts" },
    {
      code: "ECO101",
      title: "Principles of Economics",
      unit: 3,
      dept: "Social Sciences",
    },
    {
      code: "ACC101",
      title: "Principles of Accounting",
      unit: 3,
      dept: "Management",
    },
    { code: "HIS101", title: "History of West Africa", unit: 2, dept: "Arts" },
    { code: "ART102", title: "Art Appreciation", unit: 2, dept: "Arts" },
    {
      code: "GEO101",
      title: "Intro to Physical Geography",
      unit: 3,
      dept: "Social Sciences",
    },
    { code: "MUS101", title: "Fundamentals of Music", unit: 2, dept: "Arts" },
  ];

  const STORAGE_KEY = "borrowed_courses";

  // ============================
  //  HELPER FUNCTIONS
  // ============================
  function getBorrowed() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  }

  function saveBorrowed(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // ============================
  //  RENDER LOGIC
  // ============================
  function render(filterText = "") {
    const listEl = document.getElementById("borrow-list");
    if (!listEl) return;

    const myBorrowed = getBorrowed();
    const term = filterText.toLowerCase();

    // Filter courses
    const filtered = borrowableCourses.filter(
      (c) =>
        c.code.toLowerCase().includes(term) ||
        c.title.toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="muted">No courses found.</p>';
      return;
    }

    //  HTML
    listEl.innerHTML = filtered
      .map((course) => {
        const isBorrowed = myBorrowed.includes(course.code);
        return `
      <div class="course-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee;">
        <div>
          <h5 style="margin:0 0 5px 0;">${course.code} — ${course.title}</h5>
          <p style="margin:0; font-size:0.85rem; color:#666;">
            ${
              course.unit
            } Units • <span style="background:#eee; padding:2px 6px; border-radius:4px;">${
          course.dept
        }</span>
          </p>
        </div>
        <button 
          class="btn-borrow" 
          data-code="${course.code}"
          style="${
            isBorrowed
              ? "background:#dc3545; color:white;"
              : "background:#28a745; color:white;"
          } border:none; padding:6px 12px; border-radius:4px; cursor:pointer;"
        >
          ${isBorrowed ? "Remove" : "Borrow"}
        </button>
      </div>`;
      })
      .join("");

    // Adds  Listeners
    listEl.querySelectorAll(".btn-borrow").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleBorrow(btn.dataset.code);
      });
    });
  }

  function toggleBorrow(code) {
    let current = getBorrowed();

    // Toggle logic
    if (current.includes(code)) {
      current = current.filter((c) => c !== code); // Remove
    } else {
      current.push(code); // Add
    }

    // Saves to storage
    saveBorrowed(current);

    // ==========================================
    //  TRIGGER DASHBOARD UPDATE
    // ==========================================
    // sends message to dashboard-client.js immediately
   window.dispatchEvent(new Event("statsUpdated"));

    // shows green/red button change
    const searchInput = document.getElementById("borrowSearch");
    render(searchInput ? searchInput.value : "");
  }

  // ============================
  //  INITIALIZATION
  // ============================
  function init() {
    const listEl = document.getElementById("borrow-list");

    // Safety checks
    if (!listEl) return;
    if (listEl.dataset.ready === "true") return;

    // Marks as ready
    listEl.dataset.ready = "true";

    const searchInput = document.getElementById("borrowSearch");
    if (searchInput) {
      // Uses input for real-time filtering
      searchInput.addEventListener("input", (e) => render(e.target.value));
    }

    render();
  }

  // Observer
  const observer = new MutationObserver((mutationsList) => {
    // Only verify if the list was added to the DOM
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const listEl = document.getElementById("borrow-list");
        if (listEl && listEl.dataset.ready !== "true") {
          init();
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Try once immediately
  init();
});
