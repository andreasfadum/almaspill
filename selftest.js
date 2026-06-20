/*
 * selftest.js — Automatisk selvtest for Almas labyrintspill.
 *
 * Kjør:  node selftest.js
 *
 * Tester:
 *   1) Spillmotorens mekanikk for både RETTE og L-formede streker
 *      (utkjøring, krasj, poeng, tap, løst, vranglås).
 *   2) Brettgeneratoren: HVERT ikon over mange seeds/vanskelighetsgrader skal
 *      gi et LØSBART brett (kan fullføres uten tvungen krasj) og være passe
 *      vanskelig (ikke alt kan fjernes med én gang). Hjørne-streker skal finnes.
 *
 * Avslutter med kode 0 ved suksess, 1 ved feil — så bygg→test-loopen ser det.
 */
var Engine = require("./engine");
var Icons = require("./icons");
var Generator = require("./generator");

var failures = [], passes = 0;
function check(name, cond, detail) {
  if (cond) passes++;
  else failures.push(name + (detail ? " — " + detail : ""));
}

// ---------------------------------------------------------------------------
// DEL 1: Enhetstester av spillmotoren
// ---------------------------------------------------------------------------
(function unitTests() {
  // Rett strek, klar vei -> utkjøring + poeng + løst
  var s1 = Engine.createBoard({ rows: 1, cols: 3, pieces: [{ id: "a", cells: [{ r: 0, c: 0 }], dir: "R" }] });
  var r1 = Engine.attemptMove(s1, "a");
  check("rett: utkjoring", r1.result === "exit", r1.result);
  check("rett: +poeng", r1.scoreDelta === Engine.DEFAULT_CONFIG.exitReward);
  check("rett: lost", r1.solved === true);

  // Hurtighetsbonus legges til utkjøringspoengene
  var sb = Engine.createBoard({ rows: 1, cols: 3, pieces: [{ id: "a", cells: [{ r: 0, c: 0 }], dir: "R" }] });
  var rb = Engine.attemptMove(sb, "a", { bonus: 7 });
  check("bonus: utkjoring + bonus", rb.scoreDelta === Engine.DEFAULT_CONFIG.exitReward + 7, "" + rb.scoreDelta);
  check("bonus: reward-felt", rb.reward === Engine.DEFAULT_CONFIG.exitReward + 7);
  check("bonus: uten bonus uendret", Engine.attemptMove(
    Engine.createBoard({ rows: 1, cols: 3, pieces: [{ id: "a", cells: [{ r: 0, c: 0 }], dir: "R" }] }), "a"
  ).scoreDelta === Engine.DEFAULT_CONFIG.exitReward);

  // Rett strek blokkert -> krasj
  var s2 = Engine.createBoard({ rows: 1, cols: 3, pieces: [
    { id: "a", cells: [{ r: 0, c: 0 }], dir: "R" },
    { id: "b", cells: [{ r: 0, c: 2 }], dir: "R" },
  ] });
  var r2 = Engine.attemptMove(s2, "a");
  check("rett: krasj", r2.result === "crash", r2.result);
  check("rett: -poeng", r2.scoreDelta === -Engine.DEFAULT_CONFIG.crashPenalty);
  check("rett: staar igjen", !!s2.pieces["a"]);
  check("rett: kollisjonscelle", r2.collisionCell && r2.collisionCell.c === 2);
  check("rett: freeSteps=1", r2.freeSteps === 1, "" + r2.freeSteps);

  // Tap ved null poeng
  var s3 = Engine.createBoard({ rows: 1, cols: 3, pieces: [
    { id: "a", cells: [{ r: 0, c: 0 }], dir: "R" }, { id: "b", cells: [{ r: 0, c: 2 }], dir: "R" },
  ] }, { startScore: 10, crashPenalty: 10 });
  var r3 = Engine.attemptMove(s3, "a");
  check("tap: score 0", r3.score === 0, "" + r3.score);
  check("tap: gameOver", r3.gameOver === true);

  // L-formet strek: klar vei ned -> utkjøring
  var L = function () { return { id: "L", cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }], dir: "D" }; };
  var s4 = Engine.createBoard({ rows: 3, cols: 2, pieces: [L()] });
  check("L: klar vei ned", Engine.pathClear(s4, s4.pieces["L"]));
  var r4 = Engine.attemptMove(s4, "L");
  check("L: kjorer ut", r4.result === "exit");

  // L-formet strek blokkert av brikke under hjørnet
  var s5 = Engine.createBoard({ rows: 3, cols: 2, pieces: [
    L(), { id: "blk", cells: [{ r: 2, c: 1 }], dir: "U" },
  ] });
  check("L: blokkert ned", !Engine.pathClear(s5, s5.pieces["L"]));
  var r5 = Engine.attemptMove(s5, "L");
  check("L: krasj mot brikke", r5.result === "crash", r5.result);
  check("L: freeSteps=0", r5.freeSteps === 0, "" + r5.freeSteps);

  // Pil kun i ENDE: gyldige retninger og hodecelle
  var Lp = { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }], dir: "D" };
  var eds = Engine.endpointDirs(Lp);
  check("ende: to gyldige retninger", eds.length === 2 && eds.indexOf("L") >= 0 && eds.indexOf("D") >= 0, eds.join(""));
  var hc = Engine.headCell(Lp);
  check("ende: hode ved D = hjornecelle", hc.r === 1 && hc.c === 1, hc.r + "," + hc.c);
  check("ende: hode ved L = motsatt ende", (function () { var h = Engine.headCell({ cells: Lp.cells, dir: "L" }); return h.r === 0 && h.c === 0; })());
  check("ende: andre ende-retning", Engine.otherEndpointDir(Lp) === "L", Engine.otherEndpointDir(Lp));

  // SLANGE: L retter seg ut langs aksen — en celle ved SIDEN av kroppen (utenfor
  // hodets stråle) skal IKKE blokkere. (Med gammel stiv gliding ville den krasje.)
  var s4b = Engine.createBoard({ rows: 3, cols: 2, pieces: [
    { id: "L", cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }], dir: "D" },
    { id: "side", cells: [{ r: 2, c: 0 }], dir: "U" },
  ] });
  check("slange: L retter seg ut forbi celle ved siden", Engine.pathClear(s4b, s4b.pieces["L"]));
  check("slange: side-celle blokkeres av L (opp gjennom hjornet)", !Engine.pathClear(s4b, s4b.pieces["side"]));
  var r4b = Engine.attemptMove(s4b, "L");
  check("slange: L kjorer ut", r4b.result === "exit", r4b.result);

  // SLANGE-krasj: noe PÅ hodets stråle stopper streken.
  var s4c = Engine.createBoard({ rows: 4, cols: 2, pieces: [
    { id: "L", cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }], dir: "D" },
    { id: "blk", cells: [{ r: 3, c: 1 }], dir: "U" },
  ] });
  var r4c = Engine.attemptMove(s4c, "L");
  check("slange: krasj pa stralen", r4c.result === "crash", r4c.result);
  check("slange: freeSteps frem til blokk", r4c.freeSteps === 1, "" + r4c.freeSteps);

  // Å fjerne en strek frigjør plass for en annen
  var s6 = Engine.createBoard({ rows: 1, cols: 3, pieces: [
    { id: "a", cells: [{ r: 0, c: 0 }], dir: "L" },
    { id: "b", cells: [{ r: 0, c: 1 }], dir: "L" },
  ] });
  check("frigjor: b blokkert foer", !Engine.pathClear(s6, s6.pieces["b"]));
  Engine.attemptMove(s6, "a");
  check("frigjor: b klar etter", Engine.pathClear(s6, s6.pieces["b"]));

  // Løsbarhet + vranglås
  var solv = Engine.simulateSolve({ rows: 1, cols: 3, pieces: [
    { id: "a", cells: [{ r: 0, c: 0 }], dir: "L" }, { id: "b", cells: [{ r: 0, c: 1 }], dir: "L" },
  ] });
  check("losbar: enkelt", solv.solvable === true);
  var dead = Engine.simulateSolve({ rows: 1, cols: 2, pieces: [
    { id: "a", cells: [{ r: 0, c: 0 }], dir: "R" }, { id: "b", cells: [{ r: 0, c: 1 }], dir: "L" },
  ] });
  check("vranglas oppdages", dead.solvable === false);
})();

