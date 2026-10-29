/**
 * The Stoora Journal: enhancements on top of pages that already work without any script.
 *   - the mobile menu
 *   - the circular story carousel on the Journal home ("orbit")
 *   - instant topic filter, search and "View all" on the Journal home (the address updates, so a view can be shared)
 *   - "Copy link" on an article
 */
(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- mobile menu ---------- */
  const menu = $('#mnav');
  const opener = $('[data-menu]');
  function setMenu(open) {
    if (!menu || !opener) return;
    menu.hidden = !open;
    opener.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('lmenu-open', open);
    if (open) $('[data-menu-close]', menu).focus();
    else opener.focus();
  }
  if (opener) opener.addEventListener('click', () => setMenu(menu.hidden));
  if (menu) {
    $('[data-menu-close]', menu).addEventListener('click', () => setMenu(false));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        menu.hidden = true;
        document.body.classList.remove('lmenu-open');
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu && !menu.hidden) setMenu(false);
  });

  /* ---------- the fan carousel ---------- */

  /**
   * Story cards stand on the top of a very large wheel. `position` is a continuous number: 0 puts card 0 in the middle,
   * 1 puts card 1 there. A card `d` steps from the middle sits at angle phi = d * step on the wheel, so
   *   x = R * sin(phi)        y = R * (1 - cos(phi))        and it tilts by phi to follow the curve.
   * The result is a fan: the middle card upright, the others tilting outward and dropping away, sliding off the edges.
   * The wheel only ever turns smoothly, and a card is far off-screen when it wraps from one end to the other,
   * so the loop never shows a jump.
   */
  function initOrbit(root) {
    const cards = $$('.jr-ocard', root);
    const total = cards.length;
    if (total < 3) return;
    const live = $('[data-orbit-live]');
    const INTERVAL = 300; // pause on each story
    const DURATION = 700; // time one turn takes (pause + turn = 1 second per story)

    let position = 0; // where the wheel is right now (continuous)
    let target = 0; // where it is heading (a whole number)
    let from = 0;
    let startedAt = 0;
    let frame = 0;
    let timer = 0;
    let pointerDown = false;
    let onScreen = true;
    let shown = 0; // the story currently marked as the active one
    let geo = { cx: 0, top: 24, cw: 270, ch: 340, wheel: 1500, step: 0.21 };

    root.classList.add('is-orbit');

    const wrap = (n) => ((n % total) + total) % total;
    /** Steps from the middle, between -total/2 and +total/2. */
    const around = (d) => wrap(d + total / 2) - total / 2;

    /** The wheel, for this screen: card size, how far apart the cards are, and so how big the wheel is. */
    function measure() {
      const width = root.clientWidth;
      let cw, ch, base, degrees;
      if (width >= 1000) [cw, ch, base, degrees] = [430, 500, 400, 7];
      else if (width >= 640) [cw, ch, base, degrees] = [340, 430, 318, 8];
      else {
        const w = Math.min(300, width * 0.74);
        [cw, ch, base, degrees] = [w, w * 1.5, w * 0.6, 9];
      }
      // The card that wraps round (three steps out) must be completely off-screen, however wide the screen is.
      const spacing = Math.max(base, (width / 2 + cw / 2 + 24) / (total / 2));
      const step = (degrees * Math.PI) / 180;
      const wheel = spacing / Math.sin(step);
      geo = { cx: width / 2, top: 24, cw, ch, wheel, step };
      root.style.setProperty('--cw', `${cw}px`);
      root.style.setProperty('--ch', `${ch}px`);
      Object.assign(root.dataset, { cx: geo.cx.toFixed(1), top: String(geo.top), wheel: wheel.toFixed(1) });
    }

    /** Put every card on the wheel for a given position of the wheel. */
    function place(at) {
      cards.forEach((card, i) => {
        const d = around(i - at);
        const angle = d * geo.step;
        const x = geo.wheel * Math.sin(angle);
        const y = geo.wheel * (1 - Math.cos(angle));
        const away = Math.abs(d);
        const scale = 1 - 0.06 * Math.min(away, 2);
        card.style.transform = `translate3d(${(geo.cx + x - geo.cw / 2).toFixed(1)}px, ${(geo.top + y).toFixed(1)}px, 0) rotate(${((angle * 180) / Math.PI * 0.12).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        // Cards stay solid and darken a little the further they are from the middle.
        card.style.setProperty('--veil', (0.5 * Math.pow(Math.min(1, away / 2.4), 1.2)).toFixed(3));
        // The card that wraps round the back fades out well beyond the screen edge, so the loop cannot flicker.
        card.style.opacity = Math.min(1, Math.max(0, (total / 2 - away) / 0.5)).toFixed(3);
        card.style.zIndex = String(100 - Math.round(away * 20));
        card.classList.toggle('is-front', away < 0.08);
        card.style.pointerEvents = away < total / 2 - 0.4 ? 'auto' : 'none';
      });
    }

    /** Mark which story is in the middle: what screen readers can reach, and the spoken update. */
    function setShown(index, announce) {
      shown = index;
      cards.forEach((card, i) => {
        const active = i === index;
        card.setAttribute('aria-hidden', String(!active));
        $('a', card).tabIndex = active ? 0 : -1;
      });
      if (announce) {
        live.setAttribute('aria-live', 'polite');
        live.textContent = `Story ${index + 1} of ${total}: ${$('.jr-ocard-title', cards[index]).textContent}`;
      } else live.removeAttribute('aria-live');
    }

    const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2; // a smooth sine curve: eases in and out

    /** Turn the wheel to a new target, smoothly, starting from wherever it is now. */
    function turnTo(next, { announce = false } = {}) {
      target = next;
      setShown(wrap(next), announce);
      cancelAnimationFrame(frame);
      if (reducedMotion.matches) {
        position = target;
        place(position);
        return schedule();
      }
      from = position;
      startedAt = performance.now();
      const run = (now) => {
        const t = Math.min(1, (now - startedAt) / DURATION);
        position = from + (target - from) * ease(t);
        place(position);
        if (t < 1) frame = requestAnimationFrame(run);
        else schedule();
      };
      frame = requestAnimationFrame(run);
    }

    /** It turns by itself unless the visitor asks for less motion, is pointing at it, or is not looking at the page. */
    const mayAutoplay = () =>
      !pointerDown &&
      onScreen &&
      document.visibilityState === 'visible' &&
      !reducedMotion.matches;

    /** One timer only: starting a new one always cancels the old one, so intervals can never pile up. */
    function schedule() {
      clearTimeout(timer);
      timer = 0;
      if (mayAutoplay()) timer = setTimeout(() => turnTo(target + 1), INTERVAL);
    }

    const next = (announce = true) => turnTo(target + 1, { announce });
    const previous = () => turnTo(target - 1, { announce: true });
    /** Bring a chosen story to the middle by the shortest way round. */
    function goTo(index) {
      let delta = wrap(index - target);
      if (delta > total / 2) delta -= total;
      if (delta) turnTo(target + delta, { announce: true });
    }

    /* ---- choosing a story: click a card at the side, swipe, or use the arrow keys ---- */
    // The card in the middle opens its story. Any other card turns to the middle first.
    root.addEventListener('click', (event) => {
      const card = event.target.closest('.jr-ocard');
      if (!card) return;
      const index = cards.indexOf(card);
      if (index !== shown) {
        event.preventDefault();
        goTo(index);
      }
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      }
    });

    /* ---- swiping on a touch screen ---- */
    let startX = 0;
    let moved = false;
    root.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      pointerDown = true;
      startX = event.clientX;
      moved = false;
      clearTimeout(timer);
    });
    root.addEventListener('pointerup', (event) => {
      if (!pointerDown) return;
      pointerDown = false;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 40) {
        moved = true;
        dx < 0 ? next() : previous();
      } else schedule();
    });
    root.addEventListener('pointercancel', () => {
      pointerDown = false;
      schedule();
    });
    // A swipe must not also count as a tap on a story.
    root.addEventListener('click', (event) => moved && ((moved = false), event.preventDefault()), true);

    /* ---- it keeps turning by itself: only a hidden tab, an off-screen carousel or reduced motion stops it ---- */
    const visibility = () => (document.visibilityState === 'visible' ? schedule() : clearTimeout(timer));
    document.addEventListener('visibilitychange', visibility);
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => ((onScreen = entries[0].isIntersecting), schedule()), {
            threshold: 0.25,
          })
        : null;
    if (observer) observer.observe(root);
    reducedMotion.addEventListener('change', () => {
      cancelAnimationFrame(frame);
      position = target;
      place(position);
      schedule();
    });
    let resizing = 0;
    const onResize = () => {
      clearTimeout(resizing);
      resizing = setTimeout(() => (measure(), place(position)), 80);
    };
    window.addEventListener('resize', onResize);

    // Leave nothing running when the page goes away.
    window.addEventListener('pagehide', () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', onResize);
      if (observer) observer.disconnect();
    });

    measure();
    place(0);
    setShown(0, false);
    schedule();
  }
  const orbit = $('[data-orbit]');
  if (orbit) initOrbit(orbit);

  /* ---------- topic filter, search and "View all" ---------- */
  const grid = $('[data-grid]');
  if (grid && $('[data-pills]')) {
    const LATEST_FIRST = 6;
    const cards = $$('.jr-card', grid);
    const pick = $('[data-pick]');
    const pickSlug = pick ? $('.jr-pick-img', pick).getAttribute('href').split('/').pop() : '';
    const topicLinks = $$('[data-pills] .jr-topic');
    const input = $('#jr-q');
    const form = $('[data-search-form]');
    const count = $('[data-count]');
    const empty = $('[data-empty]');
    const title = $('[data-list-title]');
    const more = $('[data-more]');
    const resetLinks = $$('[data-reset]');
    const topics = Object.fromEntries(topicLinks.map((link) => [link.dataset.topic, $('b', link).textContent.trim()]));
    const state = { topic: '', q: '', expanded: false };
    const params = new URLSearchParams(location.search);
    if (topics[params.get('topic')]) state.topic = params.get('topic');
    state.q = (params.get('q') || '').trim().toLowerCase();

    function apply({ push = false } = {}) {
      const filtering = Boolean(state.topic || state.q);
      let shownCount = 0;
      let listed = 0;
      let inGridCount = 0;
      cards.forEach((card) => {
        const fits =
          (!state.topic || card.dataset.topic === state.topic) && (!state.q || card.dataset.text.includes(state.q));
        // With no filter the Editor's Pick has its own feature, so its card stays out of the grid.
        const inGrid = fits && (filtering || card.dataset.slug !== pickSlug);
        // Without a filter the grid starts with the latest few; "View all" shows the rest.
        const collapsed = inGrid && !filtering && !state.expanded && ++listed > LATEST_FIRST;
        if (inGrid) inGridCount += 1;
        card.hidden = !inGrid;
        card.classList.toggle('is-collapsed', Boolean(collapsed));
        if (inGrid) shownCount += 1;
      });
      const hiddenByLimit = cards.filter((card) => card.classList.contains('is-collapsed')).length;
      if (more) {
        more.hidden = !hiddenByLimit;
        more.textContent = `View all ${inGridCount} stories`;
      }
      if (pick) pick.hidden = filtering;
      topicLinks.forEach((link) =>
        link.dataset.topic === state.topic
          ? link.setAttribute('aria-current', 'true')
          : link.removeAttribute('aria-current'),
      );
      resetLinks.forEach((link) => link.closest('.jr-allrow') && (link.hidden = !filtering));
      if (empty) empty.hidden = shownCount > 0;
      if (title) title.textContent = filtering ? 'Stories' : 'Latest stories';
      if (count) {
        const label = state.topic ? ` in ${topics[state.topic]}` : '';
        const search = state.q ? ` matching “${state.q}”` : '';
        count.textContent = `${shownCount} ${shownCount === 1 ? 'story' : 'stories'}${label}${search}`;
      }
      const hidden = $('input[name=topic]', form);
      if (form) {
        if (state.topic && !hidden)
          form.insertAdjacentHTML('beforeend', `<input type="hidden" name="topic" value="${state.topic}">`);
        else if (hidden) state.topic ? (hidden.value = state.topic) : hidden.remove();
      }
      const next = new URLSearchParams();
      if (state.topic) next.set('topic', state.topic);
      if (state.q) next.set('q', state.q);
      const url = location.pathname + (next.toString() ? '?' + next : '');
      if (push) history.pushState(null, '', url);
      else history.replaceState(null, '', url);
    }

    const scrollToList = () =>
      $('#jr-list-h').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });

    $('[data-pills]').addEventListener('click', (event) => {
      const link = event.target.closest('.jr-topic');
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      // Choosing the open topic again goes back to all stories.
      state.topic = state.topic === link.dataset.topic ? '' : link.dataset.topic;
      state.expanded = false;
      apply({ push: true });
      if (state.topic) scrollToList();
    });
    if (input) {
      input.addEventListener('input', () => {
        state.q = input.value.trim().toLowerCase();
        apply();
      });
    }
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        state.q = input.value.trim().toLowerCase();
        apply({ push: true });
        scrollToList();
      });
    }
    resetLinks.forEach((link) =>
      link.addEventListener('click', (event) => {
        event.preventDefault();
        state.topic = '';
        state.q = '';
        state.expanded = false;
        if (input) input.value = '';
        apply({ push: true });
      }),
    );
    if (more) {
      more.addEventListener('click', () => {
        const firstHidden = cards.find((card) => card.classList.contains('is-collapsed'));
        state.expanded = true;
        apply();
        if (firstHidden) $('a', firstHidden).focus({ preventScroll: false });
      });
    }
    window.addEventListener('popstate', () => {
      const back = new URLSearchParams(location.search);
      state.topic = topics[back.get('topic')] ? back.get('topic') : '';
      state.q = (back.get('q') || '').trim().toLowerCase();
      if (input) input.value = back.get('q') || '';
      apply();
    });
    apply();
  }

  /* ---------- copy link ---------- */
  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const label = $('[data-copy-label]', button);
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        label.textContent = 'Link copied';
      } catch {
        const field = document.createElement('input');
        field.value = button.dataset.copy;
        document.body.appendChild(field);
        field.select();
        label.textContent = document.execCommand('copy') ? 'Link copied' : 'Press Ctrl+C to copy';
        field.remove();
      }
      setTimeout(() => (label.textContent = 'Copy link'), 2200);
    });
  });
})();
