import {describe, expect, test} from 'vitest';
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
    expect(checkPaint(paint(VENDOR), check)).toEqual([]);
    expect(checkPaint(paint(BASIC_CATALOG_ID), check)).toEqual([]);
  });

  test('no createSurface is no paint', () => {
    expect(checkPaint([], check)).toEqual(['the answer paints nothing: no createSurface']);
    expect(checkPaint([{version: 'v0.9', updateDataModel: {surfaceId: 'main'}}], check)).toEqual([
      'the answer paints nothing: no createSurface',
    ]);
  });

  test('a surface outside the entitlement, or in a catalog with no schema', () => {
    expect(checkPaint(paint('cat/v2'), check)).toEqual([
      'surface "main" is painted in catalog "cat/v2", outside the entitlement',
    ]);
    expect(checkPaint(paint(VENDOR), {entitlement: [VENDOR], schemaFor: () => undefined})).toEqual([
      'surface "main": no schema for catalog "cat/v1"',
    ]);
    expect(checkPaint([{version: 'v0.9', createSurface: {surfaceId: 'main'}}], check)).toEqual([
      'surface "main": createSurface names no catalogId',
    ]);
  });

  test('a tree that does not validate against its catalog, named by surface', () => {
    const findings = checkPaint(paint(VENDOR, [{id: 'root', component: 'Nope'}]), check);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/^surface "main": .*Unknown component type: "Nope"/);
  });

  test('a credential input, named by surface', () => {
    const findings = checkPaint(
      paint(VENDOR, [{id: 'root', component: 'TextField', label: 'Password', variant: 'obscured'}]),
      check,
    );
    expect(findings).toEqual([
      'surface "main": a credential input: the TextField component\'s variant "obscured"',
    ]);
  });

  test('two surfaces are checked each against its own catalog', () => {
    const messages = [
      ...paint(VENDOR),
      {version: 'v0.9', createSurface: {surfaceId: 'aside', catalogId: 'cat/v2'}},
    ];
    expect(checkPaint(messages, check)).toEqual([
      'surface "aside" is painted in catalog "cat/v2", outside the entitlement',
    ]);
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
