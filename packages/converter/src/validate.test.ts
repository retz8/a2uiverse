/** Verdict parity (task-21.11 decision 9), on upstream's v1 basic catalog. */
import {describe, expect, it} from 'vitest';
import {BASIC_CATALOG_SCHEMA, type A2uiCatalogSchema} from '@a2uiverse/sdk';
import {judgeConverted} from './validate.js';

const BASIC = BASIC_CATALOG_SCHEMA as A2uiCatalogSchema;
const ID = String(BASIC.catalogId);
const paint = (...components: unknown[]) => [
  {version: '1.0', createSurface: {surfaceId: 's', catalogId: ID}},
  {version: '1.0', updateComponents: {surfaceId: 's', components}},
];
const judge = (file: unknown, verdict: 'accepted' | 'refused', components?: string[]) =>
  judgeConverted(file, () => BASIC, undefined, [
    {surface: 's', paint: 1, verdict, ...(components ? {components} : {})},
  ])[0]!;

describe('verdict parity', () => {
  const good = paint({id: 'root', component: 'Text', text: 'Hi'});
  const bad = paint(
    {id: 'root', component: 'Column', children: ['go_label']},
    {id: 'go_label', component: 'Text'},
  );

  it('holds an accepted paint accepted', () => {
    expect(judge(good, 'accepted').parity).toBeUndefined();
  });

  it('holds a refused paint refused for the same component, its id as renamed', () => {
    expect(judge(bad, 'refused', ['go-label']).parity).toBeUndefined();
  });

  it('says where a verdict moved', () => {
    expect(judge(good, 'refused', ['root']).parity).toBe('refused before, accepted now');
    expect(judge(bad, 'accepted').parity).toMatch(/^accepted before, refused now/);
    expect(judge(bad, 'refused', ['root']).parity).toBe(
      'refused before for root, now for go_label',
    );
  });
});
