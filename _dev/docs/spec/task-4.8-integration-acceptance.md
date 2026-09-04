# Task 4.8 — Integration + acceptance

Spec for sub-task 4.8 of Phase 4 (`_dev/docs/spec/phase-4-synthesis.md`): the phase's acceptance run — the synthesis machinery seen working end to end over the two mocks under the profile 4.7 built. A verification of the integration, kept to basic checks; the real substrate is Phase 5.

## Scope

- The acceptance item list for Phase 4 and where it lives.
- The configuration the gate runs in, and the one extra pass.
- The utterances the run uses.
- Where the dead-air measurement lands.
- What the browser pass through the tunnel covers, and how the run is written up.
- What is deliberately not built for the mocks.

## Locked decisions

### 1. Deterministic mocks are the gate; one live pass is the extra

The gated run has the mocks in deterministic mode with the orchestrator's Planner and Synthesizer live — the only model calls in the configuration — so a failure points at synthesis machinery and never at a mock model's rendering choice, and the correct merge is knowable from the dataset alone. One pass with the mocks live is run on top, so the tree-is-free invariant of 4.6 is exercised against synthesis once and the dead-air figure is also taken on the path with model-painted fragments. Nothing gates on the live pass.

### 2. The acceptance utterances are pinned

One comparison utterance and one policy utterance are written in the spec and are what the gate runs. The comparison utterance must avoid the policy words the deterministic mocks key on; the policy utterance must carry one. If a pinned utterance stops producing a two-store plan, the fix is the mock's card wording (4.6 decision 8), not a new utterance. The live pass may add free utterances on top.

### 3. Dead air lands in the backlog item

The deterministic and live figures, with the utterance and roster they came from, are appended to the backlog entry on streaming the synthesis fragment into its reserved slot. No threshold is set: decision 16 of the phase says measured, not judged, and the figure is evidence for the decision that lives there.

### 4. The browser pass is one sitting, two passes

Through the tunnel, never localhost. First the gate configuration with the pinned utterances and every click and sort change made on the real canvas, so each gated item is seen live. Then the live extra, the same utterances and then free ones. The dead-air figure is read from the journal after each. Written up once.

### 5. The acceptance list lives in the phase spec

A numbered acceptance section is added to the Phase 4 spec, following the Phase 2 and Phase 3 precedent: end to end under the profile, drill-down to absent and back, reorder to invalid and re-synthesis, decline, sort, partial-value visibility, dead air measured. Its final gate line names the browser pass through the tunnel.

### 6. Nothing is recorded for the mocks

No beat is recorded through the hub, the recorder does not learn to send surface actions, and no visual baseline is taken for any synthesis state. A replayed beat never runs the Synthesizer; its regression value is on the client's evaluator and rendering, which the existing unit and canvas tests already cover on the synthetic stream, while the orchestrator's synthesis path is covered with fakes. The one thing uncovered — the whole system running together — is covered only by the run itself. The regression bed the phase promises is the mocks themselves, re-runnable with one launcher flag, plus those tests. Phase 5 records over real vendors and builds any recorder change a real beat needs. The hand-authored synthetic beat stays as the unit substrate; its stale comment about the mock catalogs not being installed is corrected and nothing else touches it.

### 7. The run is written up the way 2.9 and 3.6 were

Anything the run changes about a decision is amended into this spec and marked as added during the run. Defects the run finds are fixed in the same session and named in the commit message. Stills from the browser pass are not committed.

## Invariants

- **Only verify that synthesis works.** The mocks are dev-only instruments and Phase 4 is not the finished synthesis; nothing is built for them beyond what the run needs.
- **Live verification drives tunnel URLs, never localhost.**

## Carried consequences

- Phase 4 spec: the numbered acceptance section.
- TODO line 4.8: "beats + visual specs" dropped.
- Tunnel-environment doc: the mock profile run command beside the existing three-terminal flow, since that doc is what the browser pass follows.
- Backlog item on streaming the synthesis fragment: the two dead-air figures.
- Two small defects fixed during the run: the synthetic beat's stale comment, and the mock agent README's link to a tier README that does not exist (apps repo).
