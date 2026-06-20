/*
 * icons.js — Ikonbibliotek for Almas labyrintspill.
 *
 * Hvert ikon er et rutenett-mønster. '.' (eller mellomrom) = tom celle. Alle
 * andre tegn = celle som fylles med strek. '#' bruker ikonets standardfarge
 * (`color`); andre tegn slår opp farge i `colors`-kartet (f.eks. b -> brun) slik
 * at ÉN figur kan ha FLERE farger for bedre likhet med motivet. Generatoren
 * deler de fylte cellene opp i streker (rette, L-formede og noen lengre med flere
 * vinkler), og grupperer kun celler med SAMME farge i samme strek.
 *
 * `iconToCells` beskjærer automatisk til figurens omriss og legger nøyaktig ÉN
 * tom celle som margin på alle fire sider, så figuren alltid fyller brettet.
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
      name: "Måne", color: "#f4cf5a",
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
      name: "Hus", color: "#d9534f", colors: { w: "#e8b97f" },
      grid: [
        "......#......",
        ".....###.....",
        "....#####....",
        "...#######...",
        "..#########..",
        ".###########.",
        "#############",
        "wwwwwwwwwwwww",
        "wwwwwwwwwwwww",
        "wwwww...wwwww",
        "wwwww...wwwww",
        "wwwww...wwwww",
      ],
    },
    {
      name: "Tre", color: "#3aa657", colors: { b: "#8a5a2b" },
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
        ".....bbb.....",
        ".....bbb.....",
        ".....bbb.....",
        "....bbbbb....",
      ],
    },
    {
      name: "Båt", color: "#2c8fc9",
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
      name: "Rakett", color: "#c0c4cc", colors: { t: "#e74c3c", w: "#36b1c9", f: "#ef6c3a" },
      grid: [
        "....t....",
        "...ttt...",
        "...t.t...",
        "..tt.tt..",
        "..#####..",
        "..##w##..",
        "..##w##..",
        "..#####..",
        "..#####..",
        ".#######.",
        ".f.f.f.f.",
        "ff.....ff",
        "f.......f",
        ".f.....f.",
      ],
    },
  ];

  // Gjør om ett ikon til liste av fylte celler {r,c,color} + dimensjoner.
  // Hver celle får sin farge (## = standardfarge, andre tegn via `colors`).
  // Figuren beskjæres til sitt omriss og får nøyaktig 1 celle margin på hver side.
  function iconToCells(icon) {
    var colors = icon.colors || {};
    var raw = [];
    for (var r = 0; r < icon.grid.length; r++) {
      var lineStr = icon.grid[r];
      for (var c = 0; c < lineStr.length; c++) {
        var ch = lineStr[c];
        if (ch === "." || ch === " ") continue;
        var col = ch === "#" ? icon.color : (colors[ch] || icon.color);
        raw.push({ r: r, c: c, color: col });
      }
    }
    if (raw.length === 0) return { cells: [], rows: 1, cols: 1, name: icon.name, color: icon.color };
    var minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    raw.forEach(function (p) {
      if (p.r < minR) minR = p.r; if (p.r > maxR) maxR = p.r;
      if (p.c < minC) minC = p.c; if (p.c > maxC) maxC = p.c;
    });
    // +1 fordi vi vil ha nøyaktig én tom margincelle rundt figuren.
    var cells = raw.map(function (p) {
      return { r: p.r - minR + 1, c: p.c - minC + 1, color: p.color };
    });
    return {
      cells: cells,
      rows: (maxR - minR + 1) + 2,
      cols: (maxC - minC + 1) + 2,
      name: icon.name, color: icon.color,
    };
  }

  function cellCount(icon) { return iconToCells(icon).cells.length; }

  // Kjønnsartikkel (en/et) for figurnavn — brukes i tekst som «neste er et hus».
  var ARTICLES = {
    "Stjerne": "en", "Måne": "en", "Sol": "en", "Hjerte": "et", "Eple": "et",
    "Hus": "et", "Tre": "et", "Båt": "en", "Katt": "en", "Fisk": "en",
    "Bil": "en", "Rakett": "en",
  };
  function article(icon) { return (icon && ARTICLES[icon.name]) || "en"; }

  // Ikoner sortert etter størrelse (stigende) = reise-modusens rekkefølge.
  function bySize() {
    return ICONS.slice().sort(function (a, b) { return cellCount(a) - cellCount(b); });
  }

  return { ICONS: ICONS, iconToCells: iconToCells, cellCount: cellCount, bySize: bySize, article: article };
});
