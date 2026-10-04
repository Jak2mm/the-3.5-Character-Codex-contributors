# Contributing

Thanks for helping improve 3.5 Character Codex!

## Ground rules

- **Only use SRD (Open Game) content.** Don't add text copied from the Player's Handbook, DMG or other books that aren't part of the SRD, and don't add Product Identity (trademarks, setting names, deity names and similar). Rules summaries written in your own words are fine.
- **Keep it dependency-free.** The app is plain HTML, CSS and JavaScript bundled into one file. Please don't add a framework or an npm build step without opening an issue to discuss it first.
- **Edit `src/`, then rebuild.** Run `python tools/build.py` and commit the updated `index.html` alongside your source changes.
- **Don't break saved characters.** Characters are stored as JSON. When you add a field, give it a default in `newChar()` in `src/js/core.js`. `migrate()` in `src/js/store.js` then fills it in for older saves.

## How to test your change

1. Open `index.html` in a browser.
2. Use the built-in example character, and also start a new character.
3. Check every tab at desktop width and at phone width (about 400px).
4. Check both the light and dark themes.
5. Open the browser console and make sure there are no errors.

## Ideas for improvements

- Prestige classes from the SRD (the data is in the SRD Markdown, but the parser doesn't read it yet)
- Familiar and animal companion sheets
- Turn undead, rage and other per-day ability counters
- Applying condition penalties automatically (for example, shaken giving –2 on attacks, saves and checks)
- Bonus-type stacking rules (enhancement, morale, deflection and so on)
- Spellbooks for wizards, separate from prepared spells
- A printable version of the sheet
- A shared party initiative tracker
- Rules lookup: linking condition, spell and feat names inside the rules text to their hover cards
- Rules lookup: adding the Divine, Epic or Psionics chapters (add them to `CHAPTERS` in `tools/parse_srd.py`)

## Reporting bugs

Open an issue that says what you did, what you expected and what happened. If you can, attach a character export (**Export** button) that shows the problem.
