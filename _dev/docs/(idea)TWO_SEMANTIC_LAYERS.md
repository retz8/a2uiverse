# Two Semantic Layers

**A speculative aside — not part of the research proposal**

This note records a line of thinking that came out of working on two projects at once: an LLM-driven scheduler (a semantic recognition layer inside the OS) and an A2UI canvas shell (a generative-UI orchestrator above the apps). They started as unrelated. They stopped looking unrelated.

Nothing here is a claim the research makes or needs. It is written down because the framing was useful, not because it is established. `RESEARCH_PROPOSAL.md` stands on its own and does not depend on any of this.

---

## The observation that started it

Both projects remove hardcoded semantic knowledge and leave the mechanism underneath untouched.

| | Scheduler project | A2UI canvas |
|---|---|---|
| What gets removed | Hand-written tables of *what software is* | Hand-written definitions of *what a screen looks like* |
| What replaces it | An inferred signal | A generated surface |
| What stays | The scheduler, the queues, the kernel | The renderer, the native widgets |
| The contract in between | Mode + attributes | The component catalog |

That last row is the part worth staring at.

A2UI exists to answer: *how does an agent send a rich UI across a trust boundary without executing arbitrary code?* Its answer is a declarative description restricted to components the client has pre-approved.

The recognition layer answers a structurally identical question in the other direction: *how does a semantic judgement cross into the kernel without granting arbitrary configuration authority?* Its answer is a declarative description restricted to a vocabulary the kernel has pre-approved.

```text
   agent          ──[ component catalog ]──▶   client
   orchestrator   ──[ semantic vocabulary ]──▶  kernel
```

Same security pattern, applied twice, pointing opposite ways. The vocabulary is the kernel's component catalog; the catalog is the UI's semantic vocabulary. Both exist so that a language model can be useful without being trusted.

---

## The stacked picture

```text
                  ┌────────────────────────────────┐
                  │             user                │
                  └───────────────┬────────────────┘
                                  │  canvas + language
                  ┌───────────────▼────────────────┐
   semantic       │      orchestrator LLM           │
   layer (upper)  │      canvas · A2UI · agents     │
                  └──┬─────────┬─────────┬─────────┘
                     │         │         │   A2UI
                ┌────▼───┐ ┌───▼───┐ ┌───▼─────┐
                │ GitHub │ │ media │ │ legacy  │
                │ agent  │ │ agent │ │ wrapper │
                └────┬───┘ └───┬───┘ └───┬─────┘
   ══════════════════╪═════════╪═════════╪════════ trust boundary
                     │         │         │
                     └────declared intent┘
                                  │
                  ┌───────────────▼────────────────┐
   semantic       │      recognition LLM            │
   layer (lower)  │      mode + attributes          │
                  └──┬─────────┬─────────┬─────────┘
                     │         │         │   driver interface
                ┌────▼───┐ ┌───▼───┐ ┌───▼─────┐
                │  CPU   │ │ power │ │ I/O,net │
                └────┬───┘ └───┬───┘ └───┬─────┘
                     └─────────┼─────────┘
                  ┌────────────▼───────────────────┐
   mechanism      │        kernel                   │
                  └────────────────────────────────┘
                     ▲
                     └── process set (inferred, feeds back up
                         to the recognition layer)
```

Two semantic layers facing each other across the process boundary. Everything else on the diagram is mechanism, and none of it changes no matter how many models get stacked on top.

---

## What the upper layer knows that the lower one cannot infer

The proposal's recognition layer reads process names because it has nothing better. But when a user says "launch LoL" or "download this," an orchestrator handling that request already knows what it started and why. It does not need to infer; it can simply declare.

This does not make inference obsolete. The two have complementary blind spots:

| | Orchestrator sees | Recognition layer sees |
|---|---|---|
| Things an agent launched | ✓ with certainty | ✓ by inference |
| A game the user started directly | ✗ | ✓ |
| Cron jobs, updaters, antivirus | ✗ | ✓ |
| System daemons | ✗ | ✓ |
| *Why* something is running | ✓ | ✗ |

The orchestrator has high confidence over a narrow slice. The recognition layer has full visibility with no provenance. Neither is complete, so the natural arrangement is fusion rather than replacement:

