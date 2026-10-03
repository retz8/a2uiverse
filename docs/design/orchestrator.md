# Orchestrator: how a question becomes one screen

This guide explains the **orchestrator**, the server in the middle of A2UIVerse. The client talks only to it, and it talks to every app. It's written for a frontend engineer meeting A2UIVerse for the first time. It starts with the ideas, follows one question through the orchestrator from start to finish, then opens up the machinery: the data structures, the streams and the timers. It ends with the design decisions and where the code lives.

One example runs through the whole guide: the question _"what's the status of what I'm working on?"_, answered by Linear, GitHub and CircleCI. It's a real recorded session (you can replay it, see [Trying it without a model](#trying-it-without-a-model)), and the numbers below come from its recording and its line in the orchestrator's journal.

<p align="center">
  <img src="../images/composing-join.gif" width="720" alt="One question composed: the layout lands, three apps fill their slots, the merged view lands on top">
  <br>
  <em>The recorded question as the client drew it, waits shortened. Planning took about 6 s; the layout landed at 6.05 s, the three apps' answers between 6.07 and 6.09 s, and the merged view at 17.47 s.</em>
</p>

## Problem it solves

The client wants one screen answering one question, built from several apps. The apps don't know about each other, and each speaks for itself. Something has to sit between them and do five jobs:

1. **Pick the apps.** Out of every installed app, which ones hold part of the answer? There's no list of question types to match against; apps are described only by their own agent cards.
2. **Lay out the screen before anyone answers.** The client should show something at once, not wait for the slowest app.
3. **Ask the apps in parallel and pass their UI through**, into the right slot, without changing what the apps painted.
4. **Stay honest when apps are slow or fail.** One app failing must not break the others, and a slow one must not hold the screen hostage.
5. **Keep every question's answer alive**, so an earlier answer still works after the next question is asked.

There's also a sixth job, merging the apps' answers into one table. It's big enough to have its own guide, [`synthesis.md`](synthesis.md).

The orchestrator does all of this as a **hub**. To the client it's one A2A agent that answers everything. To each app it's an A2A client with a request. Nothing else talks to an app.

```mermaid
flowchart LR
    C["Client<br/>(the canvas)"] <-->|"A2A"| O["Orchestrator<br/>(the hub)"]
    O <-->|"A2A"| L["Linear agent"]
    O <-->|"A2A"| G["GitHub agent"]
    O <-->|"A2A"| CI["CircleCI agent"]
    O -.->|"two model calls"| M["Gemini<br/>Planner and Synthesizer"]
    O -.->|"in-process"| E["Embedding model<br/>for the Router"]
```

## Six ideas to hold on to

### 1. A2A in two minutes

A2UIVerse's processes talk **A2A** (the Agent-to-Agent protocol, version 0.3 here). If you've used a streaming HTTP API, you know most of it already:

- An agent publishes an **agent card** at `/.well-known/agent-card.json`: its name, description, and **skills**, each with example questions.
- A client sends a **message** (JSON-RPC over HTTP) and gets back a **stream of events**: status updates, each carrying a message whose **parts** are text or JSON data.
- Every exchange is a **task** with an id. The stream ends with one event marked `final: true`, whose state says how it ended: `completed`, `failed`, `canceled`.
- Tasks belong to a **context**, a conversation id. Messages in one context share history.

A2UI rides inside A2A: an agent's UI arrives as JSON data parts like `{"version": "v0.9", "createSurface": {…}}`.

### 2. Hub speaks A2A on both sides

The orchestrator is an A2A **server** toward the client and an A2A **client** toward every app. That means every event an app sends travels app → orchestrator → client, and the orchestrator can do its work on the way: stamp where the event came from, keep a copy of the app's data, decide when to merge. The client never learns an app's address.

### 3. A turn is one client message and its stream

Every message the client sends starts a **turn**: one A2A task, one stream, one final. The orchestrator tells the kind of turn from the message's shape alone (`composition/classify.ts`):

| Turn          | The message carries                             | What happens                                               |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `utterance`   | text: a question from the palette               | the whole pipeline: route, plan, paint, ask, merge         |
| `action`      | an A2UI action on a surface, like "open run"    | only the app that owns that surface is asked               |
| `operation`   | a press: Retry, Include, Try again, a step, close | an operation on an existing answer                       |
| `clientError` | an error report, like a paint it couldn't draw  | that app's slot is marked failed                           |

An action names its surface as `circleci:circleci-1`, and the part before the colon is the **owner**: the only app that hears about it. A surface owned by `shell` is A2UIVerse's own UI, like the button that opens the Store; that action is only written to the journal.

### 4. Every question is a context, and each context has a composition

Each question the client asks opens a **new A2A context**. The client sends the question with no context id, and the orchestrator mints one. For that context the orchestrator holds a **composition**: everything about that one answer. That's the plan, each app's slot and its state, a copy of each app's data, the merged view, and each app's back-and-forward history.

Compositions stay in memory for the whole session, until the client closes one. A later message names its context, so a click on an older answer lands on that answer's composition.

A question asked while looking at an older answer names that answer's context as its **parent**. The compositions form a tree, the same tree the client draws as its trail.

### 5. Shell is a source too

The orchestrator paints its own UI, the **shell**, through the same path as any app. The layout is the surface `shell:main`, and the merged view is `shell:synthesis`. Every event carries a **stamp** in its metadata saying where it came from:

```jsonc
{"a2uiverse": {"source": "linear", "role": "fragment"}}   // an app's paint, for Linear's slot
{"a2uiverse": {"source": "shell", "role": "shell"}}       // the layout, or the turn's own status
{"a2uiverse": {"source": "shell", "role": "fragment"}}    // the merged view, for its reserved slot
```

