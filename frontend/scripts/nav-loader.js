(function () {
  // =======================================
  //  CONFIGURATION
  // =======================================
  const SCRIPT_PATH = "scripts/";

  const pageScripts = {
    dashboard: "dashboard-client.js",
    profile: "profile-client.js",
    results: "results-client.js",
    "academic-fees": "paystack.js",
    "course-reg": "course-reg-client.js",
    lecturers: "lecturer-client.js",
  };

  // =======================================
  //  AUTH CHECK & SIDEBAR INIT
  // =======================================
  const token = localStorage.getItem("token");
  const path = window.location.pathname;

  if (
    path.includes("login.html") ||
    path.includes("register.html") ||
    path.includes("admin.html")
  ) {
    return;
  }

  if (!token) {
    console.warn("No token found. Redirecting...");
    window.location.replace("partials/login.html");
    return;
  }

  // update sidebar
  function updateSidebar() {
    try {
      const cleanToken = token.replace(/['"]+/g, "").trim();
      const user = JSON.parse(atob(cleanToken.split(".")[1]));

      const username = (user.username || "Student").toUpperCase();
      const regNo = user.reg_no || "N/A";

      // Updates Sidebar Profile
      const sideName = document.getElementById("sideName");
      const sideReg = document.getElementById("sideReg");

      if (sideName) sideName.textContent = username;
      if (sideReg) sideReg.textContent = `Reg No: ${regNo}`;

      //  Updates Topbar
      const topName = document.getElementById("topbarUsername");
      if (topName) topName.textContent = username;
    } catch (e) {
      console.error("Sidebar Init Error:", e);
    }
  }

  //  DYNAMIC SCRIPT LOADER

  function loadPageScript(pageName) {
    const fileName = pageScripts[pageName];
    if (!fileName) return;

    const fullPath = `${SCRIPT_PATH}${fileName}`;
    const existingScript = document.querySelector(`script[src="${fullPath}"]`);

    const runPageLogic = () => {
      if (pageName === "dashboard" && window.loadAllStats)
        window.loadAllStats();
      if (pageName === "profile" && window.loadProfile) window.loadProfile();
      if (pageName === "results" && window.renderResults)
        window.renderResults();

      if (pageName === "lecturers" && window.loadLecturers)
        window.loadLecturers();

      if (pageName === "academic-fees" && window.initPaystack)
        window.initPaystack();
    };

    if (existingScript) {
      runPageLogic();
    } else {
      const script = document.createElement("script");
      script.src = fullPath;
      script.onload = runPageLogic;
      document.body.appendChild(script);
    }
  }

  // =======================================
  //  NAV & PARTIAL LOADER
  // =======================================
  const partials = [
    "dashboard",
    "course-registration",
    "borrow-courses",
    "results",
    "calendar",
    "academic-fees",
    "documents",
    "lecturers",
    "profile",
    "signout",
  ];

  const menuEl = document.getElementById("menu");
  const pagesContainer = document.getElementById("pagesContainer");
  const pageTitle = document.getElementById("pageTitle");
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");

  if (!menuEl || !pagesContainer) return;

  async function loadPartial(name) {
    try {
      const res = await fetch(`partials/${name}.html`);
      if (!res.ok) throw new Error("Fetch failed");
      const text = await res.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = text;
      ` <strong>University of Nigeria</strong>
                <small>Student Portal</small>`;
      return {
        navNode: wrapper.querySelector(".partial-nav"),
        contentNode: wrapper.querySelector(".partial-content"),
        name,
      };
    } catch (err) {
      return null;
    }
  }

  async function init() {
    updateSidebar(); // Runs immediately

    for (const name of partials) {
      const p = await loadPartial(name);
      if (!p) continue;

      if (p.navNode) {
        const btn =
          p.navNode.querySelector("[data-page]") || p.navNode.firstElementChild;
        if (btn) {
          btn.classList.add("dynamic");
          menuEl.appendChild(btn);
        }
      }

      if (p.contentNode) {
        p.contentNode.style.display = "none";
        pagesContainer.appendChild(p.contentNode);
      }
    }

    // CLICK HANDLER
    menuEl.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-page]");
      if (!b) return;

      const pageName = b.getAttribute("data-page");

      if (pageName === "signout") {
        localStorage.removeItem("token");
        window.location.href = "partials/login.html";
        return;
      }

      showPage(pageName);
      if (sidebar && window.innerWidth <= 900)
        sidebar.classList.add("collapsed");
    });

    // HAMBURGER
    if (hamburger && sidebar) {
      hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
      });
    }

    // INITIAL LOAD
    const landing = localStorage.getItem("landingPage") || "dashboard";
    if (menuEl.querySelector(`[data-page="${landing}"]`)) {
      showPage(landing);
    } else {
      const firstBtn = menuEl.querySelector("[data-page]");
      if (firstBtn) showPage(firstBtn.getAttribute("data-page"));
    }
    localStorage.removeItem("landingPage");
  }

  function showPage(pageName) {
    pagesContainer
      .querySelectorAll(".partial-content")
      .forEach((p) => (p.style.display = "none"));
    menuEl
      .querySelectorAll("[data-page]")
      .forEach((b) => b.classList.remove("active"));

    const activeBtn = menuEl.querySelector(`[data-page="${pageName}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    const target = pagesContainer.querySelector(
      `.partial-content[data-page="${pageName}"]`,
    );
    if (target) {
      target.style.display = "";
      pageTitle.textContent = target.getAttribute("data-title") || pageName;
      loadPageScript(pageName);
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