> Declared intent overrides inference for processes it covers. Everything else is still inferred.

Which means the inference path is not scaffolding to be removed once agents arrive. It is the permanent fallback for the large fraction of a machine that no agent will ever launch.

---

## Why the two layers should not merge

They converge on knowledge. They must not converge on authority.

**Trust boundary.** The orchestrator reads output from third-party agents. If it also set kernel policy, third-party text would have a path into resource allocation. The recognition layer's input today is process names and command lines — a very narrow attack surface. Merging widens it enormously.

**Availability.** The OS must boot and schedule without an orchestrator. Orchestrators are app-layer software: they crash, update, get replaced, or are never installed. Kernel policy cannot depend on that.

**Agents will lobby.** The proposal already notes that applications declaring their own QoS all claim to be the most important thing on the system. Agents will be better at it — they can argue their case fluently in natural language. Somebody has to be able to say no, and that somebody has to sit below the boundary. Declared intent should pass through exactly the same validator, clamping, and vocabulary restriction as inferred output.

The workable arrangement is one model, two hats: possibly the same local weights serving both roles, with separate prompts, separate contexts, and separate validators. The separation is what prevents the injection path, so it has to be structural rather than a convention.

---

## The NPU angle

The lower layer's workload profile is unusual, and it happens to match a piece of hardware that currently has no killer application:

- Low duty cycle — a handful of inferences per hour
- Short structured output
- Loose latency requirement — seconds are fine
- **Must not contend with the GPU or CPU**

That last constraint is the binding one. The situations most in need of help — gaming, rendering, editing, encoding — are exactly the ones saturating the GPU. Running the recognizer there is self-defeating. An NPU is the only place this workload naturally belongs, and conversely, this may be the first always-available workload that gives an NPU something to do without taking anything away.

It is tempting to conclude "this becomes possible once NPUs get better." That is probably backwards. A 3B quantized model reading twenty process names and emitting one structured object is likely within reach of current laptop NPUs. The blocker is not silicon.

---

## What is actually hard

Ranked by how much of it is a technical problem:

**The lower layer is the realistic part.** It is self-contained inside the kernel, the contract is small, `sched_ext` is an existing deployment path, and a single OS vendor can decide to ship it. It degrades to an ordinary scheduler if absent, so it can arrive incrementally.

**The orchestrator is also realistic**, as a product. One team can build it; failure is contained to that app.

**The arrow between them is the hard part.** For declared intent to reach the kernel, someone has to define and ship that interface — and there is no reason to until orchestrators exist, and orchestrators have no reason to declare until the interface exists. That is not a capability problem and better models will not resolve it.

**The A2UI side makes a heavier assumption still.** Multiple vendors' agents rendering into one shared canvas requires everyone to agree on one protocol, at a moment when the commercial incentive runs the other way — each company would rather keep the user inside its own surface. Historically this kind of convergence has worked when a dominant platform forced it, or when nobody owned the standard and it arrived before the competitors did. An Apache-2.0 protocol from Google is aiming at the second, which is the harder of the two to hit late.

---

## A guess, held loosely

- **The lower layer arrives.** Some form of it, within a few years. One vendor can decide, and the benefit is legible.
- **The upper layer arrives, unintegrated.** Every major company ships its own orchestrator, each calling only agents inside its own ecosystem. Not one Jarvis — several, none of which talk to each other.
- **The arrow between them arrives last**, and probably as a product rather than a standard, from somewhere vertically integrated enough to own both ends.

---

## Why this does not change the research

Building the lower layer first is the right order regardless of whether any of the above happens.

It has standalone value: the machine still needs to allocate resources sensibly for software no agent launched. It has a natural attachment point if orchestrators do arrive: declared intent enters through the same vocabulary and the same validator. And if the upper layer never materializes in the form imagined here, the recognition layer loses nothing — the games users launch themselves and the antivirus scans nobody asked for will run undeclared in any future.

If anything, the speculation sharpens what the proposal is measuring. The experiments answer: *how well can a system infer intent when nobody declared it?* That question has a permanent answer-shaped hole to fill, whatever gets built above it.
