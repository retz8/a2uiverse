# Phase 2 — Layout-only composition

3 agents · 3 catalogs on one surface, no synthesis (SPEC §12, M1): GitHub · Gmail · Google Calendar. Proves Router, Planner, AgentsPool fan-out, composition (UIComposer role), shell catalog composition primitives, plan/fill/collapse, provenance + attribution, and partition isolation. Parent: `_dev/TODO.md` Phase 2.

## Scope

- Gmail and Google Calendar vendor agents in `../a2uiverse-apps/`, each with its own catalog package.
- Orchestrator: Router (embedding retrieval), Planner (the phase's one ◆), fan-out dispatch, slot-lifecycle painting, partition filtering, surfaceId namespacing.
- Client: multi-surface composition rendering, fragment boundary, client-side validation.
- `packages/shell-catalog` built for real: schema + implementation + `Slot` + `Attribution`.
- `packages/sdk` gains the composition extension (first real content).
- Deferred from 1.3: unknown-component handling at the composition layer; shell re-skin on Radix tokens with the shell catalog. Deferred from 1.4: `dev:agents` launcher + `dev:all`.
- Doc amendments to SPEC.md this grill produced (see decision 18).
- Not in scope: synthesis, Synthesizer, BindingEvaluator, IntegrityChecker, durable Composition object, vendor-agent template/CLI (Phase 3), model-provider picker or per-user credentials (M8/M10), marketplace index (M9).

## Locked decisions

### 1. Full three-mode agents, real Google MCP now

Gmail and Calendar are built like the GitHub agent — `deterministic` / `llm`+MCP / `llm`+stub — with real Google MCP exercised in this phase. Mock data is derived from real MCP payloads, not invented. Targets are Google's official per-product Workspace MCP servers (Gmail `gmailmcp.googleapis.com/mcp/v1`, Calendar `calendarmcp.googleapis.com/mcp/v1`, remote streamable-HTTP). GCP project `a2uiverse-506907` (owner `jiohin@umich.edu`) is enrolled in the Workspace Developer Preview and carries the four required APIs; every call sends `X-Goog-User-Project: a2uiverse-506907`. The credential is an ADC-style OAuth token issued by a Desktop client inside that same project, obtained by a one-time developer setup outside the agent; agents read it from the environment, parallel to `GITHUB_MCP_PAT`. No auth code in agents; nothing front-runs AuthVault (M8).

### 2. No template in Phase 2

Gmail and Calendar are hand-authored, each modeled on the GitHub agent. The abandoned `a2ui-github/adapter-template` is reference only. The mock-vendor-agent-template deliverable moves out of Phase 2: Phase 3 builds the `create-a2ui-app`-style CLI plus the design-system-research skill, frozen on the basic catalog (GitHub's hand-written Primer catalog stays the permanent exception). The duplication between the two hand-written agents is Phase 3's extraction input.

### 3. One catalog package per agent

Every agent ships its own `<vendor>-catalog` package, structurally parallel to `github-catalog`, even where code is identical. The roster will permanently hold both kinds: basic-catalog-plus-product-token-theme (Gmail, Calendar, most future agents) and full custom catalogs over a real component library (GitHub/Primer).

### 4. Style isolation: seam + detector now, strength deferred

Every fragment mounts through a single shell-owned **fragment boundary element** — the one place carrying provenance, attribution, and isolation strength. Phase 2 implements the cheapest strength that holds: catalog Providers scope their tokens (and `@scope`-wrapped CSS) to the boundary element, never `:root`; a catalog that portals must anchor its portal root inside its boundary (for Primer: `registerPortalRoot`/`PortalProvider` in the provider — this also fixes github-catalog's live unthemed-overlay defect). A CI **collision detector** mounts every installed catalog together and fails on duplicated custom properties/class names/keyframes across catalogs, on global writes of shared variables, and on DOM left outside a fragment boundary. Escalation to stronger isolation is trigger-gated (the first collision the detector reports that `@scope` cannot fix); the escalation target is left open (iframe/native-class execution isolation per §9.2/§11 — not shadow DOM).

### 5. Composition model: flat surfaces + placement metadata (2b)

Surfaces stay flat, exactly as A2UI models them. Each fragment is its own A2UI surface with its own catalogId and data model; the shell paints its own layout surface in the shell catalog whose `Slot` components are purely local placeholders (no cross-surface references in any component tree). Placement (`surface → slot`) rides on A2A message metadata — the §14 channel — extending Phase 1's source stamp. The orchestrator performs exactly one A2UI rewrite: namespacing `surfaceId` to `<appId>:<surfaceId>` on the four server→client message types, reversed on inbound actions. Component ids, binding paths, and catalogIds are never touched. The client runs one `MessageProcessor` with all installed catalogs registered; per-surface catalog resolution is stock library behavior. §4.1's "single A2UI tree" is true of the rendered tree, not the wire; "graft" means mounting a surface into a slot. Composition is a shell capability, not a protocol feature — the A2UI deviation is zero, the A2A delta is placement metadata.

### 6. Composition extension: minimal scope, formal home, one JS projection

*(Amended by the 2.4 grill — see `task-2.4-orchestrator-composition.md`.)* `packages/sdk` ships the composition extension: extension URI, the `a2uiverse` metadata stamp (source · slot · role), and surfaceId namespacing helpers. The extension is platform-internal (hub ↔ client); there is no vendor-facing shape — all guidance to a vendor is prose in the Planner-authored request, and nothing a2uiverse-specific rides the vendor wire. Nothing anticipating M2+ (no generation, no deadline fields in the contract). Layout: `packages/sdk/contracts/` holds the normative JSON contract; `packages/sdk/js/` (`@a2uiverse/sdk`) is the single hand-written idiomatic projection, with a contract test that asserts its constants against the JSON — drift is a red build. A projection in another language is re-created when a real consumer exists. Escalation to codegen is trigger-gated on the contract outgrowing eyeball verification (realistically M2).

### 7. `Slot` and `Attribution` implementations live in `shell-catalog`

The shell catalog ships both primitives' schema and React implementations — a catalog is schema + implementation, versioned together. §4.2's "no component mapping of its own" is extended: no mapping of the basic catalog's components; the composition primitives are its own. `Slot` reads client-provided context (placement map, surface registry) — the established Provider pattern.

### 8. Attribution: quiet persistent marker, hover detail, escalation later

Attribution is orchestrator-painted A2UI in the shell catalog (never client-hardcoded, never vendor-paintable), sitting in the shell's own surface where the fragment cannot address it. Presentation: a small, quiet always-present marker (grayish small caption with info icon) on the fragment boundary that expands to full attribution on hover/keyboard focus — presence always, prominence never. Contextual escalation (loud when authority is in play) is the M8 growth path. The boundary carries an accessible name announcing the source regardless of pointer state. §4.3's wording changes from "attribution element" to a shell-owned attribution affordance whose prominence the shell controls.

### 9. Planner: Vercel AI SDK, schema-enforced output, Planner-authored requests

The Planner is the phase's one model call, made through the Vercel AI SDK (`ai@7`) behind a small `getModel(settings)` factory — the provider seam. Phase 2 configures exactly one provider and ships no picker; per-user provider choice arrives with M8/M10 as a data change. Plans are schema-enforced structured output (`Output.object`, not deprecated `generateObject`; plan schema kept to plain JSON-Schema constructs), consumed by deterministic code — a malformed plan is a broken turn. Planner effort is a recorded tunable (start below the default; Planner latency is time-to-first-paint). The Planner authors a per-agent request for each dispatch rather than broadcasting the utterance verbatim; the disclosure consequence (the orchestrator putting words in the user's mouth to third parties) is recorded in §16.

### 10. Router: local embedder, one instance, Registry-owned vectors

The embedding model is small, local, in-process (no API key, no network, provider-independent), loaded once in the orchestrator and injected into both Registry and Router. Registry owns the documents and their vectors; Router owns query embedding, similarity, ranking, and the registry→marketplace fallback (one class, two sources — the marketplace is a second source at M9, not a second implementation). Index is computed at boot and held in memory; persistence arrives with install at M7, at which point stored vectors record their model version. The IntentJournal embeds the descriptor at write time with the same model; no backfill of old entries. Embedder extraction to a shared platform package is revisited at M9, not now.

### 11. AgentCards live on the Registry, fetched at boot

The Router's retrieval corpus is the AgentCard (skills, descriptions, examples, archetypes, securitySchemes), stored on the Registry as a second shape beside `AppRecord`: the record is orchestrator-authored install state; the card is an agent-authored mirror — refreshable, **nullable**. Cards are fetched at orchestrator startup and embedded once; an unreachable agent has a null card and is unroutable that session (the honest Phase 2 behavior; startup-fetch-with-persisted-fallback is the M7 shape). The card is authoritative for anything the agent declares about itself; `AppRecord.authScheme` is recognized as a duplicate of `card.securitySchemes`, to be dropped at M8.

### 12. Slot lifecycle is orchestrator-painted

The orchestrator flips slot states (failed, collapsed) by repainting its own shell surface — dispatch outcomes become paint, not a side-channel. Pending→filled is inherently the client's (a slot renders its fragment when a surface claims it). Under fan-out, one agent failing never fails the turn. Consequence for §10's open seam: Phase 2's composition state (plan, dispatch records, slot outcomes) is canonical in the orchestrator, with the shell surface as its rendered projection; the client holds only the placement map. The durable client-side Composition object stays unbuilt.

### 13. Validation: client detects, protocol reports, orchestrator paints

Fragment validation lives client-side, where the catalog schemas physically are. No vendor message may throw through the canvas: the client wraps per-message processing; a fragment that fails validation or mount reports `VALIDATION_FAILED` (the protocol's existing client→server error, with surfaceId) and the orchestrator flips that slot to failed and journals it. Granularity: unknown catalogId or unparseable message fails the fragment; an unknown component type inside a valid tree degrades to a placeholder at that node, fragment stays up. §10's Validator seam resolves as two classes: tree-vs-catalog in the client, LLM-output-vs-schema in the orchestrator.

### 14. Outbound partition isolation is enforced at the hub

The orchestrator filters `a2uiClientDataModel` per dispatch: each vendor receives only the surfaces its namespace owns, keys un-namespaced. Actions route only to the surface's owner with the same filter. Phase 1's relay-transparency invariant is amended to exactly three hub rewrites: the metadata stamp, the surfaceId namespace, and the partition filter.

### 15. Shell catalog theme binds to Radix tokens

The shell catalog's Provider maps `--a2ui-*` onto Radix Themes CSS variables — one theme source for shell UI and orchestrator-painted surfaces, dark mode included. It obeys decision 4 like every catalog: reads ambient Radix variables, writes nothing global, scopes its values to its own wrapper, with explicit fallback values for headless rendering. The binding lives in the Provider; `catalog.json` stays theme-ignorant. The protocol's `createSurface.theme` field is deliberately unused for platform styling (agent-authored, one color, unconsumed by the React renderer); vendor product themes ship in the catalog package, not per-message.

### 16. ChoicePicker: pnpm patch + upstream report

The `@a2ui/react` ChoicePicker document-global radio-`name` collision is patched locally (`pnpm patch`, instance-unique group name) and reported upstream. Findings for upstream contribution — this and the unsatisfiable `catalogId` prose clause in `server_to_client.json` — are recorded project-neutrally in `_dev/a2ui-findings.md`.

### 17. Dev commands

`pnpm dev` = platform (client · orchestrator · marketplace). `pnpm dev:agents` = launcher over `../a2uiverse-apps/` with `--only` and `--mode`; the per-agent launch-command table lives in the launcher (flags stay non-uniform until Phase 3). `pnpm dev:all` = both. Filter aliases `dev:client` / `dev:orch` / `dev:marketplace` are added. Agents load their own `agent/.env`; the launcher handles no credentials.

### 18. SPEC.md amendments

This phase's doc edits: §4.1 one-tree wording (rendered tree, not wire; graft = mount into slot); §4.2 composition primitives as the shell catalog's own mappings; §4.3 attribution affordance wording; §13 sdk dependency sentence (which half of a vendor app the TS sdk serves; the Python projection); §14 delta-register rows (placement metadata on A2A events — upstream candidate; surfaceId namespacing — local convention; outbound partition filter as the generalization already seeded; ChoicePicker and `catalogId`-prose findings — upstream bug reports); §16 known consequence (Planner-authored requests disclose orchestrator-authored words to vendors).

### 19. Acceptance

1. `pnpm dev` + `pnpm dev:agents` up; one palette utterance fans out to all three agents and renders one composed screen: shell surface with three slots, three fragments in three design systems, each filling independently as it arrives; first paint (layout + pending slots) lands before any agent has responded.
2. Degenerate case = Phase 1 parity: a single-agent utterance routes, paints, and round-trips actions as the spine did.
3. Partition isolation: a vendor's outbound dispatch carries only its own partition, un-namespaced; an action inside a fragment routes only to its owner and repaints only that fragment.
4. Provenance + attribution: every relayed event carries the source stamp; every fragment shows the quiet attribution marker with hover/focus detail, outside the vendor's surface.
5. Plan/fill/collapse: killing one agent mid-turn flips its slot to failed via shell repaint; the other fragments are unaffected; slot positions never permute. A fragment failing client-side validation reports `VALIDATION_FAILED` and lands in the same failed state.
6. Collision detector green in CI: Gmail + Calendar mounted together resolve the same `--a2ui-*` variable to different values per subtree; no global writes of shared variables; no DOM outside a fragment boundary (github-catalog portal root anchored).
7. One journal line per turn, embedding non-null, dispatch list recording all fan-out targets.
8. Real MCP: each Google agent in `llm` mode answers from its live MCP endpoint at least once, observed directly — the tunnel verification is where this is evidenced.
9. Deterministic replay: the tracked beats and the visual Playwright specs replay without the network, so acceptance never depends on live Google availability. A beat is a pseudonymized recording and is therefore not evidence for item 8.
10. Write round-trip: a write completes from inside a fragment and repaints only that fragment. Both tiers are exercised — a creating write (draft) fires only on the user's confirm action from the painted proposal; a toggling write (label) fires directly on its action. No other slot is touched.
11. Gates green in both repos; `github-catalog` republished with scoped provider + anchored portal root; ChoicePicker patch applied.

Final gate: **Claude-in-Chrome live verification through the tunnel** for items 1, 4, 5, 8 and 10.

## Invariants

- The client talks only to the orchestrator; vendor agents are never reached directly.
- The A2UI protocol is not extended or modified; every composition deviation rides A2A metadata or local convention, registered in §14.
- The relay is transparent except the three rewrites of decision 14.
- No catalog writes shared CSS variables outside its fragment boundary; no catalog leaves DOM outside its boundary.
- Slot identity and position are fixed for the turn (§4.5); fragments are never re-parented.
- `_dev/` edits land on `main` only.

## Open items

- Attribution's visual design (marker form, prop-vs-sibling component shape) — the shell-catalog sub-task's own grill.
- The Planner's layout/plan vocabulary — task-internal to the orchestrator sub-task.
- Whether the placement fact is stamped per-message or once per surface — task-internal to the extension sub-task.
- Embedder placement (shared platform package) — revisit at M9.
- Isolation-strength escalation — trigger-gated on the detector; target decided when triggered.
