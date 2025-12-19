# ED Discharge Letter Generator

A static, GitHub Pages-friendly tool for emergency medicine clinicians to build diagnosis-specific discharge letters from templates. Templates contain discharge advice, safety netting, red flags, and follow-up instructions, with optional clinician inputs. The final letter can be copied to the clipboard without storing patient data.

## Run locally

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal.

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
- Only `{{field}}` placeholders and `{{#if field}}...{{/if}}` conditional blocks are supported.
- No patient identifiers are stored by default.
