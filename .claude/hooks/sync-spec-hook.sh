#!/usr/bin/env bash
# UserPromptSubmit hook: refresh the A2UI spec when the prompt asks for it.
#
# Claude Code passes the prompt event as JSON on stdin. If the prompt contains
# the phrase "sync spec" (case-insensitive), this runs a non-destructive
# `git fetch upstream` against the sibling ../A2UI fork (canonical
# a2ui-project/a2ui). It updates the upstream/main remote-tracking ref ONLY —
# it never touches the fork's working tree or branch. The output is printed so
# Claude Code injects it back into context. Otherwise this is a silent no-op.
set -euo pipefail

input="$(cat)"

# Only act when the user explicitly asks to "sync spec".
if ! printf '%s' "$input" | grep -iq 'sync spec'; then
  exit 0
fi

UPSTREAM_URL="https://github.com/a2ui-project/a2ui.git"

# Resolve the sibling A2UI fork relative to this project.
A2UI_DIR="$(cd "${CLAUDE_PROJECT_DIR:-.}/../A2UI" 2>/dev/null && pwd || true)"

if [[ -z "$A2UI_DIR" || ! -d "$A2UI_DIR/.git" ]]; then
  echo "[sync-spec hook] error: sibling A2UI fork not found at ../A2UI relative to the project root." >&2
  exit 0
fi

echo "[sync-spec hook] triggered by \"sync spec\" — fetching upstream into $A2UI_DIR ..."

# Ensure the upstream remote exists and points at the canonical repo.
if ! git -C "$A2UI_DIR" remote get-url upstream >/dev/null 2>&1; then
  git -C "$A2UI_DIR" remote add upstream "$UPSTREAM_URL"
elif [[ "$(git -C "$A2UI_DIR" remote get-url upstream)" != "$UPSTREAM_URL" ]]; then
  git -C "$A2UI_DIR" remote set-url upstream "$UPSTREAM_URL"
fi

git -C "$A2UI_DIR" fetch upstream --prune --quiet

UPSTREAM_SHA="$(git -C "$A2UI_DIR" rev-parse --short upstream/main)"
echo "[sync-spec hook] upstream/main is now at $UPSTREAM_SHA (working tree untouched)."

# Informational: how far the fork's local main lags upstream (no changes made).
if git -C "$A2UI_DIR" rev-parse --verify --quiet main >/dev/null; then
  BEHIND="$(git -C "$A2UI_DIR" rev-list --count main..upstream/main)"
  if [[ "$BEHIND" -gt 0 ]]; then
    echo "[sync-spec hook] note: local main is $BEHIND commit(s) behind upstream/main."
  fi
fi

echo "[sync-spec hook] read the spec from the 'upstream/main' ref (see .claude/skills/a2ui-sdk-design/SKILL.md)."
exit 0
