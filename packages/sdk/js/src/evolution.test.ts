import {describe, expect, test} from 'vitest';
import type {A2uiCatalogSchema} from './a2ui/types';
import {checkAdditiveEvolution} from './evolution';

const COMMON = 'common_types.json#/$defs/ComponentCommon';

/** A catalog with one component, in the shape vendors' catalogs take. */
function catalog(
  properties: Record<string, unknown>,
  options: {
    required?: string[];
    functions?: Record<string, unknown>;
    defs?: Record<string, unknown>;
    extra?: Record<string, unknown>;
  } = {},
): A2uiCatalogSchema {
  return {
    catalogId: 'cat/v1',
    components: {
      Image: {
        type: 'object',
        allOf: [
          {$ref: COMMON},
          {
            type: 'object',
            properties: {component: {const: 'Image'}, ...properties},
            required: ['component', ...(options.required ?? [])],
          },
        ],
        unevaluatedProperties: false,
      },
      ...(options.extra ?? {}),
    },
    functions: options.functions ?? {required: {type: 'object'}},
    $defs: options.defs ?? {theme: {type: 'object'}},
  };
}

const held = catalog(
  {
    url: {type: 'string', description: 'The image.'},
    fit: {type: 'string', enum: ['contain', 'cover'], default: 'cover'},
    width: {type: 'number', minimum: 1, maximum: 100},
  },
  {required: ['url']},
);

describe('checkAdditiveEvolution — accepted', () => {
  test('the same schema again', () => {
    expect(checkAdditiveEvolution(held, held)).toEqual([]);
  });

  test('a new component, a new function, a new $defs entry, a new optional property, a new enum value', () => {
    const next = catalog(
      {
        url: {type: 'string', description: 'The image.'},
        fit: {type: 'string', enum: ['contain', 'cover', 'fill'], default: 'cover'},
        width: {type: 'number', minimum: 1, maximum: 100},
        alt: {type: 'string'},
      },
      {
        required: ['url'],
        functions: {required: {type: 'object'}, regex: {type: 'object'}},
        defs: {theme: {type: 'object'}, Size: {type: 'string'}},
        extra: {Badge: {type: 'object', properties: {component: {const: 'Badge'}}}},
      },
    );
    expect(checkAdditiveEvolution(held, next)).toEqual([]);
  });

  test('annotations change freely, a property deprecated, a constraint loosened or dropped', () => {
    const next = catalog(
      {
        url: {type: 'string', description: 'The image URL.', title: 'URL', examples: ['x']},
        fit: {
          type: 'string',
          default: 'contain',
          deprecated: true,
          'x-deprecated-reason': 'use variant',
        },
        width: {type: 'number', minimum: 0},
      },
      {required: []},
    );
    expect(checkAdditiveEvolution(held, next)).toEqual([]);
  });

  test('a keyword the walk does not know is ignored', () => {
    const next = catalog(
      {
        url: {type: 'string', format: 'uri', $comment: 'new'},
        fit: {type: 'string', enum: ['contain', 'cover']},
        width: {type: 'number', minimum: 1, maximum: 100},
      },
      {required: ['url']},
    );
    expect(checkAdditiveEvolution(held, next)).toEqual([]);
  });
});

