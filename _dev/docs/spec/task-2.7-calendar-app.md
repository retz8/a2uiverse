# Task 2.7 — Calendar app

The Calendar vendor app in `../a2uiverse-apps/calendar/`: a three-mode agent on port 11003 against live Calendar MCP, and a `calendar-catalog` package. Parent: `_dev/TODO.md` 2.7, under `_dev/docs/spec/phase-2-layout-composition.md`. Modeled on `task-2.6-gmail-app.md`, whose locked decisions carry over except where this spec diverges.

## Scope

- `calendar/agent/` — the three-mode A2A agent (`deterministic` / `llm`+MCP / `llm`+stub), its knowledge docs, examples, fixtures, and beat driver.
- `calendar/calendar-catalog/` — the catalog package: schema, the basic catalog's implementations, and a Provider carrying the Calendar product token theme.
- `calendar/manifest.json`, structurally parallel to `gmail/manifest.json`.
- The demo calendar's tracked seed corpus and the script that applies it.
- The app's four beats, recorded against the demo calendar and finalized as tracked fixtures.
- Not in scope: the `dev:agents` launcher and the composed fan-out beat (2.9), and the client's catalog-map growth (2.5).

## Locked decisions

### 1. Four beats, mirroring Gmail's taxonomy

`agenda-digest`, `event-detail`, `event-create`, and `rsvp-toggle` — one per kind of surface, with both write tiers of 2.6 decision 5 exercised. `event-create` is the creating write: composed in the painting turn, painted as a proposal, mutating only on the user's confirm action. `rsvp-toggle` is the toggling write, firing directly on its action. `agenda-digest` answers the phase's fan-out utterance.

Rescheduling is out of scope. It is neither tier cleanly — it mutates an existing event and notifies attendees — and edit-in-place as a distinct painting problem belongs with Phase 5's temporal merge, where it bears on an acceptance item.

### 2. The scope grant and the tool filter, with two enforced pins behind them

The tool inventory is pinned client-side to the reads plus event creation and the
attendee-response tool, everything else withheld by name.

Calendar's scope ladder collapses to a single layer as Gmail's does, and for a sharper reason:
the write scope grants full CRUD including deletion, and the narrower owned-events scope cannot
cover the toggling tier at all, since a response is made on an event the user does not own. So
the credential permits what the filter withholds, exactly as in Gmail.

Unlike Gmail, further layers are available here and are taken. Both are enforced at the tool
boundary, in every run mode, and both are filtered through the tool's own MCP schema — the
server rejects an argument a tool does not declare, so a pin applied blind breaks the calls it
does not apply to.

**Notification suppression.** Every call that can notify is forced non-notifying. This is a
genuine second layer where Gmail had none, and it is documented as what it is: it stops the
invitations, it does not stop the event existing. A consequence carried into the painted
surface — an event created without notifications is one its attendees do not know about, so the
proposal says so rather than implying invitations went out.

**Calendar confinement.** The calendar is a per-call argument whose default is the user's own
primary calendar, so decision 4's guarantee would otherwise rest on the model's discretion. It
is overwritten on every call rather than requested. Two tools the server offers cannot be
confined this way because they take no calendar argument at all; both are withheld for that
reason, and the admitted inventory is exactly the set that can be confined.

*(Amended after the first live run. The provisional inventory guessed both the notification
parameter and a tool that does not exist; the confinement pin was not in the original decision
at all, and the live schema is what showed it was needed. The parameter names and the admitted
set are now read from the server, not proposed.)*

### 3. The theme diverges from Gmail where Calendar genuinely does

`calendar-catalog` is the basic catalog plus a product token theme, structurally as `gmail-catalog` is. Gmail and Calendar are the same design system by the same company, so a faithful theme risks two of the three fragments reading as one product — which would leave phase acceptance item 6 mechanically green and observably meaningless.

The theme is therefore built on where Calendar actually differs from Gmail: dense agenda rows rather than cards on a tinted ground, a flatter card with reduced elevation, a tighter spacing and type scale, and a per-event colour accent rather than one product blue. The contrast is real rather than invented — a fabricated identity would defeat the catalog-per-agent design, whose point is that a vendor's fragment carries the vendor's own look.

The tokens carrying that divergence are named in this task's output, so acceptance item 6's cross-catalog assertion reads specific variables rather than whatever happens to differ.

### 4. A seeded demo calendar replaces pseudonymization

2.6 pseudonymized because an account has one mailbox, so reading Gmail live means reading real mail. That precondition does not transfer: `calendarId` is a first-class parameter and one account holds many calendars. The agent reads a demo calendar in `a2uiverse-506907` holding authored events.

There is therefore no pseudonymizer. `tool_shaping.py` carries only its projection notes; no seed, no key lists, no substitution path, and no widened tracked-artifact assertion. Fixtures are clean by construction rather than by a substitution pass whose completeness cannot be proven — which also forecloses the class of failure 2.6 hit, where rewriting one branch of an MCP result left the branch the model reads untouched.

This deviates from phase decision 1's "derived from real MCP payloads, not invented", and the deviation is recorded rather than assumed: payload **shapes** remain real, since a real Calendar API response about an authored event has a completely real shape; the **content** is authored. Acceptance item 8 is unaffected — the endpoint, credential, network, and response shapes are live.

Writes land in the demo calendar, so the creating-write beat pollutes nothing real.

### 5. The seed is a tracked, relative-dated corpus applied by script

A calendar is dates, so a hand-populated demo calendar is an empty agenda a few months later, and the live path shows nothing. The seed is a tracked fixture whose events are expressed as offsets from the run date, applied by a script in the agent that wipes and recreates the demo calendar. The relative-date encoding is load-bearing; absolute dates would reproduce the staleness the script exists to remove.

This also puts the authored corpus in a reviewable tracked file rather than leaving it as invisible state in one Google account — which is what carries decision 4's deviation. Two further consequences it serves: 2.9's composed fan-out recording needs Calendar's live mode reproducible on demand, and the two write beats mutate the demo calendar, so wipe-and-recreate is what makes them re-runnable rather than degrading their own fixture source on every run.

## Invariants

- The four beats' taxonomy — list, detail, creating write, toggling write — is what makes the beat set an acceptance instrument rather than a count.
- Every divergence from 2.6 in this spec exists because a Gmail precondition does not transfer, and says so where it lands.
- The fan-out utterance is a phase-level artifact; 2.7 does not finalize it.
- Duplication with the Gmail and GitHub agents is intended, and is Phase 3's extraction input.

## Open items

- The Calendar MCP server's actual tool inventory — nothing in either repo records it, and it is discovered on the first live run rather than guessed at here.
- Whether the attendee-response tool operates on a self-organized event with the user in the attendee list, which is what `rsvp-toggle` needs on an owned demo calendar. A fact for the first live run.
