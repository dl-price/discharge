# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: static entry point; keep IDs/classes stable because `app.js` queries them directly. Layout: left (template search/list), middle (fields), right (preview + copy).
- `styles.css`: shared styling; favor existing utility classes before adding new rules.
- `app.js`: vanilla JS for template loading, form rendering, and preview generation; organize helpers near their usage.
- `templates/`: JSON templates for each condition plus `index.json` registry. Template files are named `<id>.json` and referenced by the same `id`. Keep metadata (id, title, category, keywords, version/lastReviewed if added) close to the proposed schema.

## Build, Test, and Development Commands
- `python -m http.server` (from repo root): serve the site locally at `http://localhost:8000`; required because templates load via `fetch`.
- No build step or package install is needed; verify changes by refreshing the served page.

## Coding Style & Naming Conventions
- JavaScript: use `const`/`let`, arrow functions, and 2-space indentation; prefer early returns for clarity.
- Naming: camelCase for variables/functions; keep template field names consistent with their placeholders in the template text.
- Templates: include `id`, `title`, `category`, `keywords`, and a `fields` array. Use concise labels and defaults where appropriate.
- Keep additions small and self-contained; avoid introducing dependencies unless essential.

## Testing Guidelines
- Manual checks: start the local server, load each affected template, validate required fields, and confirm preview text renders with placeholders replaced.
- Cross-browser sanity: verify in at least one Chromium-based browser; open devtools console to ensure no errors on load or interaction.
- If adding templates, ensure `templates/index.json` references them and that recent-template behavior still works.
- Validate safety requirements: every template should have clear return precautions and a follow-up instruction; preview must preserve bullets/newlines when copied.

## Commit & Pull Request Guidelines
- Commits: short, imperative subjects (e.g., "Add renal colic template", "Improve template validation"); group related changes together.
- Pull requests: include a clear summary, linked issues if applicable, and before/after screenshots for UI or template copy updates.
- Note any manual test steps performed (server start, templates exercised) in the PR description.
- Keep diffs minimal: prefer editing existing structures over restructuring unless necessary.

## Security & Data Handling
- The app keeps data in memory/localStorage only; avoid adding any persistence or analytics without discussion.
- Do not include patient-identifying information in templates; keep content generic and clinically appropriate.
- Show or preserve cautionary language around not entering patient identifiers unless approved; clipboard content can persist on shared devices.

## Product & Template Notes
- Audience: ED clinicians; aim for plain-language bullets around ~8th grade reading level; avoid jargon unless essential and keep units explicit.
- Non-goals: no EMR integration or heavy front-end frameworks; static hosting is preferred.
- Template content should cover diagnosis statement, safety netting/red flags, follow-up plan, and optional ED findings/meds/resources.
- Conditional sections are allowed via `{{#if field}}...{{/if}}`; placeholders must match field `name` values (text, textarea, number, date, select, checkbox).
- Interaction expectations: search-as-you-type, keyboard focus on search, Enter selects top template, Cmd/Ctrl+Enter copies; show “Copied” feedback and keep preview scrollable/high-contrast.
