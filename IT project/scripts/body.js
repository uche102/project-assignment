 // ======= Payment Section ======= //
          document.getElementById("payNowBtn").addEventListener("click", () => {
            alert("Redirecting to payment portal...");
          });

          // ======= Quick Course Registration in Sidebar ======= //
          const registerBtn = document.getElementById("addToQueue");
          const courseBoxes = document.querySelectorAll(".course-list input[type='checkbox']");
          const registeredListQuick = document.getElementById("registeredCourses");

          registerBtn.addEventListener("click", () => {
            const selected = [...courseBoxes]
              .filter(c => c.checked)
              .map(c => c.value);

            localStorage.setItem("quickCourses", JSON.stringify(selected));
            showQuickCourses();
          });

          function showQuickCourses() {
            const saved = JSON.parse(localStorage.getItem("quickCourses")) || [];
            registeredListQuick.innerHTML = saved.length
              ? saved.map(c => `<li>${c}</li>`).join("")
              : "<li>No courses registered yet</li>";
          }

          showQuickCourses();

          // ======= Full Course Registration ======= //
          const semesterSelect = document.getElementById("semesterSelect");
          const availableCourses = document.querySelectorAll(".available-courses input[type='checkbox']");
          const addExtraBtn = document.getElementById("addExtraCourse");
          const extraCode = document.getElementById("extraCourseCode");
          const extraTitle = document.getElementById("extraCourseTitle");
          const submitCourses = document.getElementById("submitCourses");
          const registeredList = document.getElementById("registeredList");
          const unitCount = document.getElementById("unitCount");

          let customCourses = []; // manually added or borrowed

          addExtraBtn.addEventListener("click", () => {
            const code = extraCode.value.trim().toUpperCase();
            const title = extraTitle.value.trim();
            if (code && title) {
              customCourses.push({ code, title });
              alert(`${code} added successfully!`);
              extraCode.value = "";
              extraTitle.value = "";
            } else {
              alert("Please fill in both course code and title.");
            }
          });

          submitCourses.addEventListener("click", () => {
            const selected = [...availableCourses]
              .filter(c => c.checked)
              .map(c => ({ code: c.value, title: c.nextSibling.textContent.trim() }));

            const allCourses = [...selected, ...customCourses];
            localStorage.setItem("registeredCourses", JSON.stringify(allCourses));
            renderCourseList();
          });

          function renderCourseList() {
            const saved = JSON.parse(localStorage.getItem("registeredCourses")) || [];
            registeredList.innerHTML = "";
            saved.forEach(c => {
              const li = document.createElement("li");
              li.textContent = `${c.code} - ${c.title}`;
              registeredList.appendChild(li);
            });
            unitCount.textContent = `Total Units: ${saved.length * 3}`;
          }

          renderCourseList();
// ======= GPA Calculator ======= //
const calcGPA = document.getElementById("calcGPA");
const gpaResult = document.getElementById("gpaResult");

calcGPA.addEventListener("click", () => {
  const rows = document.querySelectorAll(".results tbody tr");
  let totalPoints = 0;
  let totalCourses = 0;

  rows.forEach(row => {
    const grade = row.cells[2].innerText.trim().toUpperCase();
    const point = gradeToPoint(grade);
    if (point !== null) {
      totalPoints += point;
      totalCourses++;
    }
  });

  if (totalCourses === 0) {
    gpaResult.textContent = "No results found.";
    gpaResult.style.color = "#333";
    return;
  }

  const gpa = (totalPoints / totalCourses).toFixed(2);
  const classification = classifyGPA(gpa);

  // Apply color + warning system
  if (gpa < 2.5) {
    gpaResult.innerHTML = ` GPA: <strong>${gpa}</strong> — ${classification}.<br><em>Please see your academic advisor.</em>`;
    gpaResult.style.color = "#d9534f"; // red
  } else {
    gpaResult.innerHTML = ` GPA: <strong>${gpa}</strong> — ${classification}`;
    gpaResult.style.color = "#28a745"; // green
  }

  localStorage.setItem("studentGPA", gpa);
});

function gradeToPoint(grade) {
  switch (grade) {
    case "A": return 5;
    case "A-": return 4.5;
    case "B+": return 4;
    case "B": return 3.5;
    case "C": return 3;
    case "D": return 2;
    case "E": return 1;
    case "F": return 0;
    default: return null;
  }
}

function classifyGPA(gpa) {
  gpa = parseFloat(gpa);
  if (gpa >= 4.5) return "First Class";
  if (gpa >= 3.5) return "Second Class Upper";
  if (gpa >= 2.5) return "Second Class Lower";
  if (gpa >= 1.5) return "Third Class";
  return "Pass";
}
details();

menu.addEventListener("click", toggleSidebar);

for (let i = 0; i < select.length; i++) {
  console.log(select[i]);
}   
