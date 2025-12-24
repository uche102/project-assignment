/* admin upload logic: parse CSV and POST to /api/results (requires JWT token) */
const uploadBtn = document.getElementById("uploadResultsBtn");
const fileInput = document.getElementById("resultFile");
const status = document.getElementById("uploadStatus");

function setStatus(msg, ok) {
  if (!status) return;
  status.style.display = "block";
  status.innerText = msg;
  status.className = ok ? "success" : "error";
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(/,|;/).map((h) => h.trim().toLowerCase());
  const cols = header;
  const rows = lines.slice(1);
  const out = rows
    .map((line) => {
      const parts = line.split(/,|;/).map((p) => p.trim());
      const obj = {};
      cols.forEach((c, i) => {
        obj[c] = parts[i] || "";
      });
      // normalize fields
      return {
        student:
          obj.student ||
          obj.matric ||
          obj.id ||
          obj.registration ||
          obj.roll ||
          "",
        courseCode:
          obj.course || obj.code || obj.coursecode || obj.module || "",
        grade: obj.grade || obj.result || obj.score || "",
        unit: obj.unit
          ? Number(obj.unit)
          : obj.credit
          ? Number(obj.credit)
          : undefined,
      };
    })
    .filter((r) => r.student && r.courseCode && r.grade);
  return out;
}

uploadBtn.addEventListener("click", () => {
  const file = fileInput?.files?.[0];
  if (!file) return setStatus("No file selected", false);
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const results = parseCsv(text);
    

      // attempt to POST to server using JWT from localStorage
      const token = window.localStorage.getItem("token");
      if (!token) return setStatus("No auth token — please log in", false);
      const res = await fetch("http://localhost:4000/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ results }),
      });
      // Save document as data URL for results.html
      const fileReader = new FileReader();
      fileReader.onload = function (ev) {
        const docs = JSON.parse(
          window.localStorage.getItem("studentDocuments") || "[]"
        );
        docs.push({ name: file.name, url: ev.target.result });
        window.localStorage.setItem("studentDocuments", JSON.stringify(docs));
      };
      fileReader.readAsDataURL(file);
      if (res.ok) {
        setStatus("Results uploaded to server ✓", true);
      } else {
        // fallback: save locally
        const txt = await res.text().catch(() => null);
        window.localStorage.setItem("studentResults", JSON.stringify(results));
        setStatus("Server rejected upload — results saved locally", false);
      }
    } catch (err) {
      console.error(err);
      setStatus("Upload failed", false);
    }
  };
  reader.readAsText(file);
});

// Improve button accessibility and feedback
const adminLoginBtn = document.getElementById("adminLoginBtn");
adminLoginBtn?.addEventListener("click", () => {
  adminLoginBtn.classList.add("active");
  setTimeout(() => adminLoginBtn.classList.remove("active"), 300);
});

const uploadResultsBtn = document.getElementById("uploadResultsBtn");
uploadResultsBtn?.addEventListener("mousedown", () => {
  uploadResultsBtn.classList.add("active");
});
uploadResultsBtn?.addEventListener("mouseup", () => {
  setTimeout(() => uploadResultsBtn.classList.remove("active"), 200);
});

const fetchStudentsBtn = document.getElementById("fetchStudentsBtn");
fetchStudentsBtn?.addEventListener("mousedown", () => {
  fetchStudentsBtn.classList.add("active");
});
fetchStudentsBtn?.addEventListener("mouseup", () => {
  setTimeout(() => fetchStudentsBtn.classList.remove("active"), 200);
});

// Fetch random enrolled students for a course
fetchStudentsBtn?.addEventListener("click", () => {
  const courseCode = document.getElementById("courseInput").value.trim();
  // Generate a random list of students
  const students = [];
  const names = [
    "Ada Okafor",
    "Chinedu Eze",
    "Ngozi Nwosu",
    "John Uche",
    "Blessing Obi",
    "Emeka Okoro",
    "Ifeoma Nnamdi",
    "Samuel Ojo",
    "Grace Ibe",
    "Uzo Nwankwo",
    "Chika Obi",
    "Ikenna Nwafor",
    "Amaka Eze",
    "Kelechi Ude",
    "Funmi Ade",
    "Bola Ajayi",
    "Tunde Bakare",
    "Mary Umeh",
    "Paul Okeke",
    "Rita Nwodo",
  ];
  for (let i = 0; i < 10; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const matric = `UNN/CS/202${Math.floor(Math.random() * 6) + 20}/${
      1000 + i
    }`;
    students.push({ name, matric });
  }
  // Display the students below the button
  let html = `<h3>Enrolled Students for ${courseCode || "[Course]"}</h3><ul>`;
  students.forEach((s) => {
    html += `<li><strong>${s.name}</strong> — <span class='muted'>${s.matric}</span></li>`;
  });
  html += "</ul>";
  let container = document.getElementById("enrolledStudentsList");
  if (!container) {
    container = document.createElement("div");
    container.id = "enrolledStudentsList";
    fetchStudentsBtn.parentNode.appendChild(container);
  }
  container.innerHTML = html;
});
