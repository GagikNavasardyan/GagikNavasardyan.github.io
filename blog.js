(() => {
  'use strict';

  document.documentElement.classList.add('js');

  /* ============ Opening files directly ============
     Links use clean URLs (writing/, slug/) because that is what the live
     site serves. Over file:// a trailing slash opens a folder listing
     instead, so rewrite to the explicit file when previewing locally. */
  if (location.protocol === 'file:') {
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href');
      if (href && href.endsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
        link.setAttribute('href', href + 'index.html');
      }
    }
  }

  /* ============ Mobile nav ============ */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');

  if (toggle && menu) {
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
  }

  /* ============ Reading progress ============ */
  const bar = document.querySelector('.reading-progress');
  const article = document.querySelector('.post');

  if (bar && article) {
    let ticking = false;

    const update = () => {
      ticking = false;
      const start = article.offsetTop;
      const distance = article.offsetHeight - innerHeight;
      if (distance <= 0) {
        bar.style.setProperty('--read-progress', '1');
        return;
      }
      const progress = (scrollY - start) / distance;
      bar.style.setProperty(
        '--read-progress',
        String(Math.min(1, Math.max(0, progress)))
      );
    };

    addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    addEventListener('resize', update);
    update();
  }

  /* ============ Label filtering ============ */
  const chips = [...document.querySelectorAll('.label-chip')];
  /* Only the main list is filtered; the live posts panel stays as it is. */
  const rows = [...document.querySelectorAll('.post-list-main .post-row')];
  const filterEmpty = document.querySelector('.filter-empty');

  if (chips.length && rows.length) {
    const applyFilter = (label) => {
      let shown = 0;
      for (const row of rows) {
        const labels = (row.dataset.labels || '').split(' ').filter(Boolean);
        const match = label === '*' || labels.includes(label);
        row.hidden = !match;
        if (match) shown++;
      }
      if (filterEmpty) filterEmpty.hidden = shown > 0;
    };

    for (const chip of chips) {
      chip.addEventListener('click', () => {
        for (const other of chips) other.classList.toggle('is-active', other === chip);
        applyFilter(chip.dataset.label);
      });
    }
  }

  /* ============ Copy buttons on code blocks ============ */
  if (navigator.clipboard) {
    for (const block of document.querySelectorAll('.code-block')) {
      const button = document.createElement('button');
      button.className = 'copy-code';
      button.type = 'button';
      button.textContent = 'Copy';

      button.addEventListener('click', async () => {
        const code = block.querySelector('code');
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.innerText);
          button.textContent = 'Copied';
        } catch {
          button.textContent = 'Failed';
        }
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 1600);
      });

      block.appendChild(button);
    }
  }

  /* ============ cfyb — "closed for your best" ============ */
  /* The builder emits the aside already visible, so the sentence reads in
     full when this script does not run. Collapsing it is the enhancement. */
  document.querySelectorAll('.cfyb').forEach((wrap, index) => {
    const body = wrap.querySelector('.cfyb-body');
    if (!body) return;

    body.id = `cfyb-${index + 1}`;
    body.hidden = true;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cfyb-toggle has-tip';
    toggle.textContent = 'cfyb';
    /* A CSS tooltip rather than `title`, which the browser shows only after
       a long delay. */
    const setTip = (open) => {
      const tip = open ? 'closed for your best: click to close'
                       : 'closed for your best: click to open';
      toggle.dataset.tip = tip;
      toggle.setAttribute('aria-label', tip);
    };
    setTip(false);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', body.id);

    toggle.addEventListener('click', () => {
      const opening = body.hidden;
      body.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      wrap.classList.toggle('is-open', opening);
      setTip(opening);
    });

    wrap.insertBefore(toggle, body);
  });

  /* ============ cfyb blocks — whole optional sections ============ */
  /* Same idea at section size: a large button standing in for everything
     between `{` and `}{cfyb: label}` in the markdown. */
  document.querySelectorAll('.cfyb-block').forEach((wrap, index) => {
    const body = wrap.querySelector('.cfyb-block-body');
    if (!body) return;

    body.id = `cfyb-block-${index + 1}`;
    body.hidden = true;

    /* Two shapes, same behaviour: a banner, or — for several in a stack, as in
       a list of components — a compact row whose label is `Name — summary`. */
    const isRow = wrap.classList.contains('cfyb-row');
    const text = wrap.dataset.label || 'closed for your best';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = isRow
      ? 'cfyb-row-toggle has-tip'
      : 'cfyb-block-toggle has-tip';

    const chevron = document.createElement('span');
    chevron.className = 'cfyb-block-chevron';
    chevron.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'cfyb-block-label';

    if (isRow) {
      const [name, ...rest] = text.split('—');
      label.textContent = name.trim();
      const parts = [label];
      if (rest.length) {
        const summary = document.createElement('span');
        summary.className = 'cfyb-row-summary';
        summary.textContent = rest.join('—').trim();
        parts.push(summary);
      }
      if (wrap.classList.contains('cfyb-paper')) {
        /* Paper buttons: name and summary stacked in one text column. */
        const text = document.createElement('span');
        text.className = 'cfyb-paper-text';
        text.append(...parts);
        toggle.append(chevron, text);
      } else {
        toggle.append(chevron, ...parts);
      }
      if (wrap.classList.contains('has-post')) {
        /* The mark is a real link to the post, so it cannot live inside the
           <button>. It goes in a positioned header next to the button and is
           laid over its right end; its href is the card's own "My post" link. */
        const postLink = [...body.querySelectorAll('a')]
          .find((a) => a.textContent.trim().toLowerCase() === 'my post');
        const mark = document.createElement(postLink ? 'a' : 'span');
        mark.className = 'cfyb-post-mark';
        if (postLink) {
          mark.href = postLink.getAttribute('href');
          mark.setAttribute('aria-label', 'Open my post about this paper');
          mark.classList.add('has-tip');
          mark.dataset.tip = 'Open my post';
        }
        mark.innerHTML =
          '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" ' +
          'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
          '<span>My post</span>';
        wrap.dataset.postMark = '1';
        wrap._postMark = mark;
      }
    } else {
      label.textContent = text;

      const badge = document.createElement('span');
      badge.className = 'cfyb-block-badge';
      badge.textContent = 'optional';

      toggle.append(chevron, label, badge);
    }

    const setTip = (open) => {
      if (isRow) {
        toggle.dataset.tip = open ? 'Click to close' : 'Click to read more';
        return;
      }
      toggle.dataset.tip = open
        ? 'Click to fold this side note away'
        : 'Optional side note. Skip it, the post reads fine without';
    };
    setTip(false);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', body.id);

    toggle.addEventListener('click', () => {
      const opening = body.hidden;
      body.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      wrap.classList.toggle('is-open', opening);
      setTip(opening);
    });

    if (wrap._postMark) {
      const head = document.createElement('div');
      head.className = 'cfyb-paper-head';
      head.append(toggle, wrap._postMark);
      wrap.insertBefore(head, body);
    } else {
      wrap.insertBefore(toggle, body);
    }
  });
})();
