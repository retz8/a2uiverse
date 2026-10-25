import type {BeatFixture} from './beatFixtures';

/**
 * A beat's builds read against the registry it replays over (task-16.10 decision 2). The hub's
 * stamp names the build each paint is drawn in, as the registry held it when the beat was
 * recorded; a build the registry the replay runs over does not hold is taken as the build its table
 * names for the catalog — the stamp then names none for it, and the paint is drawn in the table's.
 * The recording itself is left as it is.
 */
export async function buildsAgainstRegistry(
  fixture: BeatFixture,
  holds: (catalogId: string, artifactId: string) => Promise<boolean>,
): Promise<BeatFixture> {
  const named = new Map<string, string>();
  for (const turn of fixture.turns) {
    for (const batch of turn.batches) {
      for (const [catalogId, artifactId] of Object.entries(batch.stamp?.builds ?? {})) {
        named.set(artifactId, catalogId);
      }
    }
  }
  const unheld = new Set<string>();
  for (const [artifactId, catalogId] of named) {
    if (!(await holds(catalogId, artifactId))) unheld.add(artifactId);
  }
  if (unheld.size === 0) return fixture;
  return {
    ...fixture,
    turns: fixture.turns.map(turn => ({
      ...turn,
      batches: turn.batches.map(batch => {
        const builds = batch.stamp?.builds;
        if (!builds || !Object.values(builds).some(id => unheld.has(id))) return batch;
        const kept = Object.entries(builds).filter(([, id]) => !unheld.has(id));
        const {builds: _recorded, ...stamp} = batch.stamp!;
        return {
          ...batch,
          stamp: kept.length > 0 ? {...stamp, builds: Object.fromEntries(kept)} : stamp,
        };
      }),
    })),
  };
}
