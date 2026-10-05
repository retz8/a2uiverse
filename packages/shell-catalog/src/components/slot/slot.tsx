import {useContext, useRef, type CSSProperties, type MutableRefObject} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {CheckIcon, ExternalLinkIcon, LockClosedIcon, UpdateIcon} from '@radix-ui/react-icons';
import {Button, Flex, Link, Spinner, Table, Text} from '@radix-ui/themes';
import {parseSourceId, type CompositionOperation} from '@a2uiverse/sdk';
import type {ShellActionHandler} from '../../functions/shell-actions.js';
import type {AppDisplayName} from '../derived-value/join.js';
import {PressStateContext} from '../../press-state.js';
import {SignInContext, type SignInHandler} from '../../sign-in.js';
import {SlotContentContext} from '../../slot-content.js';
import {SlotStateContext} from '../../slot-state.js';
import {weightStyle} from '../shared/layout.js';
import {SkeletonBar} from '../shared/skeleton.js';
import {
  bodyCellStyle,
  ColumnHeading,
  headingCellStyle,
  reservedColumnState,
} from '../table/table.js';
import {
  collapsedLines,
  landedLines,
  LOST_WORDS,
  retryStatus,
  UNREACHED_WORDS,
  type PressLine,
} from './press-lines.js';
import {
  SlotApi,
  type SlotAuthority,
  type SlotCollapse,
  type SlotFailure,
  type SlotProps,
} from './slot.schema.js';

/**
 * What the host does when the reader presses Retry, Include or Try again (task-8.5 decision 5):
 * the composition operation as the wire carries it, and where it was raised.
 */
export type PressHandler = (press: {
  operation: CompositionOperation;
  surfaceId: string;
  componentId: string;
}) => void;

/**
 * Host-resolved content wins whenever the state allows it: `failed` renders the
 * failure panel even if stale content exists, and otherwise content fills the
 * slot the moment the resolver returns it.
 *
 * `collapsed` means the source contributed no surface. It renders nothing *only
 * if the host has nothing to rest it on* — a source that answered in prose
 * rather than in UI still occupied a slot, and letting that slot vanish while
 * its attribution stays would leave a label naming nothing. The host decides
 * what the resting state is; the slot only decides that there may be one. A
 * collapsed merge is the exception: the shell slot collapses to one line at the 24px row where
 * the merged view's label would have sat, the skeleton's height given back — the Synthesizer's
 * words for a decline (task-8.2 decision 9), the shell's own for every other cause (task-8.3
 * decision 9).
 *
 * A failed fragment slot is the failure tile (task 8.2, the design canvas's F6, as task-8.7
 * decision 17 pared it): one statement at body size — the vendor's own words when it spoke, else
 * the shell's reason for the painted cause, neither naming the source, since the attribution
 * marker above already does; then Retry, under a host that takes presses, for every cause but a
 * paint refused outside the app's catalogs (task-11.5 decision 9). No box, the reserved
 * floor, one face throughout. The plan's noun for the source stays a painted prop; the tile no
 * longer says it.
 *
 * The reader's presses (task 8.5): Retry gives the tile way to the pending line the moment it is
 * pressed; over a landed merged view a row of the shell's own, above the view's label row, carries
 * the working sentence, "couldn't be updated" with Try again, and the late sources with Include; a
 * collapsed merge's line becomes the working or waiting sentence, "couldn't be made" carries Try
 * again, and a decline's line gains the late sources with Include beneath it. The words are
 * composed here from the painted facts and the presses the host holds; a press that never reached
 * the orchestrator, or whose stream broke, is said in place.
 *
 * Shell content (task-5.5 decisions 1, 3) is the shell writing on its own page: no tile, and a
 * failure is a quiet line. While pending it is the merged view reserved at its size (task-7.15):
 * a bar where its label will be, the planned column headers, and four skeleton rows, drawn in the
 * table's own geometry. The skeleton only says a table will land here; the landed view takes its
 * own height.
 *
 * While pending or failed a fragment slot holds the space it reserved and draws nothing around it
 * (task-7.9 decision 23).
 *
 * A slot that needs sign-in is the authority tile (SPEC §8, task 12.3), the consent itself: what
 * the app will be able to do in the words of its card, one Sign in, and that it opens the app's
 * sign-in in a new window — or "sign in again" when the silent refresh failed, or "not supported
 * here" with Manage apps. After the first full tile for an app this session it is one quiet line,
 * "Not signed in · Sign in", under the marker that names the app (decision 11). While the host
 * says a sign-in window is open for the source, the tile or the line says to finish there, with
 * Cancel, in place (decision 3); a Retry sent once sign-in completes draws the pending line, as
 * the failure tile's does (decision 10). A paint refused for a credential field is a failure tile
 * with Continue on the app, opening its own page, and no Retry (decision 7).
 *
 * A slot holding a `gap` is the capability tile (task-6.2 decision 6): fixed shell UI, no model
 * wording — a minimal line and a button searching the Store for the missing capability, the gap.
 *
 * `weight` is the region's flex share inside a `Row` or `Column`, proportional among its
 * siblings and 1 when the Planner wrote none (task-6.4 decision 2): unweighted regions share
 * their axis equally, and a wrapped slot fills the `Attribution` box that carries its weight.
 */