// ---------------------------------------------------------------------------
// DEL 2: Generator — løsbarhet, vanskelighet og hjørne-streker
// ---------------------------------------------------------------------------
var difficulties = [0, 0.3, 0.6, 0.9];
var seeds = 40;
var report = [];
var totalLevels = 0, unsolvable = 0, removedTotal = 0, removedMax = 0;
var trivialCount = 0, cornerTotal = 0, highDiffLevels = 0;

Icons.ICONS.forEach(function (icon) {
  var st = { name: icon.name, levels: 0, unsolvable: 0, removed: 0, ratioSum: 0, wavesSum: 0, cornerSum: 0, pieceSum: 0 };
  difficulties.forEach(function (diff) {
    for (var seed = 1; seed <= seeds; seed++) {
      var lvl = Generator.generate(icon, { seed: seed, difficulty: diff });
      var m = lvl.meta.metrics;
      totalLevels++; st.levels++;
      if (!m.solvable) { unsolvable++; st.unsolvable++; }
      removedTotal += lvl.meta.removed; st.removed += lvl.meta.removed;
      if (lvl.meta.removed > removedMax) removedMax = lvl.meta.removed;
      st.ratioSum += m.removableRatio; st.wavesSum += m.waves;
      st.cornerSum += m.cornerPieces; st.pieceSum += m.pieces;
      cornerTotal += m.cornerPieces;
      if (diff >= 0.6) { highDiffLevels++; if (m.removableRatio >= 0.999) trivialCount++; }
    }
  });
  st.avgRatio = st.ratioSum / st.levels;
  st.avgWaves = st.wavesSum / st.levels;
  st.avgCorner = st.cornerSum / st.levels;
  st.avgPieces = st.pieceSum / st.levels;
  report.push(st);
});

