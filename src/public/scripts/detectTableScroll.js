const table = document.getElementById("scrolling-table");

function setScrolling() {
  if (table.scrollWidth > table.clientWidth) {
    table.classList.add("scrolling");
  } else {
    table.classList.remove("scrolling");
  }
}

setScrolling();

window.addEventListener("resize", setScrolling);
