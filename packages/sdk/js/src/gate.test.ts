import {describe, expect, test} from 'vitest';
import {ARTIFACT_DESCRIPTOR_FILE, hashArtifactFile} from './artifact';
import {HOST_INTERFACE_VERSION} from './catalog';
import {gateArtifact, type ArtifactFiles} from './gate';

const GMAIL = 'https://example.com/gmail/catalog.json';
const CALENDAR = 'https://example.com/calendar/catalog.json';

const encode = (text: string) => new TextEncoder().encode(text);

/** A catalog artifact as Stellify writes one: the entry, the schema, the descriptor listing both. */
async function artifact(
  catalogId: string,
  options: {schema?: unknown; hostInterface?: string} = {},
): Promise<Map<string, Uint8Array>> {
  const schema = options.schema ?? {
    catalogId,
    components: {
      Text: {type: 'object', properties: {text: {type: 'string'}}, required: ['text']},
    },
  };
  const files = new Map<string, Uint8Array>([
    ['index.js', encode(`export const CATALOG = {id: ${JSON.stringify(catalogId)}};\n`)],
    ['catalog.json', encode(`${JSON.stringify(schema, null, 2)}\n`)],
  ]);
  const hashed: Record<string, string> = {};
  for (const [path, bytes] of files) hashed[path] = await hashArtifactFile(bytes);
  const descriptor = {
    catalogId,
    entry: 'index.js',
    schema: 'catalog.json',
    hostInterface: options.hostInterface ?? HOST_INTERFACE_VERSION,
    files: hashed,
    package: {name: 'fixture-catalog', version: '0.1.0'},
    packedBy: {tool: '@a2uiverse/stellify', version: '0.0.0'},
  };
  files.set(ARTIFACT_DESCRIPTOR_FILE, encode(`${JSON.stringify(descriptor, null, 2)}\n`));
  return files;
}

describe('gateArtifact', () => {
  test('passes a well-formed artifact: its id, its descriptor, its files', async () => {
    const files = await artifact(GMAIL);
    const result = await gateArtifact(files, 0);
    expect(result.findings).toEqual([]);
    expect(result.catalogId).toBe(GMAIL);
    expect(result.artifact?.id).toMatch(/^sha256-[A-Za-z0-9_-]{43}$/);
    expect(result.artifact?.descriptor.catalogId).toBe(GMAIL);
    expect(result.artifact?.files).toBe(files);
  });

  test('no descriptor: one finding, nothing else read', async () => {
    const files: ArtifactFiles = new Map([['index.js', encode('')]]);
    expect(await gateArtifact(files, 0)).toEqual({
      findings: ['catalog artifact 1: no artifact.json'],
    });
  });

  test('a descriptor that is not JSON', async () => {
    const files: ArtifactFiles = new Map([[ARTIFACT_DESCRIPTOR_FILE, encode('{')]]);
    const result = await gateArtifact(files, 1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatch(/^catalog artifact 2: artifact\.json: not JSON /);
    expect(result.catalogId).toBeUndefined();
  });

  test('a descriptor that does not conform names every error', async () => {
    const files: ArtifactFiles = new Map([
      [ARTIFACT_DESCRIPTOR_FILE, encode(JSON.stringify({catalogId: GMAIL}))],
    ]);
    const result = await gateArtifact(files, 0);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every(f => f.startsWith('catalog artifact 1: artifact.json'))).toBe(
      true,
    );
    expect(result.artifact).toBeUndefined();
  });

  test('a file changed under its hash and a file not listed, both named', async () => {
    const files = await artifact(GMAIL);
    files.set('index.js', encode('export const CATALOG = {};\n'));
    files.set('extra.css', encode('.x{}'));
    const result = await gateArtifact(files, 0);
    expect(result.findings).toEqual([
      expect.stringMatching(new RegExp(`^catalog artifact 1 \\(${GMAIL}\\): index.js: hash is `)),
      `catalog artifact 1 (${GMAIL}): extra.css: present but not listed in the descriptor`,
    ]);
    expect(result.catalogId).toBe(GMAIL);
    expect(result.artifact).toBeUndefined();
  });

  test('a host interface the platform does not supply', async () => {
    const files = await artifact(GMAIL, {hostInterface: '1.0.0'});
    expect((await gateArtifact(files, 0)).findings).toEqual([
      `catalog artifact 1 (${GMAIL}): host interface "1.0.0" is not one the platform supplies (it supplies "${HOST_INTERFACE_VERSION}")`,
    ]);
  });

  test("a schema whose id is not the descriptor's", async () => {
    const files = await artifact(GMAIL, {schema: {catalogId: CALENDAR, components: {}}});
    expect((await gateArtifact(files, 0)).findings).toEqual([
      `catalog artifact 1 (${GMAIL}): catalog.json: catalogId is "${CALENDAR}", the descriptor says "${GMAIL}"`,
    ]);
  });

  test('a schema that does not compile as an A2UI catalog', async () => {
    const files = await artifact(GMAIL, {
      schema: {catalogId: GMAIL, components: {Broken: {type: 'nonsense'}}},
    });
    const result = await gateArtifact(files, 0);
    expect(result.findings).toEqual([
      expect.stringMatching(/^catalog artifact 1 \(.*\): catalog.json: components\/Broken: /),
    ]);
  });

  test('a schema file that is not JSON', async () => {
    const files = await artifact(GMAIL);
    const bytes = encode('{');
    files.set('catalog.json', bytes);
    const descriptor = JSON.parse(new TextDecoder().decode(files.get(ARTIFACT_DESCRIPTOR_FILE)));
    descriptor.files['catalog.json'] = await hashArtifactFile(bytes);
    files.set(ARTIFACT_DESCRIPTOR_FILE, encode(JSON.stringify(descriptor)));
    const result = await gateArtifact(files, 0);
    expect(result.findings).toEqual([
      expect.stringMatching(/^catalog artifact 1 \(.*\): catalog.json: not JSON /),
    ]);
  });
});
