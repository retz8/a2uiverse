# Phase 19 notes — vendor-agent model candidates and A2UI-unique prompts

Research gathered on 2026-10-09 for Phase 19, the vendor-agent model trial. Two parts: the candidate models for the trial, with their sources, and the prompts that exercise what only a composition across independent agents can answer.

---

## 1. Where the time goes today

Every model call runs on `gemini-3.7-flash`. The orchestrator's Planner and Synthesizer run at low effort, thinking budget zero. The agent kit's vendor agents run with thinking on.

| Measurement | Value | Where recorded |
| --- | --- | --- |
| Linear live run, first UI byte (`paintMeta`, then `createSurface`) | 28.7 s, 29.0 s | `docs/design/agent-kit.md`, "One question, end to end" |
| Live roster, dispatch settle after the plan — Linear · CircleCI · GitHub | 27–30 s · 33–36 s · 51–65 s | `_dev/TODO.md` backlog, dead-air entry (7.9) |
| Plan, live roster | 6–7 s | same entry |
| Upstream's own measurement: 722 output tokens on 6,800 prompt tokens · 2,248 on 7,256 | 10.6 s · 19.5 s | [Issue #1826](https://github.com/a2ui-project/a2ui/issues/1826) |

In the kit's live mode every action inside a fragment is framed as text for the model, which composes the next surface: one click, one full generation (`docs/design/agent-kit.md`, step 2).

---

## 2. Model candidates

Published speeds are third-party snapshots that disagree with one another; the live pages decide before the trial. Speed is mostly a serving property: the same open-weight model runs at very different rates on different hosts.

| Candidate | Host | Published output speed | Documented fit | Source |
| --- | --- | --- | --- | --- |
| Gemini 3.5 Flash | Google | about 280 tok/s, first token under 0.3 s | Same family as today, lowest-risk swap | [1] [2] |
| Gemini 3.5 Flash-Lite | Google | about 350–390 tok/s | A quality trade-off is noted | [1] [2] |
| Claude Haiku 5.5 | Anthropic | no current figure found | Haiku 4.5 cited for reliable tool calls and first token under 0.6 s; $1 in / $5 out per million tokens | [3] [4] |
| GPT-5.4-mini | OpenAI | no figure found | Listed as a budget option for agent back ends | [3] |
| gpt-oss-120b | Cerebras | about 1,700 tok/s measured, about 3,000 claimed | JSON Schema strict mode and tool calling documented; a reasoning model, run at low reasoning effort | [5] [6] [7] |
| gpt-oss-120b | Groq | about 480 tok/s | Tool use and `json_schema` structured output documented | [5] [8] [9] |
| Qwen 3.8 27B | Cerebras | no figure found | JSON Schema strict mode and tool calling documented | [6] |
| Qwen 3.6 27B | Groq | no figure found | Listed as preview | [9] [10] |
| GLM-5.3 · Kimi K3 · MiMo-V2.6-Pro | ordinary hosts | hosted GLM-5.2 about 215 tok/s | Highest open-weight intelligence scores, 44–46 on the Artificial Analysis index; speed depends on host | [11] [12] |

Three classes:

- **Frontier small models** — Gemini 3.5 Flash and Flash-Lite, Claude Haiku 5.5, GPT-5.4-mini. Tuned for strict JSON against a long schema and multi-step tool calling. Modest speed gain over `gemini-3.7-flash`.
- **Open-weight models on custom silicon** — gpt-oss-120b and Qwen on Cerebras or Groq. The typing half of a vendor turn drops from tens of seconds to a few. First-try conformance against an unfamiliar vendor catalog schema is the open question.
- **Strongest open-weight models** — GLM-5.3, Kimi K3, MiMo-V2.6-Pro. One row in the trial only if the second class fails on quality; no fast host confirmed.

Not in the first round: Celeris-1 and the Mercury diffusion models top the raw speed charts, and nothing found says they do tool calling. Groq retired its Llama 3.x models in August 2026; older guides recommending Llama are stale.

