/*
 * Lavet Wellness — Neon loading overlay
 * Builds the same neon bottle as the hero from base to bulb while the page loads.
 * Shows once per browser session. Add ?loader to any URL to force it (handy for demos).
 */
(function () {
  'use strict';
  var el = document.getElementById('neon-loader');
  if (!el) return;

  var SEEN = 'lavet_loader_seen';
  var force = /[?&]loader\b/.test(location.search);
  var seen = false;
  try { seen = !!sessionStorage.getItem(SEEN); } catch (e) {}
  if (seen && !force) { el.remove(); document.documentElement.classList.remove('is-loading'); return; }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MIN_MS = reduce ? 900 : 2800;   // minimum time on screen so the build-up is always seen
  var MAX_MS = 9000;                  // safety net — never trap the visitor

  var palette = 'gold';
  try { palette = localStorage.getItem('lavet_neon_palette') || 'gold'; } catch (e) {}
  el.setAttribute('data-palette', palette);

  var pct = el.querySelector('.neon-loader__pct');
  var bar = el.querySelector('.neon-loader__bar span');
  var status = el.querySelector('.neon-loader__status');
  var canvas = el.querySelector('canvas');
  var scene = window.NeonProduct && NeonProduct.create(canvas, { palette: palette, interactive: false, halo: true, build: 0, spinBoost: 0.45 });
  if (scene) scene.start();

  var t0 = performance.now(), pageLoaded = document.readyState === 'complete', shown = 0, finished = false;
  window.addEventListener('load', function () { pageLoaded = true; });

  var steps = [[0, 'Preparing your ritual'], [0.35, 'Measuring botanicals'], [0.7, 'Infusing the formula'], [0.95, 'Ready']];

  function finish() {
    if (finished) return; finished = true;
    try { sessionStorage.setItem(SEEN, '1'); } catch (e) {}
    el.classList.add('is-done');
    document.documentElement.classList.remove('is-loading');
    setTimeout(function () { if (scene) scene.stop(); el.remove(); document.dispatchEvent(new Event('neon:ready')); }, 900);
  }

  function tick(now) {
    if (finished) return;
    var elapsed = now - t0;
    var timeP = Math.min(1, elapsed / MIN_MS);
    var eased = 1 - Math.pow(1 - timeP, 2.2);
    // hold at 92% until the page (images, fonts) has genuinely finished loading
    var target = pageLoaded ? eased : Math.min(eased, 0.92);
    shown += (target - shown) * 0.2;
    var p = Math.min(1, shown);
    if (scene) scene.setBuild(p);
    var n = Math.round(p * 100);
    pct.textContent = n + '%';
    bar.style.transform = 'scaleX(' + p + ')';
    for (var i = steps.length - 1; i >= 0; i--) if (p >= steps[i][0]) { status.textContent = steps[i][1]; break; }
    if ((pageLoaded && elapsed >= MIN_MS && p > 0.995) || elapsed > MAX_MS) { if (scene) scene.setBuild(1); pct.textContent = '100%'; bar.style.transform = 'scaleX(1)'; status.textContent = 'Ready'; return setTimeout(finish, 350); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
