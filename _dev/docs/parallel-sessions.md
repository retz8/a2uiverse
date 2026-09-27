# Parallel sessions

Several Claude Code sessions can work at once in one working tree: the `[apps]` sub-tasks directly on `a2uiverse-apps` `main`, and every session's `_dev/` edits on this repo's `main`. They coordinate by message.

## Peers

`ListAgents` lists the other sessions on this machine; the name leading each row is its address for `SendMessage`. Message every listed peer, not only the ones on the same phase. A message opens with one self-contained line and names the sender's sub-task by number and name — "10.4, the Gmail and Calendar catalogs". A reply goes to the `from` of the message it answers.

## Shared files

A shared file is any file outside your sub-task's own folder or package. In both repos:

- every file at the repo root — `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.gitignore`, `.prettierrc`, `.prettierignore`, `README.md`, `CLAUDE.md` —
- and everything under `.github/`, `.circleci/` and `.claude/`.

In `a2uiverse`: `_dev/TODO.md`, `SPEC.md`, `docs/design/`, `scripts/`, `patches/`, and the client's catalog wiring — `apps/client/package.json`, `apps/client/vite.config.ts`, `apps/client/src/catalogs/resolver.ts`, `apps/client/src/orchestratorApi.ts`.

In `a2uiverse-apps`: `agent-kit/` and `create-a2ui-agent/`.

### Editing one

1. `git diff -- <file>`. Uncommitted edits you did not make are another session's work in flight: message the peers and wait until its owner commits.
2. Message every peer: the file, the change, and your sub-task.
3. Edit, commit, and message the peers that the file is released, with the commit.

### Commands that write shared files

- `pnpm install`, `pnpm add`, `pnpm update`, `pnpm remove` and `pnpm link` rewrite `pnpm-lock.yaml`, a `package.json` or `pnpm-workspace.yaml`, and `node_modules` under every session. Announce before running one, and release after, like an edit.
- `pnpm format` and `pnpm lint --fix` run over the whole repo. Run the formatter and fixer on your own paths only: `pnpm exec prettier --write <paths>`, `pnpm exec eslint --fix <paths>`.

## Commits

- Stage your own paths by name. Never `git add -A`, `git add .` or `git commit -a`.
- Before committing, `git diff --cached --stat` lists only your files.
- Never discard or set aside what you did not write: no `git stash`, `git checkout -- .`, `git restore .`, `git reset --hard`, `git clean`.
- A push sends every session's commits on that branch. Announce it first.

## Running processes

One stack serves every session, on the fixed ports in `tunnel-environment.md` and the `a2uiverse-apps` port table.

- Before starting a process, `lsof -nP -iTCP:<port> -sTCP:LISTEN`. A port already listening is in use: use what runs there.
- Start, restart or stop your own app's agent freely. Announce before restarting or stopping the client, the orchestrator, or a process another session started.
- Stop a process by its port or PID, never by a name pattern: every agent runs as `python -m app`.
- A process outside the fixed ports is announced with its port when it starts.
- `pnpm dev:agents` and `pnpm dev:all` start every agent. Run them only when none is running.
