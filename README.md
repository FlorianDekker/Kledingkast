# Kledingkast

Log wat je draagt en zie wat je kleding je per keer kost. Opvolger van een Google Form + Google Sheet.

Live: https://floriandekker.github.io/Kledingkast/ (op de iPhone: Delen → Zet op beginscherm).

- **Vandaag**: outfit kiezen op de pop, "Verras me" (geschud uit je kast), "zelfde als laatst", eerdere dagen bewerken.
- **Kast**: stukken met foto, prijs, kleur, uit de kast/verkocht; samenvoegen van dubbele stukken.
- **Inzicht**: tabbladen Overzicht, Kalender, Combinaties, Records, Weekdag en Verdeling; bijna alles aantikbaar (stukken, dagen, outfits).
- **Meer**: import van de Google Sheet (.xlsx, herhaalbaar), basispop, back-up als JSON, instellingen.
- **Aankleedpop**: outfits op een etalagepop, met per stuk een laag uit een magenta-pop-afbeelding van ChatGPT. Zie [docs/POP.md](docs/POP.md).

Data staat alleen lokaal in IndexedDB (Dexie). Elk record heeft een uuid en `updatedAt`, zodat er later synchronisatie bovenop kan.

## Import van het Google Form

`src/utils/importForm.js` leest de tabbladen `Data` en `Form responses 1`. Een formulier wordt herkend aan zijn tijdstempel, dus dezelfde export opnieuw inlezen voegt niets dubbel toe. Google Forms plakt meerdere keuzes aan elkaar met `, `; namen die zelf een komma bevatten worden weer heel gemaakt. Namen die niet in `Data` staan legt de app voor (nieuw stuk, koppelen, negeren) en onthoudt de keuze als alias.

`public/data/Kleding.xlsx` is een momentopname van de sheet, zodat de eerste import op de telefoon met één tik kan.

## Ontwikkelen

```
npm ci --legacy-peer-deps
npm run dev
npm test        # unit-tests (Node, fake-indexeddb)
npm run lint
npm run deploy  # build + gh-pages
```