/** v1.0's constraints of a catalog entry, tightened and loosened (task-21.10 decisions 15 and 23.7). */
describe("checkAdditiveEvolution — v1.0's keywords", () => {
  const fn = (extra: Record<string, unknown>): A2uiCatalogSchema => ({
    catalogId: 'cat/v1',
    components: {},
    functions: {
      lookup: {type: 'object', properties: {'@call': {const: 'lookup'}}, ...extra},
    },
  });
  const component = (extra: Record<string, unknown>): A2uiCatalogSchema => ({
    catalogId: 'cat/v1',
    components: {Row: {type: 'object', properties: {component: {const: 'Row'}}, ...extra}},
  });

  test('a changed returnType is a type change', () => {
    expect(checkAdditiveEvolution(fn({returnType: 'string'}), fn({returnType: 'number'}))).toEqual([
      'functions/lookup/returnType: changed from "string" to "number"',
    ]);
  });

  test('allowedCallers narrowed is refused, widened accepted', () => {
    expect(
      checkAdditiveEvolution(
        fn({allowedCallers: 'rendererOrAgent'}),
        fn({allowedCallers: 'rendererOnly'}),
      ),
    ).toEqual([
      'functions/lookup/allowedCallers: narrowed from "rendererOrAgent" to "rendererOnly"',
    ]);
    expect(checkAdditiveEvolution(fn({}), fn({allowedCallers: 'agentOnly'}))).toEqual([
      'functions/lookup/allowedCallers: narrowed from "rendererOnly" to "agentOnly"',
    ]);
    expect(checkAdditiveEvolution(fn({}), fn({allowedCallers: 'rendererOrAgent'}))).toEqual([]);
    expect(
      checkAdditiveEvolution(
        fn({allowedCallers: 'agentOnly'}),
        fn({allowedCallers: 'rendererOrAgent'}),
      ),
    ).toEqual([]);
  });

  test('requiresUserActivation turned on is refused, turned off accepted', () => {
    expect(checkAdditiveEvolution(fn({}), fn({requiresUserActivation: true}))).toEqual([
      'functions/lookup/requiresUserActivation: turned on',
    ]);
    expect(
      checkAdditiveEvolution(
        fn({requiresUserActivation: true}),
        fn({requiresUserActivation: false}),
      ),
    ).toEqual([]);
  });

  for (const key of ['allowedParents', 'allowedChildren']) {
    test(`${key} added or narrowed is refused, widened or dropped accepted`, () => {
      expect(checkAdditiveEvolution(component({}), component({[key]: ['Surface']}))).toEqual([
        `components/Row/${key}: added`,
      ]);
      expect(
        checkAdditiveEvolution(
          component({[key]: ['Surface', 'Column']}),
          component({[key]: ['Column']}),
        ),
      ).toEqual([`components/Row/${key}: "Surface" removed`]);
      expect(
        checkAdditiveEvolution(
          component({[key]: ['Column']}),
          component({[key]: ['Column', 'Card']}),
        ),
      ).toEqual([]);
      expect(checkAdditiveEvolution(component({[key]: ['Column']}), component({}))).toEqual([]);
    });
  }
});