Candidate measures, per model, on the recorded live prompts: time to first token on the real system prompt; output tokens per second; first-try validation pass rate against the vendor catalog. Thinking off or low across the board so first-token times compare. A first-try failure costs a whole second generation, so a faster model with a higher failure rate can be slower on average.

Reaching a candidate: LiteLLM by provider prefix through ADK's `LiteLlm` wrapper; the model string is the only Gemini-specific thing in the kit's `modes.py`. The orchestrator's seam is `apps/orchestrator/src/planner/getModel.ts` on the Vercel AI SDK, not part of this phase.

### Sources

1. [Fastest LLMs, October 2026 — BenchLM](https://benchlm.ai/llm-speed)
2. [Fastest LLM Inference APIs in 2026: TTFT and Throughput Guide — Inworld](https://inworld.ai/resources/fastest-llm-inference-api)
3. [Best LLM for Voice Agents in 2026 — Layer3 Labs](https://www.layer3labs.io/guides/best-llm-for-voice-agents)
4. [2026 LLM API Latency Benchmarks: TTFT + Tokens/sec](https://www.kunalganglani.com/blog/llm-api-latency-benchmarks-2026)
5. [AI Inference Speed Comparison: Tokens Per Second by Provider — Deploybase](https://deploybase.ai/articles/ai-inference-speed-comparison-tokens-per-second-by-provider)
6. [Structured Outputs — Cerebras Inference docs](https://inference-docs.cerebras.ai/capabilities/structured-outputs)
7. [Tool Calling — Cerebras Inference docs](https://inference-docs.cerebras.ai/capabilities/tool-use)
8. [ChatGroq `with_structured_output` — LangChain reference](https://reference.langchain.com/python/langchain-groq/chat_models/ChatGroq/with_structured_output)
9. [Groq provider — promptfoo](https://www.promptfoo.dev/docs/providers/groq/)
10. [Groq provider catalog — OpenClaw docs](https://docs.openclaw.ai/providers/groq)
11. [Artificial Analysis model leaderboard](https://artificialanalysis.ai/leaderboards/models)
12. [LLM Leaderboard, October 2026 — ModelGrep](https://modelgrep.com/leaderboard)
13. [Fastest AI in 2026: Speed Benchmarks — fast.io](https://fast.io/resources/fastest-ai-2026/)
14. [Fastest LLM Inference Provider for AI Agents 2026 — OpenBenchmarks](https://openbenchmarks.com/inference/fastest-inference-provider-for-my-ai-agent)
15. [Groq changelog](https://console.groq.com/docs/changelog)

### Upstream threads on the same question

- [Discussion #2095](https://github.com/a2ui-project/a2ui/discussions/2095) — a UX designer asks what problems A2UI uniquely solves. The answer that formed: A2UI earns its place when agent and host are independently developed, the task UI cannot be enumerated ahead, and the host keeps control of security, accessibility and actions; "probably unnecessary for a product with a small, known set of workflows."
- [Discussion #3068](https://github.com/a2ui-project/a2ui/discussions/3068) — what A2UI adds when latency favors deterministic UI. The reply: the value is the contract, not rendering; compose the tree ahead, swap data at runtime.
- [Discussion #2779](https://github.com/a2ui-project/a2ui/discussions/2779) — deterministic recipes for frequent updates, a decision step for ambiguous requests, a catalog subset for composition. Names TypeSafe's Jev. No replies.
- [Discussion #1207](https://github.com/a2ui-project/a2ui/discussions/1207) — a maintainer's answer to slow, varying generation: custom catalogs for well-known requirements, or pre-made A2UI JSON retrieved by context.
- [Issue #657](https://github.com/a2ui-project/a2ui/issues/657) — template-based inference with a formalized template format, open, a candidate for the top priority tier.
- [Issue #1826](https://github.com/a2ui-project/a2ui/issues/1826) — "Gen UI is feeling less responsive than I hoped!", with the measurements in §1.
- Upstream's compact inference formats, on the `upstream/main` ref under `specification/proposals/`: Express (positional DSL, 55–70% fewer output tokens claimed), Elemental (HTML-like markup), Atom (S-expressions, a further 25–50% under Express, containers emitted before children). All target A2UI v1.0.

---

## 3. A2UI-unique prompts

Prompts whose answer spans independent apps and whose screen cannot be enumerated ahead. Built on the five agents' declared skills: Gmail — inbox triage, reading a conversation, drafting a reply, filing and labelling; Calendar — what is coming up, one event, putting something on the calendar, answering an invitation; GitHub — pull request triage, reading a pull request, composing a review, acting on GitHub; Linear — issues, an issue's detail, updating an issue, filing and commenting; CircleCI — pipeline status, a run's workflows and jobs, why a job failed, rerunning and canceling. A *control* is the single-app version a fixed screen answers.

### Relations no single app holds

1. **"Which of my open pull requests are blocked on something outside GitHub?"**
   Dispatch GitHub, Linear, CircleCI. One row per pull request, a column each for its CI outcome and its issue's state. Control: "show my open pull requests" in GitHub alone. Watch: the Synthesizer writes operators and match claims, not verdict words, so the blocker reads across the columns.
2. **"Is anything in my inbox about a pull request that's already merged?"**
   Dispatch Gmail, GitHub. Threads naming a pull request number joined to the pull request's state by a `contains` relation on the number. Watch: needs inbox content naming pull requests; the second deterministic Gmail account can be seeded.
3. **"What did I agree to in email that isn't on my calendar yet?"**
   Dispatch Gmail, Calendar. Commitments in mail as rows, the matching event or the empty cell beside each. The join is `judged`, so every match reads as guessed. The best test of the disclosure marks.

### A task spine across tools

4. **"Help me close out A2U-7: show the issue, its pull request and its CI run, and let me act on each."**
   Dispatch Linear, GitHub, CircleCI. The three fragments plus the joined row; the person moves the issue, merges, reruns, each inside its own fragment, the row re-pointing as fragments repaint. Also tests SPEC §7's fan-out rule: a command about one object naming three apps' parts. Each act is a vendor round trip: the latency showcase.
5. **From that canvas, after opening A2U-7's detail: "what else is tied to this?"**
   Planned from the viewed canvas through the Planner's this-canvas reader. Control: the same words on a fresh canvas.

### Two agents, one question

6. **"Is main green right now? Ask CircleCI and GitHub."**
   Dispatch CircleCI, GitHub. Both answers over the same commit, agreement or disagreement on the row. Scenario S3 in SPEC §3, listed and never proven. Watch: the Planner may fold the two into one source.

### Context around one thing

7. **"What's happening around my next meeting?"**
   Calendar as home under an anchored join hypothesis; Gmail for threads with its attendees; Linear or GitHub for anything its description names. Control: "what's my next meeting" in Calendar alone.

### Cross-app search and counting

8. **"Show me everything mentioning 'invoice' across my apps this month."**
   Every app with search. One attributed timeline sorted by time. Scenario S6. Watch: the backlog's time-format sort problem will surface.
9. **"How many things are waiting on me per app, and which is oldest?"**
   Every app. A summary row of counts and a minimum date, each computed by the runtime over the partitions, every count disclosing its source set.
10. **"Across both my Gmail accounts, which threads mention a Linear issue, and what state is it in?"**
    Gmail twice, Linear. Scenarios S5 and S2 at once.

### Running them

- Prompts 1, 4, 6 and 10 run on data this repository already has: the A2U issues, pull request #8, the CircleCI project.
- Prompts 2, 3 and 8 depend on inbox content; seeding the second deterministic Gmail account makes them repeatable.
- Record on every run: plan time (`plan.planMs`), each dispatch's settle time, dead air (`synthesis.deadAirMs`). These runs are the baseline the latency work is measured against.
