# Semantic Computer
## Toward an LLM-Native Computer Architecture

> A speculative architectural note — not part of the research proposal.

This note began with an observation from working on two seemingly unrelated projects: an LLM-driven scheduler, where a semantic recognition layer sits close to the OS, and an A2UI canvas shell, where an orchestrator generates interfaces above applications.

They initially appeared unrelated.

They stopped looking unrelated.

Both projects point toward a broader architectural possibility:

> **What if semantic state became a first-class abstraction of the computer itself?**

Not merely something an application understands.

Not merely something an LLM uses to decide what tool to call.

But something that can flow from **user intent, through the UI and operating system, all the way to hardware policy.**

This suggests a possible architecture for an **LLM-native computer**: a computer in which a persistent semantic state is continuously derived from both what the user intends and what the machine is actually doing.

The central abstraction proposed here is a **Semantic State Machine**, or S-FSM.

Nothing here is a claim the research proposal makes or requires. The research proposal stands on its own. This note is a speculative architectural direction that emerged from thinking about where the recognition layer could eventually lead.

---

# 1. From Semantic Computing to a Semantic Computer

There is already a broad research tradition around **Semantic Computing**: systems that derive, represent, integrate, and use meaning, context, and intention in computational systems.

The usual direction is roughly:

```text
User Intent
     │
     ▼
Semantic Interpretation
     │
     ▼
Data / Content / Service / Device
```

The computer understands more about what something *means*.

The architectural question here is slightly different:

> **What happens when semantic understanding itself becomes a persistent state of the computer?**

A conventional computer exposes mostly mechanical state:

```text
processes
CPU utilization
GPU utilization
memory
I/O
network
devices
```

These are useful facts, but they do not directly describe what the machine *means* to the user.

A system may know that:

```text
Chrome.exe
VSCode.exe
python.exe
Spotify.exe
```

are running.

It does not necessarily know that:

```text
Chrome + VS Code + Python
    = one research/development workflow

Spotify
    = background activity

GPU workload
    = latency-sensitive interactive work
```

Applications and agents increasingly possess this semantic information.

The operating system largely does not.

This suggests a shift:

> **The next computer abstraction may not be another mechanism layer. It may be a semantic layer.**

---

# 2. Semantic State as a First-Class System Abstraction

The central idea is to introduce a persistent semantic representation between human intent and machine mechanisms.

Instead of:

```text
User
  ↓
Applications
  ↓
Operating System
  ↓
Hardware
```

the architecture becomes:

```text
                         USER
                           │
                    intent / actions
                           │
                           ▼
                ┌─────────────────────┐
                │ Upper Semantic Layer│
                │ agents · UI · A2UI  │
                └──────────┬──────────┘
                           │
                    declared intent
                           │
                           ▼
                ┌─────────────────────┐
                │      S-FSM          │
                │   Semantic State    │
                │   + Transitions     │
                └──────────┬──────────┘
                           │
                    semantic policy
                           │
                           ▼
                ┌─────────────────────┐
                │   Semantic OS       │
                │ scheduler · memory  │
                │ I/O · power         │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Semantic Hardware   │
                │ CPU · GPU · NPU     │
                └─────────────────────┘
```

The important point is that the semantic layer does not replace the mechanisms below it.

The scheduler remains a scheduler.

The renderer remains a renderer.

The kernel remains a kernel.

Hardware remains hardware.

The difference is that these mechanisms can now receive a representation of **what the machine is semantically doing**.

---

# 3. S-FSM: Semantic State Machine

This suggests a new architectural abstraction:

> **S-FSM — Semantic Finite State Machine**

The name should be treated cautiously because related uses of semantic automata already exist in the literature. The important contribution is not the terminology itself, but the specific role of semantic state as a cross-layer computer abstraction.

A conventional finite-state machine describes:

```text
state
  │
event
  │
transition
  │
new state
```

An S-FSM extends this idea by making the state semantic.

A simplified formulation is:

```text
Semantic State
    = f(User Intent, Machine State, Context)
```

The semantic state is not simply a natural-language description.

It should be a bounded, machine-processable representation:

```text
STATE {
    primary_intent: RESEARCH,
    secondary_intent: DEVELOPMENT,
    context: TECHNICAL_WORK,
    latency_class: INTERACTIVE,
    power_preference: BALANCED,
    confidence: 0.91
}
```

The LLM interprets evidence and proposes state or transitions.

The system does not blindly execute the LLM's natural-language output.

Instead:

```text
LLM interpretation
       │
       ▼
semantic vocabulary
       │
       ▼
validator
       │
       ▼
S-FSM transition
       │
       ▼
system policy
```

This distinction is fundamental.

> **The LLM interprets the semantic state. It does not own the state machine.**

---

# 4. Two Sources of Semantic Knowledge

The semantic state has two fundamentally different sources.

## 4.1 User-declared intent

An upper semantic layer sits above applications and agents.

It knows things that the operating system cannot reliably infer.

For example:

```text
User:
"Download this dataset and analyze it."

Orchestrator:
    downloader → DATA_ACQUISITION
    python     → DATA_ANALYSIS
```

The orchestrator knows why these processes exist because it created them as part of a task.

It has **provenance**.

It does not need to infer the relationship.

---

## 4.2 Machine-inferred state

The lower semantic layer observes the computer itself.

It sees things that an orchestrator does not necessarily know:

- applications the user launched directly;
- games;
- cron jobs;
- antivirus scans;
- system daemons;
- background updates;
- legacy applications;
- processes belonging to software that never interacted with an agent.

It therefore needs inference.

```text
process names
command lines
resource behavior
runtime relationships
        │
        ▼
    Lower LLM
        │
        ▼
Machine Semantic State
```

The lower layer has **visibility without provenance**.

The upper layer has **provenance without full visibility**.

This difference is the foundation for their fusion.

---

# 5. Upper LLM + Lower LLM + Fusion

The architecture can therefore be expressed as three semantic components.

```text
                  USER
                    │
                    ▼
             ┌─────────────┐
             │  Upper LLM  │
             │             │
             │ declared    │
             │ intent      │
             └──────┬──────┘
                    │
                    │
                    ▼
               ┌─────────┐
               │         │
               │ Fusion  │
               │         │
               └────┬────┘
                    │
                    ▼
             ┌─────────────┐
             │    S-FSM    │
             │             │
             │  Semantic   │
             │    State    │
             └──────┬──────┘
                    ▲
                    │
             ┌──────┴──────┐
             │  Lower LLM  │
             │             │
             │ machine     │
             │ inference   │
             └──────▲──────┘
                    │
              Machine State
```

The two models do not necessarily need different weights.

They may be the **same local model operating under different contexts, prompts, schemas, and validators**.

This suggests a useful architecture:

> **One semantic model, multiple bounded roles.**

The upper model answers:

> **What does the user intend?**

The lower model answers:

> **What is the machine doing?**

The fusion layer answers:

> **What semantic state is the computer currently in?**

Formally:

```text
I = User Intent
M = Machine Observation
S = Semantic State

P(S | I, M)
```

The goal is not to make the LLM produce a beautiful description.

The goal is to maintain a stable, machine-processable estimate of the current semantic state.

---

# 6. Why Fusion Matters

The two sources have complementary blind spots.

| | Upper Semantic Layer | Lower Semantic Layer |
|---|---|---|
| Agent-launched process | knows why | can infer |
| User-launched game | cannot know why | can infer |
| Cron job | usually does not know | can infer |
| Antivirus | usually does not know | can infer |
| System daemon | usually does not know | can infer |
| Explicit user intent | knows | cannot know |
| Process provenance | strong | weak |
| Machine-wide visibility | limited | broad |

Neither layer is complete.

The natural architecture is therefore fusion rather than replacement.