export function SlotView({
  source,
  gap,
  weight,
  state = 'pending',
  label,
  failure,
  authority,
  content = 'fragment',
  columns,
  columnSources,
  join,
  declined,
  collapse,
  late,
  working,
  callFailed,
  retrying,
  onSearchStore,
  onPress,
  onSignIn,
  onOpenAppLibrary,
  nameOf = appId => appId,
}: SlotProps & {
  onSearchStore?: (query: string | undefined) => void;
  /** The reader's press, as the operation the wire carries; without it no press button is drawn. */
  onPress?: (operation: CompositionOperation) => void;
  /** Start or cancel this slot's sign-in, inside the click; without it no Sign in is drawn. */
  onSignIn?: (kind: 'start' | 'cancel') => void;
  /** Manage apps on the "not supported here" tile: opens the App Library. */
  onOpenAppLibrary?: () => void;
  /** The host's display name for a source; the source itself without one. */
  nameOf?: (source: string) => string;
}) {
  const resolve = useContext(SlotContentContext);
  const resolveState = useContext(SlotStateContext);
  const signingIn = useContext(SignInContext);
  const {enabled, presses} = useContext(PressStateContext);
  // Set by a press whose button held focus: the line that replaces the button takes it (task-8.5
  // decision 15), so a keyboard reader's place is not dropped to the page.
  const focusLine = useRef(false);
  const shell = content === 'shell';
  const weighted = weightStyle(weight ?? 1);
  const press = (operation: CompositionOperation, button: HTMLElement) => {
    if (button.ownerDocument.activeElement === button) focusLine.current = true;
    onPress?.(operation);
  };
  const home = join?.home ?? undefined;
  // The merge's sources that need sign-in, as the host's slot states say (task-12.3 decision 8).
  const signIn = shell
    ? [...(home === undefined ? [] : [home]), ...(collapse?.failed ?? [])].filter(
        s => resolveState(s) === 'authority',
      )
    : [];
  const facts = {
    home,
    late,
    working,
    callFailed,
    retrying,
    declined,
    collapse,
    signIn,
  };
  const retry = source === undefined || shell ? undefined : retryStatus(presses, source);

  // The outcomes the progress line does not say, spoken politely from the slot; the region stands
  // across the slot's states so a change of words inside it is announced.
  let announcement = '';
  const announced = (lines: PressLine[]) => {
    announcement = lines.find(line => line.announce)?.text ?? '';
    return lines;
  };

  const body = (() => {
    if (gap !== undefined) {
      return (
        <div data-slot-gap={gap} data-slot-state="gap" style={weighted}>
          <div data-slot-gap-tile="" style={panelStyle}>
            <Flex align="center" gap="3" wrap="wrap">
              <Text as="span" size="2">
                No installed app can do this.
              </Text>
              <Button size="1" variant="soft" onClick={() => onSearchStore?.(gap)}>
                Search the Store
              </Button>
            </Flex>
          </div>
        </div>
      );
    }

    const resolved = source === undefined ? null : resolve(source);

    if (state === 'collapsed') {
      const homeApp = home !== undefined && signIn.includes(home) ? {app: nameOf(home)} : undefined;
      const line = shell
        ? (declined?.reason ?? (collapse && collapseLine(collapse, homeApp)))
        : undefined;
      const lines = shell ? announced(collapsedLines(facts, presses, nameOf, line)) : [];
      if (lines.length > 0) {
        return (
          <div
            data-slot={source}
            data-slot-state="collapsed"
            data-slot-content="shell"
            style={{...weighted, minHeight: 0}}
          >
            <PressRows
              lines={lines}
              first={
                declined
                  ? {'data-slot-declined': ''}
                  : collapse
                    ? {'data-slot-collapse': collapse.cause}
                    : {}
              }
              enabled={enabled}
              onPress={onPress && press}
              focusLine={focusLine}
            />
          </div>
        );
      }
      if (resolved == null) return null;
      return (
        <div
          data-slot={source}
          data-slot-state="collapsed"
          style={{...weighted, ...reservedStyle, minHeight: 0}}
        >
          {resolved}
        </div>
      );
    }

    if (state === 'authority' && !shell && source !== undefined && retry !== 'sent') {
      const note =
        retry === 'unreached' ? UNREACHED_WORDS : retry === 'lost' ? LOST_WORDS : undefined;
      if (note) announcement = note;
      return (
        <div data-slot={source} data-slot-state="authority" style={{...weighted, ...reservedStyle}}>
          <AuthorityTile
            app={nameOf(source)}
            authority={authority ?? {cause: 'signIn', scopes: []}}
            waiting={signingIn(source)}
            note={note}
            enabled={enabled}
            handOff={button => {
              if (button.ownerDocument.activeElement === button) focusLine.current = true;
            }}
            receive={element => takeFocus(element, focusLine)}
            onSignIn={onSignIn}
            onOpenAppLibrary={onOpenAppLibrary}
          />
        </div>
      );
    }

    if (state === 'failed' && retry !== 'sent') {
      if (shell) {
        return (
          <div
            data-slot={source}
            data-slot-state="failed"
            data-slot-content="shell"
            style={weighted}
          >
            {quietLine('Something went wrong here.')}
          </div>
        );
      }
      if (retry === 'unreached') announcement = UNREACHED_WORDS;
      const continueAt =
        failure?.cause === 'credential' ? continueHref(failure.continueUrl) : undefined;
      return (
        <div data-slot={source} data-slot-state="failed" style={{...weighted, ...reservedStyle}}>
          <Flex direction="column" align="start" gap="4">
            <Text as="p" size="2" data-slot-failure-line="">
              {failureStatement(failure)}
            </Text>
            {continueAt !== undefined && source !== undefined && (
              <Flex direction="column" align="start" gap="2">
                <Button asChild size="2" variant="outline" color="gray">
                  <a href={continueAt} target="_blank" rel="noopener noreferrer">
                    Continue on {nameOf(source)}
                    <ExternalLinkIcon aria-hidden />
                  </a>
                </Button>
                <Text as="span" size="1" color="gray">
                  Opens {nameOf(source)}’s website in a new tab
                </Text>
              </Flex>
            )}
            {onPress && source !== undefined && failureRetries(failure) && (
              <Flex align="center" gap="3">
                <Button
                  size="2"
                  variant="outline"
                  color="gray"
                  disabled={!enabled}
                  onClick={event => press({kind: 'retry', sources: [source]}, event.currentTarget)}
                >
                  <UpdateIcon aria-hidden />
                  Retry
                </Button>
                {retry === 'unreached' && (
                  <Text as="span" size="1" color="gray" data-slot-press-note="">
                    {UNREACHED_WORDS}
                  </Text>
                )}
              </Flex>
            )}
          </Flex>
        </div>
      );
    }

    if (resolved != null && retry !== 'sent') {
      const lines = shell ? announced(landedLines(facts, presses, nameOf)) : [];
      return (
        <div
          data-slot={source}
          data-slot-state="filled"
          data-slot-content={shell ? 'shell' : undefined}
          // A filled fragment slot keeps the floor it reserved while pending. Dropping it made the
          // box collapse the instant a fragment mounted and then grow again as content streamed —
          // the slot giving back space it had already claimed. Shell content reserved no floor.
          // The floor is written after the flex share, whose `minHeight: 0` would erase it.
          style={{...weighted, minWidth: 0, minHeight: shell ? 0 : reservedStyle.minHeight}}
        >
          {lines.length > 0 && (
            // The press lines' own row above the view's label row (task-8.5 decision 4).
            <div style={{marginBottom: 8}}>
              <PressRows
                lines={lines}
                enabled={enabled}
                onPress={onPress && press}
                focusLine={focusLine}
              />
            </div>
          )}
          {resolved}
        </div>
      );
    }

    if (shell) {
      return (
        <div
          data-slot={source}
          data-slot-state="pending"
          data-slot-content="shell"
          aria-busy="true"
          aria-label={label}
          style={weighted}
        >
          <ReservedView columns={columns} columnSources={columnSources} />
        </div>
      );
    }

    // Pending: before the source's first answer, or again from the reader's Retry — drawn at the
    // press, before the paint says so (task-8.5 decision 8). A spinner and "Loading…", naming
    // nobody: the attribution marker above says whose the slot is (task-8.7 decision 19). A Retry
    // whose stream broke says so here.
    const lost = retry === 'lost' && state !== 'failed';
    if (lost) announcement = LOST_WORDS;
    return (
      <div
        data-slot={source}
        data-slot-state="pending"
        style={{...weighted, ...reservedStyle, opacity: lost ? 1 : 0.6}}
      >
        <Text
          as="span"
          size="1"
          color="gray"
          tabIndex={-1}
          data-press-line=""
          ref={element => takeFocus(element, focusLine)}
          style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
        >
          {!lost && <Spinner size="1" />}
          {lost ? LOST_WORDS : 'Loading…'}
        </Text>
      </div>
    );
  })();

  // A slot that draws nothing, or the capability tile, has no press to speak of.
  if (body === null || gap !== undefined) return body;
  return (
    <>
      {body}
      <span role="status" style={visuallyHidden} data-slot-announce={source}>
        {announcement}
      </span>
    </>
  );
}

