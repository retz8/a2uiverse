import type {CSSProperties, ReactNode} from 'react';
import {ClockIcon} from '@radix-ui/react-icons';
import {Flex, Spinner, Text} from '@radix-ui/themes';
import {refusalOf} from '@a2uiverse/sdk';
import type {AppActKind, AppActState} from '../../app-act.js';
import type {PressStatus} from '../../press-state.js';
import type {UpdateSlotState} from '../../slot-state.js';
import {AlertGlyph, dotStyle, LinkButton, UpdateGlyph} from '../shared/quiet-line.js';
import {Installed, Loading} from './offer.js';
import {LOST_WORDS, UNREACHED_WORDS} from './press-lines.js';
import {updateLineOf, type SlotUpdate, type UpdateLine} from './slot.schema.js';

/** The slot state a column and the progress line read for an update tile, by its line. */
const SLOT_STATES: Record<UpdateLine, UpdateSlotState> = {
  update: 'update',
  waiting: 'update-waiting',
  unreached: 'update-unreached',
  none: 'update-none',
};

/** The source slot state an update tile is, by the line its update state draws (task-15.8 decision 4). */
export function updateSlotState(update: Pick<SlotUpdate, 'state'>): UpdateSlotState {
  return SLOT_STATES[updateLineOf(update.state)];
}

/**
 * The line's short form (task-15.8 decision 4): the reserved column's and the progress line's
 * words, and the line's accessible name after the app's.
 */
export const UPDATE_SHORT_WORDS: Record<UpdateLine, string> = {
  update: 'needs an update',
  waiting: 'waiting on its publisher',
  unreached: 'couldn’t check for updates',
  none: 'no update available',
};

/** The update tile's sentence (task-15.5 decision 6), in the shell's words, by its line. */
export function updateSentence(app: string, update: SlotUpdate): string {
  switch (updateLineOf(update.state)) {
    case 'update':
      return `${app} needs an update to show this.`;
    case 'waiting':
      return `${app} has changed, and the Store is waiting on its publisher, ${update.publisher}.`;
    case 'unreached':
      return `${app} has changed, and the Store couldn’t be reached.`;
    case 'none':
      return `${app} has changed, and the Store has no update for it.`;
  }
}

/** Where the line's end stands, read from the slot's facts and the host's. */
export type UpdateEnd =
  | {kind: 'updating'}
  | {kind: 'refused'; refusal: ReturnType<typeof refusalOf>}
  /** Updated — here or elsewhere — and waiting on the answer, or Show it here. */
  | {kind: 'updated'; loading: boolean}
  | {kind: 'loading'}
  /** The line's own press: Update, Retry, or none. */
  | {kind: 'press'; note?: string};

/**
 * The line's end (task-15.3 decision 16, task-15.5 decision 8): Updating while the update runs; a
 * refused update in the Store's words; Updated once the host holds the app at a version past the
 * one the line was drawn from — with Loading… while its request goes again, else Show it here;
 * Loading… in the press's place while a Retry runs; else the line's own press, saying so when a
 * resend never reached or its stream broke. `waiting` is the slot's pending repaint after the
 * resend, the line kept until the answer (task-15.8 decision 2).
 */
export function updateEnd(
  appId: string,
  source: string,
  update: SlotUpdate,
  {
    acts,
    retry,
    waiting,
    app,
  }: {acts: AppActState; retry?: PressStatus; waiting: boolean; app: string},
): UpdateEnd {
  const act = acts.act({source});
  if (act?.appId === appId && act.status === 'running') return {kind: 'updating'};
  if (act?.appId === appId && act.status === 'refused') {
    return {kind: 'refused', refusal: refusalOf(act.cause, app, 'update')};
  }
  const loading = waiting || retry === 'sent';
  const held = acts.installed(appId);
  if (held !== undefined && held !== update.installedVersion) return {kind: 'updated', loading};
  if (loading) return {kind: 'loading'};
  const note = retry === 'unreached' ? UNREACHED_WORDS : retry === 'lost' ? LOST_WORDS : undefined;
  return note ? {kind: 'press', note} : {kind: 'press'};
}

