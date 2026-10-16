/* Theme toggle.

   Loaded in <head> WITHOUT defer, on purpose: it has to set data-theme on
   <html> before the first paint, otherwise a dark-mode visitor gets a white
   flash on every navigation. Everything else here is cheap enough that the
   blocking cost is a fraction of a millisecond.

   Order of preference: an explicit choice the visitor made > the OS setting.
   Nothing is stored until the button is actually clicked, so following the OS
   remains the default and keeps working if it changes later. */
(function () {
  "use strict";

  var KEY = "theme";
  var root = document.documentElement;
  var media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch (e) {
      return null; // private browsing, or storage disabled
    }
  }

  function preferred() {
    return media && media.matches ? "dark" : "light";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0E1512" : "#FFFFFF");

    var dark = theme === "dark";
    var buttons = document.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", dark ? "true" : "false");
      buttons[i].setAttribute(
        "aria-label",
        dark ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  }

  // Runs immediately, before <body> exists. The button sync above is a no-op
  // at this point and is repeated once the DOM is ready.
  apply(stored() || preferred());

  // Delegated, so it works for buttons that do not exist yet.
  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest(".theme-toggle");
    if (!button) return;

    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {
      /* choice just will not persist */
    }
    apply(next);
  });

  // Follow the OS if the visitor has never expressed a preference here.
  if (media && media.addEventListener) {
    media.addEventListener("change", function () {
      if (!stored()) apply(preferred());
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(root.getAttribute("data-theme") || preferred());
  });
})();
