/* The dinosaurs (and their flying and fishing cousins): names, facts for the dino book, where each one lives in the
   valley, how big it is and what it does. js/sim.js places and moves them, js/art.js builds them from boxes and balls,
   js/zh.js has the 中文. Sizes are in metres: L nose to tail, H to the top of the head (or crest, sail, wings), W wide.
   The facts are the kind a dinosaur book for small kids has; kept short so a 5-year-old can listen to one. */
(function (root) {
  'use strict';
  const D = root.DINO = root.DINO || {};

  // s: where along the road (metres from the start camp), side: +1 right of the road, -1 left, d: metres from the road.
  D.SPECIES = [
    {
      id: 'compy', name: 'COMPSOGNATHUS', short: 'COMPY', zone: 'plains', act: 'PEEKABOO!',
      fact: 'Compsognathus was tiny, about as big as a chicken!',
      hint: 'hides in the tall grass, look closely',
      L: 1.3, H: 0.65, W: 0.32, color: '#9ccf4a', belly: '#f2f0a0', stripe: '#4f8a2a',
      move: 'popup', inst: [{ s: 58, side: 1, d: 6.5 }, { s: 64, side: 1, d: 9, scale: 0.9, phase: 4 }],
    },
    {
      id: 'trike', name: 'TRICERATOPS', zone: 'plains', act: 'MUNCH!',
      fact: 'Triceratops means "three-horned face". It ate plants.',
      hint: 'eats ferns on the grassy plains',
      L: 8, H: 3.1, W: 2.6, color: '#e2894a', belly: '#f6d7a6', stripe: '#a5512a',
      move: 'wander', r: 2.2, w: 0.16, every: 6.5, lasts: 2.2,
      inst: [{ s: 108, side: -1, d: 17 }, { s: 118, side: -1, d: 25, scale: 0.6, phase: 3 }],
    },
    {
      id: 'raptor', name: 'VELOCIRAPTOR', short: 'RAPTOR', zone: 'plains', act: 'LEAP!',
      fact: 'Velociraptor had feathers and was only about as big as a turkey!',
      hint: 'plays chase in a fast little pack',
      L: 2, H: 0.95, W: 0.4, color: '#5aa7d6', belly: '#e6f2ff', stripe: '#2b5e94',
      move: 'circle', r: 7, speed: 5.2, every: 4, lasts: 0.9,
      inst: [{ s: 190, side: 1, d: 19, phase: 0 }, { s: 190, side: 1, d: 19, phase: 2.1 }, { s: 190, side: 1, d: 19, phase: 4.2 }],
    },
    {
      id: 'brachio', name: 'BRACHIOSAURUS', zone: 'forest', act: 'TREETOP SNACK!',
      fact: 'Brachiosaurus was as tall as a 4-storey building! It ate leaves from the treetops.',
      hint: 'stretches its long neck in the tall trees',
      L: 21, H: 12.5, W: 4, color: '#7fb6a4', belly: '#d8efe0', stripe: '#4d8070',
      move: 'wander', r: 1.5, w: 0.06, every: 8, lasts: 3.2,
      inst: [{ s: 268, side: -1, d: 27 }],
    },
    {
      id: 'stego', name: 'STEGOSAURUS', zone: 'forest', act: 'TAIL SWING!',
      fact: 'Stegosaurus had big plates on its back and four spikes on its tail.',
      hint: 'walks between the trees with plates on its back',
      L: 9, H: 4.2, W: 2.6, color: '#c9a640', belly: '#f2e2a6', stripe: '#e0574a',
      move: 'wander', r: 2.5, w: 0.12, every: 6, lasts: 2,
      inst: [{ s: 318, side: 1, d: 15 }],
    },
    {
      id: 'pachy', name: 'PACHYCEPHALOSAURUS', short: 'PACHY', zone: 'forest', act: 'BONK!',
      fact: 'Pachycephalosaurus had a thick, hard dome on its head, like a helmet!',
      hint: 'two of them bump heads in a clearing',
      L: 4.5, H: 2, W: 1.2, color: '#b77ad6', belly: '#f0dcff', stripe: '#7a3fa0',
      move: 'bonk', every: 5, lasts: 1.2,
      inst: [{ s: 365, side: -1, d: 15, pair: 0 }, { s: 365, side: -1, d: 15, pair: 1 }],
    },
    {
      id: 'spino', name: 'SPINOSAURUS', zone: 'lake', act: 'SPLASH!',
      fact: 'Spinosaurus had a big sail on its back and loved to catch fish.',
      hint: 'goes fishing in the big blue lake',
      L: 14, H: 5.4, W: 2.4, color: '#4f8fb0', belly: '#d6ecf2', stripe: '#e8664a',
      move: 'wander', r: 4, w: 0.1, every: 7, lasts: 2.2, water: true,
      inst: [{ s: 430, side: 1, d: 29 }],
    },
    {
      id: 'para', name: 'PARASAUROLOPHUS', short: 'PARA', zone: 'lake', act: 'HONK!',
      fact: 'Parasaurolophus could honk like a trumpet through the long crest on its head.',
      hint: 'drinks at the little pond and honks',
      L: 9, H: 4.6, W: 2.2, color: '#e86f8f', belly: '#ffe0e8', stripe: '#a83a5c',
      move: 'wander', r: 1.8, w: 0.12, every: 6, lasts: 2,
      inst: [{ s: 490, side: -1, d: 17 }, { s: 500, side: -1, d: 23, scale: 0.75, phase: 2.5 }],
    },
    {
      id: 'ankylo', name: 'ANKYLOSAURUS', zone: 'hills', act: 'CLUB SWING!',
      fact: 'Ankylosaurus had armour like a tank and a club on the end of its tail.',
      hint: 'stomps around the rocky hills in its armour',
      L: 7, H: 2, W: 2.8, color: '#8f8a5a', belly: '#d8d2a0', stripe: '#5f5a34',
      move: 'wander', r: 2, w: 0.12, every: 6, lasts: 2,
      inst: [{ s: 562, side: 1, d: 14 }],
    },
    {
      id: 'maia', name: 'MAIASAURA', zone: 'hills', act: 'BABY HELLO!',
      fact: 'Maiasaura means "good mother lizard". It looked after its babies in a nest.',
      hint: 'looks after her babies in a nest',
      L: 8, H: 3.6, W: 2, color: '#6fbf73', belly: '#e2f6c8', stripe: '#3f8a46',
      move: 'nest', every: 5, lasts: 2,
      inst: [{ s: 622, side: -1, d: 14 }, { s: 618, side: -1, d: 10, baby: true, scale: 0.22 }, { s: 621, side: -1, d: 9.4, baby: true, scale: 0.2, phase: 1 }, { s: 624, side: -1, d: 10.2, baby: true, scale: 0.21, phase: 2 }],
    },
    {
      id: 'ptera', name: 'PTERANODON', zone: 'volcano', act: 'SWOOP!',
      fact: 'Pteranodon was a flying reptile, not a dinosaur! Its wings were wider than a car is long.',
      hint: 'flies in circles near the volcano',
      L: 3, H: 1.2, W: 6.5, color: '#f0a64a', belly: '#fff0d6', stripe: '#c0602a',
      move: 'fly', r: 18, speed: 7, alt: 9, every: 6, lasts: 1.6,
      inst: [{ s: 700, side: 1, d: 6, phase: 0 }, { s: 700, side: 1, d: 6, phase: 3.1 }],
    },
    {
      id: 'trex', name: 'TYRANNOSAURUS REX', short: 'T. REX', zone: 'rocks', act: 'ROAR!',
      fact: 'T. rex teeth were as long as bananas!',
      hint: 'the king of the dinosaurs waits at the end of the road',
      L: 12, H: 4.8, W: 2.4, color: '#7a9a4a', belly: '#e6e2b0', stripe: '#4c6a2a',
      move: 'wander', r: 2, w: 0.1, every: 6, lasts: 2.2,
      inst: [{ s: 792, side: 1, d: 22 }],
    },
  ];
  D.SP = {};
  for (const sp of D.SPECIES) D.SP[sp.id] = sp;

  // the valley's parts, in the order the jeep meets them (s: where the sign stands)
  D.ZONES = [
    { id: 'plains', s: 0, name: 'GRASSY PLAINS' },
    { id: 'forest', s: 225, name: 'TALL TREES' },
    { id: 'lake', s: 395, name: 'BLUE LAKE' },
    { id: 'hills', s: 530, name: 'ROCKY HILLS' },
    { id: 'volcano', s: 650, name: 'VOLCANO VIEW' },
    { id: 'rocks', s: 745, name: 'BIG ROCKS' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
