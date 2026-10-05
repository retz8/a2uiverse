# Handoff — 12.10, the five vendor agents on the kit's sign-in

## Where it stands

Built and committed in `a2uiverse-apps` (`9af9085`): the kit's vendor OAuth upstream and API-key sign-in, the five vendor agents on sign-in, shop-b on an API key, each README's live setup. Every agent suite and `pnpm verify` are green. The SPEC §16 line on the Google client in Testing is committed here.

Vendor setup for the live run is done: a GitHub OAuth App and a Google Web application client in project `a2uiverse-506907`, their IDs and secrets in each agent's git-ignored `.env`; the Google consent screen External in Testing with one test user. Linear and CircleCI register themselves on first sign-in.

## What's left — blocked on 12.6

Spec decision 15's live sign-in and one read per vendor through the vault. A live run stopped at the Planner: an app whose card asks sign-in is dispatched as `<app>.<n>`, but the Planner's prompt names the bare app id, so every plan naming one is refused and the turn shows a capability gap. 12.6 decides what the Planner names (its TODO line carries it).

After 12.6, rerun the check by hand on tunnel URLs, and verify on the way:
- CircleCI's project list from its API with the account's token (decision 9; the fallback is a project picker on the sign-in page).
- Google's calls without `X-Goog-User-Project` (decision 11).

How to run it until 12.12 teaches the launcher tunnel base URLs: each agent started by hand with `--base-url https://<tunnel-id>-<port>.asse.devtunnels.ms --mode live`, each app installed over with `registry install <app> <card url> <artifact dir>`, the orchestrator restarted after, then the client.

## Decisions taken beyond the spec, to confirm at wrap-up

- The scaffolder's `--google-adc` option went with the kit's `google_adc` helper.
- Calendar points a call naming no calendar at `primary` rather than forcing every call onto it.
- The kit's `SignIn.unmarked_tool_scopes`, for GitHub's tools: a tool its server does not mark read-only needs the write scope.
- The seeded demo calendar needs a throwaway Google account as a second test user; never seed the personal one.
