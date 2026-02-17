//   window  bypasses module scoping
window.generateCalendarPDF = function () {
  console.log("PDF Generation Triggered...");
  const element = document.getElementById("academic-calendar");

  if (!element) {
    alert("Please navigate to the Academic Calendar page first.");
    return;
  }

  const style = document.createElement("style");
  style.innerHTML = `
    @media print {
      body * { visibility: hidden !important; }
      #academic-calendar, #academic-calendar * { 
        visibility: visible !important; 
      }
      #academic-calendar {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 20px;
        background: white !important;
      }
      #downloadCalendarBtn { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  window.print();

  style.remove();
};
