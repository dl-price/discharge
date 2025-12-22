# ED Discharge Letter Generator

A static, GitHub Pages-friendly tool for emergency medicine clinicians to build diagnosis-specific discharge letters from templates. Templates contain discharge advice, safety netting, red flags, and follow-up instructions, with optional clinician inputs. The final letter can be copied to the clipboard without storing patient data.

## Run locally

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal.
`npm run dev` now rebuilds templates when anything under `templates-src/` changes.

## Deploy to GitHub Pages (project site)

1. Build the site:

```bash
npm run build
```

2. Deploy the `dist/` folder to GitHub Pages (via the Pages build from `dist/` or a `gh-pages` branch).
3. Use the GitHub Pages URL for your project.

## Add a new template

1. Add `templates-src/letters/<id>/template.json` plus `patient.md` and `gp.md`.
2. Add an entry to `public/templates/letters/index.json`.
3. Run `npm run build:templates` to compile Markdown into JSON before running `npm run dev` or `npm run build`.
4. For reusable field presets, add a block in `public/templates/blocks/` and register it in `public/templates/blocks/index.json`.
3. Commit and push.

## Template notes

- Letter templates are authored in `templates-src/letters/` and compiled into `public/templates/letters/`.
- Each letter template includes `patientBody` and `gpBody` for the two letter variants.
- Procedure templates are authored in `templates-src/procedures/` and compiled into `public/templates/procedures/` with a single `body` for EMR notes.
- ED notes templates are authored in `templates-src/notes/` and compiled into `public/templates/notes/` with a single `body`.
- Field blocks (reusable field groups with markdown bodies) live in `templates-src/field-blocks/` and compile to `public/templates/field-blocks/`.
- Templates can include `blocks: ["obs"]` and reference blocks with `{{obs}}` or individual fields via `{{obs.hr}}`.
- Section layout is defined by `type: "section"` fields (e.g. `{ "type": "section", "label": "Observations", "layout": "inline", "fields": [...] }`).
- Sections can also pull in blocks via `blocks: ["obs"]` on the section.
- Fields or sections can set `"repeatable": true` to capture multiple entries. Repeatable sections need a `"name"` (or a single block id), and are rendered as arrays for `{{#each name}}...{{/each}}` with `{{this.fieldName}}`. Use `"repeatableEmptyState"` to customize the empty UI message (default: "No entries yet.").
- Select fields can set `"multiple": true`; `{{fieldName}}` joins selections with ", " and `{{#bullets fieldName}}` renders each selection as a bullet.
- Text and textarea fields can add `"quickOptions": ["Option A", "Option B"]` to show clickable chips that append the option (comma-separated for text, new line for textarea).
- Conditionals support nesting, boolean expressions (`&&`, `||`, `!`, parentheses), comparisons (`==`, `!=`, `>`, `<`, `>=`, `<=`), and basic arithmetic (`+`, `-`, `*`, `/`).
- You can also output calculations with `{{calc ...}}`, e.g. `{{calc obs.sbp - obs.dbp}}` or `{{calc obs.rr * 2}}`.
- Abbreviation expansions are defined globally in `public/templates/expansions.json` and can be toggled in patient previews.
- No patient identifiers are stored by default.

## Templating language

Use these helpers inside `patient.md`, `gp.md`, or `body.md` files.

- `{{fieldName}}`: Inserts the value from a field `name`. Booleans render as `Yes`/`No`.
- `{{#if fieldName}}...{{/if}}`: Conditionally render a section when the field is truthy (multi-select arrays are truthy only when they have one or more selections).
- `{{#if expression}}...{{/if}}`: Expressions support `&&`, `||`, `!`, parentheses, `==`, `!=`, `>`, `<`, `>=`, `<=`, plus arithmetic (`+`, `-`, `*`, `/`).
- `{{calc expression}}`: Emits the rounded numeric value of an expression (e.g. `{{calc obs.sbp - obs.dbp}}`).
- `{{#bullets fieldName}}`: Turns each non-empty line in a textarea field into a bullet.
- `{{#bullets fieldName indent=2}}`: Same, but with extra indentation (number of spaces).
- `{{#each fieldName}}...{{/each}}`: Repeats a block for each item in an array (multi-selects), with `{{this}}` for the current item and `{{@index}}` for the 0-based index.

Notes:
- For field blocks, `{{blockId}}` injects the block body and `{{blockId.fieldName}}` references a block field.
- Placeholders must match field `name` values (including any `blockId.` prefixes).
