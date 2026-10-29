/**
 * Moving between sections (Home, Orders, Products ...): the old screen fades out while the new one
 * fades and slides in, and the menu item you chose settles into place. Loaded after the screens are
 * defined, so it wraps whatever draws the page. Respects "reduce motion".
 */
(() => {
  const screen = document.getElementById('screen');
  if (!screen || !screen.parentElement) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastKey = null;
  let fadeTimer = null;

  const draw = render;
  render = function (scrollTop) {
    const key = route.name + ':' + route.arg;
    const moving = Boolean(scrollTop) && lastKey !== null && key !== lastKey && !reduceMotion.matches;
    let ghost = null;

    if (moving) {
      // A picture of the old screen stays on top, fading out, while the new one is drawn underneath.
      ghost = screen.cloneNode(true);
      ghost.removeAttribute('id');
      ghost.className = 'screen screen-ghost';
      screen.parentElement.insertBefore(ghost, screen.nextSibling);
      ghost.scrollTop = screen.scrollTop;
      const remove = () => ghost.remove();
      ghost.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 500);
    }

    draw(scrollTop);
    lastKey = key;

    if (moving) {
      screen.classList.remove('xfade-in');
      void screen.offsetWidth;
      screen.classList.add('xfade-in');
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => screen.classList.remove('xfade-in'), 450);
      document.querySelectorAll('.dnav .nrow.on, .dnav .nsub.on').forEach((item) => item.classList.add('nav-arrive'));
    }
  };
})();
