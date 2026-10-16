(() => {
  'use strict';

  document.documentElement.classList.add('js');

  /* Over file:// a trailing-slash link opens a directory listing, so point
     the Writing link at the actual file when previewing locally. */
  if (location.protocol === 'file:') {
    for (const link of document.querySelectorAll('a[href$="/"]')) {
      const href = link.getAttribute('href');
      if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
        link.setAttribute('href', href + 'index.html');
      }
    }
  }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ Scroll reveal ============ */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ============ Nav highlighting ============ */
  const navLinks = new Map(
    [...document.querySelectorAll('.nav-menu a[href^="#"]')].map((a) => [a.hash.slice(1), a])
  );
  const sections = [...navLinks.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((link, linkId) => {
      const on = linkId === id;
      link.classList.toggle('active', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((section) => navObserver.observe(section));
  }

  /* ============ Mobile nav ============ */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');

  const closeMenu = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
      toggle.focus();
    }
  });

  /* ============ Cursor glow & card spotlight ============ */
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (finePointer && !reduceMotion) {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    document.documentElement.classList.add('has-glow');

    /* Experience art is masked to a circle around the glow's position */
    const arts = document.querySelectorAll('.exp-art');
    const revealArts = () => {
      for (const art of arts) {
        const r = art.getBoundingClientRect();
        art.style.setProperty('--ax', `${glowX - r.left}px`);
        art.style.setProperty('--ay', `${glowY - r.top}px`);
      }
    };

    let targetX = 0;
    let targetY = 0;
    let glowX = 0;
    let glowY = 0;
    let glowRaf = null;
    let glowSeen = false;

    const glowStep = () => {
      glowX += (targetX - glowX) * 0.12;
      glowY += (targetY - glowY) * 0.12;
      glow.style.transform = `translate(${glowX}px, ${glowY}px)`;
      revealArts();
      if (Math.abs(targetX - glowX) + Math.abs(targetY - glowY) > 0.5) {
        glowRaf = requestAnimationFrame(glowStep);
      } else {
        glowRaf = null;
      }
    };

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!glowSeen) {
        glowSeen = true;
        glowX = targetX;
        glowY = targetY;
        glow.style.transform = `translate(${glowX}px, ${glowY}px)`;
      }
      glow.style.opacity = '1';
      if (glowRaf === null) glowRaf = requestAnimationFrame(glowStep);
    });
    document.documentElement.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
      for (const art of arts) art.style.removeProperty('--ax');
    });
    /* Page scrolls under a still cursor; keep the masks lined up */
    if (arts.length) addEventListener('scroll', () => { if (glowSeen) revealArts(); }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      const card = e.target instanceof Element ? e.target.closest('.card') : null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--ry', `${(px * 5).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
    });
    document.addEventListener('mouseout', (e) => {
      const card = e.target instanceof Element ? e.target.closest('.card') : null;
      if (!card) return;
      const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest('.card') : null;
      if (to !== card) {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      }
    });
  }

  /* ============ Education flip cards (touch) ============ */
  /* Hover devices flip via CSS :hover; touch screens flip on tap. */
  if (matchMedia('(hover: none)').matches) {
    document.querySelectorAll('.flip-card').forEach((card) => {
      card.addEventListener('click', () => card.classList.toggle('is-flipped'));
    });
  }

  /* ============ Scroll progress & timeline draw ============ */
  const timeline = document.querySelector('.timeline');

  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - innerHeight;
    doc.style.setProperty('--scroll-progress', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : '0');

    if (timeline && !reduceMotion) {
      const rect = timeline.getBoundingClientRect();
      const passed = (innerHeight * 0.7 - rect.top) / rect.height;
      timeline.style.setProperty('--tl-progress', Math.max(0, Math.min(1, passed)).toFixed(4));
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ============ Stat counters ============ */
  const statEls = document.querySelectorAll('.teach-stat');
  if (statEls.length && !reduceMotion && 'IntersectionObserver' in window) {
    const animateCount = (el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const jobs = [];
      let node;
      while ((node = walker.nextNode())) {
        if (!/\d/.test(node.textContent)) continue;
        if (node.parentElement.closest('.stat-unit')) continue;
        jobs.push({ node, original: node.textContent });
      }
      const DURATION = 1100;
      let startTime = null;
      const frame = (now) => {
        if (startTime === null) startTime = now;
        const k = Math.min(1, (now - startTime) / DURATION);
        const eased = 1 - Math.pow(1 - k, 3);
        for (const job of jobs) {
          job.node.textContent = job.original.replace(/\d+(\.\d+)?/g, (m) => {
            const decimals = m.includes('.') ? m.split('.')[1].length : 0;
            return (parseFloat(m) * eased).toFixed(decimals);
          });
        }
        if (k < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    const statObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            statObserver.unobserve(entry.target);
            animateCount(entry.target);
          }
        }
      },
      { threshold: 0.6 }
    );
    statEls.forEach((el) => statObserver.observe(el));
  }

  /* ============ BibTeX copy ============ */
  /* Each publication carries its own BibTeX in a hidden <pre>, so adding a
     paper is a markup change rather than a change here. */
  for (const bibBtn of document.querySelectorAll('.bibtex-btn')) {
    const source = bibBtn.closest('.pub-card')?.querySelector('.bibtex-src');
    if (!source) continue;
    const BIBTEX = source.textContent.trim();

    let resetTimer = null;
    bibBtn.addEventListener('click', async () => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(BIBTEX);
        ok = true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = BIBTEX;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch {}
        ta.remove();
      }
      bibBtn.textContent = ok ? 'Copied ✓' : 'Copy failed';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { bibBtn.textContent = 'Copy BibTeX'; }, 2000);
    });
  }

  /* ============ Console greeting ============ */
  console.log(
    '%c$ whoami\n%cGagik Navasardyan · MSc AI student · ML researcher\n\n%cPoking under the hood? This site is hand-built vanilla HTML/CSS/JS, no frameworks.\n→ github.com/GagikNavasardyan · gagiknavasard@gmail.com',
    'color:#10855C;font-family:monospace;font-weight:bold',
    'color:#16211C;font-family:monospace',
    'color:#5C7268;font-family:monospace'
  );

  /* ============ About terminal typing ============ */
  const terminal = document.querySelector('[data-terminal]');
  if (terminal && !reduceMotion && 'IntersectionObserver' in window) {
    const typeJobs = [...terminal.querySelectorAll('.term-line')].map((line) => {
      let textNode = null;
      for (const n of line.childNodes) {
        if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) textNode = n;
      }
      return { line, textNode, full: textNode ? textNode.textContent : '' };
    });
    typeJobs.forEach((job) => job.line.classList.add('term-hidden'));

    const runLine = (i) => {
      if (i >= typeJobs.length) return;
      const job = typeJobs[i];
      job.line.classList.remove('term-hidden');
      // output lines print at once; command lines type character by character
      if (!job.textNode || job.line.classList.contains('term-out')) {
        setTimeout(() => runLine(i + 1), 240);
        return;
      }
      let pos = 0;
      job.textNode.textContent = '';
      const typeChar = () => {
        pos++;
        job.textNode.textContent = job.full.slice(0, pos);
        if (pos < job.full.length) setTimeout(typeChar, 40);
        else setTimeout(() => runLine(i + 1), 300);
      };
      typeChar();
    };

    const termObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          termObserver.disconnect();
          setTimeout(() => runLine(0), 400);
        }
      },
      { threshold: 0.4 }
    );
    termObserver.observe(terminal);
  }

  /* ============ Contact starfield ============ */
  const contactCanvas = document.querySelector('.contact-canvas');
  if (contactCanvas && !reduceMotion && 'IntersectionObserver' in window) {
    const cctx = contactCanvas.getContext('2d');
    const contact = contactCanvas.parentElement;
    let stars = [];
    let cw = 0;
    let ch = 0;
    let craf = null;
    let ctick = 0;

    const cresize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cw = contact.clientWidth;
      ch = contact.clientHeight;
      contactCanvas.width = cw * dpr;
      contactCanvas.height = ch * dpr;
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(70, Math.floor((cw * ch) / 16000));
      stars = Array.from({ length: target }, () => ({
        x: Math.random() * cw,
        y: Math.random() * ch,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const cstep = () => {
      ctick++;
      cctx.clearRect(0, 0, cw, ch);
      for (const s of stars) {
        s.x = (s.x + s.vx + cw) % cw;
        s.y = (s.y + s.vy + ch) % ch;
        const twinkle = 0.5 + 0.5 * Math.sin(ctick * 0.02 + s.phase);
        cctx.beginPath();
        cctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        cctx.fillStyle = `rgba(16, 133, 92, ${0.12 + 0.3 * twinkle})`;
        cctx.fill();
      }
      craf = requestAnimationFrame(cstep);
    };

    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (craf === null) craf = requestAnimationFrame(cstep);
      } else if (craf !== null) {
        cancelAnimationFrame(craf);
        craf = null;
      }
    }).observe(contact);

    addEventListener('resize', cresize);
    cresize();
  }

  /* ============ Hero lattice canvas ============ */
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  const RADIUS = 180;
  const MAX_PULL = 16;
  const mouse = { x: -1e4, y: -1e4 };

  if (finePointer) {
    hero.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    hero.addEventListener('mouseleave', () => {
      mouse.x = -1e4;
      mouse.y = -1e4;
    });
  }

  let ripples = [];
  hero.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    ripples.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: tick });
    if (ripples.length > 4) ripples.shift();
  });

  let points = [];
  let cols = 0;
  let rows = 0;
  let spacing = 56;
  let width = 0;
  let height = 0;
  let rafId = null;
  let heroVisible = true;
  let tick = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spacing = width < 768 ? 72 : 56;
    cols = Math.ceil(width / spacing) + 1;
    rows = Math.ceil(height / spacing) + 1;
    points = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        points.push({
          bx: c * spacing + (Math.random() - 0.5) * spacing * 0.5,
          by: r * spacing + (Math.random() - 0.5) * spacing * 0.5,
          phase: Math.random() * Math.PI * 2,
          ox: 0,
          oy: 0,
          x: 0,
          y: 0,
          near: 0,
          lit: 0,
        });
      }
    }
  };

  const RIPPLE_LIFE = 135;
  const RIPPLE_SPEED = 3.5;

  const step = () => {
    tick++;
    ripples = ripples.filter((rp) => tick - rp.t < RIPPLE_LIFE);
    ctx.clearRect(0, 0, width, height);

    for (const p of points) {
      const dx = mouse.x - p.bx;
      const dy = mouse.y - p.by;
      const d = Math.hypot(dx, dy);
      p.near = d < RADIUS ? 1 - d / RADIUS : 0;

      // magnetic bend toward the cursor, computed directly from current
      // distance so the deformation is always centered on the pointer
      let tx = 0;
      let ty = 0;
      if (p.near > 0 && d > 1) {
        const f = Math.min(p.near * p.near * MAX_PULL, d * 0.5);
        tx = (dx / d) * f;
        ty = (dy / d) * f;
      }
      p.ox += (tx - p.ox) * 0.25;
      p.oy += (ty - p.oy) * 0.25;

      p.x = p.bx + p.ox + Math.cos(tick * 0.01 + p.phase) * 2;
      p.y = p.by + p.oy + Math.sin(tick * 0.013 + p.phase) * 2;

      // expanding click ripples: the wavefront lights dots up and nudges
      // them outward as it passes
      p.lit = p.near;
      for (const rp of ripples) {
        const age = tick - rp.t;
        const decay = 1 - age / RIPPLE_LIFE;
        const ddx = p.bx - rp.x;
        const ddy = p.by - rp.y;
        const dd = Math.hypot(ddx, ddy) || 1;
        const front = dd - age * RIPPLE_SPEED;
        const w = Math.exp(-(front * front) / 2312) * decay;
        if (w > 0.02) {
          p.lit = Math.max(p.lit, w);
          p.x += (ddx / dd) * w * 14;
          p.y += (ddy / dd) * w * 14;
        }
      }
    }

    // web of connections between neighboring lattice points, lit only
    // where the cursor is
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = points[r * cols + c];
        if (p.lit === 0) continue;

        const neighbors = [];
        if (c + 1 < cols) neighbors.push(points[r * cols + c + 1]);
        if (r + 1 < rows) neighbors.push(points[(r + 1) * cols + c]);
        if (c + 1 < cols && r + 1 < rows) neighbors.push(points[(r + 1) * cols + c + 1]);

        for (const q of neighbors) {
          const glow = (p.lit + q.lit) / 2;
          if (glow < 0.03) continue;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(16, 133, 92, ${0.4 * glow})`;
          ctx.lineWidth = 0.8 + glow;
          ctx.stroke();
        }

        // spokes into the cursor from the innermost points
        if (p.near > 0.55) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(16, 133, 92, ${0.45 * (p.near - 0.55) / 0.45})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.1 + p.lit * 1.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(16, 133, 92, ${0.22 + p.lit * 0.55})`;
      ctx.fill();
    }

    rafId = requestAnimationFrame(step);
  };

  const start = () => {
    if (rafId === null && heroVisible && !document.hidden) {
      rafId = requestAnimationFrame(step);
    }
  };
  const stop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  new IntersectionObserver((entries) => {
    heroVisible = entries[0].isIntersecting;
    heroVisible ? start() : stop();
  }).observe(hero);

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });

  addEventListener('resize', resize);
  resize();
  start();
})();
