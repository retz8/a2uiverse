# Handoff — task 7.11, product components on a themed basic catalog

Built and committed; its visual check rides 7.2's canvas pass (`_dev/docs/handoff/task-7.2.md`, "Next — the canvas check").

## Where it stands

- **SPEC** — `12eec87`, not pushed: §9.2 lets a themed basic catalog append product components for what the basic vocabulary cannot express; §14 gains the appended-component convention (local) and a data-bindable tone on the basic `Text` (upstream candidate).
- **`circleci-catalog`** — apps `fe4c99e`, pushed: `StatusBadge` appended to the schema and the runtime catalog, its `status` a bound string mapped to a tone; the parity test asserts the catalog is the basic catalog plus exactly the product components. Pill colors sampled from CircleCI's documentation screenshots of its web app — Running `#135df2`, Success `#8bdea4` on `#03331a`, Failed `#bd4c48`, Queued `#283548`; Canceled, On Hold, Not Run and Error have no sampled color and draw neutral. Apps `CLAUDE.md` names the rule.
- **The agent** — brand doc and examples put every status in a `StatusBadge`; the four beats re-recorded (every run, workflow and job status a bound badge; the rerun still adds a workflow beside the earlier attempts) and the corpora re-derived. Agent suite and apps `pnpm verify` green.
- **Platform** — `abdd985`, not pushed: the client on the new catalog tarball. `pnpm verify` green.

## Next

- In 7.2's canvas pass, check the pills: Failed red, Success green, Running blue; the workflow and job statuses in the run detail badged too.
- Linear (7.3) reads the §9.2 rule in its own grill.
