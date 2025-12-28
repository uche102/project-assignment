// result-client.js
// Fetch and display results from the backend

(async function () {
  // Fetch results for a given student from backend
  async function fetchStudentResults(studentId) {
    try {
      const res = await fetch(`/api/results/${studentId}`);

      if (!res.ok) throw new Error("Failed to fetch results");
      const data = await res.json();
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  // Render results into the table
  async function renderResults() {
    const container = document.getElementById("resultsTable");
    if (!container) return;

    const studentId = "12345"; // Replace with real student ID from login/session
    const results = await fetchStudentResults(studentId);

    if (!results.length) {
      container.innerHTML = "<p>No results available.</p>";
      return;
    }

    let html = `<table style="width:100%;border-collapse:collapse">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Grade</th>
                      <th>Unit</th>
                      <th>File</th>
                    </tr>
                  </thead>
                  <tbody>`;

    results.forEach((r) => {
      html += `<tr>
                 <td>${r.student}</td>
                 <td>${r.course_code}</td>
                 <td>${r.grade}</td>
                 <td>${r.unit || ""}</td>
          <td>${r.student_id}</td>


               </tr>`;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  // Initialize on page load
  document.addEventListener("DOMContentLoaded", () => {
    renderResults();
  });
})();
