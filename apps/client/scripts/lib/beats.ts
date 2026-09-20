/**
 * The beats the recorder drives. Beats 1–3 come from
 * `a2ui-github/agent/scripts/record_beats.py`, with one change: beat 2 opens #233 — the head of
 * the stub backend's PR list — where the source opens live GitHub's #2123, which the stub does
 * not carry. Every beat is recorded through the composing hub, so 1–3 are one-slot composed
 * turns rather than the bare relays their pre-composition recordings captured.
 */
export interface BeatSpec {
  beat: number;
  slug: string;
  title: string;
  prompt: string;
  /** Sent inside the previous beat's conversation. */
  chains?: boolean;
}

export const BEATS: BeatSpec[] = [
  {
    beat: 1,
    slug: 'pr-list',
    title: 'PR list',
    prompt: 'Show me the open pull requests on a2ui-project/a2ui that need review.',
  },
  {beat: 2, slug: 'pr-detail', title: 'PR detail', prompt: 'Open a2ui-project/a2ui#233.'},
  {
    beat: 3,
    slug: 'review-compose',
    title: 'Compose-and-confirm review',
    prompt: 'Draft an approving review saying the spec doc looks reasonable.',
    chains: true,
  },
  {
    // The layout-only fan-out (task 6.6 decision 7): 5.7's control prompt, on which the Planner
    // reserves no merged view and lays the two slots on one row.
    beat: 4,
    slug: 'side-by-side',
    title: 'Side by side',
    prompt: 'Put my inbox and my calendar side by side.',
  },
  {
    // The temporal merge (task 5.7 decision 11): the utterance 5.6 recorded, on which the
    // Planner reserves the merged view unprompted. The synthesis payload rides the batch.
    beat: 5,
    slug: 'temporal-merge',
    title: 'Temporal merge',
    prompt: 'What needs my attention today?',
  },
  {
    // A platform answer (phase-6 decisions 2, 8): the platform's card wins the shortlist, the
    // Planner calls the installed-apps reader and answers in `shell:main` from a data model of
    // literals. No vendor is dispatched.
    beat: 6,
    slug: 'platform-answer',
    title: 'Platform answer',
    prompt: 'What apps do I have?',
  },
  {
    // A capability gap (phase-6 decision 6): nothing installed serves it, so the Planner names
    // the gap and places its slot; the catalog draws the tile.
    beat: 7,
    slug: 'capability-gap',
    title: 'Capability gap',
    prompt: 'Book me a flight to Tokyo next Friday.',
  },
  {
    // A mixed utterance (task 6.6 decision 8): one vendor dispatched and the shell's own words
    // in the same layout.
    beat: 8,
    slug: 'mixed-calendar',
    title: 'Mixed utterance',
    prompt: 'What can I do with my calendar?',
  },
  {
    // The entity join (task 7.9 decision 7): the phase's pinned utterance over Linear, GitHub and
    // CircleCI, the merged view with its match claims riding the batch that paints it.
    beat: 9,
    slug: 'entity-join',
    title: 'Entity join',
    prompt: "what's the status of what I'm working on?",
  },
];
