import {describe, expect, test} from 'vitest';
import {
  basicCatalogOptions,
  catalogOptions,
  credentialInputIn,
  credentialTermIn,
  describeCredentialFinding,
  mergeCatalogOptions,
  wordsOf,
} from './credential';

describe('the terms', () => {
  test('wordsOf splits case changes and separators', () => {
    expect(wordsOf('cardNumber')).toBe('card number');
    expect(wordsOf('OTPField')).toBe('otp field');
    expect(wordsOf('security-code')).toBe('security code');
    expect(wordsOf('pinned_items')).toBe('pinned items');
  });

  test('whole words only: pinned is not pin, a pin is a pushpin alone', () => {
    expect(credentialTermIn('pinned')).toBeUndefined();
    expect(credentialTermIn('pin')).toBeUndefined();
    expect(credentialTermIn('pin-slash')).toBeUndefined();
    expect(credentialTermIn('PinInput')).toBe('pin input');
    expect(credentialTermIn('pinCode')).toBe('pin code');
    expect(credentialTermIn('pin_number')).toBe('pin number');
    expect(credentialTermIn('obscured')).toBe('obscured');
    expect(credentialTermIn('Password')).toBe('password');
  });
});

describe('catalogOptions', () => {
  test("each component's enum and const strings, through the catalog's own $defs, never descriptions", () => {
    const options = catalogOptions({
      components: {
        Field: {
          allOf: [
            {$ref: '#/$defs/Common'},
            {$ref: 'https://example.com/common_types.json#/$defs/Elsewhere'},
            {
              properties: {
                kind: {enum: ['text', 'secret'], description: 'never "password"'},
                mode: {const: 'plain'},
              },
            },
          ],
        },
        Icon: {properties: {name: {enum: ['pin', 'star']}}},
      },
      $defs: {Common: {properties: {weight: {enum: ['light', 'bold']}}}},
    });
    expect([...options.get('Field')!].sort()).toEqual(['bold', 'light', 'plain', 'secret', 'text']);
    expect([...options.get('Icon')!]).toEqual(['pin', 'star']);
  });

  test("the basic catalog's TextField declares obscured", () => {
    expect(basicCatalogOptions().get('TextField')?.has('obscured')).toBe(true);
  });

  test("merged, a component's options are any catalog's", () => {
    const merged = mergeCatalogOptions([
      new Map([['TextField', new Set(['plain'])]]),
      new Map([['TextField', new Set(['obscured'])]]),
    ]);
    expect([...merged.get('TextField')!].sort()).toEqual(['obscured', 'plain']);
  });
});

describe('credentialInputIn', () => {
  const options = new Map([
    ['TextField', new Set(['shortText', 'obscured'])],
    ['Input', new Set(['text', 'password'])],
  ]);

  test('a clean paint, its free text naming passwords included, has none', () => {
    const paint = [
      {id: 'root', component: 'Column', children: ['t', 'f']},
      {id: 't', component: 'Text', text: 'Forgot your password?'},
      {id: 'f', component: 'TextField', label: 'Password', variant: 'shortText'},
      {id: 'g', component: 'TextField', label: 'Name', variant: {path: '/obscured'}},
    ];
    expect(credentialInputIn(paint, options)).toBeUndefined();
  });

  test('a declared option value matching a term', () => {
    const paint = [{id: 'f', component: 'TextField', label: 'Code', variant: 'obscured'}];
    expect(credentialInputIn(paint, options)).toEqual({
      component: 'TextField',
      id: 'f',
      prop: 'variant',
      value: 'obscured',
      term: 'obscured',
    });
    expect(credentialInputIn([{id: 'i', component: 'Input', type: 'password'}], options)).toEqual({
      component: 'Input',
      id: 'i',
      prop: 'type',
      value: 'password',
      term: 'password',
    });
  });

  test('a value its catalog does not declare as an option is free text', () => {
    expect(
      credentialInputIn([{id: 'x', component: 'Badge', label: 'password'}], options),
    ).toBeUndefined();
  });

  test('a component type or a property name', () => {
    expect(credentialInputIn([{id: 'p', component: 'PasswordField'}], options)).toEqual({
      component: 'PasswordField',
      id: 'p',
      term: 'password',
    });
    expect(credentialInputIn([{id: 'c', component: 'Form', cardNumber: ''}], options)).toEqual({
      component: 'Form',
      id: 'c',
      prop: 'cardNumber',
      term: 'card number',
    });
  });

  test('described for the repair', () => {
    expect(
      describeCredentialFinding({
        component: 'TextField',
        prop: 'variant',
        value: 'obscured',
        term: 'obscured',
      }),
    ).toBe('the TextField component\'s variant "obscured"');
    expect(describeCredentialFinding({component: 'Form', prop: 'pinCode', term: 'pin code'})).toBe(
      "the Form component's pinCode property",
    );
    expect(describeCredentialFinding({component: 'PasswordField', term: 'password'})).toBe(
      'the PasswordField component',
    );
  });
});
