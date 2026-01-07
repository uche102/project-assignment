// admin-auth.js — simple admin login to obtain JWT token
(function () {
  const loginBtn = document.getElementById("adminLoginBtn");
  const userEl = document.getElementById("adminUser");
  const passEl = document.getElementById("adminPass");
  const statusEl = document.getElementById("adminLoginStatus");

  if (!loginBtn) return;

  function setStatus(msg, isError) {
    statusEl.innerText = msg || "";
    statusEl.style.color = isError ? "#b91c1c" : "";
  }

  loginBtn.addEventListener("click", async () => {
    const username = userEl.value.trim();
    const password = passEl.value;
    if (!username || !password) return setStatus("provide credentials", true);
    setStatus("logging in...");
    // ... inside the event listener ...
    try {
      // CHANGE THIS LINE: Use "user-login" instead of "login"
      const res = await fetch("http://localhost:4000/api/auth/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      // ... rest of code matches ...
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "login failed" }));
        return setStatus(j.error || "login failed", true);
      }
      const body = await res.json().catch(() => ({}));
      if (body && body.token) {
        window.localStorage.setItem("token", body.token);
      }
      setStatus("logged in ✓");
    } catch (e) {
      setStatus("network error", true);
    }
  });
})();
