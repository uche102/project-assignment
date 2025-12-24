/* ======================================
   Body.js - Refactored frontend logic
   ====================================== */

window.state = {
  courses: [
    { code: "COS401", title: "Advanced Algorithms", credits: 3, level: 400 },
    { code: "COS402", title: "Compiler Design", credits: 3, level: 400 },
    { code: "MTH211", title: "Calculus II", credits: 3, level: 200 },
    { code: "ENG101", title: "Intro to Engineering", credits: 2, level: 100 },
    { code: "PHY361", title: "Quantum Mechanics", credits: 4, level: 300 },
    { code: "ENG102", title: "Technical Writing", credits: 2, level: 100 },
  ],
  registered: [
    { code: "COS401", title: "Advanced Algorithms", credits: 3 },
    { code: "ENG102", title: "Technical Writing", credits: 2 },
  ],
  announcements: [
    { id: 1, text: "Registration for semester closes 20th Dec." },
    { id: 2, text: "Results for 1st semester released soon." },
  ],
  tasks: [
    { id: 1, title: "CSC401 Assignment 1", due: "2025-12-01" },
    { id: 2, title: "Group presentation (ENG102)", due: "2025-12-07" },
    { id: 3, title: "Math Club Meeting", due: "2025-11-30" },
  ],
  borrowQueue: [],
  feesPaid: 329800,
  semResults: [
    { semester: "2019/2020 Sem1", cgpa: 3.01, gpa: 3.2 },
    { semester: "2019/2020 Sem2", cgpa: 3.1, gpa: 3.18 },
    { semester: "2020/2021 Sem1", cgpa: 3.2, gpa: 3.22 },
  ],
  profile: {
    name: "NWAKOR U.",
    matric: "UNN/CS/2020/1234",
    dept: "Computer Science",
    level: "400",
    phone: "+2348100000000",
    email: "unn@domain.com",
    address: "Nsukka, Enugu State",
  },
};

/* ======================================
   Dashboard Rendering
   ====================================== */
function renderDashboard() {
  const coursesCountEl = document.getElementById("coursesCount");
  const resultsCountEl = document.getElementById("resultsCount");
  const feesPaidEl = document.getElementById("feesPaid");
  const cgpaCardEl = document.getElementById("cgpaCard");
  const last = window.state.semResults[window.state.semResults.length - 1];

  if (coursesCountEl)
    coursesCountEl.innerText = `${state.registered.length} courses`;
  if (resultsCountEl)
    resultsCountEl.innerText = `${state.semResults.length} results`;
  if (feesPaidEl)
    feesPaidEl.innerText = `${state.feesPaid.toLocaleString()} NGN`;
  if (cgpaCardEl) cgpaCardEl.innerText = last ? last.cgpa.toFixed(2) : "0.00";

  const ann = document.getElementById("announcements");
  if (ann) {
    ann.innerHTML = "";
    state.announcements.forEach((a) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<div>${a.text}</div>`;
      ann.appendChild(div);
    });
  }

  const up = document.getElementById("upcoming");
  if (up) {
    up.innerHTML = "";
    const sortedTasks = state.tasks
      .slice()
      .sort((a, b) => new Date(a.due) - new Date(b.due));
    sortedTasks.slice(0, 5).forEach((t) => {
      const li = document.createElement("li");
      li.innerText = `${t.title} — due ${t.due}`;
      up.appendChild(li);
    });
  }
}

/* ======================================
   GPA / CGPA Calculator
   ====================================== */
document.addEventListener("partials:loaded", () => {
  const btn = document.getElementById("calcGpaBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const curCGPA =
      parseFloat(document.getElementById("currentCgpa").value) || 0;
    const compCredits =
      parseFloat(document.getElementById("completedCredits").value) || 0;
    const nextCredits =
      parseFloat(document.getElementById("nextCredits").value) || 0;
    const expected =
      parseFloat(document.getElementById("expectedGPA").value) || 0;

    const totalQuality = curCGPA * compCredits + expected * nextCredits;
    const totalCredits = compCredits + nextCredits;
    const newCgpa = totalCredits > 0 ? totalQuality / totalCredits : 0;

    const resultEl = document.getElementById("gpaResult");
    resultEl.innerHTML = `Projected CGPA: <strong>${newCgpa.toFixed(
      2
    )}</strong>`;

    if (newCgpa < 2.5) {
      resultEl.innerHTML += ` <span style="color:#b91c1c"> — Warning: below minimum threshold</span>`;
    } else if (newCgpa < 3.0) {
      resultEl.innerHTML += ` <span style="color:#d97706"> — At risk of lower class</span>`;
    } else {
      resultEl.innerHTML += ` <span style="color:#16a34a"> — Good standing</span>`;
    }
  });
});

/* ======================================
   Courses & Registration
   ====================================== */
function renderCoursesList(filter) {
  const container = document.getElementById("courses-list");
  if (!container) return;
  container.innerHTML = "";

  const list = state.courses.filter((c) => {
    if (!filter) return true;
    if (filter.search && filter.search.length > 0) {
      const q = filter.search.toLowerCase();
      return (
        c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
      );
    }
    if (filter.level && filter.level !== "all")
      return String(c.level) === String(filter.level);
    return true;
  });

  if (list.length === 0) {
    container.innerHTML = '<div class="muted">No courses found.</div>';
    return;
  }

  list.forEach((c) => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<div><strong>${c.code}</strong> — ${c.title} <div class="muted">(${c.credits} CU)</div></div>
                     <div><button class="btn small" data-code="${c.code}">Add</button></div>`;
    container.appendChild(row);
  });

  // bind add buttons
  container.querySelectorAll("button[data-code]").forEach((b) => {
    b.addEventListener("click", () => addCourseByCode(b.dataset.code));
  });
}

