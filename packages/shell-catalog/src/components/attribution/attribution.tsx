import {useState, type ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {InfoCircledIcon} from '@radix-ui/react-icons';
import {Flex, Text} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';
import {AttributionApi, type AttributionProps} from './attribution.schema.js';

/**
 * The quiet marker (SPEC §4.3): a small gray caption with an info glyph, always present,
 * expanding to full attribution on hover or keyboard focus. The accessible name always
 * carries the full detail, independent of pointer state. Rendered on Radix `Text` in the
 * caption register with Radix's own info glyph (task-5.9 decision 5).
 *
 * With a child it is the wrapper of that region (task-6.4 decision 3): marker over content in
 * one flex column, the box's `weight` as its own flex share inside the parent `Row` or `Column`.
 * The child's own weight is then measured against this box, which the parent row stretches.
 */
export function AttributionView({
  displayName,
  account,
  weight,
  children,
}: Pick<AttributionProps, 'displayName' | 'appId' | 'account' | 'weight'> & {
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const detail = `Painted by ${displayName}${account ? ` · ${account}` : ''}`;

  const marker = (
    <Text
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
        gap: '0.3em',
        lineHeight: 1.2,
        opacity: open ? 1 : 0.8,
        transition: 'opacity 120ms ease',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <InfoCircledIcon width={11} height={11} aria-hidden="true" />
      {open ? detail : displayName}
    </Text>
  );

  if (children === undefined) return marker;
  return (
    <Flex
      data-attribution={displayName}
      direction="column"
      gap="3"
      style={{minWidth: 0, ...weightStyle(weight)}}
    >
      {marker}
      {children}
    </Flex>
  );
}

/** Catalog entry: the generic binder resolves props, then renders AttributionView around its child, when it has one. */
export const AttributionComponent = createComponentImplementation(
  AttributionApi,
  ({props, buildChild}) => (
    <AttributionView
      displayName={props.displayName}
      appId={props.appId}
      account={props.account}
      weight={props.weight}
    >
      {props.child === undefined ? undefined : buildChild(props.child)}
    </AttributionView>
  ),
);