/** Hands focus to the line a press put in its button's place, once. */
function takeFocus(element: HTMLElement | null, focusLine: MutableRefObject<boolean>) {
  if (!element || !focusLine.current) return;
  focusLine.current = false;
  element.focus();
}

/**
 * The press lines, each a 24px row in the collapse line's geometry (task-8.5 decision 4): a
 * spinner before the sentence while something runs, the press inline at its end. A row that asks
 * the reader for a press is the view's action, so it reads at body size in ink with a soft accent
 * button (task-8.7 decision 21); a row that only tells stays at caption size in the quiet
 * register. The first row carries the collapse's markers when it stands for one.
 */
function PressRows({
  lines,
  first = {},
  enabled,
  onPress,
  focusLine,
}: {
  lines: PressLine[];
  first?: Record<string, string>;
  enabled: boolean;
  onPress?: (operation: CompositionOperation, button: HTMLElement) => void;
  focusLine: MutableRefObject<boolean>;
}) {
  return (
    <>
      {lines.map((line, index) => (
        <Flex
          key={index}
          align="center"
          gap="2"
          style={{height: 24}}
          data-slot-press-row=""
          {...(index === 0 ? first : {})}
        >
          {line.working && <Spinner size="1" />}
          <Text
            size={line.press || line.ink ? '2' : '1'}
            color={line.press || line.ink ? undefined : 'gray'}
            tabIndex={-1}
            data-press-line=""
            ref={element => takeFocus(element, focusLine)}
          >
            {line.text}
          </Text>
          {line.press && onPress && (
            <Button
              size="1"
              variant="soft"
              disabled={!enabled}
              onClick={event => onPress(line.press!.operation, event.currentTarget)}
            >
              {line.press.label}
            </Button>
          )}
        </Flex>
      ))}
    </>
  );
}

