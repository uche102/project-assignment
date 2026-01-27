// 2. Decode User and Define Username/RegNo
let user = {};
let username = "";
let regNo = ""; // New variable for Reg Number

try {
  // Decode the JWT token payload
  user = JSON.parse(atob(token.split(".")[1]));

  // Get Username and RegNo from your JWT structure
  username = (user.username || user.name || "Student").toLowerCase();
  regNo = user.reg_no || "REG-NOT-FOUND"; // Fallback if reg_no isn't in token yet

  // Update the Dashboard Welcome Name
  if (nameDisplay) {
    nameDisplay.textContent = user.username || user.name || "Student";
  }

  // --- NEW: Update Reg Number Display ---
  const regDisplay = document.getElementById("displayRegNo");
  if (regDisplay) {
    regDisplay.textContent = `Reg No: ${regNo}`;
  }

  // Update the Topbar Name
  const topbarName = document.getElementById("topbarUsername");
  if (topbarName) {
    topbarName.textContent = (
      user.username ||
      user.name ||
      "Student"
    ).toUpperCase();
  }
} catch (e) {
  console.error("Token decoding failed:", e);
  return;
}
