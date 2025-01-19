const themeToggle = document.getElementById("theme-toggle");
const currentTheme = () => html.dataset["theme"];

function changeToggleText() {
  if (currentTheme() === "light") {
    themeToggle.innerText = "Lights off";
  } else if (currentTheme() === "dark") {
    themeToggle.innerText = "Lights on";
  }
}

changeToggleText();

themeToggle.addEventListener("click", () => {
  const prevTheme = currentTheme();
  html.dataset["theme"] = prevTheme === "light" ? "dark" : "light";
  changeToggleText();
  localStorage.setItem(
    "theme-preference",
    prevTheme === "light" ? "dark" : "light"
  );
});