/** Present to assistive technology, absent from the page: the slot's polite announcements. */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** The skeleton rows' bar widths, per row and column, as the merged view's board draws them. */
const SKELETON_WIDTHS = [
  [62, 64, 36, 70, 58, 72],
  [48, 64, 36, 70, 58, 68],
  [56, 64, 16, 16, 16, 68],
  [70, 64, 36, 70, 58, 64],
];

/**
 * The failure tile's one statement (task-8.7 decision 17, worded for the reader by task-11.5
 * decision 9): the vendor's own words when it spoke, else the shell's reason for the painted
 * cause — "this app", never its name, since the attribution marker above the tile already says
 * whose it is — and "This app couldn't answer." when the vendor ended its task without a word or
 * no cause was painted. The catalog id a cause carries is never shown.
 */
export function failureStatement(failure: SlotFailure | undefined): string {
  switch (failure?.cause) {
    case 'vendor':
      return failure.message ?? 'This app couldn’t answer.';
    case 'unreachable':
      return 'This app couldn’t be reached.';
    case 'timeout':
      return 'This app took too long to answer.';
    case 'invalid':
      return 'This app sent a screen that couldn’t be shown.';
    case 'catalog':
      return 'This app sent something that can’t be shown here.';
    case 'uninstalled':
      return 'This app isn’t installed anymore.';
    case 'load':
      return 'Something went wrong loading this.';
    case 'credential':
      // Said for the reader (task-12.3 decision 7): what the app asked for, and that it never is.
      return 'This app asked for a password, code or card number here. A2UIVerse never asks for those on this screen.';
    default:
      return 'This app couldn’t answer.';
  }
}

