/* Animated jump from a "My post" pill on the world-model map to the post.
 *
 * Uses cross-document View Transitions: the clicked paper button morphs into
 * the post's title block while the rest of the page fades across. Only pill
 * clicks animate; every other navigation is left alone.
 *
 * Loaded without `defer` in <head>, because `pagereveal` must have a listener
 * before the new page's first render. Browsers without cross-document view
 * transitions (and pages opened straight from disk, where they cannot run) get
 * a short fade-out instead. Reduced-motion users get a plain navigation.
 */
(() => {
  const FLAG = 'post-hero-transition';
  const FADE = 'post-fade-transition';
  const NAME = 'post-hero';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const crossDoc = 'onpagereveal' in window && location.protocol !== 'file:';

  const flagged = () => {
    try { return sessionStorage.getItem(FLAG) === '1'; } catch (e) { return false; }
  };
  const setFlag = (on) => {
    try { on ? sessionStorage.setItem(FLAG, '1') : sessionStorage.removeItem(FLAG); } catch (e) {}
  };

  // Fallback arrival: if we got here through the fade-out, fade back in.
  // This script runs in <head>, so the page starts hidden before first paint.
  let fadeIn = false;
  try { fadeIn = sessionStorage.getItem(FADE) === '1'; sessionStorage.removeItem(FADE); } catch (e) {}
  if (fadeIn && !reduced) {
    const root = document.documentElement;
    root.classList.add('is-arriving');
    const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add('has-arrived');
      root.classList.remove('is-arriving');
    }));
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', reveal, { once: true });
    } else {
      reveal();
    }
  }

  // Leaving the map: only a pill click is allowed to animate.
  window.addEventListener('pageswap', (event) => {
    if (event.viewTransition && !flagged()) event.viewTransition.skipTransition();
  });

  // Arriving at the post: pair its title block with the clicked button.
  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return;
    if (!flagged()) { event.viewTransition.skipTransition(); return; }
    setFlag(false);
    const header = document.querySelector('.post-header');
    if (!header) return;
    header.style.viewTransitionName = NAME;
    event.viewTransition.finished.finally(() => { header.style.viewTransitionName = ''; });
  });

  document.addEventListener('click', (event) => {
    const pill = event.target.closest && event.target.closest('a.cfyb-post-mark');
    if (!pill || reduced) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    if (crossDoc) {
      setFlag(true);
      const head = pill.closest('.cfyb-paper-head');
      if (head) head.style.viewTransitionName = NAME;
      return; // the browser does the rest
    }

    // Fallback: fade the page out, go, and fade the post in on arrival.
    event.preventDefault();
    try { sessionStorage.setItem(FADE, '1'); } catch (e) {}
    document.documentElement.classList.add('is-leaving');
    setTimeout(() => { window.location.href = pill.href; }, 240);
  });

  // Coming back with the Back button: drop the fade-out state.
  window.addEventListener('pageshow', () => {
    document.documentElement.classList.remove('is-leaving');
    document.querySelectorAll('.cfyb-paper-head').forEach((h) => { h.style.viewTransitionName = ''; });
  });
})();