// Harde krav
check("generator: alle brett losbare", unsolvable === 0, unsolvable + " av " + totalLevels);
check("generator: faa fjernede streker", removedMax <= 1, "maks fjernet=" + removedMax);
check("generator: hjornestreker finnes", cornerTotal > 0, "totalt hjorner=" + cornerTotal);

// Vanskelighet
var trivialRate = highDiffLevels ? trivialCount / highDiffLevels : 0;
check("vanskelighet: faa trivielle paa hoy diff", trivialRate < 0.25, "triviell andel=" + (trivialRate * 100).toFixed(1) + "%");

// ---------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------
console.log("\n=== SELVTEST: Almas labyrintspill (v2) ===\n");
console.log("Ikon       | brett | uløsb | streker | hjørner | klar% | bølger");
console.log("-----------+-------+-------+---------+---------+-------+-------");
report.forEach(function (s) {
  console.log(
    pad(s.name, 10) + " | " + pad("" + s.levels, 5) + " | " + pad("" + s.unsolvable, 5) + " | " +
    pad(s.avgPieces.toFixed(1), 7) + " | " + pad(s.avgCorner.toFixed(1), 7) + " | " +
    pad((s.avgRatio * 100).toFixed(0) + "%", 5) + " | " + s.avgWaves.toFixed(1)
  );
});
console.log("\nTotalt brett testet: " + totalLevels);
console.log("Uløsbare: " + unsolvable + " | Fjernede streker: " + removedTotal + " (maks " + removedMax + ")");
console.log("Hjørne-streker totalt: " + cornerTotal);
console.log("Trivielle på høy vanskelighet: " + (trivialRate * 100).toFixed(1) + "%");

console.log("\n--- Resultat ---");
console.log("Bestått: " + passes + " sjekker");
if (failures.length) {
  console.log("FEILET: " + failures.length + " sjekker");
  failures.forEach(function (f) { console.log("  X " + f); });
  process.exit(1);
} else {
  console.log("ALLE SJEKKER BESTATT");
  process.exit(0);
}

function pad(s, n) { s = "" + s; while (s.length < n) s += " "; return s.slice(0, n); }
