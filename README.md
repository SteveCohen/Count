# Count Lab: Blackjack

An interactive Hi-Lo card counting trainer. No gambling, no real money, no backend — everything runs in the browser.

---

## Opening without a server

Just open `index.html` directly in any modern browser:

- **macOS / Linux:** double-click `index.html`, or run `open index.html`
- **Windows:** double-click `index.html`
- Or drag it into a browser tab

All five tabs, practice modes, and progress tracking work on `file://`. The only thing that won't activate without a server is the PWA offline-install prompt — but the app itself is fully functional.

---

## Optional: run a local server

Only needed if you want the PWA install banner or service-worker caching. Pick whichever is easiest:

```bash
# Python 3
python3 -m http.server 8000

# Node / npx (no install needed)
npx serve .

# VS Code
# Install the "Live Server" extension, then right-click index.html → Open with Live Server
```

Then open `http://localhost:8000` (or whatever port is shown).

---

## The five tabs

| Tab | What it does |
|-----|-------------|
| **Start Here** | Explains the Hi-Lo system, tag values, running count, true count, and key terms |
| **Practice** | Interactive drills — choose a mode, configure the shoe, and drill |
| **Reference** | Searchable glossary of 20 terms + comparison of 6 card counting systems |
| **Progress** | Stats, accuracy by rank and mode, skill milestones, session history |
| **Casino Awareness** | Educational overview of how casinos operate (factual only, no evasion advice) |

---

## Practice modes

| Mode | What you practice |
|------|------------------|
| **Card Drill** | One card appears — enter its Hi-Lo tag (+1, 0, or −1) |
| **Running Count** | A sequence of 5–8 cards deals out — enter the running count |
| **Table Flow** | A full round deals (players + dealer, with optional hidden hole card) — enter the running count |
| **True Count** | Given a running count and decks remaining, calculate the true count |
| **Mixed** | Rotates between all four modes, weighted toward your weaker areas |

---

## Configuration (Practice tab)

- **Decks:** 1, 2, 6, or 8
- **Penetration:** how far into the shoe before a reshuffle prompt (50%–85%)
- **Deal speed:** Slow / Normal / Fast / Challenge
- **Player spots:** 1–5 seats at the table (Table Flow mode)
- **Dealer hole card:** show or hide the dealer's second card
- **Training Wheels:** overlay the Hi-Lo tag on each card as it's dealt
- **Sound effects:** Web Audio tones for deal, correct, incorrect, and milestone

---

## Progress and data

All data is stored in your browser's `localStorage` — nothing is sent anywhere.

- **Export:** Progress tab → *Export Progress JSON* — downloads a `.json` snapshot
- **Reset:** Progress tab → *Reset All Progress* — clears all stored data

Clearing browser data or switching browsers will reset progress.

---

## Browser support

Any modern browser works: Chrome, Firefox, Safari, Edge. No extensions or plugins required.
