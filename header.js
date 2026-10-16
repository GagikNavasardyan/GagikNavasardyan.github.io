/* Auto-hiding header, phone and tablet widths only.

   Scrolling down fades the header out so it stops covering the text. It comes
   back only on a quick upward flick: a slow upward scroll is usually re-reading
   a line, not reaching for the menu, so the header stays out of the way. Near
   the top of the page, with the menu open, or on wide screens it always shows. */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (!header) return;

  // Same breakpoint as the collapsed nav in styles.css.
  var narrow = window.matchMedia("(max-width: 939px)");
  // Upward speed, in px per ms, that counts as a flick (~800 px/s).
  var SHOW_SPEED = 0.8;

  var lastY = window.scrollY;
  var lastT = performance.now();
  var speed = 0;
  var hidden = false;
  var ticking = false;

  function setHidden(value) {
    if (value === hidden) return;
    hidden = value;
    header.classList.toggle("is-hidden", value);
  }

  function update() {
    ticking = false;
    var y = window.scrollY;
    var t = performance.now();
    var dy = y - lastY;
    var dt = Math.max(t - lastT, 1);
    lastY = y;
    lastT = t;

    var menuOpen = document.querySelector(".nav-menu.is-open");
    if (!narrow.matches || menuOpen || y <= header.offsetHeight) {
      speed = 0;
      setHidden(false);
      return;
    }

    if (dy > 0) {
      speed = 0;
      setHidden(true);
    } else if (dy < 0) {
      // iOS bounces at the bottom of the page; that is not a flick.
      var atBottom =
        y + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atBottom) return;
      // Smoothed over frames, so one jumpy frame does not count as a flick.
      speed = 0.5 * speed + 0.5 * (-dy / dt);
      if (speed > SHOW_SPEED) setHidden(false);
    }
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  // Keyboard users tabbing into the nav must be able to see it.
  header.addEventListener("focusin", function () {
    setHidden(false);
  });

  if (narrow.addEventListener) narrow.addEventListener("change", update);
})();
