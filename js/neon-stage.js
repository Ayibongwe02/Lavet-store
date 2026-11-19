/* Lavet Wellness — hero neon stage: starts the interactive bottle and wires the colour toggle. */
(function () {
  'use strict';
  var stage = document.getElementById('neon-stage');
  var canvas = document.getElementById('neon-canvas');
  if (!stage || !canvas || !window.NeonProduct) return;

  var KEY = 'lavet_neon_palette';
  var palette = 'gold';
  try { palette = localStorage.getItem(KEY) || 'gold'; } catch (e) {}
  if (!NeonProduct.PALETTES[palette]) palette = 'gold';

  var scene = NeonProduct.create(canvas, { palette: palette, interactive: true, halo: true });
  var buttons = stage.querySelectorAll('[data-palette-btn]');

  function apply(name) {
    palette = name;
    scene.setPalette(name);
    stage.setAttribute('data-palette', name);
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-palette-btn') === name ? 'true' : 'false'); });
    try { localStorage.setItem(KEY, name); } catch (e) {}
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-palette-btn')); }); });
  apply(palette);

  // Start once the loading overlay (if any) has finished, so the hero doesn't animate unseen.
  var started = false;
  function go() { if (started) return; started = true; scene.start(); }
  if (document.getElementById('neon-loader')) { document.addEventListener('neon:ready', go); setTimeout(go, 12000); } else go();
})();