> **Declared intent should dominate inference where provenance exists. Inference fills the remainder of the machine state.**

This makes the lower recognition layer permanent.

Even if every future application becomes agentic, users will still launch applications directly. Operating systems will still run daemons. Software will still update itself. Security tools will still operate without asking an agent.

The machine will always contain activity that nobody explicitly declared.

---

# 7. Semantic State as a Cross-Layer Contract

The most important consequence of S-FSM is that semantic state does not belong exclusively to the UI or the OS.

It becomes a **cross-layer contract**.

Suppose the current semantic state is:

```text
STATE {
    primary_intent: TECHNICAL_RESEARCH,
    secondary_intent: CODE_IMPLEMENTATION,
    context: DEEP_WORK,
    latency_class: INTERACTIVE,
    power_preference: BALANCED
}
```

The UI can project this state as:

```text
prioritize:
    browser
    editor
    documentation
```

The OS can project the same state as:

```text
increase:
    interactive priority
    memory retention

decrease:
    background activity
```

Hardware-facing policy can project it as:

```text
avoid:
    unnecessary GPU wakeups

prefer:
    efficient CPU execution

maintain:
    NPU semantic monitoring
```

These are not three separate personalization systems.

They are **three projections of the same semantic state**.

This creates a vertical path:

```text
Personalized UI
      │
      ▼
Personalized Semantic State
      │
      ▼
Personalized OS Policy
      │
      ▼
Personalized Hardware Behavior
```

The result is a stronger form of personalization.

The computer is not merely personalized because it remembers the user's preferences.

It is personalized because:

> **the machine understands what the user is doing right now.**

---

# 8. From Personalized UI to a Personalized Computer

Today's "personal computer" is personal largely because it contains personal data, accounts, applications, files, and preferences.

A semantic computer could be personal at a deeper level.

It could maintain a model of the relationship between:

```text
the user
    +
their intent
    +
their applications
    +
their workflows
    +
their machine
    +
their hardware
```

Personalization would therefore extend vertically:

```text
        Personalized UI
               │
               ▼
        Personalized Intent
               │
               ▼
        Personalized S-FSM
               │
               ▼
         Personalized OS
               │
               ▼
       Personalized Hardware
```

This is no longer merely personalized software.

It is a **personalized computer architecture**.

---

# 9. The A2UI Connection

The A2UI side of the architecture reveals a surprisingly similar pattern.

A2UI asks:

> How does an agent send a rich interface across a trust boundary without executing arbitrary code?

Its answer is a declarative representation restricted to components that the client has pre-approved.

The semantic OS asks a structurally similar question:

> How does an LLM-derived semantic judgement influence the kernel without granting arbitrary policy authority?

Its answer can be structurally similar:

```text
LLM
 │
 ▼
semantic vocabulary
 │
 ▼
validator
 │
 ▼
policy constraints
 │
 ▼
kernel
```

This produces two related trust patterns:

```text
agent
   │
   │ component catalog
   ▼
 client


orchestrator
   │
   │ semantic vocabulary
   ▼
 kernel
```

Both systems allow a language model to be useful without trusting it with unrestricted execution authority.

The vocabulary becomes the boundary.

---

# 10. Semantic Knowledge Should Converge; Authority Should Not

The two semantic layers should ultimately contribute to the same S-FSM.

They should not share unrestricted authority.

> **Semantic knowledge may converge. Authority must remain separated.**

This distinction matters for three reasons.

### Trust boundary

The orchestrator consumes output from third-party agents.

If that output could directly determine kernel policy, arbitrary application-level text would gain a path into resource allocation.

Declared intent must therefore pass through the same semantic vocabulary, validation, and policy constraints as inferred intent.

### Availability

The OS must boot and schedule without an orchestrator.

An orchestrator is application software.

It can crash, update, disappear, or never be installed.

The kernel cannot depend on it.

### Agents will lobby

Agents will naturally claim that their work is important.

They can describe their tasks convincingly in natural language.

