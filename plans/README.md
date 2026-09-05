# plans/ — source of truth for the trip site

The HTML files at the repo root are **generated**. Do not hand-edit them;
`node build_plans.js` overwrites them.

| File | What it drives |
|---|---|
| `cities.json` | the 12 city pages — days, items, badges, bonus, markets, restaurants, food tables |
| `hub.json` | `00b-calendar.html`, `00d-transport.html`, `00c-booking-and-chains.html` |
| `style.css` | the shared stylesheet injected into every generated page |
| `static/` | pages copied through **verbatim**, never regenerated |

## Usage

```bash
node build_plans.js --check   # dry run: lists any page that would change
node build_plans.js           # write the pages
```

`--check` exits non-zero if anything would change, so it is safe to run before
a rebuild to see whether the generated HTML has drifted from the data.

## static/

`00-overview.html` (also copied to `index.html`), `04b-jiuzhaigou-valley-day.html`,
`Universal Studios Beijing.html` and `pokemon-centers.html` are bespoke pages —
an embedded Leaflet route map, a narrative writeup, and two one-off reference
pages. They are copied byte-for-byte rather than modelled as data, so a rebuild
can never damage them. Edit those files directly inside `plans/static/`.

Note: the overview's city table and TOC are part of that static page, so adding
or removing a city in `cities.json` does **not** update the overview — edit
`plans/static/00-overview.html` too.

## Provenance

This generator was reconstructed from the committed HTML, and verified by
regenerating all 20 pages byte-for-byte identically to what was already in the
repo. It is not the original local `build_plans.js`; the data model here is an
inferred one. If the original still exists, diff the two before relying on this.
