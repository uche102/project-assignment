// nav-loader.js — dynamically load nav button partials and page partials
(function () {
  // =======================================
  // 1. SESSION / AUTH CHECK
  // =======================================
  const token = localStorage.getItem("token");
  const path = window.location.pathname;

  // SAFETY CHECK: If already on a public page, do nothing.
  // We check for "login.html" which matches "/partials/login.html" too.
  if (
    path.includes("login.html") ||
    path.includes("register.html") ||
    path.includes("admin.html")
  ) {
    // We are on the login page. Stop here.
    // Do NOT return here if you want the init() function below to run (e.g. if login page needs partials)

    return;
  }

  // IF NO TOKEN -> REDIRECT TO LOGIN (Inside Partials)
  if (!token) {
    console.warn("No token found. Redirecting to login...");
    // FIX: Point to the file inside the partials folder
    window.location.replace("/partials/login.html");
    return; // Stop execution
  }

  // =======================================
  // 2. NAV & PARTIAL LOADER
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
      const navNode = wrapper.querySelector(".partial-nav");
      const contentNode = wrapper.querySelector(".partial-content");
      return { navNode, contentNode, name };
    } catch (err) {
      console.warn("Could not load partial", name, err);
      return null;
    }
  }

  async function init() {
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
          btn.addEventListener("keydown", (ev) => onMenuKeyDown(ev, btn));
          menuEl.appendChild(btn);
        }
      }

      if (p.contentNode) {
        p.contentNode.style.display = "none";
        pagesContainer.appendChild(p.contentNode);
      }
    }

    // ... inside init() function ...

    // menu click handler
    menuEl.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-page]");
      if (!b) return;

      const pageName = b.getAttribute("data-page");

      // === NEW: HANDLE SIGN OUT ===
      if (pageName === "signout") {
        // 1. Clear credentials
        localStorage.removeItem("token");
        localStorage.removeItem("landingPage");

        // 2. Redirect to Login
        // USE THIS if your login is inside partials:
        window.location.href = "/partials/login.html";

        // OR USE THIS if your login is in the root folder:
        // window.location.href = "/login.html";
        return;
      }
      // ============================

      showPage(pageName);
      if (sidebar && window.innerWidth <= 900)
        sidebar.classList.add("collapsed");
    });
    // EXISTING: Sidebar click handler
    menuEl.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-page]");
      if (!b) return;
      showPage(b.getAttribute("data-page"));
      // ... existing code ...
    });

    // === NEW: Content click handler (For links inside pages) ===
    document.body.addEventListener("click", (ev) => {
      // Check if the clicked element has 'data-go-to' attribute
      const link = ev.target.closest("[data-go-to]");
      if (link) {
        ev.preventDefault(); // Stop normal link behavior
        const targetPage = link.getAttribute("data-go-to");
        showPage(targetPage); // Switch the view!
      }
    });

    if (hamburger && sidebar) {
      hamburger.setAttribute(
        "aria-expanded",
        String(!sidebar.classList.contains("collapsed"))
      );
      sidebar.setAttribute(
        "aria-hidden",
        String(sidebar.classList.contains("collapsed"))
      );
      hamburger.addEventListener("click", () => {
        const isCollapsed = sidebar.classList.toggle("collapsed");
        hamburger.setAttribute("aria-expanded", String(!isCollapsed));
        sidebar.setAttribute("aria-hidden", String(isCollapsed));
        if (!isCollapsed) menuEl.querySelector("[data-page]")?.focus();
        else hamburger.focus();
      });
    }

    const landing = localStorage.getItem("landingPage") || null;
    const first = landing
      ? menuEl.querySelector(`[data-page="${landing}"]`)
      : menuEl.querySelector("[data-page]");

    if (first) showPage(first.getAttribute("data-page"));

    localStorage.removeItem("landingPage");

    if (!window.__PARTIALS_LOADED__) {
      window.__PARTIALS_LOADED__ = true;
      document.dispatchEvent(new CustomEvent("partials:loaded"));
    }
  }

  function onMenuKeyDown(ev, btn) {
    const key = ev.key;
    if (key === "Enter" || key === " ") {
      ev.preventDefault();
      btn.click();
      return;
    }
    if (key === "ArrowDown") {
      ev.preventDefault();
      focusNext(btn);
      return;
    }
    if (key === "ArrowUp") {
      ev.preventDefault();
      focusPrev(btn);
      return;
    }
    if (key === "Home") {
      ev.preventDefault();
      focusFirst();
      return;
    }
    if (key === "End") {
      ev.preventDefault();
      focusLast();
      return;
    }
    if (
      key === "Escape" &&
      sidebar &&
      !sidebar.classList.contains("collapsed")
    ) {
      sidebar.classList.add("collapsed");
      sidebar.setAttribute("aria-hidden", "true");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.focus();
    }
  }

  function focusNext(current) {
    const items = Array.from(menuEl.querySelectorAll("[data-page]"));
    const idx = items.indexOf(current);
    items[(idx + 1) % items.length]?.focus();
  }
  function focusPrev(current) {
    const items = Array.from(menuEl.querySelectorAll("[data-page]"));
    const idx = items.indexOf(current);
    items[(idx - 1 + items.length) % items.length]?.focus();
  }
  function focusFirst() {
    menuEl.querySelector("[data-page]")?.focus();
  }
  function focusLast() {
    const items = menuEl.querySelectorAll("[data-page]");
    items[items.length - 1]?.focus();
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
      `.partial-content[data-page="${pageName}"]`
    );
    if (target) {
      target.style.display = "";
      const title =
        target.getAttribute("data-title") || activeBtn?.textContent || pageName;
      pageTitle.textContent = title.trim();
      if (
        pageName === "assignments" &&
        typeof window.renderTasks === "function"
      )
        window.renderTasks();
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
