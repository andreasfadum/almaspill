/*
 * engine.js — Spillmotor for Almas labyrintspill (ren logikk, ingen UI).
 *
 * Kjører i både Node (for selvtest) og nettleser (for spillet).
 *
 * En "strek" (piece) er et sammenhengende sett celler — rett ELLER med hjørner
 * (L-form). Streken har en pil i ÉN ENDE som peker UTOVER langs den endens akse.
 *
 * Når man trykker på en strek, trekker den seg UT som en slange: «hodet» (enden
 * med pilen) glir i pilretningen, og resten av streken følger etter i hodets
 * spor. En L-form retter seg dermed gradvis ut til en rett linje før den
 * forlater brettet — bevegelsen følger kun pilens akse som en linje.
 *   - Klar akse ut (ingen annen strek på strålen fra hodet til kanten) -> streken
 *     sklir ut, fjernes, +poeng.
 *   - En annen strek står i veien på strålen -> krasj, -poeng, blir stående.
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
    timePenaltyPerSec: 2, // poengtap for hvert sekund som går (etter en frist; se UI)
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

  // Retningen fra celle `from` til nabocelle `to` (de ligger inntil hverandre).
  function vecToDir(from, to) {
    if (to.r < from.r) return "U";
    if (to.r > from.r) return "D";
    if (to.c < from.c) return "L";
    return "R";
  }

  // Gyldige pil-retninger for en strek: pilen kan kun sitte i en ENDE og peke
  // utover langs den endens akse. Rett strek -> to motsatte retninger. L-form ->
  // to perpendikulære. Enkeltcelle -> alle fire (et punkt har ingen akse).
  function endpointDirs(piece) {
    var cells = piece.cells;
    if (cells.length === 1) return ALL_DIRS.slice();
    var dA = vecToDir(cells[1], cells[0]);
    var dB = vecToDir(cells[cells.length - 2], cells[cells.length - 1]);
    return [dA, dB];
  }

  // Hodecellen (der pilen sitter) gitt strekens retning.
  function headCell(piece) {
    var cells = piece.cells;
    if (cells.length === 1) return cells[0];
    var dA = vecToDir(cells[1], cells[0]);
    return piece.dir === dA ? cells[0] : cells[cells.length - 1];
  }

  // Den andre gyldige ende-retningen (brukes for å "snu" pilen til motsatt ende).
  function otherEndpointDir(piece) {
    if (piece.cells.length === 1) return oppositeDir(piece.dir);
    var dirs = endpointDirs(piece);
    return piece.dir === dirs[0] ? dirs[1] : dirs[0];
  }

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

  // Slange-bevegelse: HODET glir steg for steg langs pilens akse, og kroppen
  // følger etter i hodets spor. Da må kun strålen fra hodet være klar — kroppen
  // beveger seg bare inn i ruter den selv akkurat forlot. Derfor avgjøres alt av
  // om strålen fra hodet til kanten er fri for andre streker.
  // Returnerer {result:'exit', steps} eller
  //            {result:'crash', freeSteps, collisionCell, blockerId}.
  function evaluateMove(state, piece) {
    var d = DELTA[piece.dir];
    var head = headCell(piece);
    var grid = occupancy(state, piece.id);
    var maxStep = state.rows + state.cols + 4;
    for (var k = 1; k <= maxStep; k++) {
      var nr = head.r + d.r * k;
      var nc = head.c + d.c * k;
      if (!inBounds(state, nr, nc)) {
        // Hodet forlater brettet; kroppen følger sporet ut -> full utkjøring.
        return { result: "exit", steps: k + piece.cells.length - 1 };
      }
      var b = grid[nr + "," + nc];
      if (b) {
        return { result: "crash", freeSteps: k - 1, collisionCell: { r: nr, c: nc }, blockerId: b };
      }
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
  //   opts.bonus  (valgfri) hurtighetsbonus lagt til utkjøringspoengene.
  //   opts.reward (valgfri) OVERSTYRER poengendringen helt — brukes når en
  //               utkjøring i stedet skal STRAFFES (f.eks. feil/blinkende kant),
  //               da sendes et negativt tall inn. Streken fjernes uansett.
  function attemptMove(state, id, opts) {
    var piece = state.pieces[id];
    if (!piece) return { result: "none" };
    var m = evaluateMove(state, piece);
    if (m.result === "exit") {
      var bonus = (opts && opts.bonus) ? opts.bonus : 0;
      var reward = (opts && opts.reward != null) ? opts.reward : state.config.exitReward + bonus;
      delete state.pieces[id];
      state.score += reward;
      if (state.score < 0) state.score = 0;
      return {
        result: "exit", id: id, steps: m.steps, bonus: bonus, reward: reward,
        scoreDelta: reward, score: state.score,
        solved: isSolved(state), gameOver: state.score <= 0,
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
    vecToDir: vecToDir,
    endpointDirs: endpointDirs,
    headCell: headCell,
    otherEndpointDir: otherEndpointDir,
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
