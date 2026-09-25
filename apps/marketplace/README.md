# @a2uiverse/marketplace

Where A2UIVerse apps will be published and found. The marketplace will keep an index of every published app's agent card, so a question can be matched to an app the user hasn't installed yet; host each app's packages; run the publish step; and try a new app by rendering its first surface before it's listed. The Store page in the client will browse it.

**Not built yet.** Today the process prints its name and exits. Its port, **10002**, is reserved for it.

## Commands

```bash
pnpm dev:marketplace                                            # from the repo root
pnpm --filter @a2uiverse/marketplace build | typecheck | test | lint
```
