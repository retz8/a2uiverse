/**
 * The converter's rules, each on its own (task-21.11 decision 19): the guide's three exclusions, an
 * id renamed with every reference to it, the stop on a collision, the stop on an unsettled position,
 * a value that does not fit left as written, and the rest of what the guide names.
 */
import {describe, expect, it} from 'vitest';
import type {CatalogMap} from './catalogMap.js';
import {convertRecorded, type ConvertOptions} from './convert.js';
import {isIdentifier} from './identifier.js';
import {readCatalogShape} from './positions.js';

const COMMON = 'https://a2ui.org/specification/v0_9/common_types.json#/$defs/';
const ref = (name: string) => ({$ref: `${COMMON}${name}`});
const component = (name: string, properties: Record<string, unknown>, ...mixins: string[]) => ({
  type: 'object',
  allOf: [
    ref('ComponentCommon'),
    ...mixins.map(ref),
    {
      type: 'object',
      properties: {component: {const: name}, ...properties},
      required: ['component'],
    },
  ],
  unevaluatedProperties: false,
});

const OLD = 'https://example.test/old/catalog.json';
const NEW = 'https://example.test/new/catalog.json';

const CATALOG = {
  catalogId: OLD,
  components: {
    Text: component('Text', {
      text: ref('DynamicString'),
      variant: {type: 'string', enum: ['h1', 'h2', 'body']},
    }),
    Column: component('Column', {children: ref('ChildList')}),
    Card: component('Card', {child: ref('ComponentId'), meta: {type: 'object'}}),
    Icon: component('Icon', {
      name: {oneOf: [{type: 'string', enum: ['call', 'star']}, ref('DataBinding')]},
    }),
    Button: component('Button', {child: ref('ComponentId'), action: ref('Action')}),
    Field: component('Field', {value: ref('DynamicString')}, 'Checkable'),
    Pick: component('Pick', {trailing: {oneOf: [ref('ComponentId'), {type: 'string'}]}}),
    'Item.Row': component('Item.Row', {'aria-label': {type: 'string'}}),
  },
  functions: {
    required: {
      type: 'object',
      properties: {
        call: {const: 'required'},
        args: {type: 'object', properties: {value: {description: 'The value.'}}},
        returnType: {const: 'boolean'},
      },
    },
    formatString: {
      type: 'object',
      properties: {
        call: {const: 'formatString'},
        args: {type: 'object', properties: {value: ref('DynamicString')}},
      },
    },
  },
};

const MAP: CatalogMap = {
  name: 'test',
  from: {catalogId: OLD, repo: 'a2uiverse', path: 'old.json'},
  to: {catalogId: NEW, repo: 'a2uiverse', path: 'new.json'},
  heading: 'Text',
};

const shape = readCatalogShape(CATALOG);
const options = (map: CatalogMap | null = MAP): ConvertOptions => ({
  catalogOf: id => (id === OLD ? {shape, ...(map ? {map} : {})} : undefined),
});

const create = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: OLD}};
const update = (...components: unknown[]) => ({
  version: 'v0.9',
  updateComponents: {surfaceId: 's', components},
});
const convert = (messages: unknown[], map?: CatalogMap | null) =>
  convertRecorded(messages, options(map));
const components = (value: unknown) =>
  (
    (value as Record<string, {components: unknown[]}>[])[1]!.updateComponents as {
      components: unknown[];
    }
  ).components;

describe('the identifier rule', () => {
  it('holds the protocol document examples', () => {
    expect(isIdentifier('user_card')).toBe(true);
    expect(isIdentifier('userCard')).toBe(true);
    expect(isIdentifier('user-card')).toBe(false);
    expect(isIdentifier('1st_item')).toBe(false);
  });
});

