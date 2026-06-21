# CLAUDE.md — Almas labyrintspill (prosjektguide for Claude Code)

Denne filen forteller Claude Code hva prosjektet er, hvordan det henger sammen,
hvordan du tester, og hva som gjenstår. Les den før du gjør endringer.

## Hva dette er

Et enkelt, barnevennlig puslespill for nettleser (laget for Alma). Brettet er
fylt med «streker» — korte, sammenhengende linjestykker (rette eller med ett
hjørne / L-form). Hver strek har en pil i ÉN ENDE som peker utover langs den
endens akse. Til sammen danner strekene en gjenkjennbar **figur** (et ikon). Man
trykker på en strek for å trekke den UT av brettet langs pilens akse. Mål: tøm
brettet.

### Spillregler
- Én strek av gangen. Trykk på en strek → streken trekker seg ut som en
  **slange**: «hodet» (enden med pilen) glir i pilretningen, og resten følger
  etter i hodets spor. En L-form retter seg dermed gradvis ut til en rett linje
  før den forlater brettet — bevegelsen følger kun pilens akse.
- **Klar akse ut** (ingen annen strek på strålen fra hodet til kanten) → streken
  kjører ut, forsvinner, **+poeng**, og frigjør plass.
- **En annen strek står på strålen** → krasj: streken blinker rødt, **−poeng**,
  og blir stående (glir tilbake).
- **Tiden tikker poeng nedover** (poeng trekkes per sekund mens man spiller).
- **0 poeng = tapt.** Da vises en **high score-tabell** (poeng, tid, levels).
- Tomt brett = level løst → **konfetti** + «Neste level».

### Modus
Spillet er **reise-only**: én ENDELØS rekke levels i stigende vanskelighet. Ett
ikon per level (små figurer først), ikonene sykler når man har vært gjennom alle.
Poeng og tid følger med gjennom hele reisen. Knappene er forenklet til **Restart**
(start reisen på nytt fra level 1) og **Rekorder**. Figurene fyller alltid brettet
(beskåret til 1 celle margin i `iconToCells`), og nye vanskeligheter introduseres
på egne regel-skjermer (se under).

Etter hver løste level vises en **vinner-skjerm**: «Du klarte level X!», poeng
tjent på brettet vs. teoretisk maks (`maxScoreForPieces`), «Level X var en/et
[figur], neste er en/et [figur]», og forrige + neste figur som små bilder.

### Rekorder
`btnScores` / tap-skjerm viser (localStorage `alma_labyrint_records_v2`):
høyeste level, raskest løst level, flest poeng på ett level, og topp-10 beste
totalscore. `recordLevelStats` (per løste level), `recordTotalRun` (per tapt
runde), `recordsHtml` (visning).

### Level-mekanikker
- **Skalert kollisjonsstraff**: krasj mot annen strek koster mer per level — 2×
  grunnstraff fra level 1, +grunnstraff per level (`crashForLevel`), satt per
  brett via `createBoard({ crashPenalty })`.
- **Blinkende farekant fra level 10**: én skjermkant blinker og bytter side
  tilfeldig — rød (level 10–19) hvert **3.** sekund, grønn (level 20+) hvert
  **5.** sekund (`dangerIntervalMs`). Et **oransje forvarsel** tennes på neste
  kant 0,5 s før byttet og overlapper den forrige (`scheduleDangerCycle`,
  `drawDanger`). Level 10–19: kjører en strek UT gjennom den blinkende (røde)
  kanten → **−200**. Level 20+: man må treffe KUN den blinkende (grønne) kanten —
  andre kanter → **−200**. Regelen vises på egen skjerm før level 10 og 20
  (`showRule`). Logikk: `dangerMode`/`dangerEdge`/`edgePenaltyFor`; straffen
  påføres via `Engine.attemptMove(state, id, { reward: -penalty })`.
