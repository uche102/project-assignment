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

uploadBtn.addEventListener("click", async () => {
  const file = fileInput?.files?.[0];
  if (!file) return setStatus("No file selected", false);

  const token = window.localStorage.getItem("token");
  if (!token) return setStatus("No auth token — please log in", false);

  const formData = new FormData();
  formData.append("result", file); // MUST match multer.single("result")

  // optional metadata
  formData.append("session", "2024/2025");
  formData.append("course_code", "CSC101");

  try {
    const res = await fetch("http://localhost:4000/api/results/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, // DO NOT set Content-Type
      },
      body: formData,
    });

    if (res.ok) {
      setStatus("Result file uploaded successfully ✓", true);
    } else {
      const err = await res.text();
      setStatus("Upload failed: " + err, false);
    }
  } catch (err) {
    console.error(err);
    setStatus("Upload failed", false);
  }
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
