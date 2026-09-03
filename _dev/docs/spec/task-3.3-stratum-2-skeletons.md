# Task 3.3 — Stratum-2 skeletons

Spec for sub-task **3.3** (`_dev/TODO.md`, Phase 3 — agent building kit): the structurally-shared, vendor-bodied layer extracted into the kit as base classes/hooks, with vendor policy bodies rehomed onto them. Parent: `phase-3-agent-kit.md`, locked decision 7 (stratum 2, ≥2-agents gate).

## Scope

- The three named skeletons — MCP wiring (3/3 agents), toolset wrapper (Gmail/Calendar), tool shaping (3/3) — move into the kit; vendor policy bodies stay in the apps, rehomed onto the skeletons' hooks.
- Four additional shared extractions ride along (decision 2).
- The GitHub agent's write tier is out of scope — split off as sub-task **3.7** (after 3.3).
- Three cleanup items in the touched files ride along (decision 6).

## Locked decisions

### 1. Toolset wrapper is standard agent anatomy — all three agents instantiate it

The kit's re-wrapping toolset base (per-call interception: outbound args, inbound results) is instantiated by all three agents, not only the two that carry a policy today. Gmail rehomes its scrubbing policy, Calendar its guard (pinning, notification suppression, address masking); GitHub instantiates the base with no-op hooks until it has a policy (3.7's write guard will land on them). Additional agent policy goes into the wrapper's hooks.

### 2. Four unlisted ≥2 extractions ride into 3.3

1. Record-mode corpus capture (Gmail/Calendar, byte-identical) — into the kit beside the recorder.
2. The Google ADC credential block (Gmail/Calendar) — into the kit as an **opt-in helper**: only Google-backed vendors wire it; non-Google agents never see it. The 3.4 scaffold CLI grows a "does this vendor need Google ADC?" question that includes it selectively.
3. The stub fixture loader shared by all three `app/tools.py` modules (the vendor `STUB_TOOLS` lists stay put).
4. The byte-identical vendor `tests/helpers.py` files fold onto the kit's parameterized variant (3.2 residue).

Not taken: parameterizing the near-duplicate vendor test files (`test_catalog_common.py` et al.) — 3.2 kept those vendor-side deliberately and 3.3 does not re-open it.

### 3. GitHub write tier is its own sub-task, not 3.3

Giving GitHub non-readonly operations is vendor feature work that collides with the extraction invariants (behavior unchanged, beats replay unchanged). It is sub-task **3.7** — off the read-only endpoint, write-tool admission/withheld list, write-guard policy on the wrapper hooks, proposal/toggling action convention, fixtures + beats — sequenced after 3.3.

### 4. Tool-shaping skeleton: mechanics unify, notes stay vendor-opaque

GitHub normalizes onto the Gmail/Calendar walker convention (two-arg, builds a new dict; its one-arg in-place variant and the adapter it forces retire). The annotation payload is vendor policy: the skeleton attaches whatever the vendor `annotate()` hook returns without legislating its shape (GitHub keeps its dict, the twins their lists). The kit provides infra, not vendor-specific stuff.

### 5. Test split mirrors the infra/policy line

Mechanics tests (re-wrapping behavior, walker shape, dump/record helpers, hook dispatch) move into the kit suite against neutral fixtures. Each agent keeps a thinner vendor suite asserting only its policy through the kit's hooks. GitHub's shaping suite pins that the normalized walker's output equals today's output (decision 4's observable-behavior caveat).

### 6. Three cleanup items ride along

1. Fix the broken `derive_corpus.py` fixture paths (both scripts still target directories 3.2 deleted) and their stale entrypoint docstrings.
2. Sweep the stale `TOOL_BACKEND` guidance out of vendor error prose and docstrings — the retired switch's mentions become `--mode stub`.
3. Collapse Calendar's duplicated masking walk (`tool_shaping.py` vs `derive_corpus.py`) into one definition.

All three are behavior-invariant for the agents.

## Invariants

- The three agents' observable behavior is unchanged; recorded beats replay unchanged — no re-recording (phase acceptance 1).
- Nothing a2uiverse-specific reaches the vendor wire (SPEC §14).
- Vendor policy bodies never move into the kit; single-vendor patterns stay vendor-side.
