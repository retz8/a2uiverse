import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react';
import {SliderApi} from '@a2ui/web_core/catalogs/basic/v1';
import {Flex, Slider, Text} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';

/**
 * `Slider` on Radix `Slider`: the label and the current value in a header row, the control
 * below. Radix's slider is a range of thumbs; the catalog's is one value, so one thumb. Radix
 * Themes exposes no way to name the thumb, so the label stands beside the control. `steps` divides
 * the range into that many equal steps the thumb snaps to, as upstream's implementation reads it.
 */
export function SliderView({
  label,
  min = 0,
  max,
  value,
  steps,
  errors,
  onChange,
  style,
}: {
  label?: string;
  min?: number;
  max: number;
  value?: number;
  steps?: number;
  errors?: string[];
  onChange?: (value: number) => void;
  style?: CSSProperties;
}) {
  const current = typeof value === 'number' ? value : min;
  const step =
    typeof steps === 'number' && steps > 0 && max > min ? (max - min) / steps : undefined;
  const error = errors?.[0];
  return (
    <Flex direction="column" gap="2" style={style}>
      <Flex justify="between" align="center" gap="3">
        {label && (
          <Text as="span" size="2" weight="medium">
            {label}
          </Text>
        )}
        <Text as="span" size="1" color="gray" style={{fontVariantNumeric: 'tabular-nums'}}>
          {current}
        </Text>
      </Flex>
      <Slider
        size="2"
        min={min}
        max={max}
        step={step}
        value={[current]}
        onValueChange={([next]) => onChange?.(next)}
      />
      {error && (
        <Text as="span" size="1" color="red" data-field-error="">
          {error}
        </Text>
      )}
    </Flex>
  );
}

/** Catalog entry: `label` and `value` arrive resolved; `min`/`max`/`steps` are fixed; `setValue` is the binder's two-way write. */
export const SliderComponent = createComponentImplementation(SliderApi, ({props}) => (
  <SliderView
    label={props.label}
    min={props.min}
    max={props.max}
    value={props.value}
    steps={props.steps}
    errors={props.validationErrors}
    onChange={props.setValue}
    style={weightStyle(props.weight)}
  />
));
