// Prompts voor ChatGPT, om met één tik te kopiëren in de app.
// Werkwijze: zie docs/POP.md.

export const PROMPT_PRODUCTFOTO = `Maak van mijn foto's één nette productfoto van dit kledingstuk voor mijn kledingkast-app.
- Ghost mannequin, recht van voren (schoenen: het paar schuin van opzij).
- Volledig transparante achtergrond (PNG), geen schaduw, vierkant 1:1, stuk gecentreerd op ~85% van de hoogte.
- Herontwerp niets: kleur, patroon, print, tekst, logo's, knopen en pasvorm exact zoals op mijn foto's. Laat slijtage staan.
- Alleen het kledingstuk: geen tekst, infopanelen of detailfoto's.`

export const promptOpDePop = naam => `Trek de magenta basispop dit kledingstuk aan: ${naam}.
- Zelfde canvas (1024×1536), pose en positie als de basispop. Verander niets aan de pop zelf: die blijft egaal fel magenta (#FF00FF).
- Neem het kledingstuk exact over van de productfoto: kleur, patroon, print, tekst, logo's en pasvorm niet aanpassen.
- Neutraal wit studiolicht: geen magenta weerschijn of roze gloed op de kleding.
- Echte transparante achtergrond (geen ingetekend ruitjespatroon).`