/**
 * The update tile (phase-15 decision 11, the design canvas's U1–U6): always one line at the quiet
 * line's size under the app's marker — the glyph, the sentence in the shell's words, a dot, then
 * its press: Update when the Store has an update, Retry when the Store could not be reached, none
 * while the Store waits on the publisher or has no update. A refused update takes the line in the
 * Store's words, with the Store's press. Without a host that takes app presses, no Update or Show it
 * here; without one that takes presses, no Retry.
 */
export function UpdateTile({
  app,
  update,
  end,
  enabled,
  onAppAct,
  onRetry,
}: {
  app: string;
  update: SlotUpdate;
  end: UpdateEnd;
  enabled: boolean;
  onAppAct?: (kind: AppActKind, anchor: HTMLElement) => void;
  onRetry?: (button: HTMLElement) => void;
}) {
  const line = updateLineOf(update.state);
  const label = `${app}, ${UPDATE_SHORT_WORDS[line]}`;
  // One block of text beside the glyph, the press inline at its end, so a sentence that wraps in a
  // narrow slot keeps its press with it (the design canvas's U4).
  const row = (glyph: ReactNode, text: ReactNode, refused?: boolean) => (
    <Flex
      role="group"
      aria-label={label}
      align="start"
      gap="2"
      data-update-line={line}
      {...(refused ? {'data-update-refused': ''} : {})}
      style={{minHeight: 28, paddingBlock: 4}}
    >
      <span style={glyphStyle}>{glyph}</span>
      <span style={textBlockStyle}>{text}</span>
    </Flex>
  );
  if (end.kind === 'refused') {
    const {refusal} = end;
    const press =
      refusal.press === 'none' || !onAppAct
        ? undefined
        : refusal.press === 'retry'
          ? 'Try again'
          : 'Update';
    return row(
      refusal.tone === 'warn' ? <ClockIcon aria-hidden /> : <AlertGlyph />,
      <>
        <Text size="2" color="gray">
          <b>{refusal.lead}</b> {refusal.rest}
        </Text>
        {press && (
          <>
            <InlineDot />
            <LinkButton disabled={!enabled} onClick={button => onAppAct!('update', button)}>
              {press}
            </LinkButton>
          </>
        )}
      </>,
      true,
    );
  }
  const press =
    end.kind === 'press'
      ? line === 'update' && onAppAct
        ? {words: 'Update', act: (button: HTMLElement) => onAppAct('update', button)}
        : line === 'unreached' && onRetry
          ? {words: 'Retry', act: onRetry}
          : undefined
      : undefined;
  const after = end.kind !== 'press' || press !== undefined;
  return row(
    <UpdateGlyph />,
    <>
      <Text size="2" color="gray">
        {updateSentence(app, update)}
      </Text>
      {after && <InlineDot />}
      {end.kind === 'updating' && (
        <Text size="2" color="gray" style={inlineStateStyle}>
          <Spinner size="1" />
          Updating
        </Text>
      )}
      {end.kind === 'updated' && (
        <>
          <span style={{marginRight: 8}}>
            <Installed words="Updated" />
          </span>
          {end.loading ? (
            <Loading />
          ) : (
            onAppAct && (
              <LinkButton disabled={!enabled} onClick={button => onAppAct('show', button)}>
                Show it here
              </LinkButton>
            )
          )}
        </>
      )}
      {end.kind === 'loading' && <Loading />}
      {press && (
        <LinkButton disabled={!enabled} onClick={press.act}>
          {press.words}
        </LinkButton>
      )}
      {end.kind === 'press' && end.note && (
        <Text size="1" color="gray" data-slot-press-note="" style={{marginLeft: 8}}>
          {end.note}
        </Text>
      )}
    </>,
  );
}

/** The quiet line's dot, inline in a block of text. */
function InlineDot() {
  return (
    <span
      aria-hidden
      style={{...dotStyle, display: 'inline-block', verticalAlign: 'middle', margin: '0 8px'}}
    />
  );
}

const glyphStyle: CSSProperties = {
  display: 'inline-flex',
  flex: 'none',
  marginTop: 3,
  color: 'var(--gray-10)',
};

/** The line's text: the sentence and its press, inline, wrapping together in a narrow slot. */
const textBlockStyle: CSSProperties = {
  minWidth: 0,
  fontSize: 'var(--font-size-2)',
  lineHeight: 'var(--line-height-2)',
};

const inlineStateStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  verticalAlign: 'middle',
};