That does not mean they should receive unlimited CPU, GPU, memory, or power.

The system below the trust boundary must remain capable of saying no.

The result is:

> **One semantic model, two semantic roles, one fused state, separate authority domains.**

---

# 11. The NPU as the Semantic Substrate

This architecture also gives the NPU a natural role.

The semantic workload has an unusual profile:

- low duty cycle;
- short structured output;
- loose latency requirements;
- relatively small local models;
- continuous availability;
- and little tolerance for competing with the GPU or CPU.

A recognition model may only need to inspect a set of processes periodically and produce a small structured state update.

That is a very different workload from image generation or large-scale model inference.

The NPU could therefore serve as the computer's **always-available semantic substrate**.

The important point is not:

> "NPU becomes useful once models become sufficiently powerful."

It may instead be:

> **Semantic computing provides an always-available workload that naturally belongs on the NPU.**

A single local model could potentially support:

```text
Upper semantic inference
        +
Lower machine-state inference
        +
Semantic-state maintenance
```

while leaving the GPU available for the user's actual workloads.

---

# 12. One Model, Two Hats

The architecture does not require a separate AI model at every semantic layer.

Potentially:

```text
                    NPU
                     │
             ┌───────▼───────┐
             │   Local LLM   │
             │  shared model │
             └───────┬───────┘
                     │
          ┌──────────┴──────────┐
          │                     │
   Upper context          Lower context
          │                     │
   declared intent        machine state
          │                     │
          └──────────┬──────────┘
                     ▼
                   Fusion
                     │
                     ▼
                  S-FSM
```

The same weights do not imply the same authority.

Different contexts can expose different inputs.

Different schemas can constrain different outputs.

Different validators can control different transitions.

This is important because it makes the architecture conceptually closer to a **semantic substrate** than a collection of unrelated AI features.

---

# 13. The Semantic Computer as an LLM-Native Architecture

This leads to a broader definition.

An LLM-native computer is not simply:

> a conventional computer with an LLM application installed.

Nor is it:

> a computer in which every subsystem is replaced by an LLM.

Instead:

> **An LLM-native computer is a computer in which semantic state is a first-class system abstraction, continuously interpreted from user intent and machine state, and projected across the UI, operating system, and hardware.**

Under this view:

```text
LLM
    = semantic interpreter

S-FSM
    = semantic state + transition model

UI
    = semantic state presentation

OS
    = semantic state policy

Hardware
    = semantic state execution
```

The mechanisms underneath remain.

The information available to those mechanisms changes.

---

# 14. The Full Architecture

The complete system can therefore be represented as:

```text
                              USER
                                │
                         language / actions
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   UPPER SEMANTIC LAYER  │
                  │                         │
                  │  LLM · agents · A2UI    │
                  │                         │
                  │  "What does the user    │
                  │   intend to do?"        │
                  └────────────┬────────────┘
                               │
                        declared intent
                               │
═══════════════════════════════╪════════════════════════
                         TRUST BOUNDARY
═══════════════════════════════╪════════════════════════
                               │
                               ▼
                  ┌─────────────────────────┐
                  │         FUSION          │
                  │                         │
                  │ declared intent         │
                  │          +              │
                  │ inferred machine state  │
                  └────────────┬────────────┘
                               │
                               ▼
                  ╔═════════════════════════╗
                  ║          S-FSM          ║
                  ║                         ║
                  ║   Persistent Semantic   ║
                  ║         State           ║
                  ║                         ║
                  ║   + Semantic Transitions║
                  ╚════════════╤════════════╝
                               │
                     semantic state / policy
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
        ┌────────────────┐ ┌────────────┐ ┌───────────────┐
        │ Semantic UI    │ │ Semantic OS│ │ HW Interface  │
        │                │ │            │ │               │
        │ A2UI           │ │ scheduler  │ │ CPU / GPU     │
        │ adaptive UI    │ │ memory     │ │ power / I/O   │
        └────────────────┘ │ I/O / power│ └───────┬───────┘
                           └─────┬──────┘         │
                                 │                │
                                 ▼                ▼
                           ┌──────────┐      ┌──────────┐
                           │  Kernel  │      │ Hardware │
                           └──────────┘      └──────────┘

                               ▲
                               │
                       machine observation
                               │
                    ┌──────────┴──────────┐
                    │   LOWER SEMANTIC   │
                    │       LAYER         │
                    │                     │
                    │      Lower LLM      │
                    │ process recognition │
                    │ context inference   │
                    └─────────────────────┘
```

