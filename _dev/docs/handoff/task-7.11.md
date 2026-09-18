# Handoff — task 7.11, product components on a themed basic catalog

Done. SPEC `12eec87` (§9.2 lets a themed basic catalog append product components for what the basic vocabulary cannot express; §14 gains the appended-component convention and a data-bindable tone on the basic `Text` as the upstream candidate), apps `fe4c99e` (`StatusBadge` appended to `circleci-catalog`, the agent onto it, beats re-recorded), platform `abdd985` (the client on the new catalog). `pnpm verify` green in both repos.

## The canvas pass

Checked in 7.2's live pass through the tunnel on 2026-09-18 (`_dev/docs/handoff/task-7.2.md`). Every run, workflow and job status drew as a pill; the computed colors match the palette sampled from CircleCI's documentation screenshots of its web app: Running `#135df2`, Success `#8bdea4` on `#03331a`, Failed `#bd4c48`, Canceled neutral.

## Next

- Linear (7.3) reads the §9.2 rule in its own grill.
