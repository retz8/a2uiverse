# 17.8 — The kit's thinking tier `low`

The agent kit's thinking tier `low` measured agent-alone on GitHub's and Linear's recorded beats, without it and with it, read and decided there: `low` or `default`. Sub-task 17.8 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), `[apps]`, worked on the phase branch in both repos (phase decision 3).

## Scope

- GitHub's beats 8 and 9 and Linear's beats 1, 2 and 3's proposal and confirm, driven agent-alone on `gemini-3.8-flash` at `default` and at `low`: a first pass on each, passes two and three on the person's approval.
- The beat driver: a beat run on one attempt, and its copies of the beats written outside the repo.
- Each `low` answer read beside the same pass's `default` answer, the person's verdict per beat.
- The choice between `low` and `default`.
- The results entry, and an extract of each turn's numbers beside it.
- Out: Claude on the kit; Gmail and CircleCI, shown in 17.11's end-to-end runs (phase decision 8); the survey's other kit levers; the kit's default in the code — 17.11.

## Locked decisions

### 1. A first pass each, the rest on approval

A pass is GitHub's beats 8 and 9 and Linear's conversation — beat 1, beat 2, beat 3's proposal and its confirm — once on one setting, on `gemini-3.8-flash`. A first pass runs at `default` and at `low`; its real cost and its answers are read, and passes two and three run on the person's approval.

### 2. Read beside the same pass's `default`

Each `low` answer is read beside the `default` answer of the same pass — the same day, data and model — not beside the committed recordings. This amends phase decision 8.

### 3. Counted as it falls

One attempt per beat per pass, a failed beat counted as it fell; a setup failure — a lapsed sign-in, an agent not up, the tunnel — fixed and that beat sent again, as the baseline ran (task-17.5 decisions 7–12). The driver gains a way to make one attempt. The kit's own correction retry inside a turn stays; it is what the first try counts.

### 4. The trial's records outside the repo

The driver gains a way to write its copies of the beats to another directory. Both records — the agent's session record and the driver's copies — are kept outside the repo.

### 5. A2U-5 back to In Review before each Linear run

Before each Linear run A2U-5 is set back to In Review, its state when the beats were recorded, in Linear's page through Claude-in-Chrome; the person's approval for those moves is given.

### 6. The order alternates

GitHub's and Linear's agents restart at each switch of the tier. Pass one runs `default` first, pass two `low` first, pass three `default` first. Each run's cached share of its prompt is read beside its numbers, and each setting's first turn after a restart is marked.

### 7. What holds up

Two checks per beat: the answer passes the app's catalog on the first try, without the kit's correction retry; and what the prompt asks is on the screen — each field the prompt names on GitHub's beats 8 and 9 and Linear's beat 1, the issue's details on beat 2, a question to confirm the move on the proposal, A2U-5 shown In Progress on the confirm and found so in Linear. The rest — the layout, the wording, what is added — is read beside `default`; the verdict is the person's, per beat.

### 8. The choice recorded, the default set in 17.11

17.8 ends in the person's choice between `low` and `default`, written in the results. The kit's default stays `default` in the code; 17.11 runs the acceptance and sets it (phase decision 2).

### 9. The write-up

An entry in `_dev/docs/latency-and-token-experiment-results.md`, per beat and per setting: each model request's time to first token, generation time, tokens — prompt, output, thinking, cached — and how it ended; each turn's time to its first screen and to its end; the first try and the two checks; the failed beats; each pass's cost; the verdict per beat. Beside it, each turn's numbers in the extract's shape, `_dev/docs/phase-17-kit-thinking-low-extract.json`.

## Invariants

- Nothing the models wrote and nothing the apps returned is committed; the committed recordings are not changed.
- A password or consent screen in a sign-in is the person's.
