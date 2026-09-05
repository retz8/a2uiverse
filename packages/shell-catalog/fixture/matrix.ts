/**
 * The catalog matrix, generated from `catalog.json` (task-5.9 decisions 6–7): every component,
 * every enum prop, every value — each as a minimal valid tree the real renderer can paint. The
 * design-check fixture and the render-parity test both read it, so what the fixture shows is
 * exactly what the test proves.
 *
 * A tree is sampled from the schema's `required` props by their declared type, then overlaid
 * with a seed per component that makes the sample legible (a real label, a bound value with data
 * behind it) and finally with the one prop the sweep is varying. The sampler is the guarantee of
 * validity; the seeds are for the eye.
 */

export type JsonSchema = Record<string, unknown> & {
  $ref?: string;
  type?: string;
  enum?: string[];
  default?: unknown;
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

export interface CatalogSchema {
  components: Record<string, JsonSchema>;
}

export type TreeComponent = {id: string; component: string} & Record<string, unknown>;

export interface Sample {
  components: TreeComponent[];
  data: Record<string, unknown>;
}

export interface EnumProp {
  prop: string;
  values: string[];
}

/** A component's own property block — the `allOf` member that carries `properties`, or the def itself. */
function ownProps(def: JsonSchema): JsonSchema {
  return def.allOf?.find(member => member.properties) ?? def;
}

export function componentNames(schema: CatalogSchema): string[] {
  return Object.keys(schema.components);
}

/** Every prop of the component that is an enum, or a `oneOf` whose first alternative is one (`Icon.name`). */
export function enumProps(schema: CatalogSchema, name: string): EnumProp[] {
  const props = ownProps(schema.components[name]).properties ?? {};
  const out: EnumProp[] = [];
  for (const [prop, fragment] of Object.entries(props)) {
    if (prop === 'component') continue;
    const values = fragment.enum ?? fragment.oneOf?.find(alt => alt.enum)?.enum;
    if (values) out.push({prop, values});
  }
  return out;
}

interface SampleContext {
  leaves: TreeComponent[];
  leaf(): string;
}

function refName(ref: string): string {
  return ref.slice(ref.lastIndexOf('/') + 1);
}

function sampleFragment(fragment: JsonSchema, ctx: SampleContext): unknown {
  if (fragment.$ref) {
    switch (refName(fragment.$ref)) {
      case 'DynamicString':
        return 'Sample';
      case 'DynamicNumber':
        return 1;
      case 'DynamicBoolean':
        return false;
      case 'DynamicStringList':
        return [];
      case 'ChildList':
        return [ctx.leaf()];
      case 'ComponentId':
        return ctx.leaf();
      case 'Action':
        return {event: {name: 'tap'}};
      case 'DataBinding':
        return {path: '/value'};
      default:
        return 'x';
    }
  }
  if (fragment.enum) return fragment.default ?? fragment.enum[0];
  if (fragment.oneOf) return sampleFragment(fragment.oneOf[0], ctx);
  if (fragment.allOf) return sampleFragment(fragment.allOf[0], ctx);
  switch (fragment.type) {
    case 'array':
      return fragment.items ? [sampleFragment(fragment.items, ctx)] : [];
    case 'object':
      return sampleObject(fragment, ctx);
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return false;
    default:
      return 'x';
  }
}

function sampleObject(fragment: JsonSchema, ctx: SampleContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const prop of fragment.required ?? []) {
    const shape = fragment.properties?.[prop];
    if (shape) out[prop] = sampleFragment(shape, ctx);
  }
  return out;
}

/** A tiny inline SVG, sized so the image variants show a real picture at a natural size without a network. */
const IMAGE_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect width="160" height="100" fill="#6e56cf"/><circle cx="110" cy="40" r="22" fill="#ffd166"/><path d="M0 100 L60 45 L95 80 L120 60 L160 100Z" fill="#3e63dd"/></svg>',
  );

const text = (id: string, content: string): TreeComponent => ({
  id,
  component: 'Text',
  text: content,
});

/** What makes each component's sample legible: real labels, bound values with data behind them, children to show. */
const SEEDS: Record<
  string,
  {props: Record<string, unknown>; extra?: TreeComponent[]; data?: Record<string, unknown>}
