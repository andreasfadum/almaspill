# Byggeinstruks: Almas labyrintspill

Dette dokumentet er en komplett spesifikasjon til Claude Code for å bygge et enkelt, men engasjerende, puslespill-/labyrintspill. Reglene kommer fra en samtale mellom Andreas og datteren Alma. Bygg spillet nøyaktig etter reglene under. Der noe er åpent, er det markert med **Valgfritt / din vurdering**.

---

## 1. Kort oppsummering av spillideen

Spilleren ser et brett fylt med korte streker. Hver strek har en pil i enden som peker i én retning (opp, ned, venstre eller høyre). Strekene er lagt ut i et rutenett, alle i 90 graders vinkler, med jevn avstand — slik at det samlede omrisset danner en gjenkjennelig **figur** (et ikon, f.eks. en katt, en bil, et eple).

Når spilleren trykker på en strek, **glir** (animeres) streken i pilens retning langs sin egen akse:

- **Hvis veien ut av brettet er klar:** streken kjører ut av brettet og forsvinner. Spilleren får poeng, og det frigjøres plass slik at andre streker kan flyttes.
- **Hvis streken treffer en annen strek på veien:** den stopper, **blinker rødt**, spilleren får en advarsel om tapte poeng, og streken **kjører tilbake til utgangsposisjonen**.

Målet er å tømme brettet (fjerne alle strekene). Spillet går **ikke på tid**. Hvis poengsummen når **null**, har spilleren tapt.

---

## 2. Spillregler (Almas egne ord, oversatt til presis logikk)

1. **Én strek av gangen.** Spilleren trykker på én strek/pil om gangen. Mens en strek animeres, kan man ikke trykke på en ny.
2. **Pilen viser bevegelsesretningen.** Når man trykker, beveger streken seg i den akseretningen pilen peker, helt til den enten forsvinner ut av brettet eller krasjer i en eksisterende strek.
3. **Klar vei = ut av brettet = poeng.** Er det helt tomt foran streken hele veien til brettkanten, kjører den ut og forsvinner. Spilleren får poeng, og det frigjøres plass.
4. **Blokkert vei = krasj = tap.** Krasjer streken i en annen strek, skal den:
   - animeres frem til den treffer hindringen,
   - **blinke rødt**,
   - gi en **advarsel** om at man har mistet poeng,
   - **kjøre tilbake** til nøyaktig samme posisjon den startet fra.
5. **Null poeng = tapt spill.** Når poengsummen treffer null, er spillet tapt (vis en tydelig «du tapte»-skjerm med mulighet til å prøve igjen).
6. **Mål: tomt brett.** Når alle streker er fjernet, er figuren/nivået løst (vis en feiring + gå videre).

---

## 3. Brettets oppbygning

- Brettet er et **rutenett (grid)**. Hver strek opptar én eller flere ruter i en rett linje (horisontalt eller vertikalt).
- **Alle streker står i 90 grader** (kun vannrett eller loddrett), i et **tilfeldig mønster**, med **lik avstand** mellom strekene — slik eksempelillustrasjonen viser.
- Det **ytre omrisset** av alle strekene til sammen skal danne en **figur** (et ikon fra biblioteket, se punkt 5).
- Hver strek har en pil i én ende som angir retningen den vil bevege seg når man trykker.

### Bevegelseslogikk (presist)
- En strek beveger seg langs sin egen akse i pilens retning.
- Sjekk alle ruter mellom strekens fremre ende og brettkanten i bevegelsesretningen:
  - Er **alle** disse rutene tomme → streken glir ut av brettet (suksess).
  - Er **minst én** rute opptatt av en annen strek → streken glir frem til ruten rett før hindringen, blinker rødt, og glir tilbake (krasj).
- En strek som er kjørt ut, fjernes permanent og frigjør sine ruter.

---

## 4. Poeng (din vurdering — gjør verdiene lett justerbare i koden)

Velg balanserte startverdier og legg dem i en tydelig `CONFIG`-/konstant-blokk øverst i koden, slik at vi kan finjustere etter testing. Forslag som utgangspunkt:

- Startpoeng: f.eks. `100`
- Poeng ved vellykket utkjøring: f.eks. `+10`
- Poengtap ved krasj: f.eks. `−10`
- Spillet tapt ved `0` poeng.

Vis alltid gjeldende poengsum tydelig. Ved krasj: vis kort advarsel/animasjon («−10 poeng!») i tillegg til rødt blink.

---

## 5. Ikonbibliotek (figurene)

