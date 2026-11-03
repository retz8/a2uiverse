import {describe, expect, test} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {basicCatalog} from '@a2ui/web_core/v0_9/basic_catalog';
import {BASIC_CATALOG_SCHEMA} from './a2ui/spec.generated';
import type {A2uiCatalogSchema} from './a2ui/types';
import {BASIC_CATALOG_ID} from './catalog';
import {
  SMOKE_GREETING,
  a2uiMessagesIn,
  a2uiMessagesOf,
  checkPaint,
  checkSignInAnswer,
  smokeWords,
} from './smoke';

const VENDOR = 'cat/v1';
const vendor = {...(BASIC_CATALOG_SCHEMA as A2uiCatalogSchema), catalogId: VENDOR};
const schemaFor = (id: string) =>
  id === BASIC_CATALOG_ID
    ? (BASIC_CATALOG_SCHEMA as A2uiCatalogSchema)
    : id === VENDOR
      ? vendor
      : undefined;
const check = {entitlement: [BASIC_CATALOG_ID, VENDOR], schemaFor};

const paint = (
  catalogId: string,
  components: unknown[] = [{id: 'root', component: 'Text', text: 'Hi'}],
) => [
  {version: 'v0.9', createSurface: {surfaceId: 'main', catalogId}},
  {version: 'v0.9', updateComponents: {surfaceId: 'main', components}},
];

describe('smokeWords', () => {
  test('the card’s first skill’s first example, else the fixed greeting', () => {
    expect(smokeWords({skills: [{examples: ['show my inbox', 'x']}, {examples: ['y']}]})).toBe(
      'show my inbox',
    );
    expect(smokeWords({skills: [{examples: []}, {examples: ['y']}]})).toBe(SMOKE_GREETING);
    expect(smokeWords({skills: [{examples: ['  ']}]})).toBe(SMOKE_GREETING);
    expect(smokeWords({})).toBe(SMOKE_GREETING);
    expect(SMOKE_GREETING).toBe('Hello! Show me what you can do.');
  });
});

describe('a2uiMessagesIn / a2uiMessagesOf', () => {
  test('one message per data part, or the messages list form; other parts skipped', () => {
    const one = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'c'}};
    const two = {version: 'v0.9', deleteSurface: {surfaceId: 's'}};
    expect(a2uiMessagesIn(one)).toEqual([one]);
    expect(a2uiMessagesIn({messages: [one, two, {noVersion: true}]})).toEqual([one, two]);
    expect(a2uiMessagesIn({paintMeta: {surfaceId: 's'}})).toEqual([]);
    expect(a2uiMessagesIn('text')).toEqual([]);
    expect(
      a2uiMessagesOf([
        {kind: 'text', text: 'hello'},
        {kind: 'data', data: one},
        {kind: 'data', data: {messages: [two]}},
        {kind: 'file'},
      ]),
    ).toEqual([one, two]);
  });
});