The machine therefore has two semantic directions:

```text
USER → intent → semantic state → mechanism
```

and

```text
mechanism → observation → semantic inference → semantic state
```

The S-FSM sits where these two directions meet.

---

# 15. What Is Actually Hard?

The hardest parts may not be model intelligence.

## The lower semantic layer

The lower layer is comparatively self-contained.

It can observe machine state, infer process intent, and produce a bounded semantic representation.

It can potentially attach to existing OS mechanisms such as `sched_ext` without requiring the entire computer ecosystem to change.

It can also degrade naturally:

```text
semantic scheduler unavailable
        ↓
ordinary scheduler
```

That makes incremental deployment plausible.

## The upper semantic layer

An orchestrator is also technically feasible as a product.

A single organization can build one.

Failure is largely contained to the application.

## The fusion layer

Fusion introduces a deeper problem:

**How should conflicting semantic evidence be resolved?**

For example:

```text
Upper LLM:
    GAMEPLAY

Lower LLM:
    VIDEO_ENCODING

Machine:
    GPU 94%

User:
    "I'm just recording this."
```

The semantic state cannot simply choose whichever model speaks last.

It needs:

- provenance;
- confidence;
- precedence;
- temporal stability;
- contradiction handling;
- and bounded transitions.

This may be one of the central research problems of the architecture.

## The S-FSM itself

A semantic state must be:

- expressive enough to capture useful context;
- stable enough for system policy;
- constrained enough to validate;
- compact enough for local inference;
- and general enough to be consumed by multiple system layers.

This is fundamentally different from generating a textual description of the machine.

The state must become an actual systems abstraction.

---

# 16. The Interface Problem

The most difficult deployment problem may not be technical capability.

It may be coordination.

For the semantic state to influence the kernel, somebody must define and ship the interface.

But:

```text
No semantic OS interface
        ↓
orchestrators have no reason to declare intent

No orchestrators
        ↓
OS vendors have no reason to expose the interface
```

This is a classic chicken-and-egg problem.

Better models do not solve it.

A standard may eventually emerge.

Alternatively, a vertically integrated vendor may own enough of:

```text
UI
+
agent
+
OS
+
hardware
```

to introduce the entire semantic stack as one product.

That may be more likely than immediate cross-vendor standardization.

---

# 17. The A2UI Problem Reappears

The upper layer makes a similar assumption.

Multiple vendors' agents rendering into one shared canvas require agreement on:

- protocol;
- component vocabulary;
- trust model;
- interaction semantics.

The same coordination problem therefore exists both above and below the semantic state:

```text
Agents
   ↓
A2UI vocabulary
   ↓
Client


Agents / UI
   ↓
Semantic vocabulary
   ↓
S-FSM
   ↓
OS


OS
   ↓
Hardware interface
   ↓
CPU / GPU / NPU
```

The architecture is technically composable.

The ecosystem may not be.

---

# 18. A Possible Evolution

A plausible progression is:

### Phase 1 — Semantic Applications

Agents understand user intent and generate interfaces.

### Phase 2 — Semantic OS

The operating system begins inferring what processes mean and adapting resource allocation.

### Phase 3 — Semantic Fusion

Declared intent and inferred machine state are combined.

### Phase 4 — S-FSM

Semantic state becomes a persistent, validated system abstraction.

### Phase 5 — Cross-Layer Projection

