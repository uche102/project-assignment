// results-client.js

// Setup results upload and render table
(function () {
  function setupResultsUpload() {
    const uploadInput = document.getElementById("resultsUpload");
    if (!uploadInput) return;

    uploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const results = JSON.parse(event.target.result);
          const existing = JSON.parse(
            localStorage.getItem("studentResults") || "[]"
          );
          localStorage.setItem(
            "studentResults",
            JSON.stringify([...existing, ...results])
          );
          alert("Results uploaded successfully!");
          renderUploadedResults();
        } catch (err) {
          alert("Error reading results file: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  function renderUploadedResults() {
    const container = document.getElementById("resultsTable");
    if (!container) return;

    const uploaded = JSON.parse(localStorage.getItem("studentResults") || "[]");
    if (!uploaded.length) {
      container.innerHTML = "<p>No results uploaded yet.</p>";
      return;
    }

    let html = `<table style="width:100%;border-collapse:collapse">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Grade</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>`;

    uploaded.forEach((r) => {
      html += `<tr>
                 <td>${r.student}</td>
                 <td>${r.courseCode}</td>
                 <td>${r.grade}</td>
                 <td>${r.unit || ""}</td>
               </tr>`;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupResultsUpload();
    renderUploadedResults();
  });
})();
