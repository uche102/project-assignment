document.addEventListener("DOMContentLoaded", () => {
  // Global Function
  window.loadProfile = function () {
    console.log("Loading Profile Data...");

    //  Find the HTML Elements  created
    const nameHeader = document.getElementById("prof-name");
    const regHeader = document.getElementById("prof-reg");

    const fieldName = document.getElementById("field-name");
    const fieldReg = document.getElementById("field-reg");
    const fieldEmail = document.getElementById("field-email");

    // If elements are missing  stop.
    if (!nameHeader) return;

    //  Get User Data from Token
    let token = localStorage.getItem("token");
    if (!token) return;

    try {
      const cleanToken = token.replace(/['"]+/g, "").trim();
      const user = JSON.parse(atob(cleanToken.split(".")[1]));

      const username = (user.username || "Student").toUpperCase();
      const regNo = user.reg_no || "N/A";

      //  Fill in the HTML
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

  // Runs if prof-name elements exist
  if (document.getElementById("prof-name")) {
    window.loadProfile();
  }
});