UI, OS, and hardware consume different projections of the same semantic state.

### Phase 6 — LLM-Native Computer

The semantic state becomes a fundamental part of the computer architecture.

At that point:

```text
UI
OS
Hardware
```

are no longer independent consumers of AI.

They are different layers operating on a shared semantic model of the machine.

---

# 19. What the Computer Gains

The resulting computer does not merely know more.

It can behave differently.

Consider a user entering a state:

```text
RESEARCH
+
CODE_IMPLEMENTATION
+
DEEP_WORK
```

The UI can reorganize itself.

The OS can suppress irrelevant background work.

The scheduler can prioritize interactive processes.

Power management can make different tradeoffs.

The GPU can avoid unnecessary contention.

The NPU can maintain semantic monitoring.

The same semantic transition can therefore produce coordinated changes throughout the system.

This is the deeper promise of S-FSM:

> **A semantic transition at the user level can become a coordinated system transition at the machine level.**

---

# 20. The Strongest Form of Personalization

This suggests a different definition of personalized computing.

Current personalization mostly changes:

```text
appearance
recommendations
layout
preferences
content
```

A semantic computer could personalize:

```text
what the machine believes you are doing
        ↓
what the UI presents
        ↓
what the OS prioritizes
        ↓
what hardware resources are emphasized
```

The personalization becomes architectural.

The machine adapts not only its interface but its behavior.

That is:

> **Personalized UI → Personalized semantic state → Personalized OS → Personalized hardware.**

---

# 21. The Core Research Question

The original recognition project asks:

> **How well can a system infer intent when nobody declared it?**

That remains an important and independently useful question.

The larger architectural question is:

> **Can semantic state become a stable, safe, and useful intermediate representation between human intent and computer mechanisms?**

This breaks down into several questions:

1. Can an upper LLM reliably encode declared user intent?
2. Can a lower LLM infer useful semantic information from machine state?
3. Can the two sources be fused without losing provenance?
4. Can semantic state remain stable under noisy observations?
5. Can an S-FSM provide safe, bounded transitions?
6. Can the same semantic state be projected meaningfully into UI, OS, and hardware?
7. Can a local NPU-hosted model maintain this semantic substrate efficiently?
8. Does semantic state actually improve system behavior enough to justify the additional complexity?

If these questions can be answered positively, the result is more than an LLM-powered scheduler or an AI-powered interface.

It becomes a candidate architecture for a new kind of computer.

---

# 22. Toward the Semantic Computer

The original observation was that two projects appeared to contain the same pattern:

```text
semantic interpretation
        ↓
restricted declarative representation
        ↓
trusted mechanism
```

The broader hypothesis is now stronger.

Perhaps the computer can maintain a persistent semantic state that sits between **human intention and machine mechanism**.

The upper semantic layer knows what the user and agents intend.

The lower semantic layer knows what the machine is actually doing.

Fusion reconciles the two.

S-FSM maintains the resulting semantic state.

The UI presents it.

The OS acts on it.

Hardware executes the resulting policy.

And an NPU-hosted local LLM provides the continuously available semantic substrate.

```text
                         USER
                           │
                           ▼
                    ┌────────────┐
                    │  Upper LLM │
                    │  intent    │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │   FUSION   │◄──────── Lower LLM
                    └─────┬──────┘           ▲
                          │                   │
                          ▼             Machine State
                    ╔════════════╗
                    ║   S-FSM    ║
                    ║            ║
                    ║ Semantic   ║
                    ║   State    ║
                    ╚═════╤══════╝
                          │
               ┌──────────┼──────────┐
               ▼          ▼          ▼
              UI          OS         HW
               │          │          │
              A2UI     scheduler   CPU/GPU
                         memory      NPU
                         power
```

The mechanism underneath does not disappear.

The computer simply gains something it historically lacked:

> **a semantic model of itself.**

That may be the deeper transition from an AI-enabled computer to an **LLM-native computer**.