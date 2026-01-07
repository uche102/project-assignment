document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errEl = document.getElementById("loginError");

  if (!form) return;

  // ============================
  // Config
  // ============================
  const API_BASE = "http://localhost:4000"; // change in production

  // ============================
  // Helpers
  // ============================
  function decodeToken(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload;
    } catch {
      return null;
    }
  }

  function restoreUser(token) {
    const payload = decodeToken(token);
    if (!payload) return;

    window.state = window.state || {};
    window.state.user = {
      id: payload.id,
      username: payload.username,
    };
  }

  // Restore user on refresh
  const savedToken = localStorage.getItem("token");
  if (savedToken) restoreUser(savedToken);

  // ============================
  // Login submit
  // ============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";

    const username = document.getElementById("username")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!username || !password) {
      errEl.textContent = "Username and password are required";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/user-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data?.error || "Invalid login credentials";
        return;
      }

      if (!data.token) {
        errEl.textContent = "Login failed: no token returned";
        return;
      }

      // Save token
      localStorage.setItem("token", data.token);
      restoreUser(data.token);

      // Redirect after successful login
      localStorage.setItem("landingPage", "dashboard");
      
      window.location.href = "../index.html";
    } catch (err) {
      console.error("Login error:", err);
      errEl.textContent = "Unable to connect to server";
    }
  });

  // ============================
  // Password toggle
  // ============================
  const passwordInput = document.getElementById("password");
  const toggle = document.getElementById("toggle");

  if (passwordInput && toggle) {
    toggle.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      toggle.textContent = isHidden ? "hide" : "show";
    });
  }

  // ============================
  // Signup
  // ============================
  const signupLink = document.querySelector(".signup");
  let signupEl;

  if (signupLink) {
    signupLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (signupEl) return;

      signupEl = document.createElement("div");
      signupEl.innerHTML = `
        <input id="signupUsername" placeholder="Choose username" />
        <input id="signupPassword" type="password" placeholder="Choose password" />
        <button id="createAccountBtn" type="button">Create account</button>
        <div id="signupStatus"></div>
      `;
      form.appendChild(signupEl);

      const status = signupEl.querySelector("#signupStatus");

      signupEl
        .querySelector("#createAccountBtn")
        .addEventListener("click", async () => {
          const u = signupEl.querySelector("#signupUsername").value.trim();
          const p = signupEl.querySelector("#signupPassword").value;

          if (!u || !p) {
            status.textContent = "All fields are required";
            return;
          }

          try {
            const res = await fetch(`${API_BASE}/api/auth/public-register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: u, password: p }),
            });

            const data = await res.json();

            if (!res.ok) {
              status.textContent = data?.error || "Registration failed";
              return;
            }

            status.style.color = "green";
            status.textContent = "Account created — please login";

            document.getElementById("username").value = u;
            document.getElementById("password").value = p;

            setTimeout(() => {
              signupEl.remove();
              signupEl = null;
            }, 1500);
          } catch (err) {
            console.error("Signup error:", err);
            status.textContent = "Network error";
          }
        });
    });
  }
});
