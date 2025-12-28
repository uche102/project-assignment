/* inline-boot.js
   Consolidates small inline scripts previously embedded in HTML partials.
   - initializes sidebar and login toggles
   - wires partials:loaded handlers for assignments and course-registration
   - logs resource loads for debugging
*/
(function () {
  "use strict";

  // resource load logging (safe: only logs when element exists)
  function safeLogResource(hrefOrSrc, selector, type) {
    const el = document.querySelector(selector);
    if (!el) return;
    function onLoad() {
      console.log(`${hrefOrSrc} loaded`);
    }
    el.addEventListener("load", onLoad);
    // if element is already in the document and likely executed, try immediate log
    setTimeout(() => {
      // heuristics: for scripts, if a known function exists, assume loaded
      if (type === "script") {
        onLoad();
      } else {
        onLoad();
      }
    }, 50);
  }

  [" /styles/body.css", "/styles/nav.css"].forEach((href) =>
    safeLogResource(href, `link[href="${href.trim()}"]`, "style")
  );

  [
    "/scripts/nav-loader.js",
    "/scripts/body.js",
    "/scripts/results-client.js",
    "/scripts/paystack.js",
  ].forEach((src) => safeLogResource(src, `script[src="${src}"]`, "script"));

  // Sidebar toggle (moved from inline)
  function initSidebarToggle() {
    const hamburger = document.getElementById("hamburger");
    const sidebar = document.getElementById("sidebar");
    if (!hamburger || !sidebar) return;

    // Ensure ARIA state reflects initial state
    hamburger.setAttribute(
      "aria-expanded",
      String(!sidebar.classList.contains("collapsed"))
    );

    hamburger.addEventListener("click", () => {
      const isExpanded = sidebar.classList.contains("expanded");
      if (isExpanded) {
        sidebar.classList.remove("expanded");
        sidebar.classList.add("collapsed");
        hamburger.setAttribute("aria-expanded", "false");
      } else {
        sidebar.classList.remove("collapsed");
        sidebar.classList.add("expanded");
        hamburger.setAttribute("aria-expanded", "true");
      }
    });
  }

  // Login toggle (moved from inline)
  function initLoginToggle() {
    const password = document.getElementById("password");
    const toggle = document.getElementById("toggle");
    if (!password || !toggle) return;
    toggle.addEventListener("click", () => {
      if (password.type === "password") {
        password.type = "text";
        toggle.textContent = "hide";
      } else {
        password.type = "password";
        toggle.textContent = "show";
      }
    });
  }

  // Partial-based initialization
  function onPartialsLoaded() {
    // assignments page: call renderTasks if available and page visible
    const assignmentsPage = document.querySelector(
      '.partial-content[data-page="assignments"]'
    );
    if (assignmentsPage && assignmentsPage.style.display !== "none") {
      if (typeof window.renderTasks === "function") window.renderTasks();
    }

    // course-registration: render lists if functions available
    const coursePage = document.querySelector(
      '.partial-content[data-page="course-registration"]'
    );
    if (coursePage && coursePage.style.display !== "none") {
      if (typeof window.renderCoursesList === "function")
        window.renderCoursesList();
      if (typeof window.renderRegisteredList === "function")
        window.renderRegisteredList();
    }
  }

  document.addEventListener("partials:loaded", onPartialsLoaded);

  document.addEventListener("DOMContentLoaded", function () {
    initSidebarToggle();
    initLoginToggle();
    // Also attempt to initialize course-registration renders on DOMContentLoaded
    if (typeof window.renderCoursesList === "function")
      window.renderCoursesList();
    if (typeof window.renderRegisteredList === "function")
      window.renderRegisteredList();
  });
})();
