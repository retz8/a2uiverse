/** The beats the recorder drives; prompts verbatim from `a2ui-github/agent/scripts/record_beats.py`. */
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
  {beat: 2, slug: 'pr-detail', title: 'PR detail', prompt: 'Open a2ui-project/a2ui#2123.'},
  {
    beat: 3,
    slug: 'review-compose',
    title: 'Compose-and-confirm review',
    prompt: 'Draft an approving review saying the spec doc looks reasonable.',
    chains: true,
  },
];
