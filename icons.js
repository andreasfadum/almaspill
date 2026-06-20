/*
 * icons.js — Ikonbibliotek for Almas labyrintspill.
 *
 * Hvert ikon er et rutenett-mønster. '#' = celle som fylles med strek,
 * '.' = tom. De fylte cellene danner figurens omriss. Generatoren deler dem
 * opp i streker (rette og L-formede).
 *
 * Matrisene er forholdsvis store og detaljerte for at figurene skal være lett
 * gjenkjennbare og brettene store nok til å bli utfordrende. Nye ikoner legges
 * enkelt til her (mål på sikt: 100 stk).
 *
 * Hold radene i ett ikon like lange (samme antall tegn).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Icons = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ICONS = [
    {
      name: "Stjerne", color: "#f2b705",
      grid: [
        "......#......",
        ".....###.....",
        ".....###.....",
        "....#####....",
        "...#######...",
        ".###########.",
        "#############",
        ".###########.",
        "...#######...",
        "....#####....",
        ".....###.....",
        ".....###.....",
        "......#......",
      ],
    },
    {
      name: "Maane", color: "#f4cf5a",
      grid: [
        ".....#####...",
        "...########..",
        "..########...",
        ".########....",
        ".#######.....",
        ".######......",
        ".######......",
        ".######......",
        ".#######.....",
        ".########....",
        "..########...",
        "...########..",
        ".....#####...",
      ],
    },
    {
      name: "Sol", color: "#f6a609",
      grid: [
        "......#......",
        "......#......",
        ".#....#....#.",
        "...#######...",
        "..#########..",
        ".###########.",
        "##.#######.##",
        ".###########.",
        "..#########..",
        "...#######...",
        ".#....#....#.",
        "......#......",
        "......#......",
      ],
    },
    {
      name: "Hjerte", color: "#e8485f",
      grid: [
        "..###...###..",
        ".###########.",
        "#############",
        "#############",
        "#############",
        "#############",
        ".###########.",
        "..#########..",
        "...#######...",
        "....#####....",
        ".....###.....",
        "......#......",
      ],
    },
    {
      name: "Eple", color: "#d23b3b",
      grid: [
        "......#......",
        ".....##......",
        "....###......",
        "...#######...",
        "..#########..",
        ".###########.",
        "#############",
        "#############",
        "#############",
        "#############",
        ".###########.",
        "..#########..",
        "...###.###...",
      ],
    },
    {
      name: "Hus", color: "#c8743a",
      grid: [
        "......#......",
        ".....###.....",
        "....#####....",
        "...#######...",
        "..#########..",
        ".###########.",
        "#############",
        "#############",
        "#############",
        "#####...#####",
        "#####...#####",
        "#####...#####",
      ],
    },
    {
      name: "Tre", color: "#3aa657",
      grid: [
        "......#......",
        ".....###.....",
        "....#####....",
        "...#######...",
        "..#########..",
        "...#######...",
        "..#########..",
        ".###########.",
        "#############",
        ".....###.....",
        ".....###.....",
        ".....###.....",
        "....#####....",
      ],
    },
    {
      name: "Baat", color: "#2c8fc9",
      grid: [
        "......#......",
        "......##.....",
        "......###....",
        "......####...",
        "......#####..",
        "......######.",
        "#############",
        ".###########.",
        "..#########..",
        "...#######...",
        "....#####....",
      ],
    },
    {
      name: "Katt", color: "#8a8f99",
      grid: [
        "##.........##",
        "###.......###",
        "#############",
        "#############",
        "#.###.#.###.#",
        "#############",
        "#####.#.#####",
        "#############",
        "#############",
        ".###########.",
        ".##.##.##.##.",
        ".##.##.##.##.",
      ],
    },
    {
      name: "Fisk", color: "#36b1c9",
      grid: [
        ".#######...#.",
        ".########.##.",
        ".#########.##",
        "#############",
        "#############",
        "#############",
        ".#########.##",
        ".########.##.",
        ".#######...#.",
      ],
    },
    {
      name: "Bil", color: "#cf3f4f",
      grid: [
        "....#######..",
        "...#########.",
        "..###########",
        ".############",
        "#############",
        "#############",
        "#############",
        ".##.....##...",
        ".##.....##...",
      ],
    },
    {
      name: "Rakett", color: "#ef6c3a",
      grid: [
        "....#....",
        "...###...",
        "...#.#...",
        "..##.##..",
        "..#####..",
        "..#####..",
        "..#####..",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#.#.#.#.",
        "##.....##",
        "#.......#",
        ".#.....#.",
      ],
    },
  ];

  // Gjør om ett ikon til liste av fylte celler {r,c} + dimensjoner.
  function iconToCells(icon) {
    var cells = [];
    var rows = icon.grid.length;
    var cols = 0;
    for (var r = 0; r < rows; r++) {
      var lineStr = icon.grid[r];
      if (lineStr.length > cols) cols = lineStr.length;
      for (var c = 0; c < lineStr.length; c++) {
        if (lineStr[c] === "#") cells.push({ r: r, c: c });
      }
    }
    return { cells: cells, rows: rows, cols: cols, name: icon.name, color: icon.color };
  }

  function cellCount(icon) { return iconToCells(icon).cells.length; }

  // Ikoner sortert etter størrelse (stigende) = reise-modusens rekkefølge.
  function bySize() {
    return ICONS.slice().sort(function (a, b) { return cellCount(a) - cellCount(b); });
  }

  return { ICONS: ICONS, iconToCells: iconToCells, cellCount: cellCount, bySize: bySize };
});