**Beslutning for denne iterasjonen:** Start med **10–15 ikoner**, bygg mekanikken først, og utvid biblioteket senere (mål på sikt: 100 ulike, morsomme og lett gjenkjennbare ikoner).

Krav til ikonene:
- Enkle, **lett gjenkjennbare** ting barn liker (f.eks. katt, hund, fisk, bil, hus, sol, stjerne, eple, blomst, ballong, rakett, hjerte, fugl, tre, is).
- Hvert ikon definerer **omrisset/formen** som strekene fylles innenfor — slik at brettet «ser ut som» figuren.
- Lag biblioteket **datadrevet**: hvert ikon er en egen definisjon (f.eks. et rutenett-mønster eller en SVG-/koordinatmal) som labyrintgeneratoren leser fra. Da kan vi enkelt legge til flere ikoner senere uten å endre spillmotoren.
- **Farger:** strekene/pilene kan ha farger som hjelper spilleren å kjenne igjen figuren (f.eks. gul sol, rødt eple). Fargene er en del av ikon-definisjonen.

---

## 6. Nivåer og vanskelighetsgrad

**Beslutning:** Bygg **begge deler**:

1. **Reise-modus (økende vanskelighet):** Start med små brett / få streker. Brettene blir gradvis større og mer floket etter hvert som spilleren fullfører figurer. Hvert nivå = ett ikon.
2. **Fri modus:** Spilleren kan velge hvilken figur/labyrint de vil løse fra biblioteket, uten fast rekkefølge.

La det være lett å legge til nye nivåer (datadrevet, basert på ikonbiblioteket).

---

## 7. Teknologi

- **Plattform: Web (nettleser).** Ren HTML/CSS/JavaScript, slik at det kan kjøres lokalt og testes raskt på PC, Mac og nettbrett.
- Ingen tunge rammeverk er nødvendig; hold det enkelt. Vanilla JS eller et lett oppsett er fint. Bruk gjerne SVG eller Canvas for brett og animasjon.
- **Touch- og musestøtte:** trykk/klikk på en strek skal fungere likt.
- Responsivt design som fungerer på nettbrett.
- Animasjonene (gli ut, krasj, rødt blink, gli tilbake) skal være tydelige og myke.

---

## 8. Brukeropplevelse (UX)

- Tydelig poengvisning til enhver tid.
- Krasj: rødt blink på streken + kort advarselstekst om tapte poeng.
- Suksess: liten belønningsfølelse når en strek kjører ut (f.eks. lyd/animasjon — valgfritt).
- «Du tapte»-skjerm ved 0 poeng, med «Prøv igjen».
- «Nivå løst / figur ferdig»-skjerm når brettet er tomt, med «Neste».
- Enkel meny: velg Reise-modus eller Fri modus; i Fri modus, velg figur.
- Barnevennlig, lekent og rent grensesnitt.

---

## 9. Kodekvalitet og struktur (viktig for videre iterasjon)

- Skill tydelig mellom: **spillmotor** (regler/bevegelse/kollisjon), **rendering** (tegning/animasjon), **nivå-/ikon-data**, og **UI**.
- Legg alle justerbare verdier (poeng, brettstørrelse, animasjonsfart, antall streker per nivå) i én `CONFIG`-blokk.
- Gjør det enkelt å legge til nye ikoner og nivåer uten å endre motoren.
- Kommenter koden på norsk der det hjelper.

---

## 10. Leveranse for denne iterasjonen (test 1)

Lever en **spillbar prototype** vi kan teste:

- Fungerende kjernemekanikk (trykk → gli → poeng/krasj → tilbake).
- 10–15 ikoner i biblioteket.
- Reise-modus + Fri modus.
- Poeng og tap-tilstand.

Etter at vi har testet, gir vi tilbakemelding for neste iterasjon.

### Sjekkliste før levering
- [ ] Kun én strek kan flyttes om gangen.
- [ ] Strek med klar vei kjører ut og gir poeng.
- [ ] Strek som blokkeres: animerer frem, blinker rødt, advarer om tap, kjører tilbake.
- [ ] Poeng trekkes ved krasj; spillet tapes ved 0.
- [ ] Tomt brett = nivå løst.
- [ ] Streker står i 90°, jevn avstand, omriss danner figuren.
- [ ] Farger gjør figuren lettere å kjenne igjen.
- [ ] Fungerer med touch på nettbrett og med mus på PC/Mac.
- [ ] CONFIG-verdier er lett justerbare.