describe('checkAdditiveEvolution — refused', () => {
  test('a component, a function or a $defs entry removed', () => {
    const next = {...held, components: {}, functions: {}, $defs: {}};
    expect(checkAdditiveEvolution(held, next)).toEqual([
      'components/Image: removed',
      'functions/required: removed',
      '$defs/theme: removed',
    ]);
  });

  test('a property removed', () => {
    const next = catalog(
      {url: {type: 'string'}, fit: {type: 'string', enum: ['contain', 'cover']}},
      {required: ['url']},
    );
    expect(checkAdditiveEvolution(held, next)).toEqual([
      'components/Image/allOf/1/properties/width: removed',
    ]);
  });

  test('a property becoming required, or a new property required', () => {
    const next = catalog(
      {
        url: {type: 'string'},
        fit: {type: 'string', enum: ['contain', 'cover']},
        width: {type: 'number', minimum: 1, maximum: 100},
        alt: {type: 'string'},
      },
      {required: ['url', 'fit', 'alt']},
    );
    expect(checkAdditiveEvolution(held, next)).toEqual([
      'components/Image/allOf/1/required: "fit" became required',
      'components/Image/allOf/1/required: "alt" became required',
    ]);
  });

  test('an enum value removed', () => {
    const next = catalog(
      {
        url: {type: 'string'},
        fit: {type: 'string', enum: ['contain']},
        width: {type: 'number', minimum: 1, maximum: 100},
      },
      {required: ['url']},
    );
    expect(checkAdditiveEvolution(held, next)).toEqual([
      'components/Image/allOf/1/properties/fit/enum: "cover" removed',
    ]);
  });

  test('type, $ref or const changed', () => {
    const next: A2uiCatalogSchema = {
      ...held,
      components: {
        Image: {
          type: 'object',
          allOf: [
            {$ref: 'https://example.com/other.json#/$defs/Other'},
            {
              type: 'object',
              properties: {
                component: {const: 'Picture'},
                url: {type: 'number'},
                fit: {type: 'string', enum: ['contain', 'cover']},
                width: {type: 'number', minimum: 1, maximum: 100},
              },
              required: ['component', 'url'],
            },
          ],
          unevaluatedProperties: false,
        },
      },
    };
    expect(checkAdditiveEvolution(held, next)).toEqual([
      `components/Image/allOf/0/$ref: changed from "${COMMON}" to "https://example.com/other.json#/$defs/Other"`,
      'components/Image/allOf/1/properties/component/const: changed from "Image" to "Picture"',
      'components/Image/allOf/1/properties/url/type: changed from "string" to "number"',
    ]);
  });

  test('a constraint tightened: added where there was none, or made stricter', () => {
    const next = catalog(
      {
        url: {type: 'string', pattern: '^https://', maxLength: 10},
        fit: {type: 'string', enum: ['contain', 'cover']},
        width: {type: 'number', minimum: 2, maximum: 50},
      },
      {required: ['url']},
    );
    expect(checkAdditiveEvolution(held, next)).toEqual([
      'components/Image/allOf/1/properties/url/pattern: added',
      'components/Image/allOf/1/properties/url/maxLength: added',
      'components/Image/allOf/1/properties/width/minimum: tightened from 1 to 2',
      'components/Image/allOf/1/properties/width/maximum: tightened from 100 to 50',
    ]);
  });

  test('an enum added where there was none, uniqueItems turned on, unknown properties closed', () => {
    const heldOpen: A2uiCatalogSchema = {
      catalogId: 'cat/v1',
      components: {
        List: {
          type: 'object',
          properties: {
            kind: {type: 'string'},
            items: {type: 'array', items: {type: 'string'}},
          },
        },
      },
    };
    const next: A2uiCatalogSchema = {
      catalogId: 'cat/v1',
      components: {
        List: {
          type: 'object',
          properties: {
            kind: {type: 'string', enum: ['a']},
            items: {type: 'array', items: {type: 'string'}, uniqueItems: true},
          },
          additionalProperties: false,
        },
      },
    };
    expect(checkAdditiveEvolution(heldOpen, next)).toEqual([
      'components/List/properties/kind/enum: added',
      'components/List/properties/items/uniqueItems: added',
      'components/List/additionalProperties: closed',
    ]);
  });

  test('an allOf entry gained or lost, an anyOf entry lost', () => {
    const heldUnion: A2uiCatalogSchema = {
      catalogId: 'cat/v1',
      components: {
        A: {
          allOf: [{type: 'object'}],
          properties: {v: {anyOf: [{type: 'string'}, {type: 'number'}]}},
        },
      },
    };
    const gained: A2uiCatalogSchema = {
      catalogId: 'cat/v1',
      components: {
        A: {
          allOf: [{type: 'object'}, {required: ['v']}],
          properties: {v: {anyOf: [{type: 'string'}]}},
        },
      },
    };
    expect(checkAdditiveEvolution(heldUnion, gained)).toEqual([
      'components/A/allOf: gained an entry',
      'components/A/properties/v/anyOf: lost an entry',
    ]);
    const lost: A2uiCatalogSchema = {
      catalogId: 'cat/v1',
      components: {
        A: {properties: {v: {anyOf: [{type: 'string'}, {type: 'number'}, {type: 'boolean'}]}}},
      },
    };
    expect(checkAdditiveEvolution(heldUnion, lost)).toEqual(['components/A/allOf: lost an entry']);
  });

  test('ComponentCommon gained is an allOf entry gained, at the root as below it', () => {
    const heldNodes: A2uiCatalogSchema = {
      catalogId: 'cat/v1',
      components: {A: {allOf: [{type: 'object'}], properties: {v: {type: 'object'}}}},
      $defs: {Box: {type: 'object'}},
    };
    const gained: A2uiCatalogSchema = {
      catalogId: 'cat/v1',
      components: {
        A: {
          allOf: [{type: 'object'}, {$ref: COMMON}],
          properties: {v: {type: 'object', allOf: [{$ref: COMMON}]}},
        },
      },
      $defs: {Box: {type: 'object', allOf: [{$ref: COMMON}]}},
    };
    expect(checkAdditiveEvolution(heldNodes, gained)).toEqual([
      'components/A/allOf: gained an entry',
      'components/A/properties/v/allOf: gained an entry',
      '$defs/Box/allOf: gained an entry',
    ]);
  });

  test('a different catalog id is not an evolution of the held one', () => {
    expect(checkAdditiveEvolution(held, {...held, catalogId: 'cat/v2'})).toEqual([
      'catalogId: "cat/v2" is not the held "cat/v1"',
    ]);
  });
});
