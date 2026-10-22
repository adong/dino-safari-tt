/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: DINO.TITLE, // the name lives in js/title.js
  cols: ['Player 1', 'Player 2'],
  keys: [
    ['move the frame', 'W A S D or mouse', '↑ ← ↓ →'],
    ['snap a photo', 'Space or click', 'Enter'],
    ['zoom in · out', 'Q', '/'],
    ['call your brother (2 players: high five)', 'T', 'T'],
    ['pause · sound', 'P or Esc · M', ''],
    ['title: safari · 2 players · dino book · easy', '1 2 B E', ''],
  ],
  note: 'In 1 player both sets of keys work. Snap a dinosaur big and in the middle of the frame, facing you, for 3 stars; snap it while it does its special move (✨) for a bonus. T calls your brother as often as you like: a treat, then he points the camera at a dinosaur for you.',
  touch: 'Tap a dinosaur to take its photo, or slide your finger to move the frame and let go to snap. 🔍 zooms in. Tap your brother\'s face to call him. Two players: the left half of the screen is player 1\'s, the right half player 2\'s.',
});
