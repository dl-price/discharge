# ED Discharge Letter Generator

A static, GitHub Pages-friendly tool for emergency medicine clinicians to build diagnosis-specific discharge letters from templates. Templates contain discharge advice, safety netting, red flags, and follow-up instructions, with optional clinician inputs. The final letter can be copied to the clipboard without storing patient data.

## Run locally

Because the app uses `fetch`, you need to serve it from a local web server (opening `index.html` directly via `file://` will not work):

```bash
python -m http.server
```

Then open `http://localhost:8000` in your browser.

## Deploy to GitHub Pages (project site)

1. Go to **Settings → Pages** in your repository.
2. Select **Deploy from a branch**.
3. Choose **main** and **/ (root)**.
4. Save, then use the GitHub Pages URL for your project.

## Add a new template

1. Add `templates/<id>.json` with the template definition.
2. Add an entry to `templates/index.json`.
3. Commit and push.

## Template notes

- Templates are stored in `templates/` and loaded using relative paths (`./templates/index.json`).
- Only `{{field}}` placeholders and `{{#if field}}...{{/if}}` conditional blocks are supported.
- No patient identifiers are stored by default.
