# Task 10.11 — Gmail's deterministic data reads like real mail

What Gmail's stub and deterministic data become: mail written for the same developer and week as the other apps' data, in the stub's real payload shapes, replacing the pseudonymizer's word salad; Gmail's beats and every platform beat holding a Gmail paint recorded again over it. Phase 10 (`_dev/docs/spec/phase-10-vendor-catalogs-professional-project.md`); 10.8's README hero over Gmail and Calendar follows it. Amends task 2.6 (`_dev/docs/spec/task-2.6-gmail-app.md`) decision 11.

## Scope

- Gmail's stub payloads written by hand.
- The corpus derivation no longer writing the stub.
- Gmail's own beats recorded again against the new stub, and its deterministic data derived from them.
- The platform's recorded beats holding a Gmail paint recorded again over the deterministic roster.

## Locked decisions

### 1. The same developer's working inbox

Gmail's mail belongs to the same developer and week as the other apps' data: the `a2uiverse` project's Linear issues, GitHub pull requests, CircleCI runs and Calendar meetings.

### 2. The stub's payloads are written by hand

The mail is written straight into Gmail's stub payloads, in their real shapes. No live run records it, and the real mailbox is never read for it. Task 2.6 decision 11 — all canned content derived from the pseudonymized recorded runs, never hand-authored — is amended for the stub as task 2.7 decision 4 did for Calendar: content authored, shapes the API's. The pseudonymizer stays as it is for any live recording.

### 3. Human mail only

The inbox carries mail from people: teammates writing about the same work, and a receipt or a newsletter from a fictional service. No vendor notification mail.

### 4. Calendar's cast writes it

The senders are the people of Calendar's seeded events, at their existing `example.com` addresses, and their mail points at the same meetings.

### 5. Named senders

A sender is a display name with its address, as `Alex Bergman <alex.bergman@example.com>`.

### 6. Sep 17 to 19, 2026

The mail is dated Sep 17 to 19, 2026, the newest on the morning of Sep 19, US Eastern.

### 7. The stub files are the source

The mail lives in the stub files themselves. The corpus derivation stops deriving the stub, and keeps deriving the deterministic data from the recorded beats.

### 8. The inbox

About ten threads over Sep 17 to 19, each from Calendar's cast and tied to the same work, four unread from today, two or three carrying more than one message:

| Sender | Thread | State |
|---|---|---|
| Idris Haddad | Notes ahead of the 11:00 design review (agenda surface) | today, unread |
| Alex Bergman | A nudge to review PR #8, "Give the Synthesizer more thinking effort than the Planner" | today, unread, waiting on a reply |
| Mei Silva | A question about the failed CI run on `synthesizer-effort-apart-from-planner` | today, unread |
| Clara Moreau | Numbers for the 11:30 budget sync | today, unread |
| Sara Vasquez | Moving the 1:1, a short back-and-forth | Sep 18, read |
| Nora | An out-of-office auto-reply | Sep 18, read |
| Priya Nakamura | A standup follow-up on A2U-5, "Say on the canvas when an utterance fails" | Sep 18, read, three messages |
| Tomas Lindqvist | The doc for tomorrow's quarter planning | Sep 18, read |
| Omar Ferreira | A recap of the vendor sync | Sep 18, read |
| A fictional service | A receipt or a newsletter | Sep 17, read |

### 9. Every thread has its body

Every thread in the list carries its full messages and bodies, so any row opens.

### 10. The newest thread is a conversation

The newest thread is Idris's notes ahead of the design review, with Mei's reply that morning: the thread the recorded "Open the most recent one of those" shows.

### 11. Labels

Three user labels — "a2uiverse", "Design" and "Receipts" — on the matching threads. Every label's counts, the system labels' included, agree with the threads in the list.

### 12. Recordings

Gmail's four beats are recorded again against the new stub and its deterministic data derived from them. Then every platform beat holding a Gmail paint is recorded again over the deterministic roster, a take that does not show its case taken again.

## Invariants

- No real mailbox content in any tracked artifact; the publishability guard still passes.
- Unchanged: the pseudonymizer and its tests, Gmail's hand-written knowledge examples, the beat prompts, the Gmail catalog.
