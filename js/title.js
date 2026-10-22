/* The game's name, in one place: the page title, the logo, the ? panel, the camp sign and the end screens read it.
   A working title until Alan names it: renaming the game is a one-line change here. */
(function (root) {
  const D = root.DINO = root.DINO || {};
  D.TITLE = 'TT Dino Safari';
  D.TAGLINE = 'Ride the jeep, snap the dinosaurs, fill your dino book!';
  if (typeof document !== 'undefined') document.title = D.TITLE + ' · Teddy & Tommy';
})(typeof window !== 'undefined' ? window : globalThis);
