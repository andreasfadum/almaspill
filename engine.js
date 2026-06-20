/*
 * engine.js — Spillmotor for Almas labyrintspill (ren logikk, ingen UI).
 *
 * Kjører i både Node (for selvtest) og nettleser (for spillet).
 *
 * En "strek" (piece) er et sammenhengende sett celler — rett ELLER med hjørner
 * (L-form). Streken har en pil som peker i én retning (U/D/L/R).
 *
 * Når man trykker på en strek, glir HELE streken stivt i pilretningen, ett steg
 * (én rute) av gangen:
 *   - Klarer alle cellene å forlate brettet uten å treffe noe -> streken kjører
 *     ut, fjernes, +poeng.
 *   - Treffer en celle en annen strek underveis -> krasj, -poeng, blir stående.
 *   - Null poeng = tapt. Tomt brett = løst.
 *
 * Viktig egenskap: å fjerne en strek frigjør bare ruter og kan aldri blokkere en
 * annen strek. Derfor er et brett løsbart hvis og bare hvis man, ved gjentatt å
 * fjerne alle streker med klar vei, til slutt tømmer brettet.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEFAULT_CONFIG = {
    startScore: 100, // startpoeng
    exitReward: 10, // poeng for vellykket utkjøring
    crashPenalty: 25, // poengtap ved krasj (økt for å gjøre feil dyrere)
    timePenaltyPerSec: 1, // poengtap for hvert sekund som går (tunbart)
  };

  var DELTA = {
    U: { r: -1, c: 0 },
    D: { r: 1, c: 0 },
    L: { r: 0, c: -1 },
    R: { r: 0, c: 1 },
  };
  function oppositeDir(d) {
    return { U: "D", D: "U", L: "R", R: "L" }[d];
  }
  var ALL_DIRS = ["U", "D", "L", "R"];

  function bbox(cells) {
    var rs = cells.map(function (x) { return x.r; });
    var cs = cells.map(function (x) { return x.c; });
    return {
      minR: Math.min.apply(null, rs), maxR: Math.max.apply(null, rs),
      minC: Math.min.apply(null, cs), maxC: Math.max.apply(null, cs),
    };
  }

  // -- Bygg brett-tilstand ---------------------------------------------------
  function createBoard(level, config) {
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || {}, level.config || {});
    var pieces = {};
    level.pieces.forEach(function (p) {
      pieces[p.id] = {
        id: p.id,
        cells: p.cells.map(function (c) { return { r: c.r, c: c.c }; }), // sti-rekkefølge bevares
        dir: p.dir,
        color: p.color || "#444",
      };
    });
    return {
      rows: level.rows,
      cols: level.cols,
      pieces: pieces,
      score: cfg.startScore,
      config: cfg,
      iconName: level.iconName || null,
    };
  }

  function inBounds(state, r, c) {
    return r >= 0 && r < state.rows && c >= 0 && c < state.cols;
  }

  // Oppslag celle -> pieceId (ekskluder eventuell strek).
  function occupancy(state, excludeId) {
    var grid = {};
    Object.keys(state.pieces).forEach(function (id) {
      if (id === excludeId) return;
      state.pieces[id].cells.forEach(function (cell) {
        grid[cell.r + "," + cell.c] = id;
      });
    });
    return grid;
  }

  // Sveip streken steg for steg i pilretningen.
  // Returnerer {result:'exit', steps} eller
  //            {result:'crash', freeSteps, collisionCell, blockerId}.
  function evaluateMove(state, piece) {
    var d = DELTA[piece.dir];
    var grid = occupancy(state, piece.id);
    var maxStep = state.rows + state.cols + 4;
    for (var k = 1; k <= maxStep; k++) {
      var anyIn = false;
      for (var i = 0; i < piece.cells.length; i++) {
        var nr = piece.cells[i].r + d.r * k;
        var nc = piece.cells[i].c + d.c * k;
        if (inBounds(state, nr, nc)) {
          anyIn = true;
          var b = grid[nr + "," + nc];
          if (b) {
            return { result: "crash", freeSteps: k - 1, collisionCell: { r: nr, c: nc }, blockerId: b };
          }
        }
      }
      if (!anyIn) return { result: "exit", steps: k };
    }
    return { result: "exit", steps: maxStep };
  }

  // null hvis veien er klar (utkjøring mulig), ellers kollisjonsinfo.
  function firstCollision(state, piece) {
    var m = evaluateMove(state, piece);
    if (m.result === "exit") return null;
    return { cell: m.collisionCell, freeSteps: m.freeSteps, blockerId: m.blockerId };
  }

  function pathClear(state, piece) {
    return evaluateMove(state, piece).result === "exit";
  }

  function getRemovable(state) {
    return Object.keys(state.pieces).filter(function (id) {
      return pathClear(state, state.pieces[id]);
    });
  }

  function isSolved(state) {
    return Object.keys(state.pieces).length === 0;
  }

  // Forsøk å flytte en strek.
  function attemptMove(state, id) {
    var piece = state.pieces[id];
    if (!piece) return { result: "none" };
    var m = evaluateMove(state, piece);
    if (m.result === "exit") {
      delete state.pieces[id];
      state.score += state.config.exitReward;
      return {
        result: "exit", id: id, steps: m.steps,
        scoreDelta: state.config.exitReward, score: state.score,
        solved: isSolved(state), gameOver: false,
      };
    }
    state.score -= state.config.crashPenalty;
    if (state.score < 0) state.score = 0;
    return {
      result: "crash", id: id,
      freeSteps: m.freeSteps, collisionCell: m.collisionCell, blockerId: m.blockerId,
      scoreDelta: -state.config.crashPenalty, score: state.score,
      solved: false, gameOver: state.score <= 0,
    };
  }

  // Simuler en perfekt spiller: fjern gjentatte ganger alle streker med klar vei.
  function simulateSolve(level, config) {
    var state = createBoard(level, config);
    var order = [], waves = 0;
    while (!isSolved(state)) {
      var removable = getRemovable(state);
      if (removable.length === 0) break; // vranglås
      removable.forEach(function (id) { order.push(id); delete state.pieces[id]; });
      waves++;
    }
    return {
      solvable: isSolved(state), waves: waves, order: order,
      remaining: Object.keys(state.pieces),
    };
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    DELTA: DELTA,
    ALL_DIRS: ALL_DIRS,
    oppositeDir: oppositeDir,
    bbox: bbox,
    createBoard: createBoard,
    inBounds: inBounds,
    occupancy: occupancy,
    evaluateMove: evaluateMove,
    firstCollision: firstCollision,
    pathClear: pathClear,
    getRemovable: getRemovable,
    isSolved: isSolved,
    attemptMove: attemptMove,
    simulateSolve: simulateSolve,
  };
});
