import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {sourceName, type CompositionOperation} from '@a2uiverse/sdk';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  InfoCircledIcon,
  LockClosedIcon,
} from '@radix-ui/react-icons';
import {Button, Flex, IconButton, Spinner, Text} from '@radix-ui/themes';
import {
  FragmentHistoryContext,
  type FragmentHistory,
  type HistoryStep,
} from '../../fragment-history.js';
import {PressStateContext} from '../../press-state.js';
import {SignInContext, type SignInHandler} from '../../sign-in.js';
import {weightStyle} from '../shared/layout.js';
import type {PressHandler} from '../slot/slot.js';
import {AttributionApi, type AttributionProps} from './attribution.schema.js';

/**
 * The quiet marker (SPEC §4.3): a small gray caption with an info glyph, always present, hover
 * and keyboard focus brightening it. It names the app, and the account by its label when the app
 * has more than one — at rest, so two fragments of one app tell apart without a hover (task-12.3
 * decision 6), a long label truncated, the whole of it on hover and in the accessible name. It
 * never says "Painted by", since the name already says whose the region is (task-8.7 decision
 * 18). Rendered on Radix `Text` in the caption register with Radix's own info glyph (task-5.9
 * decision 5).
 *
 * A scope request inside the fragment (SPEC §4.3, §8, task 12.3) is a fixed-width "Needs access"
 * chip on the marker's row beside the arrows, its card floating over the fragment's top — what the
 * app will also be able to do, Allow and Not now — nothing moving. The card opens when the
 * request arrives; the chip, Escape or a press outside folds it without answering, and the chip
 * reopens it (decision 5). Focus stays where it was; the request is said politely. Allow starts
 * the sign-in through the host; while its window is open the card keeps the scopes and says to
 * finish there, with Cancel (decision 3). Not now raises `dismiss`. A `retry` or `dismiss` sent
 * for the source hides the chip and the card at once (decision 10). The arrows stay live while a
 * request waits (decision 9).
 *
 * The fragment's way back rides the marker's row (SPEC §6.5, task 9.5), at its right edge
 * (task-9.9 decision 15): a back arrow when the host says there is a step to go back to, a
 * forward arrow beside it when there is one to go forward to — read from `FragmentHistoryContext`
 * by the painted `source`, or handed in as `history` — each a soft accent icon button named
 * "Back to" or "Forward to" that paint's title, "Back" or "Forward" alone when the agent named
 * nothing, the name on hover, focus and for assistive technology. An arrow raises the step operation — the one source and
 * the neighbour's index — through the host's press handler; without one no arrow is drawn, and
 * the arrows draw disabled where the press state says no press can be made, as Retry does, and
 * while the host says the source is busy — its repaint in flight (task-9.7 decision 6). The
 * row draws no border: the boundary stays the marker, the vendor's pixels and the whitespace.
 * When the pressed arrow leaves the row, focus moves to the other arrow or the marker, so a
 * keyboard reader's place is not dropped to the page.
 *
 * With a child it is the wrapper of that region (task-6.4 decision 3): marker over content in
 * one flex column, 8px apart so the marker reads as its region's (task 7.14), the box's `weight` as its own flex share inside the parent `Row` or `Column`,
 * 1 when the painter copied none (task-6.4 decision 2) — so regions the Planner left unweighted
 * share their axis equally. The child's own weight is then measured against this box.
 */
