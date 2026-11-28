/**
 * The catalog gate's four checks over a catalog document (task-21.10 decisions 14 and 23.6):
 * upstream's v1 basic catalog passes all four; a v0.9 document fails.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {catalogDocumentErrors} from './catalogDocument';
import type {A2uiCatalogSchema} from './types';

const spec = new URL('../../../a2ui-spec/', import.meta.url);
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, spec), 'utf8')) as A2uiCatalogSchema;
const basic = read('catalogs/basic/v1/catalog.json');

const v09: A2uiCatalogSchema = {
  catalogId: 'https://vendor.example/v0_9/catalog.json',
  components: {
    Badge: {
      type: 'object',
      allOf: [
        {$ref: 'https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon'},
        {
          properties: {
            component: {const: 'Badge'},
            label: {
              $ref: 'https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString',
            },
          },
          required: ['component', 'label'],
        },
      ],
      unevaluatedProperties: false,
    },
  },
};

describe('catalogDocumentErrors', () => {
  test("upstream's v1 basic catalog passes all four", () => {
    expect(catalogDocumentErrors(basic)).toEqual([]);
  });

  test('a catalog of conformance test data at 1.0 passes', () => {
    expect(
      catalogDocumentErrors(
        read('conformance/test_data/catalogs/allowed_callers_catalog_v1_0.json'),
      ),
    ).toEqual([]);
  });

  test('a v0.9 document fails: no protocolVersion, and references the common types cannot reach', () => {
    const errors = catalogDocumentErrors(v09);
    expect(errors[0]).toMatch(/^declares no protocolVersion/);
    expect(errors).toContainEqual(expect.stringMatching(/^components\/Badge: /));
  });

  test('a protocolVersion other than 1.0 is named', () => {
    expect(catalogDocumentErrors({...basic, protocolVersion: '0.9'})).toContainEqual(
      'protocolVersion is "0.9", not "1.0"',
    );
  });

  test('a document the release cannot load at 1.0 says why', () => {
    const named = {
      ...basic,
      components: {...basic.components, 'Action.Menu': basic.components!.Text},
    };
    expect(catalogDocumentErrors(named)).toContainEqual(
      expect.stringMatching(/^does not load at A2UI 1\.0: /),
    );
  });

  test('a document catalog_definition.json refuses is a finding at the place', () => {
    expect(catalogDocumentErrors({...basic, theme: {primaryColor: '#000'}})).toContainEqual(
      expect.stringMatching(/^catalog_definition\.json/),
    );
  });

  test('anything but an object with components is one error', () => {
    expect(catalogDocumentErrors([])).toEqual(['not a JSON object']);
    expect(catalogDocumentErrors({catalogId: 'x'})).toEqual(['components is not an object']);
  });
});
