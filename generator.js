/*
 * generator.js — Lager spillbare brett fra ikoner.
 *
 * Fyller figurens celler med streker som kan være RETTE eller ha ETT hjørne
 * (L-form), gir hver strek en pilretning, og GARANTERER at brettet lar seg løse
 * (ingen tvungen krasj). Legger så inn passe vanskelighet ved å snu noen piler
 * "den lange veien" så lenge brettet fortsatt er løsbart.
 *
 * Strekenes celler lagres i STI-REKKEFØLGE slik at UI kan tegne dem som
 * sammenhengende, avrundede linjer med hjørner.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./engine"), require("./icons"));
  } else {
    root.Generator = factory(root.Engine, root.Icons);
  }
})(typeof self !== "undefined" ? self : this, function (Engine, Icons) {
  "use strict";

  // Seedet tilfeldighet (mulberry32) for reproduserbare brett.
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  var DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  // Del fylte celler i streker. Grupperer kun celler med SAMME farge i samme
  // strek (så fargeregioner holdes adskilt). Noen få "spesielle" streker får
  // flere vinkler og er lengre. Returnerer [{ cells:[...], color }].
  function partition(cells, rows, cols, rng, opts) {
    opts = opts || {};
    var maxArm = opts.maxArm || 3;     // maks lengde per arm
    var cornerChance = opts.cornerChance == null ? 0.55 : opts.cornerChance;
    var specialChance = opts.specialChance == null ? 0.14 : opts.specialChance;
    var filled = {}, colorAt = {};
    cells.forEach(function (x) { var k = x.r + "," + x.c; filled[k] = true; colorAt[k] = x.color; });
    var used = {};
    var order = shuffle(cells.slice(), rng);
    var segments = [];

    order.forEach(function (cell) {
      var startKey = cell.r + "," + cell.c;
      if (used[startKey]) return;
      var startColor = colorAt[startKey];
      function freeSame(r, c) {
        var k = r + "," + c;
        return filled[k] && !used[k] && colorAt[k] === startColor;
      }
      var special = rng() < specialChance;
      var path = growPath(cell, freeSame, rng, special
        ? { maxArm: maxArm + 2, cornerChance: 0.9, maxCorners: 3 }
        : { maxArm: maxArm, cornerChance: cornerChance, maxCorners: 1 });
      path.forEach(function (c) { used[c.r + "," + c.c] = true; });
      segments.push({ cells: path, color: startColor });
    });
    return segments;
  }

  // Vokser en sti fra `start`: arm 1 i en ledig retning, deretter opptil
  // `maxCorners` perpendikulære armer (hjørner). De fleste streker er rette/L
  // (maxCorners=1); noen få "spesielle" får flere vinkler og er lengre.
  // `free(r,c)` avgjør om en celle kan brukes (fylt, ubrukt, riktig farge).
  function growPath(start, free, rng, opts) {
    var maxArm = opts.maxArm;
    var cornerChance = opts.cornerChance;
    var maxCorners = opts.maxCorners == null ? 1 : opts.maxCorners;
    var path = [{ r: start.r, c: start.c }];
    var inPath = {}; inPath[start.r + "," + start.c] = true;
    var rr = start.r, cc = start.c;

    function canStep(dr, dc) {
      var nr = rr + dr, nc = cc + dc;
      return free(nr, nc) && !inPath[nr + "," + nc];
    }
    function growArm(dr, dc, len) {
      var n = 0;
      while (n < len && canStep(dr, dc)) {
        rr += dr; cc += dc; path.push({ r: rr, c: cc }); inPath[rr + "," + cc] = true; n++;
      }
      return n;
    }

    // Arm 1: en tilfeldig ledig retning.
    var dirs = shuffle(DIRS4.slice(), rng);
    var arm = null;
    for (var i = 0; i < dirs.length; i++) {
      if (canStep(dirs[i][0], dirs[i][1])) { arm = dirs[i]; break; }
    }
    if (!arm) return path; // enkeltcelle
    growArm(arm[0], arm[1], 1 + Math.floor(rng() * maxArm));

    // Flere hjørner, hver perpendikulær på forrige arm.
    var corners = 0, lastArm = arm;
    while (corners < maxCorners && rng() < cornerChance) {
      var perp = lastArm[0] === 0 ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
      shuffle(perp, rng);
      var next = null;
      for (var j = 0; j < perp.length; j++) {
        if (canStep(perp[j][0], perp[j][1])) { next = perp[j]; break; }
      }
      if (!next) break;
      if (growArm(next[0], next[1], 1 + Math.floor(rng() * maxArm)) === 0) break;
      lastArm = next; corners++;
    }
    return path;
  }

  // Avstand fra en celle til kanten i en gitt retning.
  function edgeDist(cell, dir, rows, cols) {
    if (dir === "U") return cell.r;
    if (dir === "D") return rows - 1 - cell.r;
    if (dir === "L") return cell.c;
    return cols - 1 - cell.c;
  }

  // Velg pilretning blant strekens GYLDIGE ende-retninger (pilen kan kun sitte i
  // en ende og peke utover langs aksen). Foretrekk den enden som er nærmest en
  // kant — kortest stråle ut = mest sannsynlig klar.
  function chooseEndpointDir(cells, rows, cols) {
    var dirs = Engine.endpointDirs({ cells: cells });
    var best = dirs[0], bestD = Infinity;
    dirs.forEach(function (dir) {
      var head = Engine.headCell({ cells: cells, dir: dir });
      var dd = edgeDist(head, dir, rows, cols);
      if (dd < bestD) { bestD = dd; best = dir; }
    });
    return best;
  }

  function buildLevel(iconCells, segments, rows, cols) {
    var pieces = segments.map(function (seg, i) {
      return {
        id: "p" + i,
        cells: seg.cells,
        dir: chooseEndpointDir(seg.cells, rows, cols),
        color: seg.color || iconCells.color,
      };
    });
    return { rows: rows, cols: cols, pieces: pieces, iconName: iconCells.name };
  }

  function findPiece(level, id) {
    return level.pieces.filter(function (p) { return p.id === id; })[0];
  }

  function remainingCount(level) {
    return Engine.simulateSolve(level).remaining.length;
  }

  // Sørg for at brettet er løsbart. Bruker grådig hill-climbing på antall
  // fastlåste streker: i hvert steg velges den ENE retningsendringen som
  // reduserer vranglåsen mest. Fjerning av en strek brukes bare når ingen
  // retningsendring hjelper (svært sjelden). Returnerer antall fjernede streker.
  function ensureSolvable(level, rng) {
    var removed = 0, stuckRounds = 0;
    for (var outer = 0; outer < 1200; outer++) {
      var cur = remainingCount(level);
      if (cur === 0) return removed;

      var ids = shuffle(level.pieces.map(function (p) { return p.id; }), rng);
      var best = null, bestRem = cur, solvedNow = false;
      for (var i = 0; i < ids.length && !solvedNow; i++) {
        var piece = findPiece(level, ids[i]);
        var saved = piece.dir;
        var dirs = shuffle(Engine.endpointDirs(piece).slice(), rng);
        for (var k = 0; k < dirs.length; k++) {
          if (dirs[k] === saved) continue;
          piece.dir = dirs[k];
          var rc = remainingCount(level);
          if (rc < bestRem) { bestRem = rc; best = { id: ids[i], dir: dirs[k] }; }
          if (rc === 0) { solvedNow = true; break; } // løst — behold endringen
        }
        if (!solvedNow) piece.dir = saved;
      }
      if (solvedNow) return removed;

      if (best) {
        findPiece(level, best.id).dir = best.dir; // beste forbedring
        stuckRounds = 0;
      } else if (stuckRounds < 15) {
        // Lokalt minimum: "kick" — snu noen tilfeldige fastlåste streker til den
        // andre enden for å hoppe ut av minimumet (i stedet for å fjerne).
        stuckRounds++;
        var stuck0 = Engine.simulateSolve(level).remaining;
        shuffle(stuck0, rng);
        var kicks = 1 + Math.floor(rng() * 3);
        for (var z = 0; z < kicks && z < stuck0.length; z++) {
          var kp = findPiece(level, stuck0[z]);
          kp.dir = Engine.otherEndpointDir(kp);
        }
      } else {
        // Gir opp lokalt: fjern én fastlåst strek som aller siste utvei.
        var stuck = Engine.simulateSolve(level).remaining;
        var victim = stuck[Math.floor(rng() * stuck.length)] || stuck[0];
        level.pieces = level.pieces.filter(function (p) { return p.id !== victim; });
        removed++; stuckRounds = 0;
      }
    }
    return removed;
  }

  // Legg inn vanskelighet: snu noen piler "den lange veien" så lenge brettet
  // forblir løsbart. difficulty 0..1 styrer hvor mange.
  function injectDifficulty(level, rng, difficulty) {
    var ids = shuffle(level.pieces.map(function (p) { return p.id; }), rng);
    var target = Math.round(ids.length * difficulty);
    var done = 0;
    for (var i = 0; i < ids.length && done < target; i++) {
      var piece = findPiece(level, ids[i]);
      var saved = piece.dir;
      piece.dir = Engine.otherEndpointDir(piece);
      if (piece.dir !== saved && Engine.simulateSolve(level).solvable) done++;
      else piece.dir = saved;
    }
    return done;
  }

  function metrics(level) {
    var state = Engine.createBoard(level);
    var total = level.pieces.length;
    var removable = Engine.getRemovable(state).length;
    var sim = Engine.simulateSolve(level);
    var corners = level.pieces.filter(function (p) { return hasCorner(p.cells); }).length;
    return {
      pieces: total,
      removableAtStart: removable,
      removableRatio: total ? removable / total : 0,
      waves: sim.waves,
      solvable: sim.solvable,
      cornerPieces: corners,
    };
  }
  function hasCorner(cells) {
    if (cells.length < 3) return false;
    var allR = cells.every(function (c) { return c.r === cells[0].r; });
    var allC = cells.every(function (c) { return c.c === cells[0].c; });
    return !allR && !allC; // ikke ren rett linje => har hjørne
  }

  // Blås opp en figur k× (hver celle -> k×k blokk), behold farger, og behold
  // nøyaktig 1 celle margin rundt. Gir større/tettere brett (brukt fra level 30).
  function scaleCells(iconCells, k) {
    var cells = [];
    iconCells.cells.forEach(function (c) {
      var r0 = (c.r - 1) * k + 1, c0 = (c.c - 1) * k + 1; // -1: fjern gammel margin før skalering
      for (var dr = 0; dr < k; dr++) for (var dc = 0; dc < k; dc++) {
        cells.push({ r: r0 + dr, c: c0 + dc, color: c.color });
      }
    });
    return {
      cells: cells, name: iconCells.name, color: iconCells.color,
      rows: (iconCells.rows - 2) * k + 2, cols: (iconCells.cols - 2) * k + 2,
    };
  }

  /*
   * Hovedinngang: lag et brett fra et ikon.
   *   opts: { seed, difficulty (0..1), maxArm, cornerChance, specialChance, scale }
   * Figuren er allerede beskåret til nøyaktig 1 celle margin av iconToCells, så
   * brettet er like stort som figuren + margin (figuren fyller plassen).
   * `scale` (>1) blåser opp figuren for større/tettere brett.
   */
  function generate(icon, opts) {
    opts = opts || {};
    var seed = opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed;
    var difficulty = opts.difficulty == null ? 0.5 : opts.difficulty;
    var scale = opts.scale && opts.scale > 1 ? Math.floor(opts.scale) : 1;
    var iconCells = Icons.iconToCells(icon);
    if (scale > 1) iconCells = scaleCells(iconCells, scale);
    var rows = iconCells.rows, cols = iconCells.cols;
    var rng = makeRng(seed);

    var segments = partition(iconCells.cells, rows, cols, rng, {
      maxArm: opts.maxArm || 3,
      cornerChance: opts.cornerChance == null ? 0.55 : opts.cornerChance,
      specialChance: opts.specialChance,
    });
    var level = buildLevel(iconCells, segments, rows, cols);
    var removed = ensureSolvable(level, rng);
    var flips = injectDifficulty(level, rng, difficulty);

    level.seed = seed;
    level.meta = { removed: removed, flips: flips, metrics: metrics(level) };
    return level;
  }

  return {
    makeRng: makeRng,
    partition: partition,
    buildLevel: buildLevel,
    ensureSolvable: ensureSolvable,
    injectDifficulty: injectDifficulty,
    metrics: metrics,
    generate: generate,
  };
});
