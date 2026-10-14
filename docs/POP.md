# Aankleedpop

Outfits worden getoond op een grijze etalagepop. Elk kledingstuk is een losse laag die op die pop past; de app stapelt de lagen van onder naar boven: schoenen, broek, t-shirt, blouse, trui, jas. Een shirt of blouse met "ingestopt" aan gaat onder de broek.

## Hoe een laag ontstaat

1. Laat ChatGPT het kledingstuk aantrekken op een **fel magenta pop** (#FF00FF), op hetzelfde canvas en in dezelfde pose als de basispop (1024×1536).
2. Upload die afbeelding in het kledingstuk onder "Op de pop".
3. `src/utils/layerKey.js` knipt alles wat magenta is weg, drukt roze weerschijn op randen terug, veegt een ingetekende achtergrond (nep-ruitjes) vanaf de rand weg en snijdt bij. Bewaard wordt een bijgesneden PNG plus de plek op het canvas (`x, y, w, h, width, height`).

Waarom magenta: ChatGPT tekent bij elk stuk de hele pop opnieuw, ook als je om alleen het kledingstuk vraagt. Een los gevraagd kledingstuk komt bovendien als productfoto terug (andere maat, andere plek, stijf). Met een magenta pop is de pop zelf de greenscreen, en valt het stuk precies zoals op de pop.

Gemeten op de eerste drie afbeeldingen (14-10-2026): de pop verschuift tussen generaties 2 tot 7 px van hoofd tot enkels, op een canvas van 1024 breed. Dat valt in de stapeling niet op.

## Bekende beperkingen

- **Nep-transparantie.** Levert ChatGPT een ingetekend ruitjespatroon in plaats van echte transparantie, dan veegt de app dat weg en waarschuwt. Een wit kledingstuk dat direct tegen zo'n witte achtergrond ligt, is op kleur niet te onderscheiden en kan mee verdwijnen; opnieuw genereren met echte transparantie is dan de oplossing.
- **Tekst op prints** wordt door ChatGPT soms verhaspeld ("GOOD THINGS" werd "GOOD TIKSS"). Zet de exacte tekst in de prompt.
- **Magenta kleding** zou als pop worden weggeknipt. Komt in de kast nu niet voor.

## Prompts

De app kopieert ze met één tik (Meer → Pop, en per stuk onder "Op de pop"); de tekst staat in `src/constants/prompts.js`.

Basispop (eenmalig; een foto van jezelf in normale kleren erbij):

```
Ik bouw een aankleed-app voor mijn eigen kledingkast. Maak een basisfiguur in de vorm
van een realistische etalagepop: mat lichtgrijs, glad ovaal hoofd zonder gezicht,
proporties zoals op mijn foto (lengte .. cm, postuur ..). Houding recht van voren,
armen iets van het lichaam af, voeten op heupbreedte. Staand canvas 2:3 (1024×1536),
gecentreerd, transparante achtergrond, zacht egaal studiolicht.
```

Magenta-versie (in hetzelfde gesprek):

```
Maak exact dezelfde pop opnieuw: zelfde pose, positie, grootte en canvas. Het enige
verschil: kleur de hele pop egaal, mat, fel magenta (#FF00FF). Verder niets veranderen.
```

Vermijd woorden als ondergoed of blote huid: die triggeren het naaktfilter van ChatGPT.

## Meegeleverde pop en lagen

`public/data/basispop.png` en `public/data/lagen/` worden bij het opstarten (en na een import) automatisch toegepast door `src/db/bundled.js`: de basispop als er nog geen is, en elke laag op het stuk met dezelfde naam als dat stuk nog geen laag heeft. Wat eenmaal is toegepast staat in de setting `meegeleverd`; weggehaalde lagen komen dus niet terug.

Een nieuwe afbeelding meeleveren:

```
node scripts/maak-laag.mjs "<magenta-afbeelding.png>" "<naam zoals in de kast>"
```

Elke laag in `lagen.json` onthoudt zijn `bronbestand` (in Downloads) en `opties`; `node scripts/maak-laag.mjs --alles` knipt alles opnieuw als het knippen verbeterd is. Opties voor als ChatGPT meer tekende dan het stuk: `--knip-onder y`, `--knip-boven y`, `--donker-weg-onder y`. Met `"ingestopt": true` in een regel zet de app dat stuk standaard op ingestopt.

## Wismasker

Elke laag heeft een masker van waar in zijn bronafbeelding achtergrond was (rond het stuk, plus 24 px marge). Bij het stapelen wist de app daarmee eerst alles van lagere lagen en de basispop, en tekent dan het stuk. Zo piept een slanke broek geen grijze kuit van de basispop meer, en een overhemdmouw niet naast een colbert. Nodig omdat ChatGPT elk stuk op een iets ander lichaam tekent. `OutfitDoll` tekent daarom op een canvas.
