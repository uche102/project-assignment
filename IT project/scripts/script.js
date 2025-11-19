function details() {
  const details = document.querySelector(".Dashboard");
  details.addEventListener("toggle", sidebar);
}

const menu = document.getElementById("menu");
const sidebar = document.getElementById("sidebar");

function toggleSidebar() {
  sidebar.classList.toggle("sidebar2");
}

const select = document.querySelectorAll(".lab");
for (i = 0; i > select.length; i++);

console.log(select);