/**
 * Whether the tile offers Retry (task-11.5 decision 9): every cause but `catalog` — a paint the
 * hub refused outside the app's catalogs fails the same way again, so there is nothing to retry —
 * and `credential`, a paint refused for a credential field the agent did not repair (task-12.2
 * decision 7).
 */
export function failureRetries(failure: SlotFailure | undefined): boolean {
  return failure?.cause !== 'catalog' && failure?.cause !== 'credential';
}

/**
 * The collapsed merge's line when it was not declined (task-8.3 decision 9), in the shell's
 * words: the home source it cannot join without, the one source that answered — or none — or the
 * view that could not be made. A home source that needs sign-in is said so, naming its app, and
 * the line carries no press: the slot's own Sign in brings the view back (task-12.3 decision 8).
 */
export function collapseLine(collapse: SlotCollapse, homeSignIn?: {app: string}): string {
  switch (collapse.cause) {
    case 'home':
      if (homeSignIn) {
        const {app} = homeSignIn;
        return `The merged view needs ${collapse.home ?? 'the home source'}, and ${app} isn’t signed in. Signing in to ${app} brings it back.`;
      }
      // Said for the reader (task-8.7 decision 23): what the view needs and what happened to it.
      return `The merged view needs ${collapse.home ?? 'the home source'}, which didn’t load.`;
    case 'few': {
      // Said for the reader (task-8.7 decision 24): what the view needs and who answered.
      const answered = collapse.answered ?? [];
      return answered.length === 0
        ? 'The merged view needs at least two sources, and none answered.'
        : `The merged view needs at least two sources, and only ${listed(answered)} answered.`;
    }
    case 'unmade':
      return 'The merged view couldn’t be made.';
  }
}