describe("the guide's exclusions", () => {
  it("leaves a ChildList template's path unprefixed, renaming its componentId", () => {
    const out = convert([
      create,
      update({
        id: 'list',
        component: 'Column',
        children: {componentId: 'row-item', path: '/items'},
      }),
    ]);
    expect(components(out.value)[0]).toEqual({
      id: 'list',
      component: 'Column',
      children: {componentId: 'row_item', path: '/items'},
    });
  });

  it("leaves updateDataModel's path as a message parameter", () => {
    const out = convert([
      create,
      {version: 'v0.9', updateDataModel: {surfaceId: 's', path: '/a', value: {path: '/b'}}},
    ]);
    expect((out.value as unknown[])[1]).toEqual({
      version: '1.0',
      updateDataModel: {surfaceId: 's', path: '/a', value: {path: '/b'}},
    });
  });

  it('leaves a "call" that is data', () => {
    const out = convert([create, update({id: 'phone', component: 'Icon', name: 'call'})]);
    expect(components(out.value)[0]).toEqual({id: 'phone', component: 'Icon', name: 'call'});
    expect(out.stops).toEqual([]);
  });
});

describe('a component id the identifier rule refuses', () => {
  it('is renamed with every reference to it, a data string reported and kept', () => {
    const beat = {
      name: 'beat',
      turns: [
        {
          kind: 'utterance',
          batches: [
            {
              messages: [
                create,
                update(
                  {id: 'root', component: 'Column', children: ['pr-card', 'ok']},
                  {id: 'pr-card', component: 'Card', child: 'pr-title'},
                  {id: 'pr-title', component: 'Text', text: 'PR'},
                  {id: 'ok', component: 'Text', text: 'Fine'},
                ),
                {
                  version: 'v0.9',
                  updateDataModel: {surfaceId: 's', path: '/focus', value: 'pr-card'},
                },
              ],
            },
          ],
        },
        {
          kind: 'surface-action',
          action: {name: 'open', surfaceId: 's', sourceComponentId: 'pr-card'},
          batches: [],
        },
      ],
    };
    const out = convertRecorded(beat, options());
    const turns = (out.value as typeof beat).turns;
    expect(components([null, turns[0]!.batches[0]!.messages[1]])).toEqual([
      {id: 'root', component: 'Column', children: ['pr_card', 'ok']},
      {id: 'pr_card', component: 'Card', child: 'pr_title'},
      {id: 'pr_title', component: 'Text', text: 'PR'},
      {id: 'ok', component: 'Text', text: 'Fine'},
    ]);
    expect(turns[1]!.action).toMatchObject({sourceComponentId: 'pr_card'});
    expect(
      (turns[0]!.batches[0]!.messages[2] as {updateDataModel: unknown}).updateDataModel,
    ).toMatchObject({
      value: 'pr-card',
    });
    expect(out.renamed).toEqual({'pr-card': 'pr_card', 'pr-title': 'pr_title'});
    expect(out.dataStrings).toHaveLength(1);
    expect(out.stops).toEqual([]);
  });

  it('stops the run when two of a surface land on one id', () => {
    const out = convert([
      create,
      update({id: 'a-b', component: 'Text', text: 'x'}, {id: 'a_b', component: 'Text', text: 'y'}),
    ]);
    expect(out.stops).toEqual(['surface s: "a-b" and "a_b" both become "a_b"']);
  });

  it('stops the run when the rewrite does not make it conform', () => {
    const out = convert([create, update({id: '1st-item', component: 'Text', text: 'x'})]);
    expect(out.stops).toEqual(['component id "1st-item" is not an identifier even as "1st_item"']);
  });
});