`source` is how the client knows which slot a surface fills.

### 6. Two model calls, everything else deterministic

Only two steps ask a language model (Gemini, through the Vercel AI SDK):

- The **Planner** decides who answers and designs the layout. Every question runs it.
- The **Synthesizer** writes the merged view, when the plan reserved one.

Everything else is ordinary code: the Router's ranking (a small embedding model running in-process, no API key), the relay, the timers, the journal. A question answered by one app costs one model call; a merged answer costs two.

## One question, end to end

```mermaid
flowchart TD
    A["1. The message arrives<br/>dedupe, classify, heartbeat"] --> R["2. Router ranks the apps"]
    R --> P["3. Planner writes the plan<br/>(model call one)"]
    P --> F["4. First paint: the layout,<br/>before any app is asked"]
    F --> D["5. Each app is asked in parallel"]
    D --> RL["6. Every event relayed into its slot,<br/>the app's data copied on the way"]
    RL --> S["7. Each app settles"]
    S --> M["8. The merge<br/>(model call two)"]
    M --> FN["9. One final, then the journal line"]
```

**1. The message arrives.** The A2A server hands the message to the orchestrator's executor, which publishes a `working` task first (so a cancel arriving early can find it) and then:

- **Refuses a repeat.** If this message id was seen recently, the turn fails at once with "This request was already received." (see [Refusing a repeat](#refusing-a-repeat)).
- **Classifies it** (idea 3). This one is text, so it's an `utterance`.
- **Checks the context.** A question must open a context of its own. One arriving in a context the session already holds is refused: "A question opens a context of its own."
- **Starts the heartbeat**, an empty event every 30 seconds of silence (see [The heartbeat](#heartbeat)).

**2. The Router ranks the apps.** The question is turned into a vector by a small embedding model and compared with a vector of every app's agent card, plus A2UIVerse's own card, which answers questions about the platform. The top five go on the **shortlist**. There's no cut-off score: ranking only narrows the field, and the Planner makes the real choice. When a question is asked from an older answer, that answer's apps stay on the shortlist regardless of rank, so "add GitHub to this" can still plan the apps already on screen.

**3. The Planner writes the plan.** This is the first model call. The Planner gets the question and the shortlisted cards, and answers with a **layout surface**: which apps to ask and what to ask each, plus the screen's layout as a component tree in the shell catalog. Here is what it wrote for the example (trimmed):

```jsonc
{
  "dispatch": [
    {"source": "linear",   "request": "Show the issues assigned to me or currently in progress as a compact list. For each issue, include its identifier, title, status, priority, linked branch or pull request, and the full date and time it was last updated."},
    {"source": "github",   "request": "Show my open pull requests and recent branches as a compact list. For each, include its title, number, branch name, review status, any linked issue identifier, and the full date and time it was last updated."},
    {"source": "circleci", "request": "Show recent pipeline runs for my active branches as a compact list. For each run, include the branch name, commit, workflow status (passed, failed, or running), and the full date and time."},
    {"source": "shell",    "request": "Where each work item stands: one row per Linear issue … with its priority, status, linked GitHub pull request, and CircleCI build status; most recently updated first. …",
     "columns": ["Issue", "Priority", "Status", "Pull request", "CI", "Updated"],
     "columnSources": ["linear", "linear", "linear", "github", "circleci", "linear"],
     "join": {"home": "linear", "nouns": {"linear": "issues", "github": "PRs", "circleci": "runs"}}}
  ],
  "tree": {"components": [
    {"id": "root",     "component": "Column", "children": ["status", "sources"]},
    {"id": "status",   "component": "Slot", "source": "shell"},
    {"id": "sources",  "component": "Row", "children": ["linear", "github", "circleci"]},
    {"id": "linear",   "component": "Slot", "source": "linear", "weight": 1},
    {"id": "github",   "component": "Slot", "source": "github", "weight": 1},
    {"id": "circleci", "component": "Slot", "source": "circleci", "weight": 1}
  ]},
  "dataModel": {},
  "title": "Status of current work"
}
```

Notice three things. Each app gets its **own request in its own words**, never your question as typed; each asks for exactly the fields a merge will need, like "the full date and time", without ever mentioning the merge. The `shell` entry is the merged view: its request is the brief for the Synthesizer. And the tree is just `Slot`s, one per entry: the Planner designs the frame, never the apps' contents.

The plan is checked by a validator; if it fails, the model gets one retry. The Planner can also write a short **title**, which names this answer in the client's trail; here it's "Status of current work". In the recorded run, planning took 6.0 seconds from the question arriving to the plan accepted.

**4. First paint, before any app is asked.** The orchestrator turns the plan into the `shell:main` surface and sends it to the client at once. On the way, the **shell painter** writes in what only the shell owns: every app's `Slot` is wrapped in an `Attribution` (the app's name above its slot, which the app can't hide), and every slot gets its state:

```jsonc
{"id": "status", "component": "Slot", "source": "shell", "state": "pending", "label": "Synthesis", "content": "shell",
 "columns": ["Issue", "Priority", "Status", "Pull request", "CI", "Updated"], "columnSources": ["…"], "join": {"home": "linear", "…": "…"}},
{"id": "attribution-linear", "component": "Attribution", "displayName": "Linear", "appId": "linear", "child": "linear", "weight": 1},
{"id": "linear", "component": "Slot", "source": "linear", "weight": 1, "state": "pending", "label": "Linear", "noun": "Linear issues"}
```

The client can now draw the whole frame, the merged view's column headers over skeleton rows, and a waiting slot per app. **First paint never waits on any app.** In the recording it reached the client 6.05 seconds after the question was sent.

**5. Each app is asked, in parallel.** For every app in the plan, the orchestrator builds an A2A message whose text is the Planner's request for that app, and hands it to the **AgentsPool**. The pool connects to the app, sends the message in that app's own conversation for this context, and streams back its events. The three requests went out within a millisecond of each other.

**6. Every event is relayed into its slot.** As each event arrives, the orchestrator:

1. rewrites the envelope's task and context ids to the client's,
2. stamps it `{source: "linear", role: "fragment"}`,
3. **namespaces** every surface id, so Linear's `linear-1` becomes `linear:linear-1`, the one its `paintMeta` titles included,
4. **demotes** the app's final event to a plain `working` one, because the hub owns the turn's single final,
5. applies the app's data model changes to **its own copy of the partition** (needed later by the merge),
6. counts every `createSurface` as a paint in that app's history, the newest on screen (for its back arrow),
7. publishes the event to the client.

In the recording, GitHub's answer reached the client at 6.07 s, Linear's at 6.08 s and CircleCI's at 6.09 s. These apps ran in `deterministic` mode, answering from recordings in 24 to 36 milliseconds each.

**7. Each app settles.** When an app's stream ends, the orchestrator sends the client one more event for that app with no parts and the stamp `settled: true`, which tells the client that app's answer is complete. The app's slot state is decided: it **arrived** if it painted a surface, it **failed** if it ended in error, couldn't be reached, or hit the hard cap. Then the **trigger** is asked whether the merge can run: here, all three arrived, so it's released at once.

**8. The merge.** The Synthesizer, the second model call, writes the merged view as formulas over the apps' data, and the orchestrator checks it before painting it into the reserved slot. In the recorded run its first attempt was accepted, and the view landed 11.4 seconds after the merge was released. How the merged view is written, checked and kept live is the whole of [`synthesis.md`](synthesis.md).

**9. One final, then the journal line.** Once every app has arrived, failed or hit the hard cap, and the merge released during the turn is done, the orchestrator sends the turn's one `final: true` event, `completed`. The client saw it 17.5 seconds after asking. The turn's line in the **intent journal** is written when the last app's stream has fully drained, so an answer arriving late still makes it onto the line. Here is the recorded line, trimmed:

```jsonc
{
  "turnId": "4922aa90-f685-4b23-b836-a1e2819bb594",          // the client's task id
  "clientContextId": "fc54e5d9-ec43-4456-9b53-ba6fd6a7d086", // the context: this answer's composition
  "at": "2026-09-27T08:41:23.612Z",
  "kind": "utterance",
  "descriptor": "what's the status of what I'm working on?",
  "plan": {"outcome": "planned", "planMs": 6038, "layoutSurface": {"…": "the plan above"}, "title": "Status of current work", "attempts": ["…one"], "toolCalls": []},
  "dispatch": [
    {"appId": "github", "vendorContextId": "7a3c3416-…", "vendorTaskId": "3ab4822a-…", "startedAt": "2026-09-27T08:41:29.652Z", "endedAt": "2026-09-27T08:41:29.676Z", "outcome": "completed"},
    {"appId": "linear",   "…": "…", "outcome": "completed"},
    {"appId": "circleci", "…": "…", "outcome": "completed"}
  ],
  "synthesis": {"outcome": "synthesized", "attempts": ["…the accepted one"], "deadAirMs": 11382},
  "surfaces": {"created": ["shell:main", "github:notifications-1", "linear:linear-1", "circleci:circleci-1", "shell:synthesis"], "…": "…"},
  "outcome": "completed",
  "embedding": ["…384 numbers: the descriptor, embedded with the Router's model"]
}
```

## Inside the machinery

### Server and its boot

`src/index.ts` loads the configuration and calls `buildOrchestrator` in `src/app.ts`, which wires everything together once:

```mermaid
flowchart TD
    CFG["loadConfig()"] --> B["buildOrchestrator()"]
    B --> REG["Registry<br/>installed apps, the catalog table + A2UIVerse's own card"]
    B --> EMB["Embedder"]
    B --> CMP["Compositions"]
    B --> PL["Planner<br/>with its readers"]
    B --> SY["Synthesizer"]
    B --> RT["Router"]
    B --> POOL["AgentsPool"]
    REG & EMB & CMP & PL & SY & RT & POOL --> EX["OrchestratorExecutor"]
    EX --> H["A2A request handler<br/>(express: the registry's routes, the card, then JSON-RPC)"]
```

The A2A SDK's `DefaultRequestHandler` serves the card and runs the executor for every message. CORS lets in only `localhost` and dev-tunnel origins. Each dependency is handed in as an interface, so the tests swap in a fake embedder, planner, synthesizer model or card fetcher, with no model download, no model call and no network.

Before it listens, `init()` does three things in order:

1. **Reads the registry** from the state directory (`registry.load`), hashing every artifact's files again. A record file that won't parse, or an artifact whose files are missing or changed, throws with the path and the problem, and the orchestrator doesn't start.
2. **Issues a fresh write token** into the state directory (next section).
3. **Fetches every installed app's card** in parallel, from the URL stored at install, and embeds each one (`registry.refreshCards`). That fetched card is the one this run uses. A card that can't be fetched is `null`, and that app can't be routed to for the rest of the run, though it stays installed. The boot log names every such app.

### Registry: what's installed

`src/registry/` holds the installed apps and the **catalog table**, and it's the only thing that writes them, through three operations over HTTP: install, uninstall, and install-over, an install of an id already installed. [`app-install.md`](app-install.md) tells the whole story over GitHub's install: the catalog artifact Stellify packs, every check install runs, the files on disk, the routes and the write token, and how the client loads what's installed. Here is the shape of an install:

```mermaid
flowchart LR
    CMD["registry install github<br/>card URL + packed catalog"] -->|POST /registry/install<br/>write token| API["api.ts"]
    API --> REG["Registry.install"]
    REG -->|fetch| CARD["GitHub's agent card"]
    REG --> GATE["gate.ts<br/>each artifact's files"]
    REG --> IDX["the card embedded<br/>routable on the next turn"]
    REG --> DISK[("state directory<br/>registry.json + artifacts/&lt;id&gt;/")]
```

What the rest of the orchestrator relies on:

- **Install refuses the whole app on any finding**, answering every finding at once, and otherwise answers with one line saying what changed: `installed github · card 0.1.0 · catalog sha256-muNbmR5m…`. The checks are the sdk's, so the marketplace will refuse the same artifacts for the same reasons.
- **A change is live at once.** Install embeds the card before it writes anything, so the Router ranks the app on the very next turn, and the Planner's `installed_apps` reader reads the registry as it stands. Operations run one at a time, through a promise chain.
- **Two cards per app.** The record keeps the card as it was installed, and it changes only through install-over. The run uses the card fetched at startup for the dispatch URL, the skills the Router ranks, and the name the Planner reads and the attribution shows. When the agent was down at startup, the Planner's reader shows the stored card, marked unreachable.
- **The routes** sit under `/registry` on the orchestrator's own port: `apps.json`, `catalogs.json`, an artifact's files under `artifacts/<id>/` served as immutable content, and the two writes, `install` and `uninstall`, which need the write token the orchestrator writes into its state directory at startup.

### Refusing a repeat

Through a dev tunnel a request sometimes gets lost, so the client sends a request once more, under the **same message id**, when it hears nothing for 10 seconds. If the first had only been slow, running both would repeat an app's write, like merging a pull request twice.

So the executor keeps the ids it has taken in: a `Set` of at most 256. A JavaScript `Set` iterates in insertion order, so it works as a small **FIFO**: after each add, when the set is over 256, the oldest id (`set.values().next().value`) is deleted. A repeat within the last 256 messages fails at once, and nothing is dispatched. The bound is safe because a resend follows its original within seconds.

### Heartbeat

A dev tunnel's proxy closes a connection that's been idle for 100 seconds, and a turn can easily be idle that long, waiting for a slow app. So every request's stream has a heartbeat (`#heartbeat` in `src/executor.ts`):

1. It **wraps `bus.publish`** so every event sent records the time.
2. A `setInterval` checks every quarter of the interval (the interval is 30 seconds by default).
3. When nothing has gone out for a full interval, it publishes an empty `working` status event: no parts, no stamp, nothing the client draws.
4. When the stream ends, the interval is cleared and `publish` is put back.

Wrapping the function means no other code has to remember to reset the clock.

### Routing: embeddings and cosine similarity

The Router (`src/router/router.ts`) answers one question: which apps are most like this question?

- **Each app is one document.** `corpusDoc(card)` joins the card's name, description, and every skill's name, description, tags and example questions.
- **Documents and questions become vectors.** The embedding model is `Xenova/all-MiniLM-L6-v2`, quantized to 8 bits, running in-process through transformers.js. It downloads once into `STATE_DIR/models` and then works offline. Each text becomes a vector of 384 numbers, **normalized** to length 1.
- **Similarity is a dot product.** For two unit vectors, cosine similarity (how closely they point the same way) is just the sum of the products of their numbers, which is all `cosine()` computes.
- **Rank, cap, keep.** Score every routable app, sort highest first, keep the first five (`A2UIVERSE_SHORTLIST_CAP`), plus any app on screen in the answer the question was asked from.

The app vectors are computed at startup and at each install; each question costs one embedding and one pass over the apps, O(apps × 384). A2UIVerse's own card is ranked the same way, so "what apps do I have?" routes to the platform like any other question to any other app.

### Planner: a model with tools

`src/planner/planner.ts` makes the Planner's model call with the Vercel AI SDK's `generateText`, in a **tool-calling loop**:

```mermaid
flowchart LR
    Q["The question and<br/>the shortlisted cards"] --> M["The model"]
    M -->|"calls a reader"| T["installed_apps, this_canvas,<br/>recent_turns"]
    T -->|"the result"| M
    M -->|"answers"| X["Extract the block, parse, validate"]
    X -->|"errors, first time"| M
    X -->|"accepted"| OK["The plan"]
    X -->|"errors again"| BAD["Broken turn"]
```

- **The readers** are the Planner's only view of the platform: three tools with no input. `installed_apps` lists the apps and their skills; `this_canvas` describes the answer the question was asked from (which apps hold which slot, whether a merged view stands); `recent_turns` gives one line per question up that answer's chain of parents. Each is a small projection of the orchestrator's own state. None ever returns an app's data. The Planner can answer "what's on my screen?" without seeing what's on it.
- **A step budget.** Each attempt may take at most four steps (`stopWhen: stepCountIs(4)`): the three readers and the answer.
- **One tagged block.** The model answers with its JSON inside `<layout-surface>…</layout-surface>`. `extractTaggedBlock` takes exactly one such block and tolerates text around it. The tag is the orchestrator's own and never `<a2ui-json>`, the tag the client extracts A2UI from, so model output meant for the orchestrator can never be mistaken for UI.
- **The validator** (`src/planner/validate.ts`) checks, in order: the output schema; the tree against the shell catalog pruned to the layout's components (`Slot`, `Row`, `Column`, `Card`, `Text`, `Divider`, `DataList`, `DataListItem`, `Table`, `TableRow`, `Button`), so `Attribution` is simply not a word the Planner has; every dispatched app is on the shortlist, once, with a request; a merged view needs at least two apps; its columns, column marks and join name only dispatched apps; exactly one `Slot` per dispatch entry; none of the painter's own props on a `Slot`; and a data model of plain values, never a formula or a ref.
- **One retry, in the same conversation.** The failed answer and every reader result stay in the message list, and the errors are appended as one more turn: fix this, don't start over. A second failure makes the turn a **broken turn**, its final naming the findings.

The title the Planner writes is clipped to 48 characters before it's sent, and a clip is logged and journaled.

### Painting the layout

`src/composition/shellPainter.ts` is a **pure function** from the composition's state to A2UI parts. It keeps the Planner's components and ids in order, and writes in what only the shell owns:

- **Every app's `Slot` is wrapped in an `Attribution`.** A first pass builds a `Map` from each app slot's id to its wrapper's id, `attribution-<slotId>`. A second pass copies every component, **rewiring** any `child` or `children` reference to a wrapped slot so it points at the wrapper instead. The parent now holds the Attribution, which holds the Slot.
- **The painter's props go on each slot:** `state` and `label`, plus, depending on the slot, the merged view's `columns` and `join`, a failed slot's `failure`, a collapsed merge's reason, and the facts the Retry, Include and Try again lines are drawn from. The Planner may not write any of these; the validator refuses them.

A **repaint** sends the whole `updateComponents` again from the current state. Slots are found by their `source` and every id stays put, so the client updates in place. The first paint has two more parts, ahead of the tree: the Planner's title as the shell's own `paintMeta`, and the plan's data model when it isn't empty.

### Relay: three changes and no more

A2UIVerse promises that **an unmodified A2UI agent composes**. So the relay changes as little as it can, and in only two pure functions, `relayEvent` (`src/agentsPool/relay.ts`) and `composeFragment` (`src/composition/fragmentRelay.ts`). Both copy with object spread; the app's original event is never mutated.

| Change | What | Why |
| --- | --- | --- |
| **Stamp** | `metadata.a2uiverse = {source, role: "fragment"}` | the client places the surface by `source` |
| **Namespace** | `surfaceId` becomes `<appId>:<surfaceId>` on the four A2UI operations and on the app's `paintMeta` | two apps can't collide on one screen, and a paint's title and question mark land on the surface the client sees |
| **Partition filter** | outbound: each app gets only its own surfaces' data, keys un-namespaced | an app never sees another app's data |

Those are the only changes to content. Two more touch only the **envelope**:

- **Ids.** The app's task and context ids are replaced with the client's on the way in; the client's are stripped and the app's own conversation id set on the way out.
- **Demoted finals.** Under fan-out, three apps end their tasks on one client task. Relaying an app's final would end the client's turn at the first app to answer, so every app's final becomes a plain `working` event, and the executor sends the turn's one real final itself.

One small extra: when an app fails with words ("rate limit exceeded"), those words are taken off the relayed event and put on the app's `Slot` as its `failure`, so the shell's failure tile is the one place they're shown.

### AgentsPool: one handle per dispatch

`src/agentsPool/agentsPool.ts` is pure transport: it knows nothing about plans or slots. `dispatch(appId, turn)` returns a **handle** right away:

```ts
interface DispatchHandle {
  events: AsyncIterable<VendorEvent>;  // the app's events, relayed, pulled with for await
  done: Promise<DispatchRecord>;       // how it ended; never rejects
  record: DispatchRecord;              // timings, ids, outcome, filled in as it runs
  capped: Promise<void>;               // resolves only if the hard cap fires first
  cancel(): void;                      // abort, and tell the app
}
```

The structures behind it:

- **An async generator.** `events` is an `async function*` that connects, sends, and `yield`s each event as the A2A client streams it. Nothing happens until someone iterates it.
- **An `AbortController` per dispatch**, linked to the turn's signal, so aborting the turn aborts every dispatch at once. `cancel()` aborts it and also sends the app A2A's `tasks/cancel` (fire and forget: a refusal is logged, never fatal), since closing the stream alone would leave the app working.
- **`#inflight: Map<clientTaskId, Set<handle>>`.** One question fans out to several apps under one client task id, so cancelling that task cancels every handle in its set.
- **`#clients: Map<url, Promise<Client>>`**, a cache of connections, each built from the app's card as the registry holds it, so a dispatch fetches no card of its own. It stores the **promise**, not the client, so two dispatches to the same app at once share one connection attempt; a failed attempt is removed so the next one tries again.
- **A vendor context map**, `clientContextId → appId → vendorContextId` (two nested `Map`s). Each answer gets its own conversation with each app, and closing the answer drops them.

**Catalog entitlement** ([`app-install.md`](app-install.md#entitlement-at-the-hub) has it end to end). A dispatch reads the app from the registry once, as it starts, and keeps that snapshot to its end. The app's **entitlement** is the catalogs handed at its install plus the basic catalog. It goes out as the message's `a2uiClientCapabilities.supportedCatalogIds`, in place of whatever the client sent, so each app is told only what it may paint in. Every event coming back is checked: a `createSurface` in any other catalog is never relayed, the app is sent `tasks/cancel`, and the dispatch fails with the `catalog` cause, carrying the id.

**How a dispatch ends.** `completed`; `cancelled` (aborted); or `failed` with a cause:
- `vendor` when the app ended its task as failed, its words kept.
- `unreachable` when the connection failed or the stream ended with no final.
- `catalog` when the app painted outside its entitlement.
- `uninstalled` when the app isn't installed at dispatch time, so it isn't asked at all.

**The hard cap** is a `setTimeout` for 300 seconds. When it fires first, `capped` resolves, but the stream is **not** ended: the slot fails as `timeout` right away, and whatever arrives after that is **held**, undrawn, until you press Retry. If the app is still running when you retry, the old dispatch and the new one **race**: the first to answer is drawn and the other is cancelled.

### Pump: two promises per dispatch

`#pump` in `src/executor.ts` drains one handle onto the client's stream. It returns **two** promises, because two different parts of the code are waiting for two different moments:

- **`settled`** resolves when the outcome is known: arrived, failed, cancelled, or the hard cap reached. The merge trigger waits for this.
- **`drained`** resolves when the app's stream is completely finished, even past the hard cap. The journal line waits for this, so a late answer still makes it onto the line.

Inside, an async IIFE loops over `handle.events`. Each event is composed (the relay above) and then either relayed at once, **held** if the hard cap has passed, or **buffered** during a Retry race (so the race's winner can be drawn whole). When the stream ends: the `settled` marker goes out, the slot's state is decided, and `settled` resolves.

### Waiting for the turn to end

The question's turn can't end until every app has arrived, failed or been capped, and the merge released during the turn is done. `#utteranceTurn` waits for this in two layers:

1. `await Promise.all(runs.map(run => run.settled))`: every dispatch settled.
2. A `while` loop for one special case: an app you pressed Retry on before the merge was decided rejoins the group, so the turn waits for it too. The loop waits on a set of **wakers** (callbacks that resolve the current wait), and anything that could change the answer calls `wake()`.

Around this runs the **trigger** (`src/composition/trigger.ts`), a pure decision function the executor asks after every settle: wait, arm the soft deadline, release the merge, or collapse it. The soft deadline is a `setTimeout` restarted on every settle, like a debounce. The rules and a diagram are in [`synthesis.md`](synthesis.md#deciding-when-to-merge).

### Compositions, the trail, and closing

`src/composition/compositions.ts` holds the session's answers in two maps:

- **`#open: Map<contextId, CompositionState>`**, every live answer with its full state.
- **`#closed: Map<contextId, ClosedComposition>`**, a **light record** of each closed one: the question, its title, its parent, when it was opened and closed, which apps had answered, what became of the merged view. It's kept so the chain of parents stays whole through a closed answer.

`ancestry(contextId)` walks **up the parent links**, oldest first, at most five deep, with a `seen` set so a bad link can never loop forever. It's what the Planner's `recent_turns` reader reads.

```mermaid
flowchart BT
    A["Needs attention today<br/>(a root)"]
    B["what apps do I have?"]
    C["Camera prices, both stores"]
    D["what's the status of what I'm working on?"]
    B -->|"parent"| A
    C -->|"parent"| A
    D -->|"parent"| C
```

These are the four questions of the client's trail replay (`?beat=trail`): each is a context with its own composition, and each arrow points to the answer it was asked from.

**Closing** an answer (`#closeComposition`) ends everything about it: the running turn's `AbortController` (a Planner or Synthesizer call in flight aborts with it), every dispatch (each app sent `tasks/cancel`), every press running on it. Its state is let go, its light record kept, and its app conversations forgotten. Later messages in that context are refused: "This context is closed."

### One merge at a time

Several things can ask for a new merge while one is already being made: a Retry landing, an Include press, a click inside an app whose answer changed what the view reads. Letting each start its own model call could paint two merged views racing each other. So each composition allows **one merge in the making**:

- **`state.making`** holds the promise of the merge currently being made, like a lock.
- **`#owe`** records what a request needs (apps to fold in, a fresh merge, a check after a click) in **`state.owed`** and returns a promise that settles when that work is done.
- **`#kick`** starts a call for everything owed, unless a merge is already in the making. When a merge finishes, `#making` calls `#kick` again.

So however many requests pile up while the model is writing, they're answered by **one** next call, and each request's promise settles with how it went: `landed`, `kept`, `collapsed`, `none` or `abandoned`.

A merge also waits for **quiet**. `Presses` (`src/composition/presses.ts`) counts the clicks in flight per app in a `Map<appId, count>`. `quiet()` loops until none of the apps the merge reads has a click in flight, waking each time one ends. A merge whose apps' data changes while the model is writing is thrown away and made again.

### Journal

`src/journal/intentJournal.ts` writes **one JSON line per turn** to `STATE_DIR/intent-journal.jsonl`, appended when the turn closes:

- `open()` returns a small recorder object; the executor calls its methods as the turn runs (`plan`, `dispatched`, `synthesis`, `step`, `refused`…), filling in one entry.
- `close()` writes it **once**: a second call does nothing. It also embeds the turn's **descriptor** (the question verbatim, or "open-run on surface circleci:circleci-1 in circleci" for an action) with the Router's model, for later analysis.
- **It never throws.** A failed embedding writes `null`; a failed file write is logged. The journal must never break a turn.
- **Registry changes get lines of their own**, `kind: "registry"`, beside the turns. Each install, install-over, uninstall and refusal gets one, with the app, the card URL, the catalogs and their artifact ids, the outcome, and a refusal's findings. There's no utterance behind one, so it has no embedding.

Separately, every request leaves short lines on stdout (`src/log.ts`) as it runs, the trace of a turn that hasn't closed yet:

```
← utterance task=4922aa90-… ctx=fc54e5d9-… 952 bytes
plan task=4922aa90-… planned 6038 ms
→ linear task=4922aa90-…
← linear task=4922aa90-… completed 28 ms
merge task=4922aa90-… released (settled)
✓ utterance task=4922aa90-… completed 17458 ms
```

(The recorded run's lines, Linear's alone of the three apps.)

### Id spaces

Three kinds of id cross the orchestrator, and each is rewritten at the boundary:

```mermaid
flowchart LR
    C["Client"] -->|"client contextId, client taskId<br/>surfaces: linear:linear-1"| O["Orchestrator"]
    O -->|"app contextId, app taskId<br/>surfaces: linear-1"| A["Linear agent"]
```

- **Contexts and tasks.** Relayed events carry only the orchestrator's ids; messages to an app carry only that app's. The vendor context map joins the two.
- **Surfaces.** An app's own id (`linear-1`) on the app's side, the namespaced id (`linear:linear-1`) toward the client, and changed back when the client acts on it.

Set `A2UIVERSE_DEBUG_IDS=1` to see the app's own ids under the stamp while debugging.

## When things go wrong

| What happened | What the client sees |
| --- | --- |
| The Planner's answer failed validation twice | A broken turn: a `failed` final naming the findings |
| No `GOOGLE_API_KEY` | Questions are broken turns; clicks inside apps still work |
| An app failed, couldn't be reached, or hit the hard cap | That app's slot shows the failure tile with Retry; the others carry on |
| An app painted in a catalog outside its entitlement | The paint is dropped; that app's slot fails with the `catalog` cause and the id, with no Retry |
| A dispatch (a Retry, a click inside its answer) to an app uninstalled since | That app's slot fails with the `uninstalled` cause, with Retry |
| The registry on disk is damaged | The orchestrator doesn't start; the error names the file and the problem |
| An install fails a check | Nothing changes; every finding is answered at once, `422` |
| An app answered after the hard cap | The answer is held until you press Retry, then drawn at once |
| The client couldn't draw an app's paint | It reports it; that app's slot fails as `invalid` and its data leaves the merge |
| The client couldn't load the catalog an app's paint is in | It reports a catalog load failure; that app's slot fails with the `load` cause and the catalog id, and its data leaves the merge |
| A message id seen within the last 256 | Refused: "This request was already received." |
| A question inside a context the session holds | Refused: "A question opens a context of its own." |
| Anything else in a closed context | Refused: "This context is closed." |
| A press the answer can't take (Retry on an app that didn't fail, nothing to Include) | Refused with a `failed` final saying why |
| An unknown message or shell action | A broken turn |

**One app failing never fails a turn.** Only a turn whose every dispatch was cancelled, or whose answer was closed, ends `canceled`.

**Retry sends again what failed.** A click inside an app's answer that fails is kept on its slot (`failedPress` in `composition/state.ts`), as it was sent, and that slot's Retry sends it again under a fresh message id. A Retry that fails again keeps it for the next, and a click or a Retry there that completes lets it go. A slot whose turn's dispatch failed retries the plan's request. So after an app is uninstalled and installed again, Retry on a click that failed shows what the click opened, not the app's first answer.

For testing failures on purpose, `A2UIVERSE_FAULTS` makes a chosen app `delay`, `hang`, `break` mid-stream, `refuse` the connection, `fail` with a message, or paint something `invalid`, for example `{"github": {"fault": "delay", "seconds": 40}}`. It's for development only, and the boot log says loudly when it's on.

## Design decisions

| Decision | What it buys | What it costs |
| --- | --- | --- |
| **Hub and spoke: the client talks only to the orchestrator** | One place to plan, relay, filter data, merge and journal; apps need no knowledge of each other | Every byte passes through one process |
| **The layout is painted before any app is asked** | The screen appears as soon as the plan is ready, never waiting on the slowest app | The layout is designed without seeing the answers |
| **Routing by ranking, with no threshold** | No list of intents to maintain; a new app is routable by its card alone | The Planner reads up to five cards every question |
| **The relay changes three things, nothing else** | An unmodified A2UI agent composes; apps are written for their own product, never for A2UIVerse | The shell can't fix an app's paint; it can only trim or fail it |
| **Apps' finals demoted; the hub sends the one final** | Under fan-out, the turn ends once, after everyone | The client learns an app is done from the `settled` marker instead |
| **Model output in the orchestrator's own tag, validated, one retry** | The Planner and the Synthesizer share one shape; bad output never reaches the screen; cost is bounded | A second failure is a broken turn |
| **Readers: a closed set of tools, never app data** | The Planner answers questions about the platform without seeing anyone's data; a new question kind is a new reader | Each reader is written by hand |
| **The registry is files in the state directory** | Nothing to run beside the orchestrator; a copy of the directory is a snapshot | No concurrent writers; a damaged file stops the boot |
| **Install refuses the whole app, every finding at once** | An app is never half installed; the publisher sees everything to fix in one go | A single bad file keeps out every catalog handed with it |
| **Agent cards fetched once, at startup, the installed one kept on disk** | Routing is stable for the run, and the agent owns its own description | An app started later can't be routed to until a restart or an install-over |
| **One hash per catalog id while another app names it** | No app can change the code another app renders in | A shared catalog is upgraded only by uninstalling the other apps first |
| **The hub checks each paint's catalog against the app's entitlement** | No app paints in another app's catalog, whatever the client advertised | One check per relayed event |
| **A write token read from the state directory** | The public tunnel port can't install code into your browser | A browser can't install until the Store page gets its own way in |
| **A composition per context, in memory for the session** | Every answer keeps working after the next question; nothing to store or migrate | A reload or restart starts from nothing |
| **One merge in the making, requests batched** | No two merges race to paint; many presses cost one model call | A press may wait for the merge in the making |
| **The hard cap fails the slot but keeps listening** | A slow app doesn't hold the screen, and its late answer isn't lost | The held answer waits for a Retry |
| **Refuse repeated message ids, 256 kept** | A resent request never repeats an app's write | A repeat older than 256 messages would run again |
| **A heartbeat on every stream** | A proxy never cuts a turn waiting on a slow app | An empty event every 30 seconds of silence |
| **Retry sends again the click that failed** | Retry after a failed click shows what the click opened | A slot keeps the failed click until something there completes |

## Trying it without a model

- **Replay the example.** Start the client (`pnpm dev:client`) and open `?beat=9`. The recording was made through the orchestrator, so the replay shows exactly the events it relayed; see the [client README](../../apps/client/README.md#working-without-a-model).
- **Read the journal.** Every turn you run leaves a line in `apps/orchestrator/.state/intent-journal.jsonl`, with the plan, each dispatch's timings and the merge's attempts.
- **The tests** (`pnpm --filter @a2uiverse/orchestrator test`) run the whole orchestrator with no model and no network. `test/fakeVendor.ts` is a real in-process A2A app, scripted per turn. `FakeEmbedder` hashes words into a vector, so texts sharing words rank higher. `FakePlanner` returns a fixed or derived layout, and `FakeSynthesizer` sits behind the Synthesizer's text-in, text-out seam; `HeldSynthesizer` holds each call until the test lets it go, to test what happens meanwhile.
- **Live model tests** run only when asked: `A2UIVERSE_EMBEDDER_LIVE=1`, `A2UIVERSE_PLANNER_LIVE=1` or `A2UIVERSE_SYNTHESIZER_LIVE=1`, the last two with `GOOGLE_API_KEY`.
- **The fault map** (above) plays slow and failing apps against a real run.

Configuration (ports, models, deadlines) is listed in the [orchestrator README](../../apps/orchestrator/README.md).

## Where the code is

All paths are under `apps/orchestrator/src/`.

| Concern | Where |
| --- | --- |
| Boot and wiring | `index.ts`, `app.ts`, `config.ts`, `agentCard.ts` (A2UIVerse's own card) |
| The turn: every message, the pump, the merge in the making | `executor.ts` |
| Classifying a message | `composition/classify.ts` |
| Installed apps, the catalog table, install and uninstall (see [`app-install.md`](app-install.md)) | `registry/` (`registry.ts`, `gate.ts`, `store.ts`, `api.ts`, `token.ts`, `command.ts`, `cli.ts`, `corpus.ts`, `types.ts`) |
| Embeddings | `embedder/` |
| Routing | `router/router.ts` |
| The Planner | `planner/` (`planner.ts`, `validate.ts`, `prompt.ts`, `planner.md`, `examples.ts`, `readers.ts`, `platformReaders.ts`, `document.ts`, `getModel.ts`) |
| The Synthesizer | `synthesizer/` (see [`synthesis.md`](synthesis.md)) |
| One model answer, one tag | `authoring/taggedBlock.ts` |
| Talking to apps | `agentsPool/` (`agentsPool.ts`, `relay.ts`, `contextMap.ts`, `faults.ts`) |
| The composition's state and store | `composition/state.ts`, `composition/compositions.ts` |
| Painting the shell | `composition/shellPainter.ts`, `composition/synthesisPainter.ts`, `composition/constants.ts` |
| The relay's composition half and the partition filter | `composition/fragmentRelay.ts`, `composition/partition.ts` |
| The apps' data copies | `composition/partitions.ts` |
| When to merge, presses, what changed, going back | `composition/trigger.ts`, `composition/presses.ts`, `composition/integrity.ts`, `composition/relations.ts`, `composition/history.ts` |
| The journal and the log | `journal/`, `log.ts` |
| Tests and fakes | `../test/` |

## Words used in this guide

| Word | Meaning |
| --- | --- |
| **Hub** | The orchestrator: the one process the client and every app talk to |
| **Agent card** | An A2A agent's public description: name, description, skills with example questions |
| **Registry** | The installed apps and the catalog table, persisted in the state directory, written only by install, uninstall and install-over |
| **Catalog artifact** | A catalog's code, schema and styles as files under one id, packed by Stellify |
| **Catalog table** | Each catalog id and where it comes from: the client itself, or an installed artifact |
| **Entitlement** | The catalogs an app may paint in: those handed at its install, plus the basic catalog |
| **Write token** | The secret install and uninstall require, written into the state directory at startup |
| **Task** | One A2A exchange: a message and the stream of events that answers it, ending in one final |
| **Context** | An A2A conversation id. Each question opens a new one |
| **Turn** | One client message and its stream: an utterance, action, operation or client error |
| **Composition** | Everything the orchestrator holds about one question's answer; one per context |
| **Parent** | The context a question was asked from, when it was asked from an older answer |
| **Shell** | A2UIVerse's own UI, painted by the orchestrator: the layout (`shell:main`) and the merged view (`shell:synthesis`) |
| **Stamp** | `metadata.a2uiverse` on every event: the `source` it came from and its `role` |
| **Router** | Ranks the apps' cards against a question with an embedding model |
| **Shortlist** | The Router's top apps, handed to the Planner |
| **Planner** | The first model call: which apps to ask, what to ask each, and the layout |
| **Layout surface** | The Planner's answer: the dispatch list, the layout tree, its data model and title |
| **Reader** | One of the Planner's three tools over the platform's own state |
| **Dispatch** | Asking one app, through the AgentsPool |
| **Relay** | Passing an app's events to the client: stamped, namespaced, final demoted |
| **Partition** | One app's surface data model; the orchestrator keeps a copy of each |
| **Settled** | An app's answer ended: arrived, failed, cancelled, or at the hard cap |
| **Hard cap** | 300 seconds: after it an app's slot fails, and a later answer is held for Retry |
| **Soft deadline** | 10 seconds of quiet after enough apps arrived: the merge goes ahead without the rest |
| **Press** | A reader's Retry, Include or Try again, sent as an operation |
| **Broken turn** | A turn that ends `failed` as a whole, like a plan refused twice |
| **Intent journal** | One JSON line per turn, and one per install, uninstall or refusal, in `STATE_DIR/intent-journal.jsonl` |
