/**
 * The A2UI validator over the pinned v0.9.1 spec and upstream's basic catalog: what the
 * conformance suite's simplified schemas cannot show — the real message shapes, props, and
 * functions through the catalog — and how a finding reads.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import type {A2uiCatalogSchema, A2uiComponent} from './types';
import {createA2uiValidator, formatA2uiFinding} from './validator';

const basic = JSON.parse(
  readFileSync(
    new URL('../../../a2ui-spec/specification/v0_9_1/catalogs/basic/catalog.json', import.meta.url),
    'utf8',
  ),
) as A2uiCatalogSchema;

const validator = createA2uiValidator({catalog: basic});

const surface = (components: A2uiComponent[]) => [
  {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'c'}},
  {version: 'v0.9', updateComponents: {surfaceId: 's', components}},
];

const valid: A2uiComponent[] = [
  {id: 'root', component: 'Column', children: ['title', 'list', 'go']},
  {id: 'title', component: 'Text', text: 'Inbox', variant: 'h3'},
  {id: 'list', component: 'List', children: {path: '/items', componentId: 'item'}},
  {id: 'item', component: 'Text', text: {path: 'subject'}},
  {id: 'go-label', component: 'Text', text: 'Open'},
  {
    id: 'go',
    component: 'Button',
    child: 'go-label',
    action: {functionCall: {call: 'openUrl', args: {url: 'https://example.com'}}},
  },
];

const clone = <T>(value: T): T => structuredClone(value);

describe('a valid payload', () => {
  test('a surface in the basic catalog has no findings', () => {
    expect(validator.validate(surface(valid))).toEqual([]);
  });

  test('one message, and a data-model update, validate on their own', () => {
    expect(validator.validate({version: 'v0.9.1', deleteSurface: {surfaceId: 's'}})).toEqual([]);
    expect(
      validator.validate([{version: 'v0.9', updateDataModel: {surfaceId: 's', value: {a: 1}}}]),
    ).toEqual([]);
  });

  test('an update without createSurface is incremental: no root is required', () => {
    const [, update] = surface([{id: 'title', component: 'Text', text: 'x'}]);
    expect(validator.validate([update])).toEqual([]);
  });
});

describe('the schema', () => {
  test('an envelope missing its version, or of no known type, is one finding at the message', () => {
    expect(validator.validate([{createSurface: {surfaceId: 's', catalogId: 'c'}}])).toEqual([
      {category: 'ValidationError', path: '/0', message: "must have required property 'version'"},
    ]);
    expect(validator.validate([{version: 'v0.9', paint: {}}]).length).toBeGreaterThan(0);
  });

  test('an unknown component is named, and nothing else is said about it', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Heading', text: 'Inbox'};
    expect(validator.validate(surface(components))).toEqual([
      {
        category: 'ValidationError',
        path: '/1/updateComponents/components/1/component',
        componentId: 'title',
        message: 'Unknown component type: "Heading"',
      },
    ]);
  });

  test('a bad prop is one line at that prop', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Text', text: 'Inbox', variant: 'h9'};
    const findings = validator.validate(surface(components));
    expect(findings).toHaveLength(1);
    expect(formatA2uiFinding(findings[0]!)).toMatch(
      /^\/1\/updateComponents\/components\/1\/variant \(title\): must be equal to one of the allowed values/,
    );
  });

  test('a prop the component does not declare is refused by name', () => {
    const components = clone(valid);
    components[1] = {id: 'title', component: 'Text', text: 'Inbox', colour: 'red'};
    expect(validator.validate(surface(components)).map(f => f.message)).toEqual([
      'must NOT have unevaluated properties ("colour")',
    ]);
  });

  test('a function the catalog does not declare is refused by name, once', () => {
    const components = clone(valid);
    components[5] = {
      ...components[5]!,
      action: {functionCall: {call: 'openStore', args: {query: 'flights'}}},
    };
    expect(validator.validate(surface(components))).toEqual([
      {
        category: 'ValidationError',
        path: '/1/updateComponents/components/5/action/functionCall/call',
        componentId: 'go',
        message: 'Unknown function: "openStore"',
      },
    ]);
  });
});

describe('the component graph', () => {
  test('a dangling child is found with the field that names it', () => {
    const components = clone(valid);
    components[0] = {id: 'root', component: 'Column', children: ['title', 'ghost']};
    expect(validator.validate(surface(components)).map(f => f.message)).toContain(
      "Component 'root' references non-existent component 'ghost' in field 'children'",
    );
  });

  test('a template naming a missing component is dangling', () => {
    const components = clone(valid);
    components[2] = {id: 'list', component: 'List', children: {path: '/items', componentId: 'row'}};
    expect(validator.validate(surface(components)).map(f => f.message)).toContain(
      "Component 'list' references non-existent component 'row' in field 'children.componentId'",
    );
  });

  test('a surface without root is refused; so are duplicate ids', () => {
    const noRoot = valid.map(c => (c.id === 'root' ? {...c, id: 'top'} : c));
    expect(validator.validate(surface(noRoot)).map(f => f.message)).toContain(
      "Missing root component: No component has id='root'",
    );
    const duplicate = [...clone(valid), {id: 'title', component: 'Text', text: 'again'}];
    expect(validator.validate(surface(duplicate)).map(f => f.message)).toContain(
      'Duplicate component ID: title',
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
        message: "Circular reference detected involving component 'root'",
      }),
    ]);
  });

  test('a component nothing reaches from root is an orphan', () => {
    const orphan = [...clone(valid), {id: 'stray', component: 'Text', text: 'x'}];
    expect(validator.validate(surface(orphan))).toEqual([
      {
        category: 'IntegrityError',
        componentId: 'stray',
        message: "Component 'stray' is not reachable from 'root'",
      },
    ]);
  });

  test('a malformed binding path is refused', () => {
    const components = clone(valid);
    components[3] = {id: 'item', component: 'Text', text: {path: '/bad/~2'}};
    expect(validator.validate(surface(components)).map(f => f.message)).toContain(
      "Invalid path syntax: '/bad/~2'",
    );
  });
});
