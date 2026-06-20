# DEVLOG — Almas labyrintspill

Utviklerlogg som holdes oppdatert ved hver endring. Nyeste øverst. Hver
oppføring: dato, hva som ble gjort og hvorfor, og hvordan det ble verifisert.
Spillet ligger live på <https://andreasfadum.github.io/almaspill/> (GitHub Pages
fra `main`). Se `CLAUDE.md` for arkitektur og invarianter.

## Versjoner / tagger
- `v6-stable` (2026-06-20) — siste versjon FØR level-mekanikkene under. Trygg å
  gå tilbake til: `git checkout v6-stable`.

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
