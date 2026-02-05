(function () {
  // =======================================
  // 1. CONFIGURATION
  // =======================================
  // Path to scripts relative to index.html
  const SCRIPT_PATH = "scripts/";

  // Mapping pages to their specific script files
  const pageScripts = {
    dashboard: "dashboard-client.js",
    profile: "profile-client.js",
    results: "results-client.js",
    "academic-fees": "paystack.js",
  };

  // =======================================
  // 2. AUTH CHECK & SIDEBAR INIT
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

  // --- IMMEDIATE SIDEBAR UPDATE ---
  // This runs instantly so the sidebar is never empty
  function updateSidebar() {
    try {
      const cleanToken = token.replace(/['"]+/g, "").trim();
      const user = JSON.parse(atob(cleanToken.split(".")[1]));

      const sideName = document.getElementById("profileNameDisplay");
      const sideReg = document.getElementById("profileRegDisplay");

      if (sideName)
        sideName.textContent = (user.username || "Student").toUpperCase();
      if (sideReg) sideReg.textContent = `Reg No: ${user.reg_no || "N/A"}`;
    } catch (e) {
      console.error("Sidebar Init Error:", e);
    }
  }

  // =======================================
  // 3. DYNAMIC SCRIPT LOADER
  // =======================================
  function loadPageScript(pageName) {
    const fileName = pageScripts[pageName];
    if (!fileName) return;

    const fullPath = `${SCRIPT_PATH}${fileName}`;

    // Check if script is already in the DOM
    const existingScript = document.querySelector(`script[src="${fullPath}"]`);

    if (existingScript) {
      // Script exists, just trigger the refresh function if available
      if (pageName === "dashboard" && window.loadAllStats)
        window.loadAllStats();
      if (pageName === "profile" && window.loadProfile) window.loadProfile();
      if (pageName === "results" && window.renderResults)
        window.renderResults();
    } else {
      // Inject the script
      const script = document.createElement("script");
      script.src = fullPath;
      script.onload = () => {
        console.log(`Script Loaded: ${fileName}`);
        // Run init immediately after load
        if (pageName === "dashboard" && window.loadAllStats)
          window.loadAllStats();
        if (pageName === "profile" && window.loadProfile) window.loadProfile();
      };
      document.body.appendChild(script);
    }
  }

  // =======================================
  // 4. NAV & PARTIAL LOADER
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
    const url = `partials/${name}.html`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed: " + res.status);
      const text = await res.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = text;
      return {
        navNode: wrapper.querySelector(".partial-nav"),
        contentNode: wrapper.querySelector(".partial-content"),
        name,
      };
    } catch (err) {
      console.warn("Could not load partial", name, err);
      return null;
    }
  }

  async function init() {
    // 1. Fill Sidebar immediately
    updateSidebar();

    // 2. Load all partials
    for (const name of partials) {
      const p = await loadPartial(name);
      if (!p) continue;

      if (p.navNode) {
        const btn =
          p.navNode.querySelector("[data-page]") || p.navNode.firstElementChild;
        if (btn) {
          btn.classList.add("dynamic");
          btn.setAttribute("role", "menuitem");
          btn.setAttribute("tabindex", "0");
          menuEl.appendChild(btn);
        }
      }

      if (p.contentNode) {
        p.contentNode.style.display = "none";
        pagesContainer.appendChild(p.contentNode);
      }
    }

    // 3. Event Listeners
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

    // Content internal links
    document.body.addEventListener("click", (ev) => {
      const link = ev.target.closest("[data-go-to]");
      if (link) {
        ev.preventDefault();
        showPage(link.getAttribute("data-go-to"));
      }
    });

    // Hamburger
    if (hamburger && sidebar) {
      hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
      });
    }

    // 4. Show Initial Page
    const landing = localStorage.getItem("landingPage");
    const firstPage = landing || "dashboard"; // Default to dashboard

    // Safety check if dashboard button exists
    if (menuEl.querySelector(`[data-page="${firstPage}"]`)) {
      showPage(firstPage);
    } else {
      // Fallback to first available button
      const firstBtn = menuEl.querySelector("[data-page]");
      if (firstBtn) showPage(firstBtn.getAttribute("data-page"));
    }

    localStorage.removeItem("landingPage");
    document.dispatchEvent(new CustomEvent("partials:loaded"));
  }

  function showPage(pageName) {
    // Hide all
    pagesContainer
      .querySelectorAll(".partial-content")
      .forEach((p) => (p.style.display = "none"));
    menuEl
      .querySelectorAll("[data-page]")
      .forEach((b) => b.classList.remove("active"));

    // Activate Button
    const activeBtn = menuEl.querySelector(`[data-page="${pageName}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    // Show Content
    const target = pagesContainer.querySelector(
      `.partial-content[data-page="${pageName}"]`,
    );
    if (target) {
      target.style.display = "";
      const title = target.getAttribute("data-title") || pageName;
      pageTitle.textContent = title;

      // === TRIGGER SCRIPT LOAD ===
      loadPageScript(pageName);
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
