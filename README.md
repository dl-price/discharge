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

1. Add `public/templates/<id>.json` with the template definition.
2. Add an entry to `public/templates/index.json`.
3. For reusable field presets, add a block in `public/templates/blocks/` and register it in `public/templates/blocks/index.json`.
3. Commit and push.

## Template notes

- Templates are stored in `public/templates/` and loaded using relative paths.
- Each template includes `patientBody` and `gpBody` for the two letter variants.
- Only `{{field}}` placeholders and `{{#if field}}...{{/if}}` conditional blocks are supported.
- No patient identifiers are stored by default.
