import type {CSSProperties} from 'react';
import {CheckIcon, ClockIcon, MagnifyingGlassIcon} from '@radix-ui/react-icons';
import {Button, Callout, Flex, Spinner, Text} from '@radix-ui/themes';
import {refusalOf} from '@a2uiverse/sdk';
import type {AppActKind, AppActState} from '../../app-act.js';
import type {PressRecord} from '../../press-state.js';
import {AlertGlyph, Dot, LinkButton} from '../shared/quiet-line.js';
import {LOST_WORDS, UNREACHED_WORDS} from './press-lines.js';
import type {OfferNoneCause, SlotInstalled, SlotOfferedApp} from './slot.schema.js';

/**
 * The offer's fixed line (task-15.3 decision 2); its second half alone once an app it offered is
 * installed (task-15.11 decision 32), and on an offer asking nothing of its apps (decision 36).
 */
export const OFFER_LEAD = 'None of your apps can do this. From the Store:';
export const OFFER_LEAD_SHORT = 'From the Store:';

/** The two lines with nothing to offer (phase-15 decision 6), by the cause the orchestrator recorded. */
export const NOTHING_WORDS: Record<OfferNoneCause, string> = {
  nothing: 'Nothing in the Store can do this yet.',
  unreached: 'Couldn’t reach the Store.',
};

/**
 * Where an offered app's row stands, read from the slot's facts and the host's. `busy` is an
 * install or update of the app under way elsewhere: the row's press is held (task-15.9 decision 1).
 */
export type OfferRow =
  /** Its request sent, the offer kept until the answer: Installed with Loading…. */
  | {kind: 'filling'}
  | {kind: 'installing'}
  /** Installed elsewhere, or here with its fill press not through: Show it here. */
  | {kind: 'show'; note?: string; busy?: true}
  | {kind: 'refused'; refusal: ReturnType<typeof refusalOf>; busy?: true}
  | {kind: 'install'; busy?: true};

/**
 * Each offered app's row (task-15.3 decisions 8–11): the app installed in this slot, its request
 * sent — painted on the slot the offer became, or its fill press on its way — reads Installed with
 * Loading…; the app installing reads Installing; an app the host holds installed reads Show it
 * here, saying so when its fill press never reached or its stream broke; a refused install says why
 * in the Store's words. `held` is true while one row asks — its entry read again, its consent card
 * open — installs or fills: every other row waits (task-15.9 decision 7). A row whose app is busy
 * elsewhere holds its own press (decision 1).
 */
export function offerRows(
  gap: string,
  apps: readonly SlotOfferedApp[],
  {filling, acts, presses}: {filling?: string; acts: AppActState; presses: readonly PressRecord[]},
): {rows: OfferRow[]; held: boolean} {
  const fill = (appId: string) =>
    presses.find(
      press =>
        press.operation.kind === 'useApp' &&
        press.operation.gap === gap &&
        press.operation.sources[0] === appId,
    )?.status;
  const filled = filling ?? apps.find(app => fill(app.appId) === 'sent')?.appId;
  const act = acts.act({gap});
  const rows = apps.map((app): OfferRow => {
    if (app.appId === filled) return {kind: 'filling'};
    if (act?.appId === app.appId && act.status === 'running') return {kind: 'installing'};
    const busy = acts.busy(app.appId) ? {busy: true as const} : {};
    if (acts.installed(app.appId) !== undefined) {
      const status = fill(app.appId);
      const note =
        status === 'unreached' ? UNREACHED_WORDS : status === 'lost' ? LOST_WORDS : undefined;
      return note ? {kind: 'show', note, ...busy} : {kind: 'show', ...busy};
    }
    if (act?.appId === app.appId && act.status === 'refused') {
      return {kind: 'refused', refusal: refusalOf(act.cause, app.name, 'install'), ...busy};
    }
    return {kind: 'install', ...busy};
  });
  const held = filled !== undefined || act?.status === 'running' || act?.status === 'asking';
  return {rows, held};
}

/**
 * The offer (phase-15 decision 1, the design canvas's O1–O7): the fixed line, then every app the
 * plan offered as a row in the Store's result-row style — its letter, its name opening its view in
 * the Store, its publisher, its description held to two lines, and its press — in the Planner's
 * order, set apart by hairlines, no box; More in the Store beneath, opening the Store on the gap's
 * words. Without a host that takes app presses, no row draws a press.
 */