- **Samtidige trykk**: ingen global lås — et trekk avgjøres logisk med én gang,
  slange-animasjonen er rent kosmetisk, og poeng-popups (`pointer-events:none`)
  hindrer aldri at man trykker. Krasj har kun en kort per-strek nedkjøling
  (`crashCooldown`).
- **Flere farger per figur**: ikon-grid kan bruke flere tegn med fargekart
  (`colors`); streker grupperes per farge. **Noen få lengre streker** har flere
  vinkler (`growPath` multi-corner, `specialChance`).

## Filstruktur (ingen byggesteg, ingen avhengigheter i spillet)

| Fil | Ansvar |
|-----|--------|
| `index.html` | Hele spillet: UI, SVG-rendering, animasjoner, konfetti, tid/poeng, high score. Laster de tre JS-modulene med `<script src>`. |
| `engine.js` | Ren spilllogikk: brett-tilstand, sveip-/kollisjonsberegning, poeng, løsbarhets-simulator. Ingen DOM. |
| `icons.js` | Ikonbiblioteket: hvert ikon er et rutenett av `#`/`.`. Pluss hjelpere (`iconToCells`, `bySize`). |
| `generator.js` | Lager spillbare brett fra et ikon: deler figuren i streker, gir piler, **garanterer løsbarhet**, legger inn vanskelighet. |
| `selftest.js` | Automatisk selvtest (Node). Verifiserer mekanikk + at alle brett er løsbare og passe vanskelige. |
| `BYGGEINSTRUKS.md` | Den opprinnelige kravspesifikasjonen fra Alma/Andreas. |

Modulene bruker et UMD-mønster slik at de fungerer både i nettleser
(`window.Engine` osv.) og i Node (`require('./engine')`). Behold dette.

## Slik kjører du spillet
Åpne `index.html` i en nettleser (ingen server nødvendig). Tilpasset iPhone/iPad
i stående format.

## Slik tester du (VIKTIG arbeidsflyt: bygg → test → fiks → gjenta)
```bash
node selftest.js     # exit 0 = alt grønt, exit 1 = minst én feil
```
Selvtesten gjør to ting:
1. **Enhetstester** av motoren (rette OG L-streker): utkjøring, krasj, poengtap,
   tap ved 0, løst-deteksjon, og at vranglås oppdages.
2. **Generator-sveip**: for hvert ikon, mange seeds × vanskelighetsgrader, sjekker
   at brettet er **løsbart** (kan tømmes uten tvungen krasj), at ingen streker
   måtte fjernes, at hjørne-streker finnes, og at brett ikke er trivielle.

**Regel for endringer:** etter enhver endring i `engine.js`, `generator.js` eller
`icons.js`, kjør `node selftest.js` til den er grønn før du går videre. Utvid
selvtesten når du legger til funksjonalitet.

### UI-røyktest (valgfritt, ved UI-endringer)
`index.html` kan lastes headless med `jsdom` for å fange kjøretidsfeil:
```bash
npm install jsdom --no-save     # midlertidig; IKKE behold node_modules i mappen
# skriv en liten loader som inliner de tre <script src> og sjekker window.onerror
```
Husk å slette `node_modules` etterpå (det skal ikke ligge i prosjektmappen).

## Sentrale invarianter (ikke bryt disse)
- **Løsbarhet er monoton:** å fjerne en strek frigjør bare ruter og kan aldri
  blokkere en annen. Derfor er et brett løsbart hvis og bare hvis man, ved
  gjentatt å fjerne alle streker med klar vei, tømmer brettet. `simulateSolve`
  bygger på dette — ikke innfør mekanikk som kan blokkere ved fjerning uten å
  revurdere løsbarhetslogikken.
- **Generatoren garanterer løsbarhet.** `ensureSolvable` bruker grådig
  hill-climbing på antall fastlåste streker; fjerning av en strek er siste utvei
  (skal normalt være 0 — selvtesten håndhever `removedMax <= 1`).
