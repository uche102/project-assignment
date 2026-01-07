document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("resultFile");
  const uploadBtn = document.getElementById("uploadResultsBtn");
  const statusDiv = document.getElementById("uploadStatus");
  const API_BASE = "http://localhost:4000";

  if (!uploadBtn) return;

  uploadBtn.addEventListener("click", () => {
    // 1. Check if file is selected
    if (!fileInput.files.length) {
      alert("Please select a CSV file first.");
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    // 2. Get Admin Token (Assumes you logged in via admin-auth.js)
    let token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to upload results.");
      return;
    }
    // Clean token
    token = token.replace(/['"]+/g, "").trim();

    // 3. UI Updates
    uploadBtn.textContent = "Uploading...";
    uploadBtn.disabled = true;
    statusDiv.style.display = "block";
    statusDiv.textContent = "Processing CSV file...";
    statusDiv.className = ""; // Reset classes

    reader.onload = async function (e) {
      const text = e.target.result;
      // Split by newline and remove empty rows
      const rows = text
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r);

      let successCount = 0;
      let failCount = 0;

      // 4. Loop through rows
      // We skip the first row if it looks like a header (starts with "student" or "username")
      const startIdx =
        rows[0].toLowerCase().startsWith("student") ||
        rows[0].toLowerCase().startsWith("username")
          ? 1
          : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i].split(",");

        // Validate row length (must have at least student, code, grade)
        if (cols.length < 3) continue;

        const resultData = {
          student: cols[0].trim(), // Column 1: Student Username
          course_code: cols[1].trim(), // Column 2: Course Code
          grade: cols[2].trim(), // Column 3: Grade
          unit: cols[3] ? parseInt(cols[3].trim()) : 3, // Column 4: Unit (Default 3)
        };

        try {
          const res = await fetch(`${API_BASE}/api/results`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(resultData),
          });

          if (res.ok) successCount++;
          else failCount++;
        } catch (err) {
          console.error("Row Error:", err);
          failCount++;
        }

        // Optional: Update status live
        statusDiv.textContent = `Uploading... Success: ${successCount} | Fail: ${failCount}`;
      }

      // 5. Final Status
      uploadBtn.textContent = "Upload Results";
      uploadBtn.disabled = false;

      const finalMsg = `Done! Success: ${successCount}, Failed: ${failCount}`;
      statusDiv.textContent = finalMsg;

      // Visual feedback
      if (successCount > 0) {
        statusDiv.style.color = "green";
        alert(finalMsg);
      } else {
        statusDiv.style.color = "red";
      }
    };

    reader.readAsText(file);
  });
});
