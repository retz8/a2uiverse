# Handoff — task 7.2, the CircleCI app

Built and committed; one check left before 7.2 is ticked: **the CircleCI fragment seen on the canvas through the tunnel, with Claude-in-Chrome** (task spec decision 3). Task spec: `_dev/docs/spec/task-7.2-circleci-app.md`.

## Where it stands

- **The pipeline on `a2uiverse`** — `.circleci/config.yml` (`6b59996`, pushed): `pnpm verify`'s gates as two parallel jobs, `build-typecheck-test` and `lint-format`, in the `verify` workflow, on every branch. Green on `main`. CircleCI project id `5475943e-db5e-4b4a-937b-4d64f8f05d3c`.
- **The app in `a2uiverse-apps`** — `be69407`, pushed: the agent on port 11004 over the hosted MCP server, nine tools pinned, projects from `CIRCLECI_PROJECTS`, rerun and cancel proposed then confirmed; the four beats recorded live and the stub and deterministic corpora derived from them; `circleci-catalog` themed with the palette sampled from CircleCI's documentation screenshots of its web app. Agent suite 84 green; repo `pnpm verify` green.
- **The platform wiring** — `dcc5c6f`, **not pushed**: the registry entry, the client's `circleci-catalog` dependency, projection, resolver and test inlining, the platform recorder's advertised catalogs. `pnpm verify` green. A pipeline question driven through the orchestrator on `localhost` routed to CircleCI and relayed `circleci:recent-runs` stamped `source: circleci`, completed in 29 s.
- **Spec** amended to what was built — `1932783`, not pushed: projects by id through a local `list_projects` tool; the theme's reference is CircleCI's documentation screenshots.
- `circleci/agent/.env` holds the token, the Gemini key and `CIRCLECI_PROJECTS` (gitignored).

## Next — the canvas check

1. Start the stack with only CircleCI live: `pnpm dev:all --agents-dir ../a2uiverse-apps --only circleci --mode live`. Forward ports 10001 and 5173 and set them **Public** — both returned 404 at the tunnel last session.
2. Open `https://vnw20xbg-5173.asse.devtunnels.ms` and ask **"How are my CircleCI builds doing?"**.
3. Check: recent runs in one card, each row a status pill, the branch, the commit's first line and short hash, its workflows nested under it; tapping the failed run on `ci/failing-format-demo` (branch deleted, run kept) opens its workflow attempts and jobs; tapping the failed `lint-format` job shows the failed step, its exit code and the log's last lines; **Rerun from failed** paints the proposal as a question the shell raises. Confirming really reruns the workflow on CircleCI.
4. Repeat in `--mode deterministic`, which plays the recorded beats.
5. On a pass: tick 7.2 through wrap-up and push `a2uiverse` `main`.

## Open threads

- **A status cannot be colored per row** in the basic catalog: the word is data, and neither it nor an `Icon` name reaches the DOM as anything a selector reads. Every status draws as one neutral pill. Proposed as a backlog finding, not yet written.
- `ci/failing-format-demo` is deleted; its failed run stays in CircleCI's history and in the recorded beats. Re-recording beat 3 needs a fresh failing push.
- **The theme's reference** is CircleCI's documentation screenshots; Jioh's own screenshots of the web app, if taken, are compared against it.