describe('positions', () => {
  it('stops at a value whose position the catalog does not settle', () => {
    const out = convert([create, update({id: 'p', component: 'Pick', trailing: 'chevron'})]);
    expect(out.stops).toHaveLength(1);
    expect(out.stops[0]).toMatch(/trailing: the catalog does not settle what this holds/);
  });

  it('leaves a value that does not fit its position as written', () => {
    const out = convert([create, update({id: 'root', component: 'Column', children: 0})]);
    expect(components(out.value)[0]).toEqual({id: 'root', component: 'Column', children: 0});
    expect(out.misfits).toEqual([
      'message 1 (s)/updateComponents/components/0/children: neither a list of ids nor a template',
    ]);
    expect(out.stops).toEqual([]);
  });

  it('leaves a literal object property as written, a path inside it among it', () => {
    const out = convert([
      create,
      update({id: 'c', component: 'Card', child: 'x', meta: {path: '/p'}}),
    ]);
    expect(components(out.value)[0]).toMatchObject({meta: {path: '/p'}});
  });

  it('rewrites a binding and a call, dropping returnType, reading arguments by the function', () => {
    const out = convert([
      create,
      update(
        {
          id: 'f',
          component: 'Field',
          value: {path: '/email'},
          checks: [
            {
              condition: {call: 'required', args: {value: {path: '/email'}}, returnType: 'boolean'},
              message: 'Needed',
            },
          ],
        },
        {
          id: 'b',
          component: 'Button',
          child: 'f',
          action: {event: {name: 'send', context: {to: {path: '/to'}, n: 1}}},
        },
      ),
    ]);
    expect(components(out.value)).toEqual([
      {
        id: 'f',
        component: 'Field',
        value: {'@path': '/email'},
        '@checks': [
          {condition: {'@call': 'required', args: {value: {'@path': '/email'}}}, message: 'Needed'},
        ],
      },
      {
        id: 'b',
        component: 'Button',
        child: 'f',
        action: {event: {name: 'send', context: {to: {'@path': '/to'}, n: 1}}},
      },
    ]);
  });

  it('prefixes the accessibility mixin', () => {
    const out = convert([
      create,
      update({id: 't', component: 'Text', text: 'x', accessibility: {label: {path: '/l'}}}),
    ]);
    expect(components(out.value)[0]).toEqual({
      id: 't',
      component: 'Text',
      text: 'x',
      '@accessibility': {label: {'@path': '/l'}},
    });
  });
});

describe('the heading rule', () => {
  it('marks a literal text and a bound one', () => {
    const out = convert([
      create,
      update(
        {id: 'a', component: 'Text', text: 'Hi', variant: 'h2'},
        {id: 'b', component: 'Text', text: {path: '/t'}, variant: 'h1'},
        {id: 'c', component: 'Text', text: 'x', variant: 'body'},
      ),
    ]);
    expect(components(out.value)).toEqual([
      {id: 'a', component: 'Text', text: '## Hi'},
      {id: 'b', component: 'Text', text: {'@call': 'formatString', args: {value: '# ${/t}'}}},
      {id: 'c', component: 'Text', text: 'x', variant: 'body'},
    ]);
  });
});

describe('the messages', () => {
  it('restamps, swaps the catalog id, drops theme and gives a delete its null', () => {
    const out = convert([
      {
        version: 'v0.9.1',
        createSurface: {surfaceId: 's', catalogId: OLD, theme: {primaryColor: '#000000'}},
      },
      {version: 'v0.9', updateDataModel: {surfaceId: 's', path: '/gone'}},
    ]);
    expect(out.value).toEqual([
      {version: '1.0', createSurface: {surfaceId: 's', catalogId: NEW}},
      {version: '1.0', updateDataModel: {surfaceId: 's', path: '/gone', value: null}},
    ]);
    expect(out.versions).toEqual(['v0.9', 'v0.9.1']);
  });

  it('stops at a catalog it holds no map for, and at a name the rule refuses', () => {
    expect(convert([create], null).stops).toEqual([`no map for catalog ${OLD}`]);
    const out = convert([create, update({id: 'r', component: 'Item.Row', 'aria-label': 'x'})]);
    expect(out.stops).toEqual([
      'component name "Item.Row" is not an identifier; its catalog\'s map must rename it',
      'property name "aria-label" of Item.Row is not an identifier; its catalog\'s map must rename it',
    ]);
  });

  it("renames by the map's components and properties", () => {
    const out = convert([create, update({id: 'r', component: 'Item.Row', 'aria-label': 'x'})], {
      ...MAP,
      components: {'Item.Row': 'ItemRow'},
      properties: {'Item.Row': {'aria-label': 'ariaLabel'}},
    });
    expect(components(out.value)[0]).toEqual({id: 'r', component: 'ItemRow', ariaLabel: 'x'});
    expect(out.stops).toEqual([]);
  });

  it('marks a converted beat, and nothing on a bare list', () => {
    const beat = convertRecorded(
      {name: 'b', turns: [{kind: 'utterance', batches: [{messages: [create]}]}]},
      options(),
    );
    expect(beat.value).toMatchObject({convertedFrom: ['v0.9']});
    expect(convert([create]).value).toEqual([
      {version: '1.0', createSurface: {surfaceId: 's', catalogId: NEW}},
    ]);
  });
});