export function AttributionView({
  displayName,
  source,
  account,
  escalation,
  weight,
  history,
  onPress,
  onSignIn,
  children,
}: Pick<AttributionProps, 'displayName' | 'source' | 'account' | 'escalation' | 'weight'> & {
  /** Where the fragment stands in its history; read from the host's context when not given. */
  history?: FragmentHistory;
  /** What an arrow and Not now raise: the step and `dismiss`. Without it neither is drawn. */
  onPress?: (operation: CompositionOperation) => void;
  /** Allow and Cancel on the escalation card, inside the click; without it neither is drawn. */
  onSignIn?: (kind: 'start' | 'cancel') => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const markerRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const forwardRef = useRef<HTMLButtonElement>(null);
  const resolveHistory = useContext(FragmentHistoryContext);
  const {enabled, presses} = useContext(PressStateContext);
  const signingIn = useContext(SignInContext);
  const detail = sourceName(displayName, account);
  // A request answered at the press: a sent `retry` (Allow, signed in) or `dismiss` (Not now)
  // hides it before the repaint drops it (task-12.3 decision 10).
  const answered =
    source !== undefined &&
    presses.some(
      p =>
        p.status === 'sent' &&
        (p.operation.kind === 'retry' || p.operation.kind === 'dismiss') &&
        p.operation.sources[0] === source,
    );
  const request = escalation && !answered ? escalation : undefined;
  const stands = history ?? (source === undefined ? undefined : resolveHistory(source));
  const arrows = onPress && source !== undefined ? stands : undefined;
  const back = arrows?.back;
  const forward = arrows?.forward;
  // Disabled where no press can be made, and while this source's own repaint is in flight.
  const pressable = enabled && !arrows?.busy;
  // The arrow pressed while it held focus: once it leaves the row, the other arrow or the marker
  // takes the focus, so a keyboard reader's place is not dropped to the page.
  const pressed = useRef<'back' | 'forward' | undefined>(undefined);
  useEffect(() => {
    const which = pressed.current;
    if (!which) return;
    const gone = which === 'back' ? !back : !forward;
    if (!gone) return;
    pressed.current = undefined;
    (backRef.current ?? forwardRef.current ?? markerRef.current)?.focus();
  }, [back, forward]);

  const marker = (
    <Text
      ref={markerRef}
      as="span"
      size="1"
      color="gray"
      tabIndex={0}
      aria-label={detail}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        width: 'fit-content',
        maxWidth: '100%',
        gap: 4,
        lineHeight: '16px',
        opacity: open ? 1 : 0.8,
        transition: 'opacity 120ms ease',
        cursor: 'pointer',
        userSelect: 'none',
        minWidth: 0,
      }}
    >
      <InfoCircledIcon width={12} height={12} aria-hidden="true" style={{flex: 'none'}} />
      <span title={detail} style={truncateStyle}>
        {detail}
      </span>
    </Text>
  );

  const stepTo = (which: 'back' | 'forward', step: HistoryStep, button: HTMLElement) => {
    if (button.ownerDocument.activeElement === button) pressed.current = which;
    onPress!({kind: 'step', sources: [source!], step: step.step});
  };
  const row =
    back || forward || request ? (
      <Flex align="center" justify="between" gap="2" style={{width: '100%', position: 'relative'}}>
        {marker}
        <Flex align="center" gap="1" flexShrink="0">
          {request && (
            <Escalation
              app={displayName}
              scopes={request.scopes}
              waiting={source !== undefined && signingIn(source)}
              enabled={enabled}
              onSignIn={onSignIn}
              onDismiss={
                onPress && source !== undefined
                  ? () => onPress({kind: 'dismiss', sources: [source]})
                  : undefined
              }
            />
          )}
          {back && (
            <Arrow
              direction="Back"
              step={back}
              buttonRef={backRef}
              enabled={pressable}
              onClick={event => stepTo('back', back, event.currentTarget)}
            />
          )}
          {forward && (
            <Arrow
              direction="Forward"
              step={forward}
              buttonRef={forwardRef}
              enabled={pressable}
              onClick={event => stepTo('forward', forward, event.currentTarget)}
            />
          )}
        </Flex>
      </Flex>
    ) : (
      marker
    );

  if (children === undefined) return row;
  return (
    <Flex
      data-attribution={displayName}
      direction="column"
      gap="2"
      style={{minWidth: 0, ...weightStyle(weight ?? 1)}}
    >
      {row}
      {children}
    </Flex>
  );
}

/** One line, cut with an ellipsis when it does not fit. */
const truncateStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

const WAITING_WORDS = 'Waiting for you to finish signing in';

/**
 * The escalation (task 12.3, the canvas's E2 and E5): the chip, fixed width, a soft accent like the
 * arrows, and its card floating over the fragment's top at the row's right edge, no wider than
 * the slot. The card's content is the consent in plain words: the app needs more access, what it
 * will also be able to do, Allow and Not now, and that Allow opens its sign-in in a new window.
 */