- **Strekenes celler lagres i sti-rekkefølge** slik at UI kan tegne dem som
  sammenhengende, avrundede linjer med hjørner. Ikke sorter dem om. Hode/hale og
  gyldige pil-retninger utledes fra første/siste celle (`endpointDirs`,
  `headCell`) — derfor MÅ endene faktisk være endepunkter i rekkefølgen.
- **Pilen sitter alltid i en ende.** En streks `dir` skal alltid være én av
  `Engine.endpointDirs(piece)`. Generatoren (init, `ensureSolvable`,
  `injectDifficulty`) velger kun blant disse — ikke sett vilkårlige retninger.
- **Brett-token i UI:** `boardToken` økes ved hvert nye brett; ventende
  animasjons-callbacks sjekker token og avbryter hvis brettet er byttet. Behold
  dette når du endrer animasjoner.

## Justerbare verdier (balanse)
I `engine.js`, `DEFAULT_CONFIG`:
- `startScore` (100) — startpoeng
- `exitReward` (10) — poeng per strek ut
- `crashPenalty` (25) — grunn-poengtap ved krasj. Skaleres per level i UI
  (`crashForLevel`: base*(1+level)) og settes per brett via `createBoard`.
- `timePenaltyPerSec` (2) — poengtap per sekund, men først etter en frist
  (`TIME_PENALTY_GRACE_SEC` = 10 sek i `index.html`; ingen straff de første 10 s)

Hurtighetsbonus (i `index.html`, `computeExitBonus`): rask fjerning gir ekstra
poeng på toppen av `exitReward`, og raske fjerninger på rad bygger en **kjede**
(combo) som gir enda mer. Bonusen sendes inn til
`Engine.attemptMove(state, id, { bonus })`.
- **Hurtighet** er KONTINUERLIG: `speedBonusFor(gap)` = lineær fra `SPEED_MAX`
  (20, ved 0 ms) til 0 ved `SPEED_WINDOW` (2500 ms). Så 0,5 s gir mer enn 1 s.
- **Kjede** = `min(streak, COMBO_CAP) * COMBO_STEP` (= `min(streak,15)*3`, maks 45
  per strek) — vokser med streak-lengden for å belønne å løse mange raskt.
- **Forutsigbar maks**: maks per strek = `exitReward + SPEED_MAX + min(i,15)*3`,
  og `maxScoreForPieces(n)` summerer dette — MÅ holdes i synk med `computeExitBonus`
  så vinner-skjermens «X av Y mulige poeng» stemmer.
- `COMBO_WINDOW` (2500 ms) styrer hvor raskt neste fjerning må komme for å holde
  kjeden i live. Popup-en vises sjelden: kun ved hver `COMBO_SHOW_EVERY` (10.)
  streak, og når en lang kjede (≥ `COMBO_END_MIN`) tar slutt.

I `index.html`:
- `difficultyForIndex(i)` — vanskelighetsrampe for reise-modus (level 1 enkel).

## Slik legger du til et ikon
Legg et nytt objekt i `ICONS` i `icons.js`:
```js
{ name: "Hund", color: "#a9744f", grid: [
  ".###.....",
  "#####....",
  // ... '#' = celle med strek, '.' = tom. Alle rader like lange.
]}
```
Reise-modus sorterer automatisk etter størrelse (`bySize`). Kjør `node selftest.js`
— den tester det nye ikonet automatisk. Mål på sikt: 100 ikoner.

## Status / endringslogg
- v1: kjernemekanikk med rette streker, 12 ikoner, reise + fri modus, selvtest.
- v2: L-formede (hjørne-)streker, sveip-basert kollisjon, større/mer detaljerte
  ikoner, tid + poeng-per-sekund, high score-tabell, «Neste level», mobiltilpasset.
- v3: høyere krasjstraff (25), konfetti ved fullført brett, enda større
  ikonmatriser (24–49 streker per brett), smartere `ensureSolvable` (0 fjernede).
