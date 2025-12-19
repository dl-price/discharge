# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Vite entry point; keep the root div stable for React rendering.
- `src/`: React app source (`App.jsx`, `main.jsx`) using MUI components.
- `templates-src/letters/`: template source folders containing `template.json`, `patient.md`, and `gp.md`.
- `templates-src/procedures/`: template source folders containing `template.json` and `body.md`.
- `templates-src/notes/`: template source folders containing `template.json` and `body.md`.
- `public/templates/letters/`: compiled JSON templates for each condition plus `index.json` registry.
- `public/templates/procedures/`: compiled JSON templates for procedure notes plus `index.json` registry.
- `public/templates/notes/`: compiled JSON templates for ED notes plus `index.json` registry.
- `public/templates/blocks/`: reusable preset blocks (one JSON per block) with `index.json` registry.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: serve locally via Vite.
- `npm run build`: build static assets into `dist/` for GitHub Pages.

## Coding Style & Naming Conventions
- JavaScript: use `const`/`let`, arrow functions, and 2-space indentation; prefer early returns for clarity.
- Naming: camelCase for variables/functions; keep template field names consistent with their placeholders in the template text.
- Templates: include `id`, `title`, `category`, `keywords`, and a `fields` array. Use concise labels and defaults where appropriate. Provide `patient.md`/`gp.md` for letters and `body.md` for procedures/notes, then run `npm run build:templates` to compile into JSON.
- Keep additions small and self-contained; avoid introducing dependencies unless essential.

## Testing Guidelines
- Manual checks: start the local server, load each affected template, validate required fields, and confirm preview text renders with placeholders replaced.
- Cross-browser sanity: verify in at least one Chromium-based browser; open devtools console to ensure no errors on load or interaction.
- If adding letter templates, ensure `public/templates/letters/index.json` references them.
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
- Template content should cover diagnosis statement, safety netting/red flags, follow-up plan, and optional ED findings/meds/resources. Provide separate `patientBody` and `gpBody` when needed.
- Conditional sections are allowed via `{{#if field}}...{{/if}}`; placeholders must match field `name` values (text, textarea, number, date, select, checkbox).
- Interaction expectations: search-as-you-type, keyboard focus on search, Enter selects top template, Cmd/Ctrl+Enter copies; show “Copied” feedback and keep preview scrollable/high-contrast.