function listed(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * The merged view before it lands: the label row with a bar in it, then a table — the planned
 * headers when the plan named columns, one full-width column otherwise — over four rows of bars.
 * A column marked to a source says in its heading when that source is still loading or has
 * failed, as the landed table does (task 8.2).
 */
function ReservedView({
  columns,
  columnSources,
}: {
  columns?: string[];
  columnSources?: (string | null)[];
}) {
  const resolve = useContext(SlotStateContext);
  const count = columns?.length || 1;
  return (
    <Flex direction="column" gap="2">
      <Flex align="center" style={{height: 24}}>
        <SkeletonBar width={136} height={10} />
      </Flex>
      <Table.Root size="1" variant="ghost">
        {columns && columns.length > 0 && (
          <Table.Header>
            <Table.Row>
              {columns.map((column, index) => (
                <Table.ColumnHeaderCell key={`${column}-${index}`} style={headingCellStyle(index)}>
                  <ColumnHeading
                    column={column}
                    reserved={reservedColumnState(resolve, columnSources?.[index])}
                  />
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
        )}
        <Table.Body>
          {SKELETON_WIDTHS.map((widths, row) => (
            <Table.Row key={row} data-skeleton-row="">
              {Array.from({length: count}, (_, index) => (
                <Table.Cell key={index} style={bodyCellStyle(index)}>
                  <SkeletonBar width={`${widths[index % widths.length]}%`} height={8} />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
}

/**
 * Where Continue on the app goes: the painted page when it is https, or http on this machine —
 * any other scheme draws no button.
 */
export function continueHref(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return parsed.href;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    return parsed.protocol === 'http:' && local ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

const WAITING_WORDS = 'Waiting for you to finish signing in';

/**
 * The authority tile (task 12.3), the canvas's T1, L1 and L3: deterministic shell UI in plain
 * words, no address shown. A full tile is a column at the slot's leading edge — the statement,
 * the scopes under "<App> will be able to" when the card named any, Sign in, and that it opens in
 * a new window; waiting, the statement turns to finishing in the window that opened, then the
 * spinner line and Cancel. The quiet form is one line in either state, so nothing moves.
 */
function AuthorityTile({
  app,
  authority,
  waiting,
  note,
  enabled,
  handOff,
  receive,
  onSignIn,
  onOpenAppLibrary,
}: {
  app: string;
  authority: SlotAuthority;
  waiting: boolean;
  /** A resume press that never reached the orchestrator, or whose stream broke. */
  note?: string;
  enabled: boolean;
  /** A pressed button that held focus: the control replacing it takes the focus. */
  handOff: (button: HTMLElement) => void;
  /** The control that replaced a pressed button: it takes the focus, once. */
  receive: (element: HTMLElement | null) => void;
  onSignIn?: (kind: 'start' | 'cancel') => void;
  onOpenAppLibrary?: () => void;
}) {
  const signIn = (kind: 'start' | 'cancel', button: HTMLElement) => {
    handOff(button);
    onSignIn?.(kind);
  };
  const noteText = note && (
    <Text as="span" size="1" color="gray" data-slot-press-note="">
      {note}
    </Text>
  );
  const cancel = (size: '1' | '2') =>
    onSignIn && (
      <Button
        size={size}
        variant="outline"
        color="gray"
        ref={receive}
        onClick={event => signIn('cancel', event.currentTarget)}
      >
        Cancel
      </Button>
    );

  if (authority.cause === 'unsupported') {
    return (
      <Flex direction="column" align="start" gap="4" data-authority="unsupported">
        <Text as="p" size="2">
          Signing in to {app} isn’t supported here.
        </Text>
        <Text as="p" size="1" color="gray">
          {app} asks for a kind of sign-in A2UIVerse can’t do. The app stays installed.
        </Text>
        {onOpenAppLibrary && (
          <Button size="2" variant="outline" color="gray" onClick={() => onOpenAppLibrary()}>
            Manage apps
          </Button>
        )}
      </Flex>
    );
  }

  if (authority.quiet) {
    return (
      <Flex
        role="group"
        aria-label={`${app}, not signed in`}
        align="center"
        gap="2"
        wrap="wrap"
        data-authority="quiet"
        style={{minHeight: 28}}
      >
        {waiting ? (
          <>
            <Spinner size="1" />
            <Text size="2" color="gray">
              {WAITING_WORDS}
            </Text>
            {onSignIn && (
              <Link asChild size="2" weight="medium">
                <button
                  type="button"
                  style={linkButtonStyle}
                  ref={receive}
                  onClick={event => signIn('cancel', event.currentTarget)}
                >
                  Cancel
                </button>
              </Link>
            )}
          </>
        ) : (
          <>
            <LockClosedIcon aria-hidden style={{color: 'var(--gray-10)'}} />
            <Text size="2" color="gray">
              Not signed in
            </Text>
            {onSignIn && (
              <>
                <span aria-hidden style={dotStyle} />
                <Link asChild size="2" weight="medium">
                  <button
                    type="button"
                    style={linkButtonStyle}
                    disabled={!enabled}
                    ref={receive}
                    onClick={event => signIn('start', event.currentTarget)}
                  >
                    Sign in
                  </button>
                </Link>
              </>
            )}
            {noteText}
          </>
        )}
      </Flex>
    );
  }

  if (waiting) {
    return (
      <Flex direction="column" align="start" gap="4" data-authority="waiting">
        <Text as="p" size="2">
          Finish signing in to {app} in the window that opened.
        </Text>
        <Flex align="center" gap="3" wrap="wrap">
          <Spinner size="1" />
          <Text as="span" size="1" color="gray">
            {WAITING_WORDS}
          </Text>
          {cancel('1')}
        </Flex>
      </Flex>
    );
  }

  const again = authority.cause === 'again';
  const scopes = again ? [] : (authority.scopes ?? []);
  return (
    <Flex direction="column" align="start" gap="4" data-authority={authority.cause}>
      {again ? (
        <Text as="p" size="2">
          Your {app} sign-in has run out.
        </Text>
      ) : (
        <Text as="p" size="3" weight="bold">
          Sign in to {app} to show it here.
        </Text>
      )}
      {scopes.length > 0 && (
        <Flex direction="column" gap="2">
          <Text as="span" size="1" color="gray">
            {app} will be able to
          </Text>
          <ul style={scopeListStyle}>
            {scopes.map(scope => (
              <li key={scope} style={scopeItemStyle}>
                <CheckIcon
                  aria-hidden
                  style={{flex: 'none', marginTop: 2, color: 'var(--gray-10)'}}
                />
                <Text size="2">{scope}</Text>
              </li>
            ))}
          </ul>
        </Flex>
      )}
      {onSignIn && (
        <Flex align="center" gap="3" wrap="wrap">
          <Button
            size="2"
            disabled={!enabled}
            ref={receive}
            onClick={event => signIn('start', event.currentTarget)}
          >
            {again ? 'Sign in again' : 'Sign in'}
            <ExternalLinkIcon aria-hidden />
          </Button>
          {noteText}
        </Flex>
      )}
      <Text as="span" size="1" color="gray">
        Opens {app}’s sign-in in a new window
      </Text>
    </Flex>
  );
}

/** A button drawn as a link: the quiet line's Sign in and Cancel. */
const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  font: 'inherit',
  cursor: 'pointer',
};

const dotStyle: CSSProperties = {
  width: 3,
  height: 3,
  borderRadius: 2,
  background: 'var(--gray-8)',
  flex: 'none',
};

const scopeListStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const scopeItemStyle: CSSProperties = {display: 'flex', gap: 8, alignItems: 'flex-start'};

/** The shell's quiet register: subdued text, no box, no floor. */
function quietLine(text: string) {
  return (
    <Text size="1" color="gray">
      {text}
    </Text>
  );
}

/**
 * The capability tile's look. SPEC §8 calls it a tile and it is the shell's own deterministic UI
 * with an action in it — not a placeholder for a vendor's pixels — so it keeps its box: one that
 * hugs its line and its button at the slot's leading edge, as the failure tile's line sits there,
 * never stretched across the slot (task-11.8 decision 21).
 */
const panelStyle: CSSProperties = {
  background: 'var(--color-panel-solid)',
  border: '1px solid var(--gray-6)',
  borderRadius: 'var(--radius-3)',
  padding: 'var(--space-2) var(--space-3)',
  width: 'fit-content',
  maxWidth: '100%',
};

/**
 * What a fragment slot holds before its fragment arrives (task-7.9 decision 23): the space it has
 * reserved and nothing drawn around it — no border, no background, no edge. The floor stays, so
 * the layout does not jump as fragments stream in; the quiet line sits flush at the leading edge,
 * under the attribution marker, where the fragment will start.
 */
const reservedStyle: CSSProperties = {
  minHeight: '4rem',
  display: 'flex',
  // Top, not centred: a row stretches the slot to its tallest neighbour, and a centred line
  // would float halfway down the canvas, away from the marker naming it.
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
};

/**
 * Catalog entry, bound to the host's handlers: the generic binder resolves props, then renders
 * SlotView, whose capability tile raises `openStore` and whose presses — Retry on the failure tile,
 * Include and Try again on the merged view's lines — raise the host's press from this slot's
 * surface. The authority tile's Sign in and Cancel raise the host's sign-in handler, its Manage
 * apps `openAppLibrary`. Without a press handler no press button is drawn, without a sign-in
 * handler no Sign in. Sources are named by the host's lookup of their app, the app id without one.
 */
export function createSlotComponent(
  onShellAction: ShellActionHandler,
  {
    onPress,
    onSignIn,
    appDisplayName,
  }: {onPress?: PressHandler; onSignIn?: SignInHandler; appDisplayName?: AppDisplayName} = {},
) {
  return createComponentImplementation(SlotApi, ({context}) => {
    // Read from the component's own model, not the binder's resolved props: upstream's binder
    // merges each repaint over the last, so a prop the runtime stops painting — `working`, `late`,
    // `retrying` — would keep its old value (`_dev/a2ui-findings.md` §9). Every Slot prop is a
    // literal the runtime paints and repaints, so the model is the whole truth.
    const props = context.componentModel.properties as SlotProps;
    return (
      <SlotView
        source={props.source}
        gap={props.gap}
        weight={props.weight}
        state={props.state}
        label={props.label}
        noun={props.noun}
        failure={props.failure}
        authority={props.authority}
        content={props.content}
        columns={props.columns}
        columnSources={props.columnSources}
        join={props.join}
        declined={props.declined}
        collapse={props.collapse}
        late={props.late}
        working={props.working}
        callFailed={props.callFailed}
        retrying={props.retrying}
        onSearchStore={query => {
          const surfaceId = context.dataContext.surface.id;
          const componentId = context.componentModel.id;
          onShellAction({name: 'openStore', surfaceId, componentId, ...(query ? {query} : {})});
        }}
        onPress={
          onPress &&
          (operation =>
            onPress({
              operation,
              surfaceId: context.dataContext.surface.id,
              componentId: context.componentModel.id,
            }))
        }
        onSignIn={
          onSignIn && props.source !== undefined
            ? kind =>
                onSignIn({
                  kind,
                  source: props.source!,
                  surfaceId: context.dataContext.surface.id,
                  componentId: context.componentModel.id,
                })
            : undefined
        }
        onOpenAppLibrary={() =>
          onShellAction({
            name: 'openAppLibrary',
            surfaceId: context.dataContext.surface.id,
            componentId: context.componentModel.id,
          })
        }
        nameOf={source => {
          // A source names the app and the account it paints under (task-12.2 decision 3); the
          // app's display name stands for it.
          const appId = parseSourceId(source)?.appId ?? source;
          return appDisplayName?.(appId) ?? appId;
        }}
      />
    );
  });
}
