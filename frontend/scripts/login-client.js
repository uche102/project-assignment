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

    // Ensure the username is available for the dashboard
    window.state = window.state || {};
    window.state.user = {
      id: payload.id,
      username: payload.username || payload.name || "Student",
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

    // CHANGE: Get the value from the input (even if the ID is still 'username')
    const reg_no = document.getElementById("username")?.value.trim();
    const password = document.getElementById("password")?.value;

    try {
      const res = await fetch(`${API_BASE}/api/auth/user-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // CHANGE: Send reg_no
        body: JSON.stringify({ reg_no, password }),
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

      //  Hides login elements to make space
      const loginElements = form.querySelectorAll(
        "h1, .sub, #username, #password, #toggle, #signInBtn, .forgot-link, .small, .admin-btn",
      );
      loginElements.forEach((el) => (el.style.display = "none"));

      // Create the Signup Container
      signupEl = document.createElement("div");
      signupEl.className = "signup-container";
      signupEl.innerHTML = `
        <h1 style="margin-bottom: 5px;">Create Account</h1>
        <p class="sub" style="margin-bottom: 20px;">Enter your details</p>
        
        <input id="signupUsername" placeholder="Choose Username" class="input-field" style="margin-bottom: 10px; width: 100%;" />
        <input id="signupRegNo" placeholder="Registration Number (e.g. 2021/123456)" class="input-field" style="margin-bottom: 10px; width: 100%;" />
        <input id="signupPassword" type="password" placeholder="Choose Password" class="input-field" style="margin-bottom: 10px; width: 100%;" />
        
        <button id="createAccountBtn" type="button" class="menu-item" style="width: 100%; margin-top: 10px;">Create Account</button>
        <button id="cancelSignup" type="button" style="background:none; border:none; color:#007bff; cursor:pointer; margin-top:15px; width:100%;">Back to Login</button>
        
        <div id="signupStatus" style="margin-top: 10px; font-size: 0.9rem;"></div>
      `;

      form.appendChild(signupEl);

      //  Cancel/Back Button Logic ---
      signupEl.querySelector("#cancelSignup").addEventListener("click", () => {
        signupEl.remove();
        signupEl = null;
        loginElements.forEach((el) => (el.style.display = "")); // Show login again
      });

      const status = signupEl.querySelector("#signupStatus");

      signupEl
        .querySelector("#createAccountBtn")
        .addEventListener("click", async () => {
          const u = signupEl.querySelector("#signupUsername").value.trim();
          const r = signupEl.querySelector("#signupRegNo").value.trim();
          const p = signupEl.querySelector("#signupPassword").value;

          if (!u || !p || !r) {
            status.textContent = "All fields are required";
            status.style.color = "red";
            return;
          }

          try {
            const res = await fetch(`${API_BASE}/api/auth/public-register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: u, password: p, reg_no: r }),
            });

            const data = await res.json();

            if (!res.ok) {
              status.textContent = data?.error || "Registration failed";
              status.style.color = "red";
              return;
            }

            status.style.color = "green";
            status.textContent = "Success! Returning to login...";

            // Auto fills login and return
            setTimeout(() => {
              document.getElementById("username").value = u;
              document.getElementById("password").value = p;
              signupEl.remove();
              signupEl = null;
              loginElements.forEach((el) => (el.style.display = ""));
            }, 2000);
          } catch (err) {
            console.error("Signup error:", err);
            status.textContent = "Network error";
          }
        });
    });
  }
});