function Escalation({
  app,
  scopes,
  waiting,
  enabled,
  onSignIn,
  onDismiss,
}: {
  app: string;
  scopes: string[];
  waiting: boolean;
  enabled: boolean;
  onSignIn?: (kind: 'start' | 'cancel') => void;
  onDismiss?: () => void;
}) {
  const [cardOpen, setCardOpen] = useState(true);
  const chipRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardId = useId();
  const leadId = useId();
  const lead = `${app} needs more access to finish this.`;
  // A new request opens the card again, though the last one was folded away: adjusted while
  // rendering, as React advises for state that follows a prop.
  const requestKey = scopes.join('\n');
  const [shownKey, setShownKey] = useState(requestKey);
  if (shownKey !== requestKey) {
    setShownKey(requestKey);
    setCardOpen(true);
  }
  // A press outside the chip and the card folds it, unanswered.
  useEffect(() => {
    if (!cardOpen) return;
    const document = chipRef.current?.ownerDocument;
    if (!document) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (chipRef.current?.contains(target) || cardRef.current?.contains(target)))
        return;
      setCardOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [cardOpen]);
  const fold = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !cardOpen) return;
    event.stopPropagation();
    const inside = cardRef.current?.contains(event.target as Node);
    setCardOpen(false);
    if (inside) chipRef.current?.focus();
  };

  return (
    <>
      <Button
        ref={chipRef}
        size="1"
        variant="soft"
        aria-expanded={cardOpen}
        aria-controls={cardId}
        data-escalation-chip=""
        // Taller than the marker's line: its overhang reaches into the gap above and below, so
        // the row keeps its height and nothing moves when the request arrives (phase-12 decision 16).
        style={{flex: 'none', whiteSpace: 'nowrap', marginBlock: -4}}
        onClick={() => setCardOpen(open => !open)}
        onKeyDown={fold}
      >
        <LockClosedIcon aria-hidden />
        Needs access
      </Button>
      <span role="status" style={visuallyHidden}>
        {lead}
      </span>
      {cardOpen && (
        <div
          ref={cardRef}
          id={cardId}
          role="dialog"
          aria-labelledby={leadId}
          data-escalation-card=""
          style={cardStyle}
          onKeyDown={fold}
        >
          <Text as="p" size="2" weight="bold" id={leadId}>
            {lead}
          </Text>
          <Flex direction="column" gap="2">
            <Text as="span" size="1" color="gray">
              It will also be able to
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
          {waiting ? (
            <Flex align="center" gap="3" wrap="wrap">
              <Spinner size="1" />
              <Text as="span" size="1" color="gray">
                {WAITING_WORDS}
              </Text>
              {onSignIn && (
                <Button size="1" variant="outline" color="gray" onClick={() => onSignIn('cancel')}>
                  Cancel
                </Button>
              )}
            </Flex>
          ) : (
            <>
              <Flex align="center" gap="3" wrap="wrap">
                {onSignIn && (
                  <Button size="1" disabled={!enabled} onClick={() => onSignIn('start')}>
                    Allow
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    size="1"
                    variant="outline"
                    color="gray"
                    disabled={!enabled}
                    onClick={() => onDismiss()}
                  >
                    Not now
                  </Button>
                )}
              </Flex>
              <Text as="span" size="1" color="gray">
                Allow opens {app}’s sign-in in a new window
              </Text>
            </>
          )}
        </div>
      )}
    </>
  );
}

/** The card floating over the fragment's top: below the row, at its right edge, no wider than the slot. */
const cardStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 5,
  width: 320,
  maxWidth: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  background: 'var(--color-panel-solid)',
  border: '1px solid var(--gray-a5)',
  borderRadius: 'var(--radius-4)',
  boxShadow: 'var(--shadow-5)',
  textAlign: 'start',
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

/** Present to assistive technology, absent from the page: the request said politely. */
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

/** The arrow's name: the direction, then the paint it goes to when the agent named it. */
function arrowName(direction: 'Back' | 'Forward', step: HistoryStep): string {
  return step.title ? `${direction} to ${step.title}` : direction;
}

/**
 * One arrow: a soft accent icon button, named for where it goes (task-9.9 decision 15), marked
 * `data-way` so the host can hold its fragment in place while the step runs (decision 19).
 */
function Arrow({
  direction,
  step,
  buttonRef,
  enabled,
  onClick,
}: {
  direction: 'Back' | 'Forward';
  step: HistoryStep;
  buttonRef: RefObject<HTMLButtonElement | null>;
  enabled: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const name = arrowName(direction, step);
  return (
    <IconButton
      ref={buttonRef}
      size="1"
      variant="soft"
      data-way={direction === 'Back' ? 'back' : 'forward'}
      aria-label={name}
      title={name}
      disabled={!enabled}
      onClick={onClick}
    >
      {direction === 'Back' ? (
        <ArrowLeftIcon aria-hidden="true" />
      ) : (
        <ArrowRightIcon aria-hidden="true" />
      )}
    </IconButton>
  );
}

/**
 * Catalog entry, bound to the host's press and sign-in handlers (tasks 9.5, 12.3): the generic
 * binder resolves props, then renders AttributionView around its child, when it has one; an
 * arrow's step, Not now's `dismiss` and Allow's sign-in carry the surface and component that
 * raised them, as a slot's press does.
 */
export function createAttributionComponent({
  onPress,
  onSignIn,
}: {onPress?: PressHandler; onSignIn?: SignInHandler} = {}) {
  return createComponentImplementation(AttributionApi, ({buildChild, context}) => {
    // Read from the component's own model, not the binder's resolved props: upstream's binder
    // merges each repaint over the last, so a request the runtime stops painting — `escalation`
    // after Not now or Allow — would keep its chip (`_dev/a2ui-findings.md` §9). Every
    // Attribution prop is a literal the runtime paints and repaints.
    const props = context.componentModel.properties as AttributionProps;
    return (
      <AttributionView
        displayName={props.displayName}
        source={props.source}
        account={props.account}
        escalation={props.escalation}
        weight={props.weight}
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
        onPress={
          onPress &&
          (operation =>
            onPress({
              operation,
              surfaceId: context.dataContext.surface.id,
              componentId: context.componentModel.id,
            }))
        }
      >
        {props.child === undefined ? undefined : buildChild(props.child)}
      </AttributionView>
    );
  });
}
