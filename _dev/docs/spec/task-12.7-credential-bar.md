# Task 12.7 — The credential bar at the paint

The hub's check that refuses a paint containing a credential input, the one repair sent back to the agent, the fallback tile, the guidance sentence on vendor requests, and the install-time credential check removed (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 23 and 24). SPEC §8, §14.

## Scope

- The paint-time check in the hub, reusing the credential term list.
- A refused paint: what reaches the client, what is taken down, the way back.
- The one repair, and the slot while it is in flight.
- The fallback: the `credential` cause and its `continueUrl` set by the orchestrator, drawn by 12.3's tile.
- The guidance sentence on vendor requests: its wording, and who adds it.
- The credential lint removed from the install gate and Stellify; the term list's home.
- A dev fault producing refusal, repair and fallback on the deterministic roster.

## Locked decisions

### 1. What the check reads

The check reads a paint's component types, its property names, and the property values the painter's catalog declares as fixed options, matched as whole words against the credential term list. `obscured` joins the term list. Free text — labels, placeholders, `Text` content — and the data model are not read. An unmasked field labelled "Password" passes: an accepted gap.

### 2. Checked per event, refused whole

The hub checks each event of an agent's answer as it arrives. The event carrying a credential input is never relayed; the hub stops relaying that answer and takes down what it already showed. Every surface of that answer is refused.

### 3. The repair carries the reason alone

A refused paint is sent back to its agent once, as a new message in the same vendor conversation carrying the reason alone — the component and the matched value, ending with the guidance sentence's second half. The original request or press is not sent again. One repair per send: the plan's request, a press, a Retry. A second refusal goes to the fallback.

### 4. The slot during the repair

During the repair the slot behaves as if just sent, with nothing more shown: for the plan's request it is loading; for a press the fragment stays as it was, its progress tick working. The repair runs under the ordinary deadlines, and an answer arriving after the merge is offered through Include.

### 5. The fallback

A slot whose agent does not repair fails with the `credential` cause and its `continueUrl` — the card's `provider.url`, otherwise its `documentationUrl` — and takes 12.3's tile, with no Retry. This holds also when the refused paint answered a press inside a fragment on screen: the fragment gives way to the tile and its source leaves the merge.

### 6. The guidance sentence

The orchestrator appends one fixed sentence to every text request it writes to an agent — the plan's request, its re-sends on Retry and resume, the account choice's request:

> Don't include any field that asks for a password, a one-time code, a PIN or a card number; for anything like that, offer a link to your own website instead.

A press inside a fragment carries no text and gets none. The Planner's prompt is unchanged.

### 7. The way back

A refused paint keeps its paint id, used and never reused, and is dropped on both the client and the orchestrator: it is never a step of the way back, and no wiring is remembered over it. The repaired paint takes the next id.

### 8. The term list stays in the sdk contract

The term list, with the word splitting and whole-word matching, stays in the sdk contract, its rule sentence describing the check at the paint. The schema-walking credential lint leaves the sdk, the install gate and Stellify, with its tests.

### 9. A `credential` dev fault

The orchestrator's dev fault map gains a `credential` fault: the source's paint carries a `TextField` with the `obscured` variant — its first `TextField` rewritten, or one added. On the plan's dispatch alone, the default, the repair goes through clean: refusal, then repair. With every dispatch hit, the repair is refused too: refusal, then fallback.

### 10. The refusal is logged without a value

A refusal is logged as one line naming the source, the component and the matched term, never a value.

## Invariants

- No credential input reaches the client.
- Nothing a2uiverse-specific rides the vendor wire beyond the prose of the guidance sentence and the repair.
