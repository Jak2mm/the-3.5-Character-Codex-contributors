# 3.5 Character Codex

A free, fillable character sheet for the **3.5 edition System Reference Document (SRD)** rules. It runs entirely in your web browser. You don't need to install anything, make an account or run a server.

**Use it:** open `index.html`, or visit the GitHub Pages link for this repository once Pages is turned on (see [Hosting it](#hosting-it)).

## Features

- **Character sheet** laid out like the classic 3.5 record sheet. Ability scores, racial adjustments, base attack bonus, saves, AC (normal, touch and flat-footed), grapple and initiative all calculate automatically, and multiclassing is supported.
- **Hover references.** Hover over (or tap) any ability, skill, feat, spell, condition, race, class feature or item to read its SRD rules text.
- **Dropdown pickers** with search and a preview pane: all 11 core classes, 7 races, 36 skills, 110 feats, 605 spells, 37 conditions, 83 weapons, 21 armors and shields, 155 pieces of gear and 382 magic items.
- **Bonus types and stacking.** Worn magic items, common feats, racial traits, class features, skill synergies, and active spells and conditions apply their typed bonuses automatically. Bonuses of the same type (enhancement, deflection, resistance and so on) don't stack, following the SRD's *Combining Magical Effects* rules. Dodge, circumstance, racial and untyped bonuses do stack. A pop-up warns you when a new bonus is overlapped, and hovering any total shows exactly what adds up. You can edit or add bonuses on any item, effect or custom library entry.
- **Skills and feats.** Class skills are marked, with max ranks and a skill-point counter. Craft, Knowledge, Perform and Profession support multiple specialties.
- **Spells.** Spells per day include bonus spells and cleric domain slots, with save DCs for each spell level. You can track prepared spells or spells known, tick off used slots, and rest to restore them.
- **Combat and effects.** Initiative order, a turn and round counter, and active spells and conditions. Casting a spell with a duration starts a countdown automatically, based on caster level. Each new round ticks every effect down by one.
- **Items.** An inventory with locations (worn, carried, backpack, mount, stored), coins, total weight and light, medium or heavy load from your Strength and size.
- **Notes and quests.** Searchable session notes, and quests with objectives, progress bars and status.
- **Rules lookup.** Search the SRD rules by keyword (combat, magic, skills, equipment, conditions, environment, traps, prestige classes and more), or browse them chapter by chapter. Matching words are highlighted, and quick matches link straight to spells, feats, items and conditions. Press `/` anywhere to search.
- **Custom library.** Make your own items, feats, spells, abilities and conditions. They appear in every picker beside the SRD entries.
- **Custom magic items.** Build weapons (from any SRD weapon, with enhancement, masterwork and special abilities like flaming or keen), armor and shields (with enhancement and abilities like shadow), and wondrous items. Give them stat bonuses, special abilities with uses per day, and spells with uses per day, charges or at will. Adding one fills in your attacks or armor automatically. Its abilities appear on the Character tab, and its spells appear on the Spells tab with a Use button and duration tracking. Any SRD item can be turned into an editable copy with **Customize**.
- **Multiple characters**, plus **export and import** as JSON files.
- Light and dark themes, and layouts for desktop and mobile.

## Where your data is saved

Characters are saved in **your browser's local storage** on the device you use. They aren't uploaded anywhere. To move a character to another device, or to keep a backup, use **Export** and then **Import**.

(When the page runs inside Claude as a published artifact, it syncs characters to the user's private Claude storage instead. That code is in `src/js/store.js`. Outside Claude it falls back to local storage automatically.)

## Project layout

```
index.html            Built, self-contained app (this is what people open)
src/head.html         Page title, fonts and all CSS (design tokens at the top)
src/body.html         Static page shell: top bar, tabs, tooltip and modal roots
src/js/core.js        Rules data helpers, character model and derived calculations (AC, saves, skills, spells, load)
src/js/bonuses.js     Typed bonuses for items, feats, spells, conditions, races and classes, plus the stacking rules
src/js/ui-bonus.js    Stacking warnings and the bonus editor
src/js/ui-custom.js   Custom item editor, weapon/armor special abilities, item spells and abilities
src/js/ref.js         Hover tooltips, detail popups and the searchable picker
src/js/store.js       Saving and loading (local storage, optional Claude sync)
src/js/ui-sheet.js    Character, Skills & Feats tabs
src/js/ui-other.js    Spells, Combat & Effects, Items, Notes, Quests and Library tabs
src/js/ui-rules.js    Rules Lookup tab: search, chapter contents and reader
src/js/events.js      Input binding, button actions and start-up
data/srd.json         SRD content extracted for the app
tools/build.py        Bundles src/ and data/ into index.html
tools/parse_srd.py    Regenerates data/srd.json (entries and rules chapters) from the Markdown SRD
```

There is no framework and no npm build: it's plain HTML, CSS and JavaScript.

## Developing

1. Edit files in `src/`.
2. Rebuild: `python tools/build.py`
3. Open `index.html` in a browser.

Commit both your `src/` changes and the rebuilt `index.html`.

To regenerate the rules data, for example after fixing a parsing issue:

```bash
git clone --depth 1 https://github.com/olimot/srd-v3.5-md
pip install markdown beautifulsoup4 lxml
python tools/parse_srd.py srd-v3.5-md
python tools/build.py
```

## Hosting it

To host it on GitHub Pages:

1. In your repository on GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)`, then click **Save**.

After a minute the app is live at `https://<your-username>.github.io/<repository-name>/`.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for ideas and guidelines.

## Licenses

- **Code** (everything in `src/` and `tools/`) is released under the [MIT License](LICENSE).
- **Rules text** in `data/srd.json` (and embedded in `index.html`) is Open Game Content from the System Reference Document v3.5, used under the [Open Game License v1.0a](OGL.md). The SRD content was taken from [olimot/srd-v3.5-md](https://github.com/olimot/srd-v3.5-md).

This project is not affiliated with, endorsed by or sponsored by Wizards of the Coast. It includes only Open Game Content from the SRD and no Product Identity.