function renderRegisteredList() {
  const container = document.getElementById("registeredList");
  if (!container) return;
  container.innerHTML = "";

  if (state.registered.length === 0) {
    container.innerHTML = '<div class="muted">No registered courses.</div>';
    return;
  }

  state.registered.forEach((c) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div><strong>${c.code}</strong> — ${c.title} <small class="muted">(${c.credits} CU)</small></div>
                    <div><button class="btn" data-drop="${c.code}">Drop</button></div>`;
    container.appendChild(el);
  });

  container.querySelectorAll("button[data-drop]").forEach((b) => {
    b.addEventListener("click", () => {
      const code = b.dataset.drop;
      state.registered = state.registered.filter((r) => r.code !== code);
      renderRegisteredList();
      renderDashboard();
    });
  });
}

function addCourseByCode(code) {
  if (state.registered.some((r) => r.code === code))
    return alert("Course already registered");
  const c = state.courses.find((x) => x.code === code);
  if (!c) return alert("Course not found");

  state.registered.push({ code: c.code, title: c.title, credits: c.credits });
  renderRegisteredList();
  renderDashboard();
}

/* ======================================
   Borrow Queue
   ====================================== */
function renderBorrowQueue() {
  const q = document.getElementById("borrowQueue");
  if (!q) return;
  q.innerHTML = "";

  if (state.borrowQueue.length === 0) {
    q.innerHTML = '<div class="muted">No pending requests</div>';
    return;
  }

  state.borrowQueue.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div><strong>${item.code}</strong> — ${item.reason}</div>
                    <div><button class="btn" data-id="${item.id}">Cancel</button></div>`;
    q.appendChild(li);
  });

  q.querySelectorAll("button[data-id]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = +b.dataset.id;
      state.borrowQueue = state.borrowQueue.filter((i) => i.id !== id);
      renderBorrowQueue();
    });
  });
}

/* ======================================
   Tasks
   ====================================== */
function renderTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;
  list.innerHTML = "";

  if (state.tasks.length === 0) {
    list.innerHTML = '<div class="muted">No tasks</div>';
    return;
  }

  state.tasks
    .slice()
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .forEach((t) => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `<div>${t.title} — <small class="muted">due ${t.due}</small></div>
                      <div><button class="btn small" data-remove="${t.id}">Done</button></div>`;
      list.appendChild(li);
    });

  list.querySelectorAll("button[data-remove]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = +b.dataset.remove;
      state.tasks = state.tasks.filter((tt) => tt.id !== id);
      renderTasks();
      renderDashboard();
    });
  });
}

/* ======================================
   Results
   ====================================== */
function renderResults() {
  const container = document.getElementById("resultsTable");
  if (!container) return;

  container.innerHTML =
    '<table style="width:100%;border-collapse:collapse"><thead><tr><th>Semester</th><th>GPA</th><th>CGPA</th></tr></thead><tbody></tbody></table>';
  const tbody = container.querySelector("tbody");

  state.semResults.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="padding:8px;border-bottom:1px solid white">${r.semester}</td>
                    <td style="padding:8px;border-bottom:1px solid white">${r.gpa}</td>
                    <td style="padding:8px;border-bottom:1px solid white">${r.cgpa}</td>`;
    tbody.appendChild(tr);
  });
}

/* ======================================
   Profile
   ====================================== */
function renderProfile() {
  document.getElementById("profileName").innerText = state.profile.name;
  document.getElementById(
    "profileMatric"
  ).innerText = `Matric: ${state.profile.matric}`;
  document.getElementById(
    "profileDept"
  ).innerText = `Dept: ${state.profile.dept}`;
  document.getElementById(
    "profileLevel"
  ).innerText = `Level: ${state.profile.level}`;
  document.getElementById("profilePhone").value = state.profile.phone;
  document.getElementById("profileEmail").value = state.profile.email;
  document.getElementById("profileAddress").value = state.profile.address;
}

/* ======================================
   Initial Render
   ====================================== */
document.addEventListener("partials:loaded", () => {
  renderDashboard();
  renderCoursesList();
  renderRegisteredList();
  renderBorrowQueue();
  renderTasks();
  renderResults();
  renderProfile();
});
