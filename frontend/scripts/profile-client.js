document.addEventListener("DOMContentLoaded", () => {
  // Define Global Function
  window.loadProfile = function () {
    console.log("Loading Profile Data...");

    // 1. Find the HTML Elements we just created
    const nameHeader = document.getElementById("prof-name");
    const regHeader = document.getElementById("prof-reg");

    const fieldName = document.getElementById("field-name");
    const fieldReg = document.getElementById("field-reg");
    const fieldEmail = document.getElementById("field-email");

    // If elements are missing (e.g. we are on a different tab), stop.
    if (!nameHeader) return;

    // 2. Get User Data from Token
    let token = localStorage.getItem("token");
    if (!token) return;

    try {
      const cleanToken = token.replace(/['"]+/g, "").trim();
      const user = JSON.parse(atob(cleanToken.split(".")[1]));

      const username = (user.username || "Student").toUpperCase();
      const regNo = user.reg_no || "N/A";

      // 3. Fill in the HTML
      nameHeader.textContent = username;
      regHeader.textContent = `Reg No: ${regNo}`;

      if (fieldName) fieldName.textContent = username;
      if (fieldReg) fieldReg.textContent = regNo;
      if (fieldEmail)
        fieldEmail.textContent = `${username.toLowerCase().replace(/\s/g, "")}@unn.edu.ng`;

      console.log("Profile Updated Successfully");
    } catch (e) {
      console.error("Profile Data Error:", e);
    }
  };

  // Run immediately if the elements exist
  if (document.getElementById("prof-name")) {
    window.loadProfile();
  }
});
