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

  // Del fylte celler i streker (rette eller L-form), i sti-rekkefølge.
  function partition(cells, rows, cols, rng, opts) {
    opts = opts || {};
    var maxArm = opts.maxArm || 3;     // maks lengde per arm
    var cornerChance = opts.cornerChance == null ? 0.55 : opts.cornerChance;
    var filled = {};
    cells.forEach(function (x) { filled[x.r + "," + x.c] = true; });
    var used = {};
    var order = shuffle(cells.slice(), rng);
    var segments = [];

    function freeGlobal(r, c) {
      var k = r + "," + c;
      return filled[k] && !used[k];
    }

    order.forEach(function (cell) {
      if (used[cell.r + "," + cell.c]) return;
      var path = growPath(cell, freeGlobal, rng, maxArm, cornerChance);
      path.forEach(function (c) { used[c.r + "," + c.c] = true; });
      segments.push(path);
    });
    return segments;
  }

  function growPath(start, freeGlobal, rng, maxArm, cornerChance) {
    var path = [{ r: start.r, c: start.c }];
    var inPath = {};
    inPath[start.r + "," + start.c] = true;

    var dirs = shuffle(DIRS4.slice(), rng);
    // Arm 1
    var arm1 = null;
    for (var i = 0; i < dirs.length; i++) {
      var dr = dirs[i][0], dc = dirs[i][1];
      if (freeGlobal(start.r + dr, start.c + dc) && !inPath[(start.r + dr) + "," + (start.c + dc)]) {
        arm1 = dirs[i]; break;
      }
    }
    if (!arm1) return path; // enkeltcelle
    var len1 = 1 + Math.floor(rng() * maxArm);
    var rr = start.r, cc = start.c, n = 0;
    while (n < len1 && freeGlobal(rr + arm1[0], cc + arm1[1]) && !inPath[(rr + arm1[0]) + "," + (cc + arm1[1])]) {
      rr += arm1[0]; cc += arm1[1];
      path.push({ r: rr, c: cc }); inPath[rr + "," + cc] = true; n++;
    }

    // Arm 2 (hjørne) — perpendikulær på arm 1
    if (rng() < cornerChance) {
      var perp = arm1[0] === 0 ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
      shuffle(perp, rng);
      var arm2 = null;
      for (var j = 0; j < perp.length; j++) {
        if (freeGlobal(rr + perp[j][0], cc + perp[j][1]) && !inPath[(rr + perp[j][0]) + "," + (cc + perp[j][1])]) {
          arm2 = perp[j]; break;
        }
      }
      if (arm2) {
        var len2 = 1 + Math.floor(rng() * (maxArm - 1) + 0.0001);
        var m = 0;
        while (m < len2 && freeGlobal(rr + arm2[0], cc + arm2[1]) && !inPath[(rr + arm2[0]) + "," + (cc + arm2[1])]) {
          rr += arm2[0]; cc += arm2[1];
          path.push({ r: rr, c: cc }); inPath[rr + "," + cc] = true; m++;
        }
      }
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
        cells: seg,
        dir: chooseEndpointDir(seg, rows, cols),
        color: iconCells.color,
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
    var removed = 0;
    for (var outer = 0; outer < 400; outer++) {
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
      } else {
        // Lokalt minimum: fjern én fastlåst strek som siste utvei.
        var stuck = Engine.simulateSolve(level).remaining;
        var victim = stuck[Math.floor(rng() * stuck.length)] || stuck[0];
        level.pieces = level.pieces.filter(function (p) { return p.id !== victim; });
        removed++;
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

  /*
   * Hovedinngang: lag et brett fra et ikon.
   *   opts: { seed, difficulty (0..1), maxArm, cornerChance, pad }
   * pad legger `pad` tomme rader/kolonner rundt figuren på alle fire sider, så
   * brettet blir større og silhuetten tydeligere (figuren flyttes inn til midten).
   */
  function generate(icon, opts) {
    opts = opts || {};
    var seed = opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed;
    var difficulty = opts.difficulty == null ? 0.5 : opts.difficulty;
    var pad = opts.pad || 0;
    var iconCells = Icons.iconToCells(icon);
    var rows = iconCells.rows + pad * 2, cols = iconCells.cols + pad * 2;
    var cells = pad
      ? iconCells.cells.map(function (c) { return { r: c.r + pad, c: c.c + pad }; })
      : iconCells.cells;
    var rng = makeRng(seed);

    var segments = partition(cells, rows, cols, rng, {
      maxArm: opts.maxArm || 3,
      cornerChance: opts.cornerChance == null ? 0.55 : opts.cornerChance,
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
