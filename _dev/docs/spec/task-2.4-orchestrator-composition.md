# Task 2.4 — Orchestrator composition core

Task-internal design for `_dev/TODO.md` 2.4, settled by grill on top of phase decisions 5, 9–12, 14 (`_dev/docs/spec/phase-2-layout-composition.md`). The grill also produced amendments to phase decision 6 and SPEC.md — listed at the end; the sdk code change they imply lands inside this task.

## Scope

- Router + local embedder + Registry AgentCard surface; Planner behind the AI SDK seam; fan-out dispatch; the three relay rewrites; slot-lifecycle painting of the orchestrator's own shell surface; journal embedding.
- The sdk contract amendment (vendor-facing slot request removed; Python projection dropped) is implemented as part of this task.

## Locked decisions

### 1. Planner selects from the Router's shortlist

The Router ranks agents and hands the Planner a capped shortlist — no similarity threshold, ranking only. The Planner (the phase's one model call) decides which shortlisted agents actually get slots. The single-agent turn is just a one-slot plan.

### 2. Plan layout: depth-capped tree

The plan's layout is an alternating row/column tree, depth-capped at 2, unrolled in the plan schema (no recursive `$ref`), leaves being slot entries. A short deterministic reasonableness checklist runs after parse (each installed agent at most once, no empty groups, ≥1 slot); a violation is the malformed-plan case of phase decision 9. Layout is per-utterance creative Planner output; growing a much more flexible-but-safe layout vocabulary is the recorded forward path.

### 3. Slot entry and naming

A leaf is `{appId, archetype, request}` — nothing more. Slot names are orchestrator-derived from appId (collision-free with one slot per agent per turn); the Planner never invents identifiers. M8 expands the naming policy for multi-account (memo in `_dev/TODO.md` Phase 10).

### 4. No vendor-facing slot request; archetype is hub-internal

All size/shape guidance to a vendor travels as prose inside the Planner-authored per-agent request — no structured a2uiverse data on the vendor wire. Prompt assembly happens in the composition core's dispatch builder; AgentsPool stays pure transport. Archetype (`card`/`panel`/`row`/`full`) survives only inside the hub: plan-leaf vocabulary, shell-surface paint input, and the weird-layout sanity check. Vendors never receive, declare, or hear it — the AgentCard archetype-declaration idea is dropped. `SlotRequest`, `readSlotRequest`, and `SLOT_ARCHETYPES` leave the sdk contract and js projection; the archetype constants move into orchestrator source.

### 5. sdk: one projection, JS

The Python projection is dropped entirely — directory and gate wiring (nothing was ever published; it is workspace/git wiring only). The contract JSON stays normative so a projection in any language can be re-created when a real consumer exists; structured slot negotiation may return as a genuinely optional extension if M2+ synthesis needs machine-readable negotiation.

### 6. Embedder: quantized MiniLM via transformers.js

`@huggingface/transformers` with quantized `Xenova/all-MiniLM-L6-v2`, loaded once in-process. Model id + revision recorded as constants beside the vectors (the M7 persistence seam); first-boot model download cached under the orchestrator's `stateDir`.

### 7. Planner model: Gemini Flash

The `getModel(settings)` seam is configured with the AI SDK Google provider, authed by the existing Google AI Studio key under the `GOOGLE_API_KEY` env name (the a2ui-github convention). Exact model id is picked at implementation as the recorded default of the effort tunable.

### 8. Router corpus: one document per agent

Each agent embeds as one document — card name + description + skill texts concatenated — one vector keyed by appId. Skills are card content the Planner reads, not index structure. A null card (unreachable agent) contributes no vector and is unroutable that session, per phase decision 11. Per-skill granularity is a contained revisit at M9 with real corpus data.

### 9. Slot-outcome mapping

Every dispatch ends in exactly one slot state: surface claimed → filled (the client's, inherently); clean completion with zero surfaces touched → collapsed (cancelled folds in); failed/timeout dispatch or client `VALIDATION_FAILED` → failed. Collapsed needs no vendor cooperation and no new wire signal.

### 10. Shell surface identity and lifecycle

The shell's own surface follows the same laws as fragments: namespaced under a reserved `shell` source id (the Registry enforces the reservation — no installed app may claim it), stamped `role: 'shell'`; fragment relays are stamped `role: 'fragment'` plus their `slot`. One shell surface per utterance turn; all in-turn changes (slot state flips) are repaints of that surface, never a new one mid-turn. Action turns bypass Router and Planner entirely: the action routes only to the surface's owner with the partition filter, and only that vendor's surfaces change.

## Amendments this grill produced

- **SPEC.md §4.4**: rewritten — the request to an agent is Planner-authored prose carrying all guidance; no archetype/budget on the wire; the "AgentCard may declare supported archetypes" line dropped.
- **SPEC.md §5 (t4)**: dispatch tuple loses `archetype, budget`.
- **SPEC.md §13**: vendor-dependency sentence — single JS projection for the app's catalog half; the agent half depends on the protocols alone.
- **SPEC.md §14**: delta-register row "Slot archetype + budget on the request" deleted — the vendor-facing wire delta is zero.
- **Phase-2 spec decision 6**: composition extension scope shrinks to extension URI, stamp, and namespacing helpers; one language projection (JS); Python toolchain leaves the gates.
