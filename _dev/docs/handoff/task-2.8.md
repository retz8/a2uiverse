# Handoff — 2.8 github-catalog boundary retrofit

Not started. This file exists because 2.8 inherits two things from 2.5 besides its own scope.

## Its own scope

Scope `github-catalog`'s provider to the fragment boundary, anchor Primer's portal root inside it,
republish. `github-catalog` lives in `../a2uiverse-apps/github/github-catalog` (`[apps]`).

## What 2.5 left for it

**The collision detector already names the defects.** `apps/client/src/canvas/composition/
collisionDetector.test.ts` holds an `ACCEPTED` list — violations that exist today, each with an
owner, recorded rather than hidden:

- `@primer/primitives/dist/css/base/motion/motion.css` defines `--base-duration-*` and
  `--base-easing-*` at `:root`, so they land outside every fragment boundary.
- Primer's functional sheets read `--borderWidth-default` and `--focus-outline-width` bare, with
  no imported sheet defining them.

A second test asserts each accepted entry **still occurs** — so fixing one without deleting its
entry fails the gate. Emptying that list is part of 2.8, not an afterthought.

**2.5's live tunnel verification was never run.** Everything 2.5 verified ran headless against
replayed fixtures. Four claims need the real path — orchestrator on 10001, GitHub agent on 11001,
driven through the tunnel URL, never `localhost`:

1. first paint (layout + pending slots) lands before any fragment arrives
2. attribution renders on each boundary
3. an action inside a fragment repaints only that fragment
4. killing the agent mid-turn flips only its slot

GitHub alone covers 1, 2, and the single-slot half of 3–4: there is no uncomposed path any more,
so a single-agent turn is a real one-slot composition. The "and the others were unaffected" half
of 3–4, plus independent slot filling and the detector's cross-catalog payload, needs 2.6/2.7.

## Open thread

Standing up a Gmail or Calendar agent is not sufficient on its own: the client registers only
`shell-catalog` + `github-catalog` (2.5 decision 1). A fragment from an unregistered catalog
reports `VALIDATION_FAILED` and does not render. Rendering needs 2.6/2.7 to publish their catalog
packages **and** the one-line registration added at both memo sites — `orchestratorApi.ts`'s
`STATIC_CATALOGS` and `catalogs/resolver.ts`'s `TABLE`, which move together.
