import {
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import type {CompositionOperation} from '@a2uiverse/sdk';
import {ArrowLeftIcon, ArrowRightIcon, InfoCircledIcon} from '@radix-ui/react-icons';
import {Flex, IconButton, Text} from '@radix-ui/themes';
import {
  FragmentHistoryContext,
  type FragmentHistory,
  type HistoryStep,
} from '../../fragment-history.js';
import {PressStateContext} from '../../press-state.js';
import {weightStyle} from '../shared/layout.js';
import type {PressHandler} from '../slot/slot.js';
import {AttributionApi, type AttributionProps} from './attribution.schema.js';

/**
 * The quiet marker (SPEC §4.3): a small gray caption with an info glyph, always present,
 * expanding to full attribution on hover or keyboard focus. Full attribution is the name and
 * the account label when one is in play; with none, hover and focus only brighten the marker —
 * it never says "Painted by", since the name already says whose the region is (task-8.7
 * decision 18). The accessible name always carries the full detail, independent of pointer
 * state. Rendered on Radix `Text` in the caption register with Radix's own info glyph (task-5.9
 * decision 5).
 *
 * The fragment's way back rides the marker's row (SPEC §6.5, task 9.5): a back arrow after the
 * marker when the host says there is a step to go back to, a forward arrow beside it when there
 * is one to go forward to — read from `FragmentHistoryContext` by the painted `appId`, or handed
 * in as `history` — each an icon button in the marker's register named "Back to" or "Forward to"
 * that paint's title, "Back" or "Forward" alone when the agent named nothing, the name on hover,
 * focus and for assistive technology. An arrow raises the step operation — the one source and
 * the neighbour's index — through the host's press handler; without one no arrow is drawn, and
 * the arrows draw disabled where the press state says no press can be made, as Retry does. The
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
  appId,
  account,
  weight,
  history,
  onPress,
  children,
}: Pick<AttributionProps, 'displayName' | 'appId' | 'account' | 'weight'> & {
  /** Where the fragment stands in its history; read from the host's context when not given. */
  history?: FragmentHistory;
  /** What an arrow raises: the step operation. Without it no arrow is drawn. */
  onPress?: (operation: CompositionOperation) => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const markerRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const forwardRef = useRef<HTMLButtonElement>(null);
  const resolveHistory = useContext(FragmentHistoryContext);
  const {enabled} = useContext(PressStateContext);
  const detail = account ? `${displayName} · ${account}` : displayName;
  const stands = history ?? (appId === undefined ? undefined : resolveHistory(appId));
  const arrows = onPress && appId !== undefined ? stands : undefined;
  const back = arrows?.back;
  const forward = arrows?.forward;
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
      }}
    >
      <InfoCircledIcon width={12} height={12} aria-hidden="true" />
      {open ? detail : displayName}
    </Text>
  );

  const stepTo = (which: 'back' | 'forward', step: HistoryStep, button: HTMLElement) => {
    if (button.ownerDocument.activeElement === button) pressed.current = which;
    onPress!({kind: 'step', sources: [appId!], step: step.step});
  };
  const row =
    back || forward ? (
      <Flex align="center" gap="1" style={{alignSelf: 'flex-start', maxWidth: '100%'}}>
        {marker}
        {back && (
          <Arrow
            direction="Back"
            step={back}
            buttonRef={backRef}
            enabled={enabled}
            onClick={event => stepTo('back', back, event.currentTarget)}
          />
        )}
        {forward && (
          <Arrow
            direction="Forward"
            step={forward}
            buttonRef={forwardRef}
            enabled={enabled}
            onClick={event => stepTo('forward', forward, event.currentTarget)}
          />
        )}
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

/** The arrow's name: the direction, then the paint it goes to when the agent named it. */
function arrowName(direction: 'Back' | 'Forward', step: HistoryStep): string {
  return step.title ? `${direction} to ${step.title}` : direction;
}

/** One arrow: an icon button in the marker's register, named for where it goes. */
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
      variant="ghost"
      color="gray"
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
 * Catalog entry, bound to the host's press handler (task 9.5): the generic binder resolves props,
 * then renders AttributionView around its child, when it has one; an arrow's step carries the
 * surface and component that raised it, as a slot's press does.
 */
export function createAttributionComponent({onPress}: {onPress?: PressHandler} = {}) {
  return createComponentImplementation(AttributionApi, ({props, buildChild, context}) => (
    <AttributionView
      displayName={props.displayName}
      appId={props.appId}
      account={props.account}
      weight={props.weight}
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
  ));
}
