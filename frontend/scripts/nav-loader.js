// nav-loader.js — dynamically load nav button partials and page partials
(function () {
  const partials = [
    "dashboard",
    "course-registration",
    "borrow-courses",
    "results",
    "assignments",
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
    // use absolute path from Express static route
    const url = `/frontend/partials/${name}.html`;
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

      // append nav buttons
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

      // append page content
      if (p.contentNode) {
        p.contentNode.style.display = "none";
        pagesContainer.appendChild(p.contentNode);
      }
    }

    // menu click handler
    menuEl.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-page]");
      if (!b) return;
      showPage(b.getAttribute("data-page"));
      if (sidebar && window.innerWidth <= 900)
        sidebar.classList.add("collapsed");
    });

    // hamburger toggle
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

    // show first page by default
    const first = menuEl.querySelector("[data-page]");
    if (first) showPage(first.getAttribute("data-page"));

    // dispatch loaded event
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