export function OfferView({
  gap,
  apps,
  rows,
  held,
  enabled,
  asksNothing,
  onAppAct,
  onOpenStore,
}: {
  gap: string;
  apps: readonly SlotOfferedApp[];
  rows: readonly OfferRow[];
  held: boolean;
  enabled: boolean;
  asksNothing?: boolean;
  onAppAct?: (kind: AppActKind, appId: string, anchor: HTMLElement) => void;
  onOpenStore?: (open: {query?: string; app?: string}) => void;
}) {
  const pressable = enabled && !held;
  const installed = rows.some(row => row.kind === 'show' || row.kind === 'filling');
  return (
    <Flex direction="column" gap="3" style={{minWidth: 0}}>
      <Text as="p" size="2">
        {installed || asksNothing ? OFFER_LEAD_SHORT : OFFER_LEAD}
      </Text>
      <ul style={listStyle}>
        {apps.map((app, index) => {
          const row = rows[index]!;
          return (
            <li key={app.appId} data-offer-app={app.appId} style={rowStyle}>
              <span aria-hidden style={tileStyle}>
                {tileLetter(app.name)}
              </span>
              <Flex direction="column" gap="1" style={{minWidth: 0}}>
                <Flex align="baseline" gap="2" style={{minWidth: 0, whiteSpace: 'nowrap'}}>
                  <LinkButton ink onClick={() => onOpenStore?.({app: app.appId})}>
                    {app.name}
                  </LinkButton>
                  <Text size="1" color="gray">
                    by {app.publisher}
                  </Text>
                </Flex>
                <Text size="1" color="gray" style={descriptionStyle}>
                  {app.description}
                </Text>
              </Flex>
              <Flex align="center" gap="3" style={{flex: 'none'}}>
                <RowEnd
                  row={row}
                  enabled={enabled}
                  pressable={pressable}
                  onPress={onAppAct && ((kind, anchor) => onAppAct(kind, app.appId, anchor))}
                />
              </Flex>
              {row.kind === 'refused' && (
                <div style={{gridColumn: '2 / -1'}}>
                  <Callout.Root
                    size="1"
                    variant="soft"
                    color={row.refusal.tone === 'warn' ? 'amber' : 'red'}
                    role="alert"
                  >
                    <Callout.Icon>
                      {row.refusal.tone === 'warn' ? <ClockIcon /> : <AlertGlyph />}
                    </Callout.Icon>
                    <Callout.Text>
                      <b>{row.refusal.lead}</b> {row.refusal.rest}
                    </Callout.Text>
                  </Callout.Root>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Flex>
        <LinkButton onClick={() => onOpenStore?.({query: gap})}>
          <MagnifyingGlassIcon aria-hidden />
          More in the Store
        </LinkButton>
      </Flex>
    </Flex>
  );
}

/** A row's end: its press, or where the press stands. */
function RowEnd({
  row,
  enabled,
  pressable,
  onPress,
}: {
  row: OfferRow;
  enabled: boolean;
  pressable: boolean;
  onPress?: (kind: AppActKind, anchor: HTMLElement) => void;
}) {
  switch (row.kind) {
    case 'filling':
      return (
        <>
          <Installed words="Installed" />
          <Loading />
        </>
      );
    case 'installing':
      return onPress ? (
        <Button size="1" variant="soft" disabled>
          <Spinner size="1" />
          Installing
        </Button>
      ) : null;
    case 'show':
      return (
        <>
          {row.note && (
            <Text size="1" color="gray" data-slot-press-note="">
              {row.note}
            </Text>
          )}
          <Installed words="Installed" />
          {onPress && (
            <Button
              size="1"
              variant="soft"
              disabled={!pressable || row.busy}
              onClick={event => onPress('show', event.currentTarget)}
            >
              Show it here
            </Button>
          )}
        </>
      );
    case 'refused':
      if (!onPress) return null;
      // The Store's own press for the cause (task-15.3 decision 10): Install again, Try again, or
      // Install held for checks that will fail the same way.
      return (
        <Button
          size="1"
          variant="soft"
          disabled={!enabled || row.busy || row.refusal.press === 'none'}
          onClick={event => onPress('install', event.currentTarget)}
        >
          {row.refusal.press === 'retry' ? 'Try again' : 'Install'}
        </Button>
      );
    case 'install':
      return onPress ? (
        <Button
          size="1"
          variant="soft"
          disabled={!pressable || row.busy}
          onClick={event => onPress('install', event.currentTarget)}
        >
          Install
        </Button>
      ) : null;
  }
}

/** Installed or Updated, with a tick, in the quiet green the Store uses. */
export function Installed({words}: {words: string}) {
  return (
    <Text size="1" color="green" style={stateStyle}>
      <CheckIcon aria-hidden />
      {words}
    </Text>
  );
}

/** Loading…, quiet, while the request sent waits on its answer. */
export function Loading() {
  return (
    <Text size="1" color="gray" style={{...stateStyle, opacity: 0.6}}>
      <Spinner size="1" />
      Loading…
    </Text>
  );
}

/**
 * The two lines with nothing to offer (task-15.3 decision 14): the sign-in's quiet-line form, a
 * magnifying glass in the lock's place, the shell's sentence, a dot, then Search the Store on the
 * gap's words.
 */
export function NothingLine({none, onSearch}: {none: OfferNoneCause; onSearch?: () => void}) {
  return (
    <Flex align="center" gap="2" wrap="wrap" style={{minHeight: 28}}>
      <MagnifyingGlassIcon aria-hidden style={{color: 'var(--gray-10)'}} />
      <Text size="2" color="gray">
        {NOTHING_WORDS[none]}
      </Text>
      <Dot />
      <LinkButton onClick={() => onSearch?.()}>Search the Store</LinkButton>
    </Flex>
  );
}

/**
 * The install ask's installed line (task-15.3 decision 18, task-15.8 decision 5): a tick and, in
 * ink, the app installed and one of its own example questions as plain text — or, with none, an
 * invitation to ask it something. No marker, no press.
 */
export function installedWords({name, example}: SlotInstalled): string {
  return example === undefined
    ? `${name} is installed. Ask it something.`
    : `${name} is installed. Try asking “${example}”`;
}

export function InstalledLine({installed}: {installed: SlotInstalled}) {
  return (
    <Flex align="start" gap="2">
      <CheckIcon aria-hidden style={{flex: 'none', marginTop: 4, color: 'var(--green-11)'}} />
      <Text size="2">{installedWords(installed)}</Text>
    </Flex>
  );
}

/** The app's tile: the first letter of its name, as the Store's rows draw it (task-14.7 decision 9). */
function tileLetter(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  borderTop: '1px solid var(--gray-a3)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr) auto',
  columnGap: 14,
  rowGap: 10,
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid var(--gray-a3)',
};

const tileStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'var(--gray-a3)',
  color: 'var(--gray-11)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 600,
  flex: 'none',
};

const descriptionStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: '18px',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const stateStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  whiteSpace: 'nowrap',
  // Inline beside a sentence on the update tile, centred on its line rather than on the glyph's foot.
  verticalAlign: 'middle',
};
