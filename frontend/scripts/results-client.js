

window.renderResults = async function () {
  console.log("Rendering Results...");

  // Local Config
  const API_BASE = "http://localhost:4000";

  const tableBody = document.getElementById("resultsTableBody");

  if (!tableBody) return;

  //  Get Token
  let token = localStorage.getItem("token");
  if (!token) {
    tableBody.innerHTML = '<tr><td colspan="4">Please log in.</td></tr>';
    return;
  }
  token = token.replace(/['"]+/g, "").trim();

  //  Decode User
  let studentID = "";
  try {
    const user = JSON.parse(atob(token.split(".")[1]));
    studentID = user.reg_no || user.username;
  } catch (e) {
    console.error("Token decode failed", e);
    return;
  }

  try {
    //  FETCH DATA
    const res = await fetch(
      `${API_BASE}/api/results/${encodeURIComponent(studentID)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    let myResults = data.results || [];

    if (myResults.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center; padding: 20px;">No results found.</td></tr>';
    } else {
      //  SORT LOGIC (A -> F)
      myResults.sort((a, b) => {
        const gradeA = (a.grade || "F").trim().toUpperCase();
        const gradeB = (b.grade || "F").trim().toUpperCase();
        return gradeA.localeCompare(gradeB);
      });

      // RENDER WITH REMARKS
      tableBody.innerHTML = myResults
        .map((r) => {
          const grade = (r.grade || "F").trim().toUpperCase();

          //  REMARK AND COLOR LOGIC ---
          let remark = "Unknown";
          let color = "#333"; 

          switch (grade) {
            case "A":
              remark = "Excellent";
              color = "green"; 
              break;
            case "B":
              remark = "Very Good";
              color = "blue"; 
              break;
            case "C":
              remark = "Good";
              color = "#4f46e5"; 
              break;
            case "D":
              remark = "Fair";
              color = "#ca8a04"; 
              break;
            case "E":
              remark = "Pass";
              color = "orange"; 
              break;
            case "F":
              remark = "Fail";
              color = "red"; 
              break;
            default:
              remark = "Pending";
              color = "gray"; 
          }
          // ----------------------------

          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px; font-family: monospace;">${r.course_code}</td>
              <td style="padding: 12px;">${r.unit || "-"}</td>
              <td style="padding: 12px; font-weight: bold;">${grade}</td>
              <td style="padding: 12px; font-weight: bold; color: ${color};">
                ${remark}
              </td>
            </tr>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error("Result Fetch Error:", err);
    tableBody.innerHTML =
      '<tr><td colspan="4" style="color:red; text-align:center;">Error loading results.</td></tr>';
  }
};

// Runs immediately if table exists
if (document.getElementById("resultsTableBody")) {
  window.renderResults();
}
