# @a2uiverse/embedder

The one embedding model the platform ranks with. The orchestrator's Router ranks installed apps against a question with it, the IntentJournal embeds each turn's descriptor with it, and the marketplace's index embeds every published card with it and answers its search route with it — so a question ranks the same against the local registry and the marketplace's index. Private to the monorepo; the orchestrator and the marketplace depend on it through the workspace.

## What's in it

- **`Embedder`** — the seam: texts in, unit-normalized vectors out, one call batching many texts.
- **`TransformersEmbedder`** — the production embedder: quantized MiniLM (`Xenova/all-MiniLM-L6-v2`, `q8`) over transformers.js, in-process, no API key. The pipeline loads lazily, so importing the package never touches onnxruntime; the first-boot model download is cached under the directory the process passes, its own state directory, and later boots are offline.
- **`corpusDoc`** — the one document an agent card is embedded as: its name, description and every skill's name, description, tags and examples, one line each. The Router and the marketplace both embed cards through it.
- **`cosine`** and **`rank`** — cosine over unit vectors, and the one ranking both processes use: every candidate scored against the query, highest first, ties in the candidates' order. The Router's shortlist cap and its keep rule sit on top of `rank`; the marketplace's search returns it as is.
- **`FakeEmbedder`** — the deterministic, dependency-free embedder both processes' tests rank with: hashed bag-of-words into a unit vector, so texts sharing tokens score higher. Records every call.

## Commands

```bash
pnpm --filter @a2uiverse/embedder build | typecheck | test | lint
A2UIVERSE_EMBEDDER_LIVE=1 pnpm --filter @a2uiverse/embedder test embedder.live   # the real model, ~23 MB on first run
```

The tests run with no model and no network. The live test downloads the model into a temporary cache and is skipped unless asked for.

## Using it

```ts
import {TransformersEmbedder, corpusDoc, rank} from '@a2uiverse/embedder';

const embedder = new TransformersEmbedder({cacheDir: join(stateDir, 'models')});
const [vector] = await embedder.embed([corpusDoc(card)]);
const [query] = await embedder.embed(['unread mail from today']);
const ranked = rank(query, [{card, vector}]); // [{card, vector, score}], highest first
```

How the Router uses it is in [`docs/design/orchestrator.md`](../../docs/design/orchestrator.md); the marketplace's index is in `docs/design/marketplace.md` once Phase 13 lands it.