> = {
  Text: {props: {text: 'The quick brown fox jumps over the lazy dog.'}},
  Image: {props: {url: IMAGE_URL, description: 'A hill under a yellow sun'}},
  Icon: {props: {name: 'star'}},
  Video: {props: {url: 'https://example.invalid/clip.mp4'}},
  AudioPlayer: {props: {url: 'https://example.invalid/clip.mp3', description: 'Interview, 12 min'}},
  Row: {
    props: {children: ['c1', 'c2', 'c3']},
    extra: [text('c1', 'One'), text('c2', 'Two'), text('c3', 'Three')],
  },
  Column: {
    props: {children: ['c1', 'c2', 'c3']},
    extra: [text('c1', 'One'), text('c2', 'Two'), text('c3', 'Three')],
  },
  List: {
    props: {children: ['c1', 'c2', 'c3']},
    extra: [text('c1', 'One'), text('c2', 'Two'), text('c3', 'Three')],
  },
  Card: {props: {child: 'body'}, extra: [text('body', 'Inside the card')]},
  Tabs: {
    props: {
      tabs: [
        {title: 'First', child: 't1'},
        {title: 'Second', child: 't2'},
      ],
    },
    extra: [text('t1', 'The first tab'), text('t2', 'The second tab')],
  },
  Modal: {
    props: {trigger: 'open', content: 'body'},
    extra: [
      {id: 'open', component: 'Button', child: 'open-label', action: {event: {name: 'open'}}},
      text('open-label', 'Open'),
      text('body', 'Hello from the dialog'),
    ],
  },
  Divider: {props: {}},
  Button: {
    props: {child: 'label', action: {event: {name: 'save'}}},
    extra: [text('label', 'Save')],
  },
  TextField: {props: {label: 'Name', value: {path: '/name'}}, data: {name: 'Ada Lovelace'}},
  CheckBox: {props: {label: 'Subscribe', value: {path: '/subscribed'}}, data: {subscribed: true}},
  ChoicePicker: {
    props: {
      label: 'Size',
      options: [
        {label: 'Small', value: 's'},
        {label: 'Medium', value: 'm'},
        {label: 'Large', value: 'l'},
      ],
      value: {path: '/size'},
    },
    data: {size: ['m']},
  },
  Slider: {props: {label: 'Volume', min: 0, max: 10, value: {path: '/volume'}}, data: {volume: 4}},
  DateTimeInput: {
    props: {label: 'When', enableDate: true, enableTime: true, value: {path: '/when'}},
    data: {when: '2026-09-05T11:00'},
  },
  Slot: {props: {name: 'slot-gmail', label: 'Gmail'}},
  Attribution: {props: {displayName: 'Gmail', account: 'work'}},
  Frame: {
    props: {direction: 'row', children: ['c1', 'c2']},
    extra: [text('c1', 'Left'), text('c2', 'Right')],
  },
  DerivedValue: {
    props: {cell: {path: '/cell'}, format: {kind: 'currency', currency: 'USD'}},
    data: {cell: {value: 899, contributed: 1, of: 2, absent: ['shop-b:list']}},
  },
  SortControl: {
    props: {sort: {path: '/sorts/0'}},
    data: {
      sorts: [
        {
          path: '/rows',
          options: [
            {key: '/when', label: 'Time'},
            {key: '/what', label: 'Title'},
          ],
          key: '/when',
          direction: 'asc',
        },
      ],
    },
  },
};

/**
 * A minimal valid tree for the component: `root` is the component itself, then the leaves the
 * sample needed. `overrides` is the sweep's one varied prop.
 */
export function sampleTree(
  schema: CatalogSchema,
  name: string,
  overrides: Record<string, unknown> = {},
): Sample {
  const def = schema.components[name];
  if (!def) throw new Error(`no component ${name} in the schema`);
  const leaves: TreeComponent[] = [];
  const ctx: SampleContext = {
    leaves,
    leaf() {
      const id = `leaf-${leaves.length + 1}`;
      leaves.push(text(id, `Child ${leaves.length + 1}`));
      return id;
    },
  };
  const seed = SEEDS[name];
  const sampled = sampleObject(ownProps(def), ctx);
  delete sampled.component;
  const root: TreeComponent = {
    ...sampled,
    ...(seed?.props ?? {}),
    ...overrides,
    id: 'root',
    component: name,
  };
  return {
    components: [root, ...(seed?.extra ?? []), ...leaves],
    data: seed?.data ?? {},
  };
}

/** The whole sweep for one component: the seeded default, then one tree per enum value. */
export function sweep(
  schema: CatalogSchema,
  name: string,
): Array<{label: string; prop?: string; value?: string; sample: Sample}> {
  return [
    {label: 'default', sample: sampleTree(schema, name)},
    ...enumProps(schema, name).flatMap(({prop, values}) =>
      values.map(value => ({
        label: `${prop}=${value}`,
        prop,
        value,
        sample: sampleTree(schema, name, {[prop]: value}),
      })),
    ),
  ];
}
