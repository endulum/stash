const html = document.querySelector("html");
const themePreference = localStorage.getItem("theme-preference");

if (themePreference) {
  // first, is there a saved theme preference?
  html.dataset["theme"] = themePreference;
} else if (window.matchMedia) {
  // second, does the browser prefer a theme?
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    html.dataset["theme"] = "dark";
  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    html.dataset["theme"] = "light";
  }
} else {
  html.dataset["theme"] = "dark";
}
