import {describe, expect, it} from 'vitest';
import type {RendererDataModel} from './messages';
import {
  RENDERER_DATA_MODEL_LOG_PREFIX,
  formatRendererDataModelSize,
  logRendererDataModelSize,
  measureRendererDataModel,
} from './dataModelSize';

function model(surfaces: Record<string, object>): RendererDataModel {
  return {version: '1.0', surfaces} as RendererDataModel;
}

describe('measureRendererDataModel', () => {
  it('reports no surfaces for an empty payload', () => {
    const size = measureRendererDataModel(model({}));
    expect(size.surfaceCount).toBe(0);
    expect(size.surfaces).toEqual([]);
    expect(size.totalBytes).toBeGreaterThan(0); // the version envelope still costs bytes
  });

  it('counts each surface and orders them largest first', () => {
    const size = measureRendererDataModel(
      model({
        small: {a: 1},
        large: {items: Array.from({length: 20}, (_, i) => ({title: `pr ${i}`}))},
      }),
    );
    expect(size.surfaceCount).toBe(2);
    expect(size.surfaces.map(s => s.surfaceId)).toEqual(['large', 'small']);
    expect(size.surfaces[0].bytes).toBeGreaterThan(size.surfaces[1].bytes);
  });

  it('totals more than any single surface, and grows as surfaces accumulate', () => {
    const one = measureRendererDataModel(model({a: {title: 'first'}}));
    const two = measureRendererDataModel(model({a: {title: 'first'}, b: {title: 'second'}}));
    expect(one.totalBytes).toBeGreaterThan(one.surfaces[0].bytes);
    expect(two.totalBytes).toBeGreaterThan(one.totalBytes);
  });

  it('measures UTF-8 bytes, not UTF-16 code units', () => {
    const size = measureRendererDataModel(model({a: {t: '한글'}}));
    // `{"t":"한글"}` — 8 ASCII bytes plus 2 Hangul syllables at 3 UTF-8 bytes each = 14.
    // A naive `.length` sees 10, since each syllable is a single UTF-16 unit.
    expect(size.surfaces[0].bytes).toBe(14);
    expect(JSON.stringify({t: '한글'}).length).toBe(10);
  });
});

describe('logRendererDataModelSize', () => {
  it('logs one prefixed line naming the surface count, total, and per-surface breakdown', () => {
    const lines: string[] = [];
    logRendererDataModelSize(model({s1: {a: 1}}), line => lines.push(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(RENDERER_DATA_MODEL_LOG_PREFIX);
    expect(lines[0]).toContain('1 surface(s)');
    expect(lines[0]).toContain('s1=');
  });

  it('omits the breakdown when there are no surfaces', () => {
    expect(formatRendererDataModelSize(measureRendererDataModel(model({})))).not.toContain('—');
  });
});
