# Handoff — task 3.7 (GitHub agent write tier)

## Where it stands

Implementation is **complete and committed**; only the live tunnel verification (spec decision 4) remains. That's why 3.7 is still `[WIP]`.

- Spec: `_dev/docs/spec/task-3.7-github-write-tier.md` (all decisions locked; no confinement, full surface).
- Code: `a2uiverse-apps` `main` — `70c85a1` (write tier) on top of `24b5ae8`/`af65a28` (task 3.3 + kit rename to `a2ui-agent-kit`). Not pushed at wrap-up time.
- Suite green (143), `pnpm verify` green. Prompt golden skeleton regenerated.
- The agent now: unrestricted endpoint + `X-MCP-Toolsets: all` (89 tools), write-capable prompt (confirm-turn performs the write), domain doc "Acting" section (propose/confirm by property, target named on the proposal), card advertises an "Acting on GitHub" skill, README/.env.example warn the agent acts as the PAT's user.
- The `.env` PAT is the user's write-capable token (verified live against both endpoints during the grill; it reaches the user's own and collaborator org repos).

## What's next: the live verification (needs Claude-in-Chrome)

A real **propose → confirm → fire → painted result** run through the canvas via the tunnel, landing on a real repo of the user's choosing. Use tunnel URLs, never localhost (`_dev/docs/tunnel-environment.md`).

- Start: client + orchestrator (platform repo), and the GitHub agent live: `uv run python -m app --mode live` in `a2uiverse-apps/github/agent` with `--base-url` set to its tunnel URL. Note platform `dev:agents` is broken against kit-shaped agents until 3.6 — start the agent by hand.
- Suggested flow: a creating write (e.g. "comment on issue N of <repo>: …") → proposal surface must name the target repo + number → confirm → tool fires → result painted from the tool result; verify the comment actually exists on GitHub. Optionally a toggle (e.g. dismiss a notification) firing directly.
- Watch item from the spec: tool inventory went 28 → 89 — if flash's tool choice degrades, that's the first suspect.

On success: tick 3.7 in `_dev/TODO.md` (wrap-up). Then pick up **3.4** (scaffold CLI — carries the two deferred opt-in questions: Google ADC, a2uiverse-ecosystem/paintMeta).