describe('checkPaint', () => {
  test('a paint in an entitled catalog that validates and asks for no credential passes', () => {
    expect(checkPaint(paint(VENDOR), check).findings).toEqual([]);
    expect(checkPaint(paint(BASIC_CATALOG_ID), check).findings).toEqual([]);
  });

  test('no createSurface is no paint', () => {
    expect(checkPaint([], check)).toEqual({
      findings: ['the answer paints nothing: no createSurface'],
      paint: [],
    });
    expect(
      checkPaint([{version: 'v0.9', updateDataModel: {surfaceId: 'main'}}], check).findings,
    ).toEqual(['the answer paints nothing: no createSurface']);
  });

  test('a surface outside the entitlement, or in a catalog with no schema', () => {
    expect(checkPaint(paint('cat/v2'), check).findings).toEqual([
      'surface "main" is painted in catalog "cat/v2", outside its entitlement',
    ]);
    expect(
      checkPaint(paint(VENDOR), {entitlement: [VENDOR], schemaFor: () => undefined}).findings,
    ).toEqual(['surface "main": no schema for catalog "cat/v1"']);
    expect(
      checkPaint([{version: 'v0.9', createSurface: {surfaceId: 'main'}}], check).findings,
    ).toEqual(['surface "main": createSurface names no catalogId']);
  });

  test('over a map by version, a surface is judged against the set of its stamp (task-19.2 decision 6)', () => {
    const byVersion = {
      entitlement: {'v0.9': [BASIC_CATALOG_ID], 'v0.9.1': [BASIC_CATALOG_ID, VENDOR]},
      schemaFor,
    };
    const stamped = (version: string) => [
      {version, createSurface: {surfaceId: 'main', catalogId: VENDOR}},
      {
        version,
        updateComponents: {
          surfaceId: 'main',
          components: [{id: 'root', component: 'Text', text: 'Hi'}],
        },
      },
    ];
    expect(checkPaint(stamped('v0.9.1'), byVersion).findings).toEqual([]);
    expect(checkPaint(stamped('v0.9'), byVersion).findings).toEqual([
      'surface "main" is painted in catalog "cat/v1" stamped v0.9, which its card declares for v0.9.1 only',
    ]);
    // A stamp that is neither version is checked against the union, and left to the validator.
    const unspoken = checkPaint(stamped('v1.0'), byVersion).findings;
    expect(unspoken.length).toBeGreaterThan(0);
    expect(unspoken.some(f => /version/.test(f))).toBe(true);
    expect(unspoken.some(f => /painted in/.test(f))).toBe(false);
    expect(checkPaint(paint('cat/v2'), byVersion).findings).toEqual([
      'surface "main" is painted in catalog "cat/v2", outside its entitlement',
    ]);
  });

  test('a tree that does not validate against its catalog, named by surface', () => {
    const {findings} = checkPaint(paint(VENDOR, [{id: 'root', component: 'Nope'}]), check);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/^surface "main": .*Unknown component type 'Nope'/);
  });

  test('a credential input, named by surface', () => {
    const {findings} = checkPaint(
      paint(VENDOR, [{id: 'root', component: 'TextField', label: 'Password', variant: 'obscured'}]),
      check,
    );
    expect(findings).toEqual([
      'surface "main": a credential input: the TextField component\'s variant "obscured"',
    ]);
  });

  /**
   * A model-mode agent streams its tree as it writes it, the way the kit's streaming parser does:
   * every update sends the tree so far again, a component half-written until a later copy completes
   * it, a `loading_*` placeholder standing where a child has not arrived (Shop A's live stream).
   */
  const streamed = (button: Record<string, unknown>) => [
    {version: 'v0.9', createSurface: {surfaceId: 'main', catalogId: VENDOR}},
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'main',
        components: [
          {id: 'root', component: 'Card', child: 'body'},
          {id: 'body', component: 'Column', children: ['loading_title']},
          {id: 'loading_title', component: 'Row', children: []},
        ],
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'main',
        components: [
          {id: 'root', component: 'Card', child: 'body'},
          {id: 'body', component: 'Column', children: ['title', 'sort']},
          {id: 'title', component: 'Text', text: 'Cameras'},
          {id: 'sort', component: 'Button', variant: 'borderless'},
        ],
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'main',
        components: [
          {id: 'root', component: 'Card', child: 'body'},
          {id: 'body', component: 'Column', children: ['title', 'sort']},
          {id: 'sort', component: 'Button', variant: 'borderless', ...button},
          {id: 'sort-label', component: 'Text', text: 'Price'},
        ],
      },
    },
  ];

  test('a tree streamed as it is written is judged as it stands at the end', () => {
    const action = {event: {name: 'sort', context: {key: 'price'}}};
    expect(checkPaint(streamed({child: 'sort-label', action}), check).findings).toEqual([]);
  });

  test('a component still invalid when the stream ends is a finding', () => {
    const {findings} = checkPaint(streamed({child: 'sort-label'}), check);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(
      /^surface "main": .*\/action \(sort\): Expected object, received undefined/,
    );
  });

  test('two surfaces are checked each against its own catalog', () => {
    const messages = [
      ...paint(VENDOR),
      {version: 'v0.9', createSurface: {surfaceId: 'aside', catalogId: 'cat/v2'}},
    ];
    expect(checkPaint(messages, check).findings).toEqual([
      'surface "aside" is painted in catalog "cat/v2", outside its entitlement',
    ]);
  });
  test('the paint handed back is settled: one update per surface, each component’s last copy from the root', () => {
    const action = {event: {name: 'sort', context: {key: 'price'}}};
    const {paint: settled} = checkPaint(streamed({child: 'sort-label', action}), check);
    expect(settled).toEqual([
      {version: 'v0.9', createSurface: {surfaceId: 'main', catalogId: VENDOR}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [
            {id: 'root', component: 'Card', child: 'body'},
            {id: 'body', component: 'Column', children: ['title', 'sort']},
            {id: 'title', component: 'Text', text: 'Cameras'},
            {id: 'sort', component: 'Button', variant: 'borderless', child: 'sort-label', action},
            {id: 'sort-label', component: 'Text', text: 'Price'},
          ],
        },
      },
    ]);
  });

  test('the settled paint draws message by message where the stream as sent does not', () => {
    const action = {event: {name: 'sort', context: {key: 'price'}}};
    const inBasic = streamed({child: 'sort-label', action}).map(message =>
      message.createSurface
        ? {version: 'v0.9', createSurface: {surfaceId: 'main', catalogId: BASIC_CATALOG_ID}}
        : message,
    );
    const failures = (messages: readonly Record<string, unknown>[]) => {
      const processor = new MessageProcessor([basicCatalog]);
      let failed = 0;
      for (const message of messages) {
        try {
          processor.processMessages([message] as Parameters<typeof processor.processMessages>[0]);
        } catch {
          failed += 1;
        }
      }
      return {failed, surfaces: processor.model.surfacesMap.size};
    };
    expect(failures(inBasic).failed).toBeGreaterThan(0);
    const judged = checkPaint(inBasic, check);
    expect(judged.findings).toEqual([]);
    expect(failures(judged.paint)).toEqual({failed: 0, surfaces: 1});
  });

  test('every other message as sent, in its place; surfaces interleaved each settled at its first update', () => {
    const text = (id: string, words: string) => ({id, component: 'Text', text: words});
    const data = {version: 'v0.9', updateDataModel: {surfaceId: 'a', path: '/n', value: 1}};
    const messages = [
      {version: 'v0.9', createSurface: {surfaceId: 'a', catalogId: VENDOR}},
      {version: 'v0.9', createSurface: {surfaceId: 'b', catalogId: BASIC_CATALOG_ID}},
      {version: 'v0.9', updateComponents: {surfaceId: 'a', components: [text('root', 'A1')]}},
      {version: 'v0.9', updateComponents: {surfaceId: 'b', components: [text('root', 'B')]}},
      data,
      {version: 'v0.9', updateComponents: {surfaceId: 'a', components: [text('root', 'A2')]}},
    ];
    const judged = checkPaint(messages, check);
    expect(judged.findings).toEqual([]);
    expect(judged.paint).toEqual([
      messages[0],
      messages[1],
      {version: 'v0.9', updateComponents: {surfaceId: 'a', components: [text('root', 'A2')]}},
      messages[3],
      data,
    ]);
  });

  test('a whole paint is handed back as it is, and settling it again changes nothing', () => {
    const whole = [
      ...paint(VENDOR),
      {version: 'v0.9', updateDataModel: {surfaceId: 'main', path: '/n', value: 1}},
    ];
    const {paint: settled} = checkPaint(whole, check);
    expect(settled).toEqual(whole);
    expect(checkPaint(settled, check).paint).toEqual(settled);
  });

  test('a tree sent in pieces, each new, is handed back as one update with the same components', () => {
    const messages = [
      {version: 'v0.9', createSurface: {surfaceId: 'main', catalogId: VENDOR}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [{id: 'root', component: 'Column', children: ['one', 'two']}],
        },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [{id: 'one', component: 'Text', text: '1'}],
        },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [{id: 'two', component: 'Text', text: '2'}],
        },
      },
    ];
    const judged = checkPaint(messages, check);
    expect(judged.findings).toEqual([]);
    expect(judged.paint).toEqual([
      messages[0],
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [
            {id: 'root', component: 'Column', children: ['one', 'two']},
            {id: 'one', component: 'Text', text: '1'},
            {id: 'two', component: 'Text', text: '2'},
          ],
        },
      },
    ]);
  });

  test('what the check never judged is not in the paint: a surface no create made, a creation replaced', () => {
    const messages = [
      {version: 'v0.9', updateDataModel: {surfaceId: 'early', path: '/n', value: 1}},
      ...paint(VENDOR, [{id: 'root', component: 'Text', text: 'first'}]),
      ...paint(VENDOR, [{id: 'root', component: 'Text', text: 'second'}]),
      {version: 'v0.9', updateDataModel: {surfaceId: 'nowhere', path: '/n', value: 1}},
    ];
    const judged = checkPaint(messages, check);
    expect(judged.findings).toEqual([]);
    expect(judged.paint).toEqual(paint(VENDOR, [{id: 'root', component: 'Text', text: 'second'}]));
  });
});

