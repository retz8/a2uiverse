# CircleCI web app — references for circleci-catalog

What the CircleCI catalog's components, typeface and colours are drawn from. Screenshots sit beside this file, untracked.

## Sources

- **Product screens** — CircleCI's own documentation screenshots, `circleci/circleci-docs` at `93438cb`:
  - `docs/guides/modules/ROOT/images/pipelines-dashboard.png` — the pipelines page
  - `docs/guides/modules/ROOT/images/chunk/fix-workflow-workflow-page.png` — a failed workflow's page
  - `docs/guides/modules/ROOT/images/chunk/fix-job-pipeline-page.png` — a failed pipeline row with its jobs
  - `docs/guides/modules/ROOT/images/chunk/fix-error-job-page.png` — a failed step with its log
  - `docs/guides/modules/ROOT/images/getting-started-guide-exp/steps.png`, `expand-step.png` — a job's steps, a step's log
  - `docs/guides/modules/ROOT/images/orchestrate-and-trigger/rerun-from-failed-workflows-page.png` — the rerun menu
  - `archive/images/guides/modules/ROOT/images/approval_job_cloud.png` — On Hold and Running on a workflow page
  - `archive/images/guides/modules/ROOT/images/job_status.png` — a job page's step list
- **Brand portal** — `brand.circleci.com`, CircleCI's official brand site, linked from its newsroom:
  - Typography: "Our primary typeface is Inter and our secondary typeface is Space Grotesk (eg. in headings) to be used sparingly."
  - Design Guidelines: the Morph Design System brand book, a Figma embed that pages past its cover only with a Figma login. No colour value on the portal is readable in public.
- **Open palette** — Radix Colors 3.0.0 (`@radix-ui/colors`, MIT), light and dark scales.
- **Typeface file** — `@fontsource-variable/inter` 5.3.0, `inter-latin-wght-normal.woff2`, SIL Open Font License 1.1.

## Screens

- **Page title** — the object's name at display size, its status pill beside it, actions at the right.
- **Summary panel** — a white panel with a 1px border: fields laid out in a row, each a small muted label over its value, the fields separated by vertical rules (Duration / Finished, Branch, Commit, Author & Message).
- **Pipeline row** — one bordered panel per pipeline: project and number, status pill, workflow, checkout source (branch, short hash, commit subject), trigger, start, duration, actions. Under it, "Jobs": each job a line of status glyph, name, number and duration, joined by a tree connector drawn from the label.
- **Workflow page** — the jobs as boxes, each a status glyph, name and duration.
- **Job page** — the steps as rows on a quiet fill: disclosure caret, status glyph, step name in medium weight, duration at the right.
- **Failed step** — a red border and a pale red header row: status glyph, step name, duration. Under it the log on a dark panel: monospace, line numbers in a muted gutter.
- **Rerun** — a pill-shaped secondary button opening "Rerun workflow from start", "Rerun workflow from failed", "Cancel Workflow".
- **Links** — branch, commit hash, workflow and job names are blue text.

## Controls

- **Buttons** — fully rounded pills. Secondary: a grey fill, dark label. Primary: a solid blue fill, white label ("Fix workflow"). Quiet actions are icon or text only.
- **Status pill** — a fully rounded pill, a glyph then the word:
  - Running — solid blue, white label, a circular-arrow glyph
  - Success — pale green, dark green label, a check
  - Failed — solid red, white label, a cross
  - On Hold — purple, a pause glyph
- **Job status glyph** — a filled circle carrying the glyph: green check, red cross, blue circular arrow, a dark slate hourglass for a job waiting its turn, a grey "•••" for one not yet run.

## Typeface

Inter throughout the product screens, headings included. Space Grotesk is the brand's display face for marketing and is not used in the product screens, so the catalog ships Inter only. Monospace for logs.

## Colour

No CircleCI colour is published in a form that can be read (the brand book needs a Figma login), so every colour is a Radix Colors 3.0.0 step at a hue near the product's:

| Role | Light | Dark |
| --- | --- | --- |
| Panel surface | white | slateDark 2 `#18191b` |
| Border | slate 6 `#d9d9e0` | slateDark 6 `#363a3f` |
| Row hover, quiet fill | slate 3 `#f0f0f3` | slateDark 3 `#212225` |
| Text | slate 12 `#1c2024` | slateDark 12 `#edeef0` |
| Muted text | slate 11 `#60646c` | slateDark 11 `#b0b4ba` |
| Link | blue 11 `#0d74ce` | blueDark 11 `#70b8ff` |
| Primary button, hover | blue 9 `#0090ff`, blue 10 `#0588f0` | blueDark 9 `#0090ff`, blueDark 10 `#3b9eff` |
| Secondary button, hover | slate 4 `#e8e8ec`, slate 5 `#e0e1e6` | slateDark 4 `#272a2d`, slateDark 5 `#2e3135` |
| Focus ring | blue 8 `#5eb1ef` | blueDark 8 `#2870bd` |
| Danger text | red 11 `#ce2c31` | redDark 11 `#ff9592` |
| Success | green 4 `#d6f1df` on green 11 `#218358` | greenDark 4 `#113b29` on greenDark 11 `#3dd68c` |
| Failed | red 9 `#e5484d`, white | red 9 `#e5484d`, white |
| Running | blue 9 `#0090ff`, white | blue 9 `#0090ff`, white |
| On Hold | purple 9 `#8e4ec6`, white | purple 9 `#8e4ec6`, white |
| Queued, blocked | slate 12 `#1c2024`, white | slateDark 8 `#5a6169`, white |
| Canceled, not run | slate 4 `#e8e8ec` on slate 11 `#60646c` | slateDark 4 `#272a2d` on slateDark 11 `#b0b4ba` |
| Failed step header | red 3 `#feebec`, border red 7 `#f4a9aa` | redDark 3 `#3b1219`, border redDark 7 `#8c333a` |
| Log panel | slateDark 1 `#111113`, border slateDark 6 `#363a3f`, text slateDark 12 `#edeef0`, gutter slateDark 9 `#696e77` | the same |
