# 18.5.3 — The Store's sample from a streamed paint

The Publish listing of `restaurant-finder` read "This sample couldn't be shown" on both tries of the dry run: the marketplace's smoke test keeps the finder's stream chunk by chunk, a Button's action context arriving as `{}` in one `updateComponents` and whole in the next, and the client's sample frame fails the whole sample when any message of the captured preview fails validation. Sub-task 18.5.3 of Phase 18 (`_dev/docs/spec/phase-18-ecosystem-run.md`, decision 10); found in 18.4.

## Scope

- What a captured preview stores.
- The sdk's paint check, which already judges a stream in its settled form.
- The marketplace's two capture paths and Stellify's `preview`.
- The publish stage of the dry run, repeated live.
- The marketplace record and Stellify's `preview` section.
- Out: the client's sample frame; the canvas's own handling of a streamed partial; SPEC and the delta register, which stay as written; the sample itself.

## Locked decisions

### 1. The fix lives at capture

A preview stores the settled paint, the form the sdk's check judges: every `updateComponents` collapsed into one update carrying each component's last copy, drawn from the root, every other message as sent. The preview is the picture of the answer as it ended, not a replay of the stream. The client's sample frame stays a plain renderer, unchanged.

### 2. The check hands back what it judged

The sdk's paint check returns the settled paint beside its findings, and every caller stores that: the marketplace on both paths, the paint it captured itself and a preview handed for a sign-in app, and Stellify's `preview` in the file it writes. A handed preview is settled on receipt as well, so a file from an older Stellify is stored settled too. Nothing stored was ever unjudged.

### 3. The repeat is the publish stage

The dry run's repeat is its publish stage alone, live on the real marketplace as 18.4 ran it: the claim, the publish of the Node restaurant finder from its card URL, the listing's sample painting on Publish and on the Store page, the seven apps' samples still painting, then 18.4's reset, the publisher's record removed from the ledger and the marketplace started again holding seven. The 18.5.3 line records the stage as the repeat, narrowing phase decision 10's "the dry run repeated" on the record, after 18.5.1's and 18.5.2's precedent.

### 4. The records

SPEC §9.1 says the smoke test's paint is kept as the listing's live preview, which stays true; SPEC is unchanged and nothing enters the delta register. The marketplace record's smoke and preview sections and Stellify's `preview` section are rewritten in the same session to say what is stored.

## Invariants

- The sample is never changed.
- The client's sample frame and the canvas's handling of a streamed partial are untouched.
- The seven apps' stored previews are whole paints, which settling leaves as they are.
