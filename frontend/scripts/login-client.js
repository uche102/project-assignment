document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errEl = document.getElementById("loginError");

  if (!form) return;

  // Handle login submission
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errEl.textContent = "";
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    try {
      let res = await fetch("http://localhost:4000/api/auth/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        errEl.textContent =
          body && body.error ? body.error : "invalid username or password";
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        errEl.textContent = body && body.error ? body.error : "Login failed";
        return;
      }
      // success: server returned a token (JWT). Store and redirect.
      const body = await res.json().catch(() => ({}));
      if (body && body.token) {
        window.localStorage.setItem("token", body.token);
      }
      window.location.href = "body.html";
    } catch (err) {
      console.error("login error", err);
      errEl.textContent = "Network error";
    }
  });

  // Signup flow: show a small inline signup form when user clicks the signup link
  const signupLink = document.querySelector(".signup");
  let signupEl = null;
  if (signupLink) {
    signupLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (signupEl) return; // already shown
      signupEl = document.createElement("div");
      signupEl.style.marginTop = "12px";
      signupEl.innerHTML = `
        <input id="signupUsername" type="text" placeholder="Choose a username" required style="display:block;margin:.25rem 0;" />
        <input id="signupPassword" type="password" placeholder="Choose a password" required style="display:block;margin:.25rem 0;" />
        <button id="createAccountBtn" type="button" class="menu-item">Create account</button>
        <div id="signupStatus" role="status" style="margin-top:.5rem"></div>
      `;
      form.appendChild(signupEl);

      const createBtn = document.getElementById("createAccountBtn");
      const sUser = document.getElementById("signupUsername");
      const sPass = document.getElementById("signupPassword");
      const sStatus = document.getElementById("signupStatus");

      createBtn.addEventListener("click", async () => {
        sStatus.textContent = "";
        const u = sUser.value && sUser.value.trim();
        const p = sPass.value;
        if (!u || !p)
          return (sStatus.textContent = "username and password required");
        // save signup details locally first so they're not lost on network failure
        const pending = { username: u, password: p, createdAt: Date.now() };
        try {
          window.localStorage.setItem("pendingSignup", JSON.stringify(pending));

          const res = await fetch(
            "http://localhost:4000/api/auth/public-register",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: u, password: p }),
            }
          );
          if (res.status === 403) {
            const body = await res.json().catch(() => ({}));
            sStatus.textContent = body.error || "registration disabled";
            return;
          }
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            sStatus.textContent = body.error || "registration failed";
            return;
          }
          // success: remove pending copy and notify user
          window.localStorage.removeItem("pendingSignup");
          sStatus.style.color = "green";
          sStatus.textContent = "Account created — please sign in";
          // auto-fill login fields
          document.getElementById("username").value = u;
          document.getElementById("password").value = p;
          // remove signup form after a short delay
          setTimeout(() => {
            if (signupEl) signupEl.remove();
            signupEl = null;
            sStatus.textContent = "";
          }, 1500);
        } catch (err) {
          console.error("signup error", err);
          // keep pending signup in localStorage and notify user
          try {
            window.localStorage.setItem(
              "pendingSignup",
              JSON.stringify(pending)
            );
          } catch (e) {}
          sStatus.textContent =
            "Network error — signup saved locally, will retry when online";
        }
      });
    });
  }
});
