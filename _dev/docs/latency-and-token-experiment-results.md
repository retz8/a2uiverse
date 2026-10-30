# Latency and token experiment results

Every run that spent model tokens to measure A2UIVerse, in the order they ran: what it asked, how it ran, what it cost, what it found, and where its data is. The phase it serves states why it ran; the decision it fed is that phase's.

| Date | Sub-task | Experiment | Models | Spend |
| --- | --- | --- | --- | --- |
| 2026-10-27 | 17.2 | [A first look at Claude on the orchestrator](#2026-10-27--172--a-first-look-at-claude-on-the-orchestrator) | Claude Sonnet 5.5, Claude Haiku 5.5, `gemini-3.8-flash` | not recorded |
| 2026-10-27 | 17.3 | [The kit's measurement on Linear, and Gemini's thinking settings](#2026-10-27--173--the-kits-measurement-on-linear-and-geminis-thinking-settings) | `gemini-3.8-flash` | not recorded |
| 2026-10-29 | 17.5 | [The baseline](#2026-10-29--175--the-baseline) | `gemini-3.8-flash` | $8.74 |
| 2026-10-30 | 17.6 | [The cache strategy's live check](#2026-10-30--176--the-cache-strategys-live-check) | `gemini-3.8-flash`, Claude Haiku 5.5, Claude Sonnet 5.5 | $0.21 |
| 2026-10-30 | 17.7 | [The Planner on Claude](#2026-10-30--177--the-planner-on-claude) | Claude Sonnet 5.5, Claude Haiku 5.5, `gemini-3.8-flash` | $4.75 |

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
