document.addEventListener("DOMContentLoaded", () => {
  async function renderResults() {
    const tableBody = document.getElementById("resultsTableBody");
    if (!tableBody || tableBody.dataset.loaded === "true") return;

    // 1. Get Token
    let token = localStorage.getItem("token");
    if (!token) {
      tableBody.innerHTML = '<tr><td colspan="4">Please log in.</td></tr>';
      return;
    }
    token = token.replace(/['"]+/g, "").trim();

    // 2. Decode User to get username
    let user = {};
    try {
      user = JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
      return;
    }

    try {
      // 3. FETCH FROM DATABASE (The Official Source)
      const res = await fetch(`${API_BASE}/api/results/${user.username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const myResults = data.results || [];

      if (myResults.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;">No results found in Database.</td></tr>';
      } else {
        tableBody.innerHTML = myResults
          .map(
            (r) => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${r.course_code}</td>
            <td style="padding: 10px;">${r.unit || "-"}</td>
            <td style="padding: 10px; font-weight: bold;">${r.grade}</td>
            <td style="padding: 10px; color: ${
              r.grade === "F" ? "red" : "green"
            }; font-weight:bold;">
              ${r.grade === "F" ? "Fail" : "Pass"}
            </td>
          </tr>
        `,
          )
          .join("");
      }
    } catch (err) {
      console.error("Result Fetch Error:", err);
      tableBody.innerHTML =
        '<tr><td colspan="4">Error loading results from server.</td></tr>';
    }

    tableBody.dataset.loaded = "true";
  }

  renderResults();

  // Watch for page navigation
  const observer = new MutationObserver(() => {
    if (document.getElementById("resultsTableBody")) renderResults();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
