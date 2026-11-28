/**
 * The A2UI validator over upstream's v1 basic catalog: what the conformance suite does not show —
 * the real message shapes, props and functions through the catalog, each bad component a finding
 * beside the graph's first failure, the stamp, several catalogs on one surface — and how a finding
 * reads.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import type {A2uiCatalogSchema, A2uiComponent} from './types';
import {createA2uiValidator, formatA2uiFinding} from './validator';

const basic = JSON.parse(
  readFileSync(
    new URL('../../../a2ui-spec/catalogs/basic/v1/catalog.json', import.meta.url),
    'utf8',
  ),
) as A2uiCatalogSchema;
const BASIC = basic.catalogId as string;

const validator = createA2uiValidator({catalogs: [basic]});

const surface = (components: A2uiComponent[], version = '1.0') => [
  {version, createSurface: {surfaceId: 's', catalogId: BASIC}},
  {version, updateComponents: {surfaceId: 's', components}},
];

const valid: A2uiComponent[] = [
  {id: 'root', component: 'Column', children: ['title', 'list', 'go']},
  {id: 'title', component: 'Text', text: '### Inbox'},
  {id: 'list', component: 'List', children: {path: '/items', componentId: 'item'}},
  {id: 'item', component: 'Text', text: {'@path': 'subject'}},
  {id: 'goLabel', component: 'Text', text: 'Open'},
  {
    id: 'go',
    component: 'Button',
    child: 'goLabel',
    action: {functionCall: {'@call': 'openUrl', args: {url: 'https://example.com'}}},
  },
];

const clone = <T>(value: T): T => structuredClone(value);

describe('a valid payload', () => {
  test('a surface in the basic catalog has no findings', () => {
    expect(validator.validate(surface(valid))).toEqual([]);
  });

  test('a surface created whole, its components and data inline, has none', () => {
    expect(
      validator.validate({
        version: '1.0',
        createSurface: {
          surfaceId: 's',
          catalogId: BASIC,
          components: valid,
          dataModel: {items: [{subject: 'Hi'}]},
        },
      }),
    ).toEqual([]);
  });

  test('one message, and a data-model update, validate on their own', () => {
    expect(validator.validate({version: '1.0', deleteSurface: {surfaceId: 's'}})).toEqual([]);
    expect(
      validator.validate([
        {version: '1.0', updateDataModel: {surfaceId: 's', path: '/a', value: null}},
      ]),
    ).toEqual([]);
  });

  test('an update without createSurface is incremental: no root is required', () => {
    const [, update] = surface([{id: 'title', component: 'Text', text: 'x'}]);
    expect(validator.validate([update])).toEqual([]);
  });

  test("v1.0's two agent-to-renderer function messages are taken as the release judges them", () => {
    expect(
      validator.validate([
        ...surface(valid),
        {
          version: '1.0',
          callRendererFunction: {
            surfaceId: 's',
            functionCallId: 'c1',
            callFunction: {'@call': 'formatString', catalogId: BASIC, args: {value: 'x'}},
          },
        },
        {version: '1.0', agentFunctionResponse: {functionCallId: 'c2', value: 3}},
      ]),
    ).toEqual([]);
  });
});

describe('the stamp', () => {
  test('every message stamped other than 1.0 is a finding of its own', () => {
    const findings = validator.validate(surface(valid, 'v0.9'));
    expect(findings).toEqual([
      expect.objectContaining({path: '/0', message: expect.stringContaining("'v0.9'")}),
      expect.objectContaining({path: '/1', message: expect.stringContaining("'v0.9'")}),
    ]);
  });

  test('a v0.9 update on a surface created at 1.0 is a finding', () => {
    const [create] = surface(valid);
    const [, update] = surface(valid, 'v0.9');
    expect(validator.validate([create, update])).toEqual([
      {
        category: 'ValidationError',
        path: '/1',
        message: "Message version 'v0.9' does not match expected target version '1.0'",
      },
    ]);
  });
});

describe('the schema', () => {
  test('an envelope missing its version, or of no known type, is one finding', () => {
    expect(validator.validate([{createSurface: {surfaceId: 's', catalogId: BASIC}}])).toEqual([
      expect.objectContaining({category: 'ValidationError', path: '/0'}),
    ]);
    expect(validator.validate([{version: '1.0', paint: {}}])).toEqual([
      expect.objectContaining({category: 'ValidationError', path: '/0'}),
    ]);
  });

  test('an unknown component is named, and nothing else is said about it', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Heading', text: 'Inbox'};
    expect(validator.validate(surface(components))).toEqual([
      {
        category: 'ValidationError',
        path: '/1/updateComponents/components/1/component',
        componentId: 'title',
        message: expect.stringMatching(/^Unknown component type 'Heading'/),
      },
    ]);
  });

  test('a bad prop is one line at that prop', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Text', text: 'Inbox', variant: 'h3'};
    const findings = validator.validate(surface(components));
    expect(findings).toHaveLength(1);
    expect(formatA2uiFinding(findings[0]!)).toMatch(
      /^\/1\/updateComponents\/components\/1\/variant \(title\): Invalid enum value/,
    );
  });

  test('a bad prop of a component created inline is found under createSurface', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Text', text: 'Inbox', variant: 'h3'};
    const findings = validator.validate({
      version: '1.0',
      createSurface: {surfaceId: 's', catalogId: BASIC, components},
    });
    expect(findings.map(f => f.path)).toEqual(['/0/createSurface/components/1/variant']);
  });

  test('a prop the component does not declare is refused by name, at the key', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Text', text: 'Inbox', colour: 'red'};
    expect(validator.validate(surface(components))).toEqual([
      {
        category: 'ValidationError',
        path: '/1/updateComponents/components/1/colour',
        componentId: 'title',
        message: "Unrecognized key(s) in object: 'colour'",
      },
    ]);
  });

  test('a function the catalog does not declare is refused by name, once', () => {
    const components = clone(valid);
    components[5] = {
      ...components[5]!,
      action: {functionCall: {'@call': 'openStore', args: {query: 'flights'}}},
    };
    expect(validator.validate(surface(components))).toEqual([
      {
        category: 'ValidationError',
        path: '/1/updateComponents/components/5/action/functionCall/@call',
        componentId: 'go',
        message: expect.stringContaining("'openStore'"),
      },
    ]);
  });

  test('a callRendererFunction naming no catalog is refused, as the release refuses it', () => {
    expect(
      validator.validate([
        ...surface(valid),
        {
          version: '1.0',
          callRendererFunction: {
            surfaceId: 's',
            functionCallId: 'c1',
            callFunction: {'@call': 'formatString', args: {value: 'x'}},
          },
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        path: '/2',
        message: expect.stringContaining('callFunction.catalogId'),
      }),
    ]);
  });
});

describe('several catalogs', () => {
  const VENDOR = 'https://vendor.example/catalog.json';
  const vendor: A2uiCatalogSchema = {
    catalogId: VENDOR,
    protocolVersion: '1.0',
    components: {
      Badge: {
        type: 'object',
        properties: {
          component: {const: 'Badge'},
          label: {$ref: 'common_types.json#/$defs/DynamicString'},
        },
        required: ['component', 'label'],
      },
    },
  };
  const mixed = createA2uiValidator({catalogs: [basic, vendor]});
  const badge = (extra: Record<string, unknown> = {}): A2uiComponent => ({
    id: 'badge',
    component: 'Badge',
    '@catalogId': VENDOR,
    label: 'New',
    ...extra,
  });
  const tree = (child: A2uiComponent) => [
    {version: '1.0', createSurface: {surfaceId: 's', catalogId: BASIC}},
    {
      version: '1.0',
      updateComponents: {
        surfaceId: 's',
        components: [{id: 'root', component: 'Column', children: ['badge']}, child],
      },
    },
  ];

  test('a component naming a second catalog is judged against that catalog', () => {
    expect(mixed.validate(tree(badge()))).toEqual([]);
    expect(mixed.validate(tree(badge({tone: 'loud'})))).toEqual([
      expect.objectContaining({
        path: '/1/updateComponents/components/1/tone',
        componentId: 'badge',
      }),
    ]);
  });

  test('a component naming a catalog the validator was not given is refused', () => {
    const {'@catalogId': _named, ...unnamed} = badge();
    expect(validator.validate(tree(badge())).map(f => f.componentId)).toEqual(['badge']);
    expect(mixed.validate(tree(unnamed as A2uiComponent)).map(f => f.message)).toEqual([
      expect.stringMatching(/^Unknown component type 'Badge'/),
    ]);
  });
});

describe('the component graph', () => {
  test('a dangling child is found with the field that names it', () => {
    const components = clone(valid);
    components[0] = {id: 'root', component: 'Column', children: ['title', 'ghost']};
    expect(validator.validate(surface(components)).map(f => f.message)).toContainEqual(
      expect.stringContaining(
        "Component 'root' references non-existent component 'ghost' in field 'children[1]'",
      ),
    );
  });

  test('a template naming a missing component is dangling', () => {
    const components = clone(valid);
    components[2] = {id: 'list', component: 'List', children: {path: '/items', componentId: 'row'}};
    expect(validator.validate(surface(components)).map(f => f.message)).toContainEqual(
      expect.stringContaining("Component 'list' references non-existent component 'row'"),
    );
  });

  test('a surface without root is refused; so are duplicate ids', () => {
    const noRoot = valid.map(c => (c.id === 'root' ? {...c, id: 'top'} : c));
    expect(validator.validate(surface(noRoot)).map(f => f.message)).toContainEqual(
      expect.stringContaining('Missing root component'),
    );
    const duplicate = [...clone(valid), {id: 'title', component: 'Text', text: 'again'}];
    expect(validator.validate(surface(duplicate)).map(f => f.message)).toContain(
      "Duplicate component ID: 'title'",
    );
  });

  test('a cycle is refused', () => {
    const cycle: A2uiComponent[] = [
      {id: 'root', component: 'Card', child: 'inner'},
      {id: 'inner', component: 'Card', child: 'root'},
    ];
    expect(validator.validate(surface(cycle))).toEqual([
      expect.objectContaining({
        category: 'RecursionError',
        message: expect.stringContaining('Circular reference detected'),
      }),
    ]);
  });

  test('a component nothing reaches from root is an orphan', () => {
    const orphan = [...clone(valid), {id: 'stray', component: 'Text', text: 'x'}];
    expect(validator.validate(surface(orphan))).toEqual([
      expect.objectContaining({
        category: 'IntegrityError',
        message: expect.stringMatching(/^Component 'stray' is not reachable from 'root'/),
      }),
    ]);
  });

  test('a malformed binding path is refused', () => {
    const components = clone(valid);
    components[3] = {id: 'item', component: 'Text', text: {'@path': '/bad/~2'}};
    expect(validator.validate(surface(components)).map(f => f.message)).toContainEqual(
      expect.stringContaining("'/bad/~2'"),
    );
  });
});

describe('every bad component, the first failure of the graph', () => {
  test('each bad component is a finding of its own', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Text', text: 'Inbox', variant: 'h3'};
    components[4] = {id: 'goLabel', component: 'Text', text: 'Open', colour: 'red'};
    expect(validator.validate(surface(components)).map(f => f.componentId)).toEqual([
      'title',
      'goLabel',
    ]);
  });

  test('a bad component does not hide the graph: both are found', () => {
    const components = clone(valid);
    components[0] = {id: 'root', component: 'Column', children: ['title', 'ghost']};
    components[1] = {id: 'title', component: 'Text', text: 'Inbox', variant: 'h3'};
    expect(validator.validate(surface(components)).map(f => f.category)).toEqual([
      'ValidationError',
      'IntegrityError',
    ]);
  });

  test('the graph says its first failure only', () => {
    const components = clone(valid);
    components[0] = {id: 'root', component: 'Column', children: ['ghost1', 'ghost2']};
    expect(validator.validate(surface(components))).toEqual([
      expect.objectContaining({message: expect.stringContaining("'ghost1'")}),
    ]);
  });
});