- v4: **slange-bevegelse**. Pilen sitter nå kun i ÉN ENDE av streken og peker
  utover langs den endens akse (ikke lenger en stiv figur som glir samlet). Ved
  trykk glir hodet i pilretningen og kroppen følger i sporet, så en L-form retter
  seg ut til en rett linje før den forlater brettet. Kollisjon/løsbarhet avgjøres
  nå av om strålen fra hodet til kanten er fri (`evaluateMove` i `engine.js`).
  Nye hjelpere: `Engine.endpointDirs`, `headCell`, `otherEndpointDir`. Generator
  velger pil kun blant gyldige ende-retninger. UI tegner streken på nytt per
  frame langs et «spor» (`animateSnakeExit` i `index.html`).
- v5: tydeligere poeng-feedback. Utkjøring gir et «smell» (stort sprettende
  +tall) og en bump på poeng-pillen; krasj rister streken mens et voksende
  −tall spretter ut av linjen. Ny **hurtighetsbonus** + **kjede (combo)** som
  belønner raske fjerninger (`computeExitBonus`), sendt inn via
  `Engine.attemptMove(state, id, { bonus })`. Tidsstraff per sekund uendret.
- v6: kjede-popup vises kun ved hver 10. streak + når en lang kjede (≥10) ender
  (beregnes fortsatt hver fjerning) — mindre forstyrrende. Tidsstraffen starter
  først etter 10 sekunder (`TIME_PENALTY_GRACE_SEC`) og er doblet til 2/sek.
- v7: endeløs reise + level-mekanikker — padding fra level 6, skalert
  kollisjonsstraff (`crashForLevel`), blinkende farekant (−100 fra level 10,
  −200 «kun riktig kant» fra level 20) med regel-skjermer, samtidige trykk
  (ingen busy-lås), figurnavn med æ/ø/å (Måne/Båt), og «Level N klart!» vises.
  `attemptMove` fikk `opts.reward`-override; konfetti hardnet mot manglende
  canvas. Egen utviklerlogg: se `DEVLOG.md`.
- v8: figurer fyller brettet (beskåret til 1 celle margin), flere farger per
  figur (fargekart + samme-farge-segmentering), noen lengre fler-vinkel-streker,
  oransje farekant-forvarsel (0,5 s før bytte), farekant-straff 200 og grønn kant
  blinker 5 s / rød 3 s. Ny vinner-skjerm (poeng vs. teoretisk maks + forrige/
  neste figur), forenklede knapper (kun Restart + Rekorder, fri modus fjernet),
  og utvidede rekorder (raskest level, flest poeng/level, høyeste level, total).
- v9: sterkere streak-belønning. Hurtighetsbonus er nå KONTINUERLIG
  (`speedBonusFor`, 20→0 over 2,5 s) så 0,5 s slår 1 s, og kjede-bonusen vokser
  mer per streak (`min(streak,15)*3`, maks 45/strek). `maxScoreForPieces` holdt i
  synk så «X av Y mulige poeng» forblir forutsigbart.

## Backlog / ideer til videre arbeid
- Flere ikoner (mot 100). Behold tydelige silhuetter + farger.
- Lyd: kort «svisj» ved utkjøring, «dunk» ved krasj, jubel ved fullført.
- Lagre fremgang i reisen (localStorage) så man kan fortsette senere.
- Vis en liten forhåndsvisning av målfiguren ved start av et level.
- Finjuster balanse (crashPenalty/timePenalty) etter mer testing med Alma.
- Vurder vanskelighetsnivåer (lett/middels/vanskelig) i fri modus.
- Tilgjengelighet: større trykkflater, fargeblind-vennlige paletter.

## Konvensjoner
- Kommentarer og UI-tekst på **norsk (bokmål)**.
- Ingen rammeverk, ingen byggesteg, ingen eksterne avhengigheter i selve spillet.
- Hold motoren ren (ingen DOM) slik at selvtesten kan kjøre i Node.
