import type {A2uiClientAction} from '@a2ui/web_core/v0_9';

/**
 * A short human phrase for an action, for the loading indicator — e.g.
 * `{name: 'open-issue', context: {number: 117}}` → "open issue #117".
 *
 * Best-effort and client-only: the action name is humanized and the first scalar
 * context value is appended (numbers as `#n`, strings verbatim). Non-scalar context
 * values are skipped, and a fully empty action yields "" (the caller falls back to a
 * generic label). The agent chooses the name and context keys, so this echoes them —
 * a polished domain label would be supplied by the agent in the action context.
 */
export function describeAction(action: A2uiClientAction): string {
  const name = humanize(action?.name ?? '');
  const id = firstScalarId(action?.context);
  return [name, id].filter(Boolean).join(' ');
}

function humanize(name: string): string {
  return name.split(/[-_]+/).filter(Boolean).join(' ');
}

function firstScalarId(context: Record<string, unknown> | undefined): string {
  for (const value of Object.values(context ?? {})) {
    if (typeof value === 'number') return `#${value}`;
    if (typeof value === 'string' && value) return value;
  }
  return '';
}
