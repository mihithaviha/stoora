/**
 * The Stoora Journal: enhancements on top of pages that already work without any script.
 *   - the mobile menu
 *   - the 3D ring of story cards on the Journal home (turns by itself; needs GSAP from /vendor/gsap)
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

  /* ---------- the 3D ring carousel ---------- */

  /**
   * The story cards stand on the inside of a big ring (a cylinder seen from the middle): the card at the back faces you,
   * the cards beside it curve toward you, and the ring turns by itself without ever stopping.
   *
   *   ring turn `rot` (degrees)  ->  card i faces you when  rot = i * step
   *   position of card i         ->  rotateY(-i * step), pushed back by the ring's radius R
   *
   * It needs GSAP and its Draggable plugin (served from /vendor/gsap). Without them, or without JavaScript, the cards
   * stay a plain row you can scroll sideways. Dragging (mouse or finger) turns the ring, and when you let go it carries on
   * from the speed of your flick and eases back to its own pace. Arrow keys turn it one story at a time.
   */
  function initRing(root) {
    const list = $('.jr-orbit-list', root);
    const cards = $$('.jr-ocard', root);
    const dragger = $('[data-dragger]', root);
    const total = cards.length;
    if (total < 3 || !list || !dragger || !window.gsap || !window.Draggable) return;
    gsap.registerPlugin(Draggable);

    const SECONDS_PER_STORY = Number(root.dataset.seconds) || 3.2; // how long each story takes to pass by
    const step = 360 / total; // degrees between two cards
    const AUTO = step / SECONDS_PER_STORY; // the ring's own speed, in degrees per second
    const wrap = (n, size) => ((n % size) + size) % size;

    let rot = 0; // how far the ring has turned
    let speed = reducedMotion.matches ? 0 : AUTO; // degrees per second right now
    let goal = speed; // the speed it is easing toward
    const nudge = { v: 0 }; // extra turn from the arrow keys
    let dragging = false;
    let onScreen = true;
    let shown = -1; // the card in front, for screen readers
    let degreesPerPixel = 0.2;
    let cardWidth = 420;
    let lastTime = performance.now();
    let dragEndedAt = 0;

    root.classList.add('is-ring');

    /** Card size, ring radius and perspective for this screen width. */
    function measure() {
      const width = root.clientWidth;
      let cw, ch;
      if (width >= 1000) [cw, ch] = [420, 500];
      else if (width >= 640) [cw, ch] = [340, 440];
      else [cw, ch] = [Math.min(280, width * 0.7), Math.min(280, width * 0.7) * 1.5];
      cardWidth = cw;
      const gap = cw * 0.16;
      const radius = (cw + gap) / (2 * Math.sin(Math.PI / total)); // cards just clear each other around the ring
      root.style.setProperty('--cw', `${cw}px`);
      root.style.setProperty('--ch', `${ch}px`);
      root.style.perspective = `${Math.round(radius * 3.4)}px`;
      cards.forEach((card, i) =>
        gsap.set(card, { rotateY: -i * step, transformOrigin: `50% 50% ${radius}px`, z: -radius, backfaceVisibility: 'hidden' }),
      );
      gsap.set(list, { z: radius * 0.55 }); // bring the whole ring forward so the card at the back is nearly full size
      degreesPerPixel = step / (cw + gap) / 0.9;
    }

    /** Turn the ring and slide each photo a little the other way, for a feeling of depth. */
    function draw() {
      const turn = rot + nudge.v;
      gsap.set(list, { rotationY: turn });
      cards.forEach((card, i) => {
        const away = wrap(turn - i * step + 180, 360) - 180; // degrees from facing you: -180 to 180
        const photo = card.firstElementChild && card.firstElementChild.firstElementChild;
        const image = photo && photo.querySelector('img');
        if (image) gsap.set(image, { x: Math.max(-1, Math.min(1, -away / (step * 1.5))) * cardWidth * 0.08 });
      });
      const front = wrap(Math.round(turn / step), total);
      if (front !== shown) setShown(front);
    }

    /** Only the card in front is reachable by keyboard and screen reader. */
    function setShown(index) {
      shown = index;
      cards.forEach((card, i) => {
        card.setAttribute('aria-hidden', String(i !== index));
        const link = $('a', card);
        if (link) link.tabIndex = i === index ? 0 : -1;
      });
    }

    /** One tick per frame: speed eases toward its goal (so changes of pace are smooth), then the ring turns. */
    gsap.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000); // a long pause (hidden tab) must not make the ring jump
      lastTime = now;
      if (!onScreen) return;
      if (!dragging) {
        speed += (goal - speed) * (1 - Math.exp(-dt * 1.8));
        rot += speed * dt;
      }
      draw();
    });

    /* ---- dragging with the mouse or a finger ---- */
    let flick = 0;
    let lastDragAt = 0;
    Draggable.create(dragger, {
      trigger: root,
      type: 'x',
      dragClickables: true, // the cards are links: a drag that starts on one must still turn the ring
      minimumMovement: 6,
      onDragStart() {
        dragging = true;
        flick = 0;
        lastDragAt = performance.now();
      },
      onDrag() {
        const now = performance.now();
        const turned = -this.deltaX * degreesPerPixel; // dragging right pulls the cards right
        rot += turned;
        const seconds = Math.max(0.008, (now - lastDragAt) / 1000);
        flick = flick * 0.6 + (turned / seconds) * 0.4;
        lastDragAt = now;
      },
      onDragEnd() {
        gsap.set(dragger, { x: 0 }); // the drag layer only measures; reset it
        dragging = false;
        dragEndedAt = performance.now();
        const idle = performance.now() - lastDragAt > 120; // let go while holding still: no flick
        speed = idle ? 0 : Math.max(-260, Math.min(260, flick));
      },
    });
    // a drag must not also open the story it ended on
    root.addEventListener(
      'click',
      (event) => {
        if (performance.now() - dragEndedAt < 250) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );

    /* ---- keyboard: one story at a time ---- */
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      gsap.to(nudge, { v: nudge.v + (event.key === 'ArrowRight' ? step : -step), duration: 0.9, ease: 'power3.inOut' });
    });

    /* ---- it only works when it can be seen ---- */
    if ('IntersectionObserver' in window)
      new IntersectionObserver(
        (entries) => {
          onScreen = entries[0].isIntersecting;
          lastTime = performance.now();
        },
        { threshold: 0.05 },
      ).observe(root);
    reducedMotion.addEventListener('change', () => (goal = reducedMotion.matches ? 0 : AUTO));
    let resizing = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizing);
      resizing = setTimeout(() => (measure(), draw()), 100);
    });

    measure();
    draw();
    // the cards rise into place one after another; with reduced motion they simply appear
    if (!reducedMotion.matches) gsap.from(cards, { duration: 1.4, y: 160, opacity: 0, stagger: 0.09, ease: 'expo.out' });
  }
  const orbit = $('[data-orbit]');
  if (orbit) initRing(orbit);

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