describe('checkSignInAnswer', () => {
  const card = {securitySchemes: {oauth: {type: 'oauth2'}}};

  test('an HTTP 401 passes', () => {
    expect(checkSignInAnswer({httpStatus: 401}, card)).toEqual([]);
  });

  test('an auth-required task naming a scheme the card declares passes', () => {
    expect(
      checkSignInAnswer(
        {taskState: 'auth-required', data: {security: [{oauth: ['mail.read']}]}},
        card,
      ),
    ).toEqual([]);
  });

  test('an auth-required task naming a scheme the card does not declare, or no requirement', () => {
    expect(
      checkSignInAnswer({taskState: 'auth-required', data: {security: [{apiKey: []}]}}, card),
    ).toEqual(['the auth-required answer names scheme "apiKey", which the card does not declare']);
    expect(checkSignInAnswer({taskState: 'auth-required', data: {}}, card)).toEqual([
      'the auth-required answer carries no security requirement',
    ]);
  });

  test('anything else is not a sign-in answer', () => {
    expect(checkSignInAnswer({httpStatus: 200, taskState: 'completed'}, card)).toEqual([
      'the agent answered HTTP 200, a task in state "completed" instead of asking to sign in: an HTTP 401 or an auth-required task',
    ]);
    expect(checkSignInAnswer({}, card)).toEqual([
      'the agent answered nothing instead of asking to sign in: an HTTP 401 or an auth-required task',
    ]);
  });
});
