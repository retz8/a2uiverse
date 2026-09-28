import {describe, expect, test} from 'vitest';
import {
  checkArtifactSchema,
  hashArtifactFile,
  validateArtifactDescriptor,
  verifyArtifactFiles,
  type ArtifactDescriptor,
} from './artifact';

const bytes = (text: string) => new TextEncoder().encode(text);

async function descriptorFor(files: Record<string, string>): Promise<ArtifactDescriptor> {
  const hashed: Record<string, string> = {};
  for (const [path, content] of Object.entries(files))
    hashed[path] = await hashArtifactFile(bytes(content));
  return {
    catalogId: 'https://example.com/gmail/catalog.json',
    entry: 'index.js',
    schema: 'catalog.json',
    hostInterface: '0.9.1',
    files: hashed,
    package: {name: 'gmail-catalog', version: '0.3.0'},
    packedBy: {tool: 'a2uiverse-pack', version: '0.1.0'},
  };
}

const FILES = {
  'index.js': 'export const CATALOG = 1;',
  'catalog.json': '{"catalogId":"https://example.com/gmail/catalog.json","components":{}}',
  'styles.css': '.gmail-catalog{}',
  'fonts/GoogleSans-Regular.woff2': 'wOF2',
};

describe('hashArtifactFile', () => {
  test('sha256-<base64>, the known digest of an empty input', async () => {
    expect(await hashArtifactFile(new Uint8Array())).toBe(
      'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    );
  });
});

describe('validateArtifactDescriptor', () => {
  test('a well-formed descriptor', async () => {
    const descriptor = await descriptorFor(FILES);
    expect(validateArtifactDescriptor(descriptor)).toEqual({ok: true, value: descriptor});
  });

  test('missing fields, unknown fields, bad shapes', async () => {
    const descriptor = await descriptorFor(FILES);
    const {packedBy: _dropped, ...withoutPackedBy} = descriptor;
    expect(validateArtifactDescriptor(withoutPackedBy)).toMatchObject({ok: false});
    expect(validateArtifactDescriptor({...descriptor, title: 'Gmail'})).toMatchObject({ok: false});
    expect(validateArtifactDescriptor({...descriptor, hostInterface: 'v0_9'})).toMatchObject({
      ok: false,
    });
    expect(validateArtifactDescriptor('x')).toMatchObject({ok: false});
  });

  test('paths are relative and inside the root; hashes are sha256-<base64>', async () => {
    const descriptor = await descriptorFor(FILES);
    const hash = descriptor.files['index.js'];
    for (const bad of ['/index.js', '../index.js', 'a/../b.js', 'a\\b.js']) {
      const result = validateArtifactDescriptor({
        ...descriptor,
        files: {...descriptor.files, [bad]: hash},
      });
      expect(result.ok, bad).toBe(false);
    }
    expect(
      validateArtifactDescriptor({...descriptor, files: {...descriptor.files, 'x.js': 'md5-abc'}})
        .ok,
    ).toBe(false);
  });

  test('the entry and the schema must be listed files', async () => {
    const descriptor = await descriptorFor(FILES);
    const result = validateArtifactDescriptor({...descriptor, entry: 'main.js'});
    expect(result).toEqual({ok: false, errors: ['/entry: "main.js" is not listed in files']});
  });
});

describe('verifyArtifactFiles', () => {
  const asMap = (files: Record<string, string>) =>
    new Map(Object.entries(files).map(([path, content]) => [path, bytes(content)]));

  test('files that match', async () => {
    const descriptor = await descriptorFor(FILES);
    expect(await verifyArtifactFiles(descriptor, asMap(FILES))).toEqual([]);
  });

  test('a missing file, a changed file, an unlisted file', async () => {
    const descriptor = await descriptorFor(FILES);
    const {'styles.css': _missing, ...rest} = FILES;
    const tampered = {...rest, 'index.js': 'export const CATALOG = 2;', 'extra.js': ''};
    const errors = await verifyArtifactFiles(descriptor, asMap(tampered));
    expect(errors).toHaveLength(3);
    expect(errors.find(e => e.startsWith('styles.css'))).toMatch(
      /listed in the descriptor but missing/,
    );
    expect(errors.find(e => e.startsWith('index.js'))).toMatch(
      /hash is sha256-.*, the descriptor says sha256-/,
    );
    expect(errors.find(e => e.startsWith('extra.js'))).toMatch(/present but not listed/);
  });
});

describe('checkArtifactSchema', () => {
  test('agrees', async () => {
    const descriptor = await descriptorFor(FILES);
    expect(checkArtifactSchema(descriptor, JSON.parse(FILES['catalog.json']))).toEqual([]);
  });
  test('a different id, no components, not an object', async () => {
    const descriptor = await descriptorFor(FILES);
    expect(checkArtifactSchema(descriptor, {catalogId: 'x', components: {}})[0]).toMatch(
      /catalog\.json: catalogId is "x", the descriptor says/,
    );
    expect(checkArtifactSchema(descriptor, {catalogId: descriptor.catalogId})).toEqual([
      'catalog.json: components is not an object',
    ]);
    expect(checkArtifactSchema(descriptor, [])).toEqual(['catalog.json: not a JSON object']);
  });
});
