# DEVLOG — Almas labyrintspill

Utviklerlogg som holdes oppdatert ved hver endring. Nyeste øverst. Hver
oppføring: dato, hva som ble gjort og hvorfor, og hvordan det ble verifisert.
Spillet ligger live på <https://andreasfadum.github.io/almaspill/> (GitHub Pages
fra `main`). Se `CLAUDE.md` for arkitektur og invarianter.

## Versjoner / tagger
- `v6-stable` (2026-06-20) — siste versjon FØR level-mekanikkene under. Trygg å
  gå tilbake til: `git checkout v6-stable`.
- `v7-levels` (2026-06-20) — blinkende farekant, endeløs reise, padding (senere
  erstattet), samtidige trykk, skalert straff.

---

## 2026-06-21 — Sterkere streak-belønning (kontinuerlig hurtighet + større kjede)

Ønske: belønn raske streaks mer, så 0,5 s/strek slår 1 s/strek, men hold maks
forutsigbart for «X av Y mulige poeng».

- **Kontinuerlig hurtighetsbonus** (`speedBonusFor`): lineær fra `SPEED_MAX` (20,
  ved 0 ms) til 0 ved `SPEED_WINDOW` (2,5 s). Erstatter de gamle bøttene
  (<1,2 s=10 …) som gjorde 0,5 s og 1 s like.
- **Større kjede-bonus**: `min(streak, COMBO_CAP=15) * COMBO_STEP=3` (maks 45 per
  strek), opp fra `min(streak,6)*2` (maks 12).
- **`maxScoreForPieces`** oppdatert til `exitReward + SPEED_MAX + min(i,15)*3` —
  må holdes i synk med `computeExitBonus`.
- Måling: 15×0,5 s ≈ 754, 15×1 s ≈ 698, 15×2 s ≈ 586; teoretisk maks (gap→0) for
  15 = 810 = nøyaktig et perfekt løp (predikerbart). Verifisert med node-logikktest
  + jsdom (vinner-skjerm viser «X av Y mulige poeng», ingen kjøretidsfeil) +
  `selftest` grønn.

## 2026-06-20 — Tette figurer, flerfarge, ny vinner-skjerm, rekorder, kun Restart

To batcher samme dag (etter v7):

**Batch A (commit c1d0623):**
- **1-celle margin:** `iconToCells` beskjærer hver figur til omrisset + nøyaktig
  1 tom celle på hver side. Erstatter v7-paddingen — figuren fyller plassen, og
  `fitCell` gir større celler (tydeligere). Selvtest håndhever margin == 1.
- **Flere farger per figur:** ikon-grid kan bruke ulike tegn (fargekart i
  `colors`); `iconToCells` gir per-celle-farge. Generatoren grupperer KUN celler
  med samme farge i samme strek. Tre/Hus/Rakett fikk flerfarge.
- **Lengre fler-vinkel-streker:** `growPath` støtter flere hjørner; noen få
  «spesielle» streker er lengre med flere vinkler (`specialChance`).
  `ensureSolvable` fikk «kick»-perturbasjon → removedMax tilbake til 1.
- **Farekant:** straff hevet til 200; **oransje forvarsel** på neste kant 0,5 s
  før byttet (overlapper forrige). `drawDanger`/`scheduleDangerCycle`.

**Batch B (denne commit):**
- **Grønn kant (level 20+) blinker 5 s**, rød (10–19) 3 s (`dangerIntervalMs`).
- **Ny vinner-skjerm:** «Du klarte level X!» + poeng tjent på brettet vs.
  teoretisk maks (`maxScoreForPieces`) i prosent; «Level X var en/et [figur],
  neste er en/et [figur]»; forrige figur øverst og neste figur nederst (miniIcon).
  Kjønnsartikkel via `Icons.article`.
- **Knapper forenklet:** Reise/Velg figur/Nytt brett fjernet → kun **Restart**
  (+ Rekorder). Spillet er nå reise-only (fri modus fjernet).
- **Utvidede rekorder:** raskest løst level, flest poeng på ett level, høyeste
  level, og beste totalscore (topp 10). Ny lagringsnøkkel `alma_labyrint_records_v2`
  (gamle high scores nullstilles). `recordLevelStats`/`recordTotalRun`/`recordsHtml`.

**Verifisert:** `node selftest.js` grønn (43 sjekker); jsdom-røyktest driver
reisen til level 20 og bekrefter ny vinner-skjerm (2 figurer + maks-poeng),
regel-skjermer, farekant, kun-Restart-knapp, og at rekord-skjermen bygges — ingen
kjøretidsfeil.

---

## 2026-06-20 — Level-mekanikker, samtidige trykk, padding, blinkende farekant

Stor runde med flere ønsker fra Andreas/Alma:

1. **Samtidige trykk (flyt).** Fjernet den globale `busy`-låsen som hindret all
   input mens en strek animerte. Nå avgjøres trekket logisk MED ÉN GANG (poeng +
   fjerning), og slange-animasjonen er rent kosmetisk. Poeng-popup har
   `pointer-events: none` og blokkerer aldri. Krasj har en kort per-strek
   nedkjøling (`crashCooldown`) så et dobbelttrykk ikke gir dobbel straff, men
   alle andre streker kan trykkes hele tiden.
2. **Figurnavn:** `Maane`→`Måne`, `Baat`→`Båt` (viste «dobbel-a» i velgeren).
3. **Padding fra level 6:** `Generator.generate({ pad })` legger tomme rader/
   kolonner rundt figuren (`padForIndex` i UI). Gir mer luft så silhuetten blir
   tydeligere og streker har plass til å gli ut.
4. **Endeløs reise:** reisen slutter ikke lenger etter siste ikon — den sykler
   ikonene med stadig høyere vanskelighet, så level 10/20-mekanikkene nås.
5. **Blinkende farekant (level 10+):** én skjermkant blinker og bytter side hvert
   3. sekund (tilfeldig av de fire). Level 10–19: kjører en strek UT gjennom den
   blinkende (røde) kanten → **−100**. Level 20+: man må treffe KUN den blinkende
   (grønne) kanten — treffer man andre kanter → **−200**. Regelen vises på en
   egen skjerm før level 10 og 20 starter.
6. **Skalert kollisjonsstraff:** krasj mot annen strek koster nå mer per level —
   2× grunnstraff allerede fra level 1, +grunnstraff per level
   (`crashForLevel`). Settes per brett via `createBoard({ crashPenalty })`.
7. **Vis fullført level:** «Level N klart!» vises etter hver løste level.

**Verifisert:** `node selftest.js` grønn (inkl. nye tester for reward-override og
padding-løsbarhet); jsdom-røyktest uten kjøretidsfeil; manuell sjekk av live-URL.

## Tidligere (oppsummert fra CLAUDE.md-endringslogg)
- v6: roligere kjede-popup (kun hver 10. + ved slutt), tidsstraff etter 10 s frist, doblet til 2/sek.
- v5: tydeligere poeng-«smell», krasj-rist med voksende −tall, hurtighetsbonus + kjede.
- v4: slange-bevegelse (pil i én ende, L retter seg ut langs aksen).
- v1–v3: kjernemekanikk, L-streker, tid/poeng, high score, konfetti.
