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
    // The composed beat: it names no source, so the Router has to earn the fan-out. A prompt
    // that listed the three apps would let a broken Router still look right.
    beat: 4,
    slug: 'composed-morning',
    title: 'Composed fan-out',
    prompt: 'What needs my attention this morning?',
  },
];
