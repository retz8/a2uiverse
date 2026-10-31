# Latency and token experiment results

Every run that spent model tokens to measure A2UIVerse, in the order they ran: what it asked, how it ran, what it cost, what it found, and where its data is. The phase it serves states why it ran; the decision it fed is that phase's.

| Date | Sub-task | Experiment | Models | Spend |
| --- | --- | --- | --- | --- |
| 2026-10-27 | 17.2 | [A first look at Claude on the orchestrator](#2026-10-27--172--a-first-look-at-claude-on-the-orchestrator) | Claude Sonnet 5.5, Claude Haiku 5.5, `gemini-3.8-flash` | not recorded |
| 2026-10-27 | 17.3 | [The kit's measurement on Linear, and Gemini's thinking settings](#2026-10-27--173--the-kits-measurement-on-linear-and-geminis-thinking-settings) | `gemini-3.8-flash` | not recorded |
| 2026-10-29 | 17.5 | [The baseline](#2026-10-29--175--the-baseline) | `gemini-3.8-flash` | $8.74 |
| 2026-10-30 | 17.6 | [The cache strategy's live check](#2026-10-30--176--the-cache-strategys-live-check) | `gemini-3.8-flash`, Claude Haiku 5.5, Claude Sonnet 5.5 | $0.21 |
| 2026-10-30 | 17.7 | [The Planner on Claude](#2026-10-30--177--the-planner-on-claude) | Claude Sonnet 5.5, Claude Haiku 5.5, `gemini-3.8-flash` | $4.75 |
| 2026-10-30 | 17.8 | [The kit's thinking tier `low`](#2026-10-30--178--the-kits-thinking-tier-low) | `gemini-3.8-flash` | $1.38 |
| 2026-10-31 | 17.9 | [The Planner's answer streamed, checked live](#2026-10-31--179--the-planners-answer-streamed-checked-live) | Claude Sonnet 5.5, `gemini-3.8-flash`, `gemini-3.7-flash` | $0.95 |
| 2026-10-31 | 17.10 | [The synthesis fragment streamed, checked live](#2026-10-31--1710--the-synthesis-fragment-streamed-checked-live) | Claude Sonnet 5.5, `gemini-3.8-flash`, `gemini-3.7-flash` | $0.91 |
| 2026-10-31 | 17.11 | [The acceptance](#2026-10-31--1711--the-acceptance) | Claude Sonnet 5.5, `gemini-3.8-flash`, `gemini-3.7-flash` | $2.58 |
| 2026-10-31 | 17.11 | [The Synthesizer on Sonnet 5.5 beside Gemini, the apps deterministic](#2026-10-31--1711--the-synthesizer-on-sonnet-55-beside-gemini-the-apps-deterministic) | Claude Sonnet 5.5, `gemini-3.8-flash` | $0.57 |

---

## 2026-10-27 · 17.2 · A first look at Claude on the orchestrator

The Planner and the Synthesizer named on Claude through the model seam, once the seam could, to see that a plan and a merge come back. One prompt, one sample each.

- **The Planner on Sonnet 5.5**: 3.7 s at `default`, 5.3 s at `low`.
- **The Planner on Haiku 5.5**: 5.4 s at `default`; 8.4 s at `low`, valid on its retry.
- **The Synthesizer at `low`**: 5.9 s on Haiku 5.5, 8.9 s on Sonnet 5.5.
- **Gemini at `low`**, through the SDK's `none`: zero reasoning tokens.
- `low` on Claude then sent the SDK's `none` alone, which on Sonnet 5.5 left the effort at the API's default, `high`; 17.6 set it to `low` (task-17.6 decision 6), so these `low` times are at effort `high`.

Data: the TODO's 17.2 line and its done commit.

## 2026-10-27 · 17.3 · The kit's measurement on Linear, and Gemini's thinking settings

The kit's new per-request records proven on Linear's beat 1, run live through the beat driver on Gemini at `low`; then `gemini-3.8-flash`'s thinking settings checked against the model directly.

- **Linear's beat 1**: three requests on one turn, two tool calls then the paint, each re-reading a 25–32k-token prompt, Gemini's cache serving most of it from the second. The painting request: 66.7 s to first token and 7.1 s of generation, its first token at 80.10 s beside the first recorded batch at 80.18 s. Gemini reported thoughts tokens on every request despite `low`, 9.3k on the paint; the same beat against the stub reported none.
- **The thinking settings on `gemini-3.8-flash`**: a zero thinking budget is not honoured, 47k thought tokens and 380 s to first token, against 18k and 123 s with nothing set; the `low` thinking level leaves none, 1.6 s; `minimal` is refused. The kit's `low` on Gemini became the `low` level (task-17.1 decision 3 amended).

Data: the TODO's 17.3 line and its done commit.

## 2026-10-29 · 17.5 · The baseline

Today's defaults measured end to end before any lever moves (task 17.5), on 2026-10-29: every model call on `gemini-3.8-flash`, the Planner and the Synthesizer at `low`, the vendor agents live at the kit's default effort; the default roster, Shop A installed for the camera comparison alone, Shop B in the Store. The six prompts — 1, 4, 6 and 10 above, the control "show my open pull requests" and "Compare camera prices at Shop A and Shop B." — each one utterance turn on a fresh canvas, sent through the tunnel by Claude-in-Chrome, three passes back to back. Every time is on the orchestrator's clock from the utterance arriving, read from the turn's journal line, the tunnel's leg not counted; each is the median of the three passes in seconds, lowest to highest in brackets. Each turn's numbers: `phase-17-baseline-extract.json` beside these notes.

### Per prompt

| Prompt | Plan | First paint, per app | Dead air | Settled screen | The merge |
| --- | --- | --- | --- | --- | --- |
| 1, pull requests blocked outside GitHub | 23.2 (20.9–26.3) | Linear 118.2 (109.5–122.5) · CircleCI 123.1 (103.0–153.6) · GitHub 151.6 (129.5–168.7) | 28.1 (26.7–54.1) | 217.4 (215.7–226.1) | merged each pass, released by the home source; once on the retry |
| 4, closing out A2U-7 | 54.8 (27.0–74.0) | Linear 186.2 (106.9–195.8); GitHub and CircleCI answered in words each pass | — | 198.4 (172.6–208.5) | none: collapsed on one screen twice, not planned once |
| 6, is main green | 20.3 (14.7–23.8) | CircleCI 85.3 (81.3–92.5) · GitHub 111.6 (72.9–174.4) | 11.0 (3.6–44.6) | 126.2 (103.7–231.8) | declined twice, merged once on the retry |
| 10, both Gmail accounts | 51.4 (40.0–58.4) | Linear 104.0 (75.1–128.9) · the first Gmail account 160.8 (138.8–215.3) · the second 220.1 (203.6–236.6), two passes of three | 13.5 (3.3–15.6) | 237.8 (206.7–239.8) | merged twice, declined once; released by the soft deadline twice, before the second account |
| Control, "show my open pull requests" | 6.7 (6.6–7.9) | GitHub 128.9 (87.2–138.3) | — | 143.7 (101.8–151.5) | none planned |
| The camera comparison | 21.5 (20.8–31.6) | Shop A 63.5 (58.3–107.2) | — | 69.7 (64.2–111.3) | none: Shop B offered from the Store |

A2U-7 is today "Shell-action report hangs through the tunnel", with no pull request or CI run linked to it: on prompt 4 GitHub and CircleCI say so in words. On prompt 10 in pass 1 the second Gmail account answered in words too.

### The split of the wait

Each app's run, from its dispatch to its settle, with its requests as the kit measures them (17.3), each request's time to first token and generation summed over the run:

| Prompt | App | Requests | Time to first token, summed | Generation, summed | Dispatch to settle |
| --- | --- | --- | --- | --- | --- |
| 1 | Linear | 4–5 | 82.6 (81.6–98.6) | 7.7 (7.6–9.6) | 98.4 (92.4–108.1) |
| 1 | CircleCI | 7–14 | 94.9 (73.9–108.0) | 16.2 (14.4–22.2) | 122.1 (94.9–139.8) |
| 1 | GitHub | 5–11 | 113.9 (101.8–122.7) | 25.8 (24.3–46.2) | 165.8 (145.7–168.3) |
| 4 | CircleCI | 9–14 | 89.7 (81.5–94.1) | 1.0 (1.0–1.4) | 100.0 (89.0–102.3) |
| 4 | GitHub | 11–18 | 109.7 (80.7–110.9) | 2.4 (1.9–3.1) | 135.1 (103.0–145.6) |
| 4 | Linear | 3–4 | 109.0 (77.6–138.5) | 13.4 (13.3–13.5) | 124.3 (92.4–153.6) |
| 6 | CircleCI | 5 | 62.0 (57.2–68.5) | 15.6 (14.1–16.1) | 81.6 (76.3–85.5) |
| 6 | GitHub | 1–11 | 90.2 (46.9–134.7) | 4.5 (4.0–16.0) | 100.4 (52.5–167.0) |
| 10 | Linear | 2–3 | 50.6 (33.3–68.1) | 6.6 (6.3–13.0) | 58.4 (40.8–82.7) |
| 10 | Gmail, both accounts at once | 22–35 | 252.0 (185.4–324.7) | 16.9 (14.2–21.1) | 184.3 (148.2–188.4) |
| Control | GitHub | 3–11 | 113.3 (72.0–116.9) | 15.5 (15.0–15.6) | 137.0 (93.9–144.8) |
| Camera | Shop A | 2 | 36.0 (31.2–85.6) | 6.5 (4.8–6.9) | 42.6 (38.1–90.5) |

Gmail's two accounts run at once, so their summed request times exceed the run.

- **The shortlist**: 1–9 ms on every turn, inside the plan.
- **The Planner**: one request a plan, the whole of the plan time, except the camera comparison's two: a request ending in the Store search, 3.5–4.3 s, the search 17–22 ms, then the plan's own, 16.5–27.4 s. At `low` its requests reason a median 1,766 tokens, up to 8,973 on prompt 4 in pass 1, that plan's 74.0 s; the control's 306–623, its 6.6–7.9 s.
- **The Synthesizer**: one request a merge, 13.5–29.0 s when it writes a merged view, 3.3–11.0 s when it declines; a retry doubles it, dead air 54.1 s on prompt 1 in pass 1 and 44.6 s on prompt 6 in pass 3.
- **The apps**: of 298 requests on the counted turns, 257 ended in a tool call, a median 4.5 s to first token each; 41 ended in text — the paint, or an answer in words — a median 48.5 s to first token (8.3–118.9) and 8.8 s of generation. Every prompt with an app waits longest on the apps: their runs, 42.6–184.3 s at the median, against plans of 6.7–54.8 s and dead air of 11.0–28.1 s.

### Tokens, first tries and the cost

Over the three passes, pass 1's first try of prompt 10 and the request its Allow sent again included:

| | Requests | Prompt tokens | Cached | Output tokens, reasoning included | Cost |
| --- | --- | --- | --- | --- | --- |
| Planner | 22 | 701,171 | 17% | 61,588 (51,168 reasoning) | $0.68 |
| Synthesizer | 12 | 264,047 | 0% | 30,833 (3,397) | $0.31 |
| GitHub | 101 | 16,599,378 | 84% | 145,666 (113,617) | $3.54 |
| Gmail | 111 | 12,258,351 | 85% | 88,688 (76,597) | $2.45 |
| CircleCI | 77 | 2,603,670 | 82% | 97,379 (77,251) | $0.88 |
| Linear | 36 | 900,737 | 64% | 121,146 (102,455) | $0.74 |
| Shop A | 6 | 93,664 | 43% | 24,484 (21,307) | $0.14 |

- **What it cost**: $8.74 at `gemini-3.8-flash`'s price, $0.75 / $3.75 / $0.075 per million input, output and cached tokens until 2026-12-31 ([Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)) — pass 1 $3.46, pass 2 $2.44, pass 3 $2.84.
- **The prompt cache**: the Planner's requests cached on 4 of 21 — the camera comparison's second request each pass, 29,568–29,569 of about 32.1k prompt tokens, and prompt 10 sent again in pass 1, 29,533 of 31,580; every other plan cached nothing. The Synthesizer's, none. The apps', 43–85%: each tool round re-reads the request before it, Gemini's cache serving most of it from the second (17.3).
- **First tries**: the Planner 18 of 18 plans; the Synthesizer 7 of 9 merges that called the model; the apps 35 of 36 runs, GitHub's on prompt 1 in pass 3 painting on its second attempt.

### As they fell

- Pass 1's prompt 1 is the first turn after the orchestrator booted, marked in the extract; its shortlist took 5 ms.
- Pass 1's first try of prompt 10: the second Gmail account's sign-in did not yet hold reading its email, and its fragment asked for it. The person allowed it and the prompt was sent again (task-17.5 decision 12). The first try is in the extract, marked, and out of the medians.

Data: [`phase-17-baseline-extract.json`](phase-17-baseline-extract.json), each turn's numbers, no text any model wrote and no data any app returned.

## 2026-10-30 · 17.6 · The cache strategy's live check

Checked live on 2026-10-30 through the orchestrator's own model seam, each seam's fixed prompt sent twice per model with its JSON compact, the output held to 200 tokens: $0.21 of the $0.50 cap (ours).

| Seam · model | Prompt tokens | First request | Second request |
| --- | --- | --- | --- |
| Planner · `gemini-3.8-flash` | 20,484 | whole, 3.5 s, the cache created beside it | 20,386 read from the cache, 20.1 s |
| Synthesizer · `gemini-3.8-flash` | 14,014 | whole, 3.0 s | 14,006 read from the cache, 2.7 s |
| Planner · Claude Haiku 5.5 | 30,388 | 30,168 written to the cache, 1.7 s | 30,168 read, 1.4 s |
| Planner · Claude Sonnet 5.5 | 30,388 | 30,168 written to the cache, 3.0 s | 30,168 read, 2.5 s |

- The Planner's request, one app shortlisted: 20,484 tokens on Gemini, 30,388 on Claude, Claude's tokenizer counting the same request at about 1.48 times Gemini's (ours).
- Gemini's 20.1 s was taken again, three requests each way: whole 3.4–4.2 s, naming the cache 3.7–4.5 s, 181–196 output tokens each (ours): no difference in time. One of the whole requests was served 18,433 tokens by the implicit cache.
- Gemini refuses a request naming a cache with a system instruction beside it: 400, "CachedContent can not be used with GenerateContent request setting system_instruction, tools or tool_config" (ours).
- Claude accepted `between_tools` thinking at effort `low` on Sonnet 5.5 and thinking off at effort `low` on Haiku 5.5, with no warning and no reasoning tokens (ours).

## 2026-10-30 · 17.7 · The Planner on Claude

The Planner on Claude Sonnet 5.5 and on Claude Haiku 5.5, read against the baseline (task 17.7), on 2026-10-30: the Planner at `low` — thinking between tool calls at effort `low` on Sonnet 5.5, thinking off at effort `low` on Haiku 5.5 — with 17.6's compact prompts and one-hour cache; the Synthesizer on `gemini-3.8-flash` at `low`; the vendor agents live on `gemini-3.8-flash` at the kit's default effort; the plan cache off. The six prompts run as the baseline ran them, one pass on each model, Sonnet 5.5 first, the orchestrator restarted between; passes two and three not run (task-17.7 decision 3). Each number is that one pass's, in seconds on the orchestrator's clock from the utterance arriving. Each turn's numbers: `phase-17-planner-on-claude-extract.json` beside these notes.

### Plan time

| Prompt | Baseline, `gemini-3.8-flash`, median (range) | Sonnet 5.5 | Haiku 5.5 |
| --- | --- | --- | --- |
| 1, pull requests blocked outside GitHub | 23.2 (20.9–26.3) | 7.6 | 3.9 |
| 4, closing out A2U-7 | 54.8 (27.0–74.0) | 6.7 | 6.0, refused twice |
| 6, is main green | 20.3 (14.7–23.8) | 6.4 | 3.0 |
| 10, both Gmail accounts | 51.4 (40.0–58.4) | 6.6 | 5.7, valid on the retry |
| Control, "show my open pull requests" | 6.7 (6.6–7.9) | 3.7 | 2.3 |
| The camera comparison | 21.5 (20.8–31.6) | 6.1 | 5.6, refused twice |

- **Sonnet 5.5**: one request a plan, the camera comparison's two — its request ending in the Store search 2.4 s, the search 21 ms, then the plan's own 3.7 s. Every plan below the fastest of the baseline's three on its prompt.
- **No reasoning**: no request of either model reported a reasoning token. Sonnet 5.5's plans wrote 207–853 output tokens; the baseline's reasoned a median 1,766 tokens before a median 506 of text.

### Per prompt, Sonnet 5.5

| Prompt | First paint, per app | Dead air | Settled screen | The merge |
| --- | --- | --- | --- | --- |
| 1 | Linear 73.1 · CircleCI 147.2 · GitHub 193.4 | 27.6 | 240.6 | merged, released by the home source |
| 4 | Linear 53.5 · CircleCI 149.3; GitHub answered in words | 8.2 | 173.2 | merged once every app settled |
| 6 | CircleCI 65.8 · GitHub 194.6 | 18.3 | 237.8 | merged once every app settled |
| 10 | Linear 72.1 · the first Gmail account 108.3 · the second 163.8 | 15.3 | 166.7 | merged, released by the soft deadline |
| Control | GitHub 192.7 | — | 207.3 | none planned |
| Camera | Shop A 45.3 | — | 51.0 | none: Shop B offered from the Store |

### Per prompt, Haiku 5.5

| Prompt | First paint, per app | Dead air | Settled screen | The merge |
| --- | --- | --- | --- | --- |
| 1 | Linear 117.2 · CircleCI 148.5 · GitHub 151.8 | 11.5 | 173.5 | merged once every app settled |
| 4 | the plan refused twice, the turn failed | — | — | — |
| 6 | CircleCI 56.9 · GitHub 114.5 | — | 121.8 | none planned |
| 10 | the second Gmail account 198.4 · the first 245.8; Linear answered in words | 21.6 | 278.3 | merged once every app settled |
| Control | GitHub 80.9 | — | 99.7 | none planned |
| Camera | the plan refused twice, the turn failed | — | — | — |

### The plans beside the baseline's

The checks of task-17.7 decision 5 — the apps asked, and where the baseline planned a merge, one planned on the same join — each plan read beside the baseline's three passes on its prompt.

- **Sonnet 5.5**, held up on all six. The same apps as the baseline on every prompt. The baseline's join on 1 — GitHub's pull requests home, Linear's issues and CircleCI's runs; on 4 — Linear's issues home, GitHub's pull requests and CircleCI's runs, as the baseline's first and third passes; on 10 — both Gmail accounts' threads and Linear's issues, no home, as the baseline's third pass; on the camera comparison — Shop A's cameras, Shop B a gap offered from the Store. On 6 a merge planned, as the baseline's each pass, on CircleCI's runs home and GitHub's pull requests, where the baseline's held no join twice and CircleCI's runs with GitHub's commits, no home, once. Its merges went through on 4 and 6, where the baseline's collapsed twice on 4 and declined twice on 6.
- **Haiku 5.5**, did not hold up on 4, 6 and the camera comparison. The same apps on 1, 6, 10 and the control, and the baseline's join on 1 and 10. On 6 no merge planned, where the baseline planned one each pass. Prompt 4 refused twice: the first answer with a property the plan's schema does not allow, the second writing each source with its account's address beside it. The camera comparison refused twice: the first naming Shop B a gap without searching the Store, the second, after the search, joining on Shop B as a dispatched source.

### Tokens, first tries and the cost

| | Requests | Prompt tokens | Cache read | Cache written | Output tokens, reasoning included | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Planner, Sonnet 5.5 | 7 | 235,599 | 182,496 | 30,416 | 3,835 (0) | $0.22 |
| Synthesizer, Sonnet 5.5's pass | 4 | 65,061 | 42,018 | — | 10,523 (0) | $0.06 |
| The apps, Sonnet 5.5's pass | 118 | 13,483,379 | 11,955,334 | — | 158,640 (124,363) | $2.64 |
| Planner, Haiku 5.5 | 10 | 338,796 | 273,744 | 30,416 | 4,756 (0) | $0.015 |
| Synthesizer, Haiku 5.5's pass | 2 | 31,416 | 14,006 | — | 5,085 (0) | $0.03 |
| The apps, Haiku 5.5's pass | 92 | 8,577,877 | 7,546,160 | — | 117,560 (99,153) | $1.78 |

- **What it cost**: $4.75 — Sonnet 5.5's pass $2.92, Haiku 5.5's $1.83, its two failed turns asking no app. At `gemini-3.8-flash`'s $0.75 / $3.75 / $0.075 per million input, output and cached tokens until 2026-12-31 ([Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)); Sonnet 5.5's $2 / $10 / $0.10 and Haiku 5.5's $0.10 / $0.50 / $0.01 ([Pricing — Claude](https://platform.claude.com/docs/en/about-claude/pricing)); a one-hour cache write at twice the input price ([Prompt caching — Claude](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).
- **The prompt caches**: each Claude model wrote 30,416 tokens on its pass's first plan, and every later Planner request read them. The Synthesizer's cache was created beside the first merge after each boot, and every later merge read 14,006 tokens from it.
- **First tries**: the Planner on Sonnet 5.5 6 of 6 plans; on Haiku 5.5 3 of 6, one valid on the retry, two refused twice. The Synthesizer 6 of 6 merges that called the model.
- Each pass's first turn is the first after the orchestrator booted, marked in the extract.

### The choice

Chosen on 2026-10-30: Claude Sonnet 5.5 for the Planner, on its one pass (task-17.7 decision 6); its default set in 17.11.

Data: [`phase-17-planner-on-claude-extract.json`](phase-17-planner-on-claude-extract.json), each turn's numbers, no text any model wrote and no data any app returned.

## 2026-10-30 · 17.8 · The kit's thinking tier `low`

The agent kit at its `default` tier, no thinking setting, and at `low`, Gemini's low thinking level (task 17.8), on 2026-10-30: GitHub's recorded beats 8 and 9 and Linear's conversation — beat 1, beat 2, beat 3's proposal and its confirm — driven agent alone through the beat driver against each agent live on `gemini-3.8-flash`, one attempt per beat, signed in through Claude-in-Chrome on the tunnel. `default` first, then `low`, both agents restarted between; A2U-5 set back to In Review before each Linear run. One pass on each tier; passes two and three not run (task-17.8 decision 1). Each `low` answer read beside the same pass's `default` answer (task-17.8 decision 2). Each number is that one pass's, in seconds on the turn's clock from the prompt arriving at the agent. Each turn's numbers: `phase-17-kit-thinking-low-extract.json` beside these notes.

### Per beat

| Beat | Answer's first token, `default` · `low` | First screen | Turn's end | Thinking on the answer, tokens | Requests |
| --- | --- | --- | --- | --- | --- |
| GitHub 8, "What pull requests need my attention today?…" | 53.9, refused · 28.8 | 118.7 · 74.1 | 143.3 · 82.5 | 9,269 · 3,783 | 10 · 5 |
| GitHub 9, "Show my open pull requests and active branches…" | 41.9 · 39.1, refused | 91.5 · 110.2 | 106.5 · 147.9 | 6,964 · 6,619 | 8 · 10 |
| Linear 1, "Show my in-progress and assigned issues…" | 56.9 · 1.7 | 73.3 · 14.1 | 80.2 · 21.6 | 7,866 · 0 | 3 · 4 |
| Linear 2, "Open A2U-5." | 29.0 · 2.7 | 37.7 · 6.1 | 50.0 · 18.9 | 4,607 · 0 | 2 · 2 |
| Linear 3, "Move it to In Progress." | 15.6 · 1.6 | 20.4 · 4.2 | 26.9 · 10.5 | 2,302 · 0 | 2 · 2 |
| Linear 3, "Yes, move it." | 11.2 · 1.7 | 21.9 · 10.8 | 34.4 · 24.1 | 1,503 · 0 | 3 · 3 |

- **The answer's first token**: the wait of the request that drew the screen for its first token; on a refused answer, its first attempt's. The correction after a refusal drew the screen at 6.8 s on GitHub 8 at `default` and 6.4 s on GitHub 9 at `low`.
- **Linear at `low`**: no request reported a thinking token; at `default` its tool calls thought 73–487 tokens and its answers 1,503–7,866.
- **GitHub at `low`**: every request reported thinking — its tool calls 24–967 tokens, as at `default`'s 44–1,061, and its answers 3,783 and 6,619. Both agents sent Gemini's low thinking level. GitHub's requests carried 106,524–189,272 prompt tokens, Linear's 25,105–55,797.
- **GitHub's runs**: the two tiers' runs made different tool calls — on beat 8 four rounds at `low` and eight at `default`, on beat 9 eight and seven — and one correction each; those moved GitHub's first screen and end more than its thinking did.

### The answers beside `default`'s

The checks of task-17.8 decision 7, and the rest read.

- **First try**: 5 of 6 on each tier. GitHub's catalog refused one answer on each — beat 8 at `default`, beat 9 at `low` — for the same component property, a page header's title area in a `small` variant the catalog does not allow.
- **What the prompt asks on the screen**: all twelve. Each field the prompt names on GitHub 8 and 9 and Linear 1; A2U-5's details on beat 2; a question to confirm the move on the proposal; A2U-5 shown In Progress on the confirm, and found so in Linear after each.
- **Read**: the same pull request on GitHub 8 and the same nine on GitHub 9, the same four issues on Linear 1. Linear's four screens the same components bound to the same fields on both tiers. GitHub 8 at `low` a plain heading in place of the page header, one "Review requested" badge on the header in place of one a row, no author line; GitHub 9 at `low` a title naming the active branches, each pull request's review status naming who commented, where `default`'s said whether a review is required, the date and time written out in place of a formatted one. The verdict: each of the six held up at `low`.

### Tokens, first tries and the cost

| | Requests | Prompt tokens | Cached | Output tokens | Thinking tokens | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| GitHub, `default` | 18 | 2,500,017 | 2,133,626 | 7,900 | 21,544 | $0.55 |
| Linear, `default` | 10 | 428,067 | 366,110 | 7,332 | 17,712 | $0.17 |
| GitHub, `low` | 15 | 2,072,302 | 1,600,749 | 8,867 | 14,409 | $0.56 |
| Linear, `low` | 11 | 334,310 | 256,817 | 7,507 | 0 | $0.11 |

- **What it cost**: $1.38 — `default`'s run $0.71, `low`'s $0.67. At `gemini-3.8-flash`'s $0.75 / $3.75 / $0.075 per million input, output and cached tokens until 2026-12-31, thinking billed as output ([Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)).
- Each tier's first turn on each agent — GitHub 8, Linear 1 — is the first after the agent started, marked in the extract.

### The choice

Chosen on 2026-10-30: `low` for the kit, on its one pass (task-17.8 decision 8); its default set in 17.11. Linear's answers at `low` on prompts that ask the model to judge, which its recorded beats do not, read in 17.11's prompts 4 and 10.

Data: [`phase-17-kit-thinking-low-extract.json`](phase-17-kit-thinking-low-extract.json), each turn's numbers, no text any model wrote and no data any app returned.

## 2026-10-31 · 17.9 · The Planner's answer streamed, checked live

The Planner's answer read as the model writes it (task 17.9), checked live on 2026-10-31 through the tunnel by Claude-in-Chrome (task-17.9 decision 9): the orchestrator on the `phase-17/latency` branch, the Planner on Claude Sonnet 5.5 at `low` for three prompts, then on `gemini-3.8-flash` at `low` for one; the Synthesizer on `gemini-3.8-flash` at `low`; the apps in `stub` mode, their model over canned data, on `gemini-3.7-flash`; the plan cache off. One sample each, in seconds on the orchestrator's clock from the utterance arriving. A check that the streaming works, not a measurement: the measured numbers are 17.11's.

| Prompt · Planner | First token | The list committed, the apps asked | The layout's first piece | The layout checked (`planMs`) |
| --- | --- | --- | --- | --- |
| "show my open pull requests" · Sonnet 5.5 | 1.76 | 3.05 | 3.07 | 3.08 |
| "Is main green right now? Ask CircleCI and GitHub." · Sonnet 5.5 | 1.55 | 4.82 | 5.60 | 5.62 |
| "what apps do I have?" · Sonnet 5.5 | 1.80; after its reader call, 7.83 | 7.84 | 7.85 | 7.86 |
| "show my open pull requests" · `gemini-3.8-flash` | 5.09 | 5.51 | 5.76 | 6.07 |

- **What held**: every plan valid on the first try, written title, dispatch list, data model, tree, as asked; each layout drawn from its first piece and checked whole; every app's answer in its slot, the merged view landing on the second prompt over CircleCI's and GitHub's. No app answered before its layout was checked — they took 109–139 s — so nothing was held live; the scripted tests cover the hold.
- **Sonnet 5.5 hands its JSON over in bursts** (ours). Writing prose, a bare request streamed a text delta about every 35 ms; writing JSON, in a tag or not, it handed over 10–12 deltas at once every 0.4–0.8 s. A Planner request replayed with the Planner's system prompt and readers streamed its prose, then nothing for 0.6 s, then its block of 185 characters in one burst at its end, the orchestrator taking each delta as it came. So a short block arrives whole at its end: the list committed 0.8 s ahead of the plan's end on the merge prompt, about 20 ms on the other two. Replayed offline through the reader and the checks, the same three answers commit their lists at 70%, 79% and 2% of their text and tell each component as written.
- **On Gemini** the first token came after 390 reasoning tokens Gemini does not stream; the list then committed 0.56 s and the first piece 0.31 s ahead of the plan's end.
- **Sign-in**: GitHub's and CircleCI's `stub` accounts had run out; each slot drew its sign-in tile at first paint, signed in with the app's fake account, and resumed.

### Before and after

Before 17.9 the apps were asked, and the layout drawn, once the plan was complete and checked, at `planMs`; the Planner's streaming leaves the model's writing as it was, so each turn's own `planMs` is its before (ours).

| Prompt · Planner | `planMs`: the apps asked and the layout drawn, before | The apps asked, after | Earlier | The layout's first piece, after | Earlier |
| --- | --- | --- | --- | --- | --- |
| "show my open pull requests" · Sonnet 5.5 | 3.08 | 3.05 | 0.04 | 3.07 | 0.01 |
| "Is main green right now? Ask CircleCI and GitHub." · Sonnet 5.5 | 5.62 | 4.82 | 0.80, 14% of `planMs` | 5.60 | 0.01 |
| "what apps do I have?" · Sonnet 5.5 | 7.86 | no app asked | — | 7.85 | 0.01 |
| "show my open pull requests" · `gemini-3.8-flash` | 6.07 | 5.51 | 0.55, 9% | 5.76 | 0.30 |

The 25 plans recorded before 17.9, estimated, not measured (ours): where each accepted answer's dispatch list and first component end in its text, the text after them converted to seconds at this check's rates while the answer streamed — Sonnet 5.5 406 and 441 characters a second on two turns, taken as 424; `gemini-3.8-flash` 600 on one.

| Plans | The list ends at, of the answer | The apps asked earlier | The first piece earlier | `planMs` | Earlier, of `planMs` |
| --- | --- | --- | --- | --- | --- |
| 17.5's baseline, `gemini-3.8-flash`, 19 | median 63% (48–69%) | median 1.2 s (0.5–1.5) | median 0.9 s (0.2–1.2) | median 23.8 s (6.6–74.0) | 5% |
| 17.7's pass, Sonnet 5.5, 6 | median 80% (68–81%) | median 0.9 s (0.4–1.1) | median 0.7 s (0.2–0.9) | median 6.5 s (3.7–7.6) | 14% |

- **Sonnet 5.5's bursts take from it**: on this check's two turns that asked an app, the same estimate gave 0.35 s and 0.86 s where 0.04 s and 0.80 s were measured.
- **The title**: those answers wrote it last; asked first, it moves ahead of the list, about 50 characters, some 0.1 s less.
- **What it does not touch**: the time a model reasons before it writes, most of a long plan on 17.5's baseline.
- **The settled screen**: the apps asked about a second sooner move it by about as much, 0.5–1.7% of 17.5's medians, 69.7–237.8 s, whose apps' runs were 42.6–184.3 s.
- One sample a prompt, the rates from two turns and one; the measured before and after over the six end-to-end prompts is 17.11's.

| | Requests | Prompt tokens | Cache read | Cache written | Output tokens, reasoning included | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Planner, Sonnet 5.5 | 4 | 139,585 | 91,422 | 30,474 | 1,801 (0) | $0.18 |
| Planner, `gemini-3.8-flash` | 1 | 22,923 | 0 | — | 575 (390) | $0.02 |
| Synthesizer, `gemini-3.8-flash` | 1 | 15,879 | 0 | — | 3,072 (0) | $0.02 |
| GitHub, `gemini-3.7-flash` | 16 | 1,257,992 | 979,076 | — | 55,951 (47,884) | $0.49 |
| CircleCI, `gemini-3.7-flash` | 11 | 275,931 | 228,614 | — | 12,068 (9,312) | $0.10 |
| The streaming diagnosed, Sonnet 5.5 | 6 | 30,454 and five under 100 | 0 | 30,226 | at most 2,154 | $0.14 |

- **What it cost**: $0.95. Sonnet 5.5 at $2 / $10 / $0.10 per million input, output and cached tokens, a one-hour cache write at twice the input price ([Pricing — Claude](https://platform.claude.com/docs/en/about-claude/pricing), [Prompt caching — Claude](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)); the Gemini requests at `gemini-3.8-flash`'s $0.75 / $3.75 / $0.075 until 2026-12-31, thinking billed as output ([Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)). The apps ran `gemini-3.7-flash`, which that page does not list; they are priced at `gemini-3.8-flash`'s. GitHub's requests include one press: the Cancel of the question its answer asked.
- The diagnosis's Planner request missed the Planner's cache and wrote it again; its five small requests were capped at 300–500 output tokens each.

## 2026-10-31 · 17.10 · The synthesis fragment streamed, checked live

The merged view drawn row by row as the Synthesizer writes it (task 17.10), checked live on 2026-10-31 through the tunnel by Claude-in-Chrome (task-17.10 decision 11): the orchestrator on the `phase-17/latency` branch, the Planner on Claude Sonnet 5.5 at `low`; the Synthesizer on `gemini-3.8-flash` at `low` for two prompts, then on Claude Sonnet 5.5 at `low` for one; the apps in `stub` mode, their model over canned data, on `gemini-3.7-flash`; the plan cache off. One sample each, in seconds on the orchestrator's clock from the merge's release; what the browser drew, sampled every 100 ms in the page. A check that the streaming works, not a measurement: the measured numbers are 17.11's.

| Prompt · Synthesizer | Rows | First token | First row painted (`firstRowMs`) | Accepted (`deadAirMs`) | First row earlier | What the browser drew |
| --- | --- | --- | --- | --- | --- | --- |
| "Is main green right now? Ask CircleCI and GitHub." · `gemini-3.8-flash` | 6 | 2.10 | 11.48 | 23.02 | 11.54 | the whole view at once, about 35 s after acceptance |
| "Which of my open pull requests are blocked on something outside GitHub?" · `gemini-3.8-flash` | 5 | 2.50 | 8.31 | 14.45 | 6.14 | the tree over four skeleton rows, then the five rows 1.3–1.5 s apart, accepted 0.7 s after the last |
| "Is main green right now? Ask CircleCI and GitHub." · Sonnet 5.5 | 1 | 1.41 | 4.30 | 5.55 | 1.26 | the tree over four skeleton rows, the row, accepted 1.0 s later |

- **What held**: every answer written tree, sorts, data model, note, as asked, and accepted on its first attempt; each row drawn at its sorted place, the fourth of the second prompt's rows landing above the third; the skeleton rows four, three, two, one, one, gone at acceptance; the merge's working words and the slot's busy mark held until acceptance. Nothing failed mid-stream and nothing was thrown away, so the takedown, the retry and the remake were not seen live; the scripted tests cover them.
- **The first prompt was not seen streaming**: the orchestrator painted its first row at 11.48 s and accepted it at 23.02 s, and the browser drew nothing of it until about 35 s after acceptance, then the whole view at once. The cause is not established. The client's catalog gate holds an answer behind a paint whose catalog is still loading, and GitHub's question was the answer's first GitHub paint; but on a later reload every catalog loaded within 10 s of the page opening, and this page had been open 43 s before the question. The tunnel holding the answer's stream is the other candidate. The browser's resource-timing buffer was full, so the first page's load times were not kept.
- **On Sonnet 5.5** the one row came 1.26 s before the answer's end, its JSON handed over in bursts as 17.9 found.
- **Sign-in**: Linear's and both Gmail accounts' `stub` sign-ins had run out; they were left signed out, so the second prompt joined GitHub and CircleCI alone.

### Before and after

Before 17.10 the merged view was drawn once the Synthesizer's answer was complete and checked, at `deadAirMs`; the streaming leaves the Synthesizer's writing as it was, so each merge's own `deadAirMs` is its before (ours).

| Prompt · Synthesizer | The view drawn, before (`deadAirMs`) | The first row drawn, after (`firstRowMs`) | Earlier | Earlier, of the wait |
| --- | --- | --- | --- | --- |
| "Is main green right now? Ask CircleCI and GitHub." · `gemini-3.8-flash` | 23.02 | 11.48 | 11.54 | 50% |
| "Which of my open pull requests are blocked on something outside GitHub?" · `gemini-3.8-flash` | 14.45 | 8.31 | 6.14 | 42% |
| "Is main green right now? Ask CircleCI and GitHub." · Sonnet 5.5 | 5.55 | 4.30 | 1.26 | 23% |

- **What the reader sees in the wait**: before, the reserved slot's four skeleton rows and the merge's working words throughout; after, the tree with its headings and sort control, in the browser 1.4 s and 1.0 s ahead of the first row on the two merges seen streaming, then the rows taking the skeleton rows' places.
- **Where it gains most**: a long answer written steadily, Gemini's two here. Sonnet 5.5 hands its JSON over in bursts, so its one row came 1.26 s ahead of the end.
- **What it does not touch**: the accepted view lands when it did. The apps' runs, 53–123 s on this check, are most of each question: on the second prompt the rows 6.14 s earlier are 4% of the question's 143.3 s.
- **On the screen**: the first prompt's view reached the browser whole, about 35 s after acceptance (above), so two of the three earlier first rows were seen.
- One sample a prompt; the measured before and after over the six end-to-end prompts is 17.11's.

### Found during the check, and fixed

- **GitHub's question drawn as a modal**: GitHub asks which repository is meant as a `ConfirmationDialog`, which Primer draws over a backdrop. The canvas pins an app's dialog to its slot, and GitHub's slot held nothing else, so the slot had no height and the dialog, centred on it, spilled over the merged view. The dialog also took the keyboard: a question typed into the ask box went to it, and Return pressed its focused Cancel, sent to GitHub as the answer. GitHub's catalog now draws the dialog in place in the view, taking focus only while nothing else on the page holds it. Checked on the third prompt: the question sat in GitHub's slot beside CircleCI's view, and typing reached the ask box.
- **The merged view's first column on one line**: the shell catalog's `Table` kept its first column from wrapping (task-8.7 decision 29). The first prompt's Synthesizer put whole commit messages there, so that column ran 2,491 px wide in a 1,769 px slot, the table scrolled sideways, and the other four columns were squeezed until a date took five lines and a row 116 px. Every column now wraps under the 56-character cap, the first keeping room for 16 characters; checked in the browser on the same view, every column inside the slot, the rows 76 px.

| | Requests | Prompt tokens | Cache read | Cache written | Output tokens, reasoning included | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Planner, Sonnet 5.5 | 3 | 101,316 | 60,948 | 30,474 | 2,142 (0) | $0.17 |
| Synthesizer, `gemini-3.8-flash` | 2 | 32,377 | 14,074 | — | 6,245 (0) | $0.04 |
| Synthesizer, Sonnet 5.5 | 1 | 20,532 | 0 | 19,950 | 807 (0) | $0.09 |
| GitHub, `gemini-3.7-flash` | 9 | 685,189 | 442,852 | — | 34,921 (30,535) | $0.35 |
| CircleCI, `gemini-3.7-flash` | 25 | 615,342 | 495,358 | — | 35,865 (28,169) | $0.26 |

- **What it cost**: $0.91, against the $2.3 estimated and put to the person before it ran. Priced as in 17.9's entry: Sonnet 5.5 at $2 / $10 / $0.10 per million input, output and cached tokens, a one-hour cache write at twice the input price ([Pricing — Claude](https://platform.claude.com/docs/en/about-claude/pricing), [Prompt caching — Claude](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)); the Gemini requests at `gemini-3.8-flash`'s $0.75 / $3.75 / $0.075, thinking billed as output ([Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)), the apps' `gemini-3.7-flash` priced the same. GitHub's requests include the Cancel the trapped keyboard sent; Linear and Gmail made no model request.

## 2026-10-31 · 17.11 · The acceptance

The six end-to-end prompts once on the configuration the sub-tasks chose (task 17.11), on 2026-10-31: the Planner on Claude Sonnet 5.5 at `low` with 17.6's one-hour cache, its answer streamed (17.9); the Synthesizer on `gemini-3.8-flash` at `low` with Gemini's explicit cache, the first merge streamed (17.10); the vendor agents live on `gemini-3.8-flash` at the kit's `low` (17.8); the plan cache off. Run as the baseline ran (task-17.11 decision 3): one utterance turn per prompt on a fresh canvas, sent through the tunnel by Claude-in-Chrome, every sign-in held, both Gmail accounts checked by name, Shop A installed for the camera comparison alone. One pass; passes two and three not run, on the person's decision. Each number is that pass's, in seconds on the orchestrator's clock from the utterance arriving, beside the baseline's median and range over its three passes. Each turn's numbers: `phase-17-acceptance-extract.json` beside these notes.

### Per prompt

Each cell: the acceptance · the baseline's median (range).

| Prompt | Plan | First paint, per app | Dead air | Settled screen | The merge |
| --- | --- | --- | --- | --- | --- |
| 1, pull requests blocked outside GitHub | 7.09 · 23.2 (20.9–26.3) | Linear 19.84 · 118.2 (109.5–122.5); CircleCI 75.72 · 123.1 (103.0–153.6); GitHub 108.56 · 151.6 (129.5–168.7) | 14.74 · 28.1 (26.7–54.1) | 172.85 · 217.4 (215.7–226.1) | merged, released by the home source |
| 4, closing out A2U-7 | 7.54 · 54.8 (27.0–74.0) | Linear 14.58 · 186.2 (106.9–195.8); GitHub and CircleCI answered in words, as in the baseline | — | 148.33 · 198.4 (172.6–208.5) | none: collapsed, only Linear answered |
| 6, is main green | 5.96 · 20.3 (14.7–23.8) | GitHub 68.50 · 111.6 (72.9–174.4), its answer then refused; CircleCI 83.87 · 85.3 (81.3–92.5) | — | 153.78 · 126.2 (103.7–231.8) | none: collapsed, GitHub's answer refused on both attempts |
| 10, both Gmail accounts | 6.82 · 51.4 (40.0–58.4) | the two Gmail accounts 55.66 and 75.86 · 160.8 and 220.1; Linear 57.78 · 104.0 (75.1–128.9) | 11.40 · 13.5 (3.3–15.6) | 93.85 · 237.8 (206.7–239.8) | merged, released by the home source |
| Control, "show my open pull requests" | 2.19 · 6.7 (6.6–7.9) | GitHub 75.00 · 128.9 (87.2–138.3) | — | 105.77 · 143.7 (101.8–151.5) | none planned |
| The camera comparison | 5.36 · 21.5 (20.8–31.6) | Shop A 10.26 · 63.5 (58.3–107.2) | — | 15.78 · 69.7 (64.2–111.3) | none: Shop B offered from the Store |

- **Prompt 6**: GitHub's first answer broke off as invalid JSON at character 30,763 of 30,877, its request left open after 9,473 output tokens; the kit's correction was refused by GitHub's catalog for a page header's title area in a `small` variant. The slot said the screen couldn't be shown, and the merge collapsed with CircleCI alone.

### The split of the wait

Each app's run, from its dispatch to its settle, with its requests as the kit measures them; each cell the acceptance · the baseline's median.

| Prompt | App | Requests | Time to first token, summed | Generation, summed | Dispatch to settle |
| --- | --- | --- | --- | --- | --- |
| 1 | Linear | 2 · 4–5 | 4.4 · 82.6 | 7.7 · 7.7 | 20.6 · 98.4 |
| 1 | CircleCI | 6 · 7–14 | 55.6 · 94.9 | 15.4 · 16.2 | 83.4 · 122.1 |
| 1 | GitHub | 8 · 5–11 | 84.8 · 113.9 | 44.8 · 25.8 | 152.0 · 165.8 |
| 4 | Linear | 2 · 3–4 | 5.4 · 109.0 | 14.1 · 13.4 | 20.8 · 124.3 |
| 4 | CircleCI | 13 · 9–14 | 31.5 · 89.7 | 1.7 · 1.0 | 41.0 · 100.0 |
| 4 | GitHub | 20 · 11–18 | 108.9 · 109.7 | 2.5 · 2.4 | 141.4 · 135.1 |
| 6 | CircleCI | 8 · 5 | 71.1 · 62.0 | 16.0 · 15.6 | 92.6 · 81.6 |
| 6 | GitHub | 15 · 1–11 | 43.8 · 90.2 | 25.5 · 4.5 | 147.8 · 100.4 |
| 10 | Linear | 5 · 2–3 | 48.6 · 50.6 | 11.2 · 6.6 | 62.0 · 58.4 |
| 10 | Gmail, both accounts at once | 24 · 22–35 | 74.3 · 252.0 | 12.7 · 16.9 | 76.3 · 184.3 |
| Control | GitHub | 7 · 3–11 | 67.3 · 113.3 | 24.9 · 15.5 | 103.9 · 137.0 |
| Camera | Shop A | 2 · 2 | 4.1 · 36.0 | 6.3 · 6.5 | 10.4 · 42.6 |

- **The shortlist**: 3–19 ms on every turn, inside the plan.
- **The Planner**: one request a plan, its first token at 1.04–1.95 s, no reasoning token; the camera comparison's two, a request ending in the Store search at 2.07 s, the search 22 ms, then the plan's own, 3.26 s. Every plan after the first read 30,474 tokens from Claude's cache.
- **The Synthesizer**: two merges, 14.74 s and 11.40 s, their first token at 2.61 s and 1.80 s.
- **The apps**: of the 13 requests that drew an answer on its first attempt, the first token came at a median 3.2 s (1.8–42.7), against the baseline's 48.5 s (8.3–118.9) over 41. On those requests Linear, Gmail and Shop A thought nothing but Linear on prompt 10, 2,873 tokens before a first token at 20.6 s; GitHub thought 2,079–6,501 tokens and CircleCI none to 4,364. Every prompt with an app still waits longest on the apps: their runs 10.4–152.0 s, against plans of 2.19–7.54 s and dead air of 11.40–14.74 s.

### The streamed answers, before and after

Before 17.9 and 17.10 the apps were asked and the layout drawn at `planMs`, and the merged view drawn at `deadAirMs`; each turn's own is its before (task-17.11 decision 5).

| Prompt | Planner's first token | The apps asked | The layout's first piece | `planMs` | The apps asked earlier | Synthesizer's first token | First row (`firstRowMs`) | `deadAirMs` | First row earlier |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.95 | 6.13 | 7.05 | 7.09 | 0.96, 14% | 2.61 | 9.16 | 14.74 | 5.58, 38% |
| 4 | 1.92 | 6.93 | 6.93 | 7.54 | 0.62, 8% | — | — | — | — |
| 6 | 1.72 | 5.93 | 5.94 | 5.96 | 0.03, 0% | — | — | — | — |
| 10 | 1.61 | 6.11 | 6.12 | 6.82 | 0.71, 10% | 1.80 | 8.62 | 11.40 | 2.78, 24% |
| Control | 1.04 | 1.85 | 2.02 | 2.19 | 0.35, 16% | — | — | — | — |
| Camera | 1.49 | 5.35 | 5.36 | 5.36 | 0.01, 0% | — | — | — | — |

The Synthesizer's times are on its own clock, from the merge's release. What the browser drew, sampled in the page on the browser's clock from the question sent, the tunnel's leg inside it, never compared with the baseline (task-17.11 decision 4):

| Prompt | The layout's first piece | Each app's first paint | The merged view's tree | Its first row | Accepted |
| --- | --- | --- | --- | --- | --- |
| 1 | 8.32 | Linear 21.08, CircleCI 77.06, GitHub 109.81 | 165.86 | 168.55 | 174.09 |
| 4 | 17.61 | Linear 25.53 | — | — | — |
| 6 | 7.52 | GitHub 70.09, CircleCI 85.63 | — | — | — |
| 10 | 7.68 | Gmail 57.28 and 77.47, Linear 59.56 | 89.96 | 92.67 | 95.40 |
| Control | 3.21 | GitHub 76.20 | — | — | — |
| Camera | 7.07 | Shop A 23.84 | — | — | — |

- The rows came one by one, 2.5–2.9 s apart. The merged views reached the browser 1.3 s and 1.6 s after the orchestrator painted their first row; 17.10's late view was not seen again.
- On prompt 4 every event reached the browser about 10 s after the orchestrator sent it: the layout at 17.61 against 6.93, the apps' words 10 s after they settled. On the camera comparison Shop A's paint, its first after its install, reached the browser 13.6 s after the orchestrator relayed it.

### The readings

- **The plans**, by task-17.7 decision 5's checks: the same apps as the baseline on all six; where the baseline planned a merge, one on the same join — GitHub's pull requests home with Linear's issues and CircleCI's runs on 1; Linear's issues home with GitHub's pull requests and CircleCI's runs on 4, as the baseline's first and third passes; CircleCI's runs with GitHub's commits, no home, on 6, as the baseline's third pass; both Gmail accounts' threads and Linear's issues on 10, the first account's threads home; Shop A's cameras on the camera comparison, Shop B offered from the Store after a search.
- **The merges**: on 1 three rows, each pull request with its Linear issue and where it is blocked; on 10 two rows, each a thread with its Linear issue's state. Prompt 4's collapsed as two of the baseline's three did; prompt 6's, where the baseline declined twice and merged once, collapsed on GitHub's refused answer.
- **The apps' answers**, by task-17.8 decision 7's checks: the first try on 10 of 13 runs — GitHub's answer refused on 1 and the control and drawn on the correction, and refused on both attempts on 6; what the prompt asks on the screen on every run but GitHub's on 6.
- **Linear on 4 and 10**, read closest: on 4 A2U-7's detail — its status, priority, assignee and labels, its four actions, its description, links and activity — with no thinking, the answer's first token at 2.2 s; on 10 the team's issues grouped by state, each with its identifier and title, the answer's first token at 20.6 s after 2,873 thinking tokens. The baseline records Linear's answers on these prompts as first paints, 186.2 s and 104.0 s at the median.
- **The limits**: the baseline's answers survive as outcomes, not screens; the repos' data has moved since 2026-10-29; one pass stands against a median of three.
- **The verdict**, the person's, on 2026-10-31: both levers held — the Planner on Claude Sonnet 5.5 and the kit at `low`. GitHub's refused answers come from its brand guidance asking for a `small` title, which its catalog's title area does not allow (the Backlog line).

### Tokens, first tries and the cost

| | Requests | Prompt tokens | Cache read | Cache written | Output tokens, reasoning included | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Planner, Sonnet 5.5 | 7 | 237,157 | 182,844 | 30,474 | 3,904 (0) | $0.23 |
| Synthesizer, `gemini-3.8-flash` | 2 | 33,076 | 14,074 | — | 4,060 (0) | $0.03 |
| GitHub | 50 | 9,517,422 | 8,620,609 | — | 50,117 (21,382) | $1.51 |
| Gmail, both accounts | 24 | 2,038,870 | 1,731,655 | — | 2,529 (0) | $0.37 |
| CircleCI | 27 | 984,926 | 829,147 | — | 22,072 (15,338) | $0.26 |
| Linear | 9 | 210,376 | 127,880 | — | 12,160 (5,570) | $0.12 |
| Shop A | 2 | 31,053 | 13,393 | — | 1,195 (0) | $0.02 |

- **What it cost**: $2.58 — the pass $2.53, Claude $0.23 and Gemini $2.30; Shop A's Store capture at the two launches $0.04. Against the $2.75–3.25 estimated and put to the person before it ran, and the baseline's $2.91 a pass, all of it Gemini. Priced as in 17.9's entry: Sonnet 5.5 at $2 / $10 / $0.10 per million input, output and cached tokens, a one-hour cache write at twice the input price ([Pricing — Claude](https://platform.claude.com/docs/en/about-claude/pricing), [Prompt caching — Claude](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)); `gemini-3.8-flash` at $0.75 / $3.75 / $0.075 until 2026-12-31, thinking billed as output ([Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)).
- **Gemini per pass, by seam**, the acceptance · a third of the baseline's three passes: the Planner $0 · $0.23; the Synthesizer $0.03 · $0.10; GitHub $1.51 · $1.18, its three refused answers drawn again; Gmail $0.37 · $0.82; CircleCI $0.26 · $0.29; Linear $0.12 · $0.25; Shop A $0.02 · $0.05.
- **First tries**: the Planner 6 of 6 plans; the Synthesizer 2 of 2 merges that called the model; the apps 10 of 13 runs.
- **Gmail's two accounts** ran at once in one agent, whose recorder holds one turn at a time: the first account's 14 requests are read from the agent's log, marked in the extract, without their end instants.
- **As they fell**: prompt 1 is the first turn after the orchestrator booted, marked in the extract. The first launch came up with the apps on `gemini-3.7-flash`, which each app's local `.env` names over the kit's default; they were launched again with `MODEL_NAME=gemini-3.8-flash` before any prompt, only Shop A's Store capture having run on the first.

### The choice

Chosen on 2026-10-31: the Planner's default Claude Sonnet 5.5 and the kit's `low`, both set in the code (task-17.11 decision 7); the Synthesizer stays on `gemini-3.8-flash` at `low` (below). The defaults Phase 18 records with: the notes' section 4.

Data: [`phase-17-acceptance-extract.json`](phase-17-acceptance-extract.json), each turn's numbers, no text any model wrote and no data any app returned.

## 2026-10-31 · 17.11 · The Synthesizer on Sonnet 5.5 beside Gemini, the apps deterministic

Asked by the person after the acceptance: the Synthesizer on Claude Sonnet 5.5 at `low` beside `gemini-3.8-flash` at `low`, over prompts 1, 6 and 10, with the vendor agents in `deterministic` mode, answering from their recorded fixtures with no model call, under a scratch state; the Planner on Sonnet 5.5 at `low`; the plan cache off; the orchestrator restarted between the two Synthesizers. Prompt 1 sent three times on Sonnet 5.5. Seconds on the merge's clock, from its release.

| Prompt · Synthesizer | Sources | First token | First row | Dead air | Output tokens | The merge |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · `gemini-3.8-flash` | five | 2.85 | 11.29 | 24.23 | 3,952 | 6 rows, each of the three pull requests with a run matched to its CircleCI run by its branch |
| 1 · Sonnet 5.5 | three | 1.12 | 5.69 | 10.69 | 2,134 | 3 rows, one pull request matched to its run |
| 1 · Sonnet 5.5 | five | 1.06 | 5.95 | 12.82 | 2,572 | 6 rows, one pull request matched to its run |
| 1 · Sonnet 5.5 | five | 0.95 | — | 2.62 | 165 | declined: the link between Linear's issues and the pull requests a bare number with no repository |
| 6 · `gemini-3.8-flash` | two | 2.43 | 9.16 | 18.26 | 2,954 | the six commits on main, a line on top answering whether main is green |
| 6 · Sonnet 5.5 | two | 1.05 | 7.08 | 15.29 | 3,000 | the same six commits, no answering line |
| 10 · `gemini-3.8-flash` | three | 11.75 | — | 12.29 | 1,601 (1,522 reasoning) | declined: no thread names a Linear issue in the fixtures |
| 10 · Sonnet 5.5 | three | 1.04 | — | 2.18 | 119 | declined |

- **Faster on Sonnet 5.5**: the dead air of the merges it wrote 10.69–15.29 s against 18.26–24.23 s, its first token about a second, its rows in the browser 1.5–2.3 s apart; Gemini at `low` reasoned 1,522 tokens before declining on 10.
- **Fewer joins on Sonnet 5.5**: on the same fixtures, one pull request matched to its CircleCI run in three where Gemini matched all three, the branch names equal; one of its three tries declined outright.
- **What it cost**: Claude $0.35, Gemini $0.05, the apps none. The same stack then checked the Planner's rule of three slots to a row on one question: Claude $0.14, the Planner's cache written again after a restart, and Gemini $0.03.
- **The choice**, the person's, on 2026-10-31: the Synthesizer stays on `gemini-3.8-flash` at `low`.
