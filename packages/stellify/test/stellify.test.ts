import {
  checkCatalogExports,
  validateArtifactDescriptor,
  verifyArtifactFiles,
  HOST_SPECIFIERS,
} from '@a2uiverse/sdk';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {describe, expect, test} from 'vitest';
import {artifactFiles, stellify, writeArtifact, type StellifyResult} from '../src/index.js';
import {copyFixture, decode, edit, write} from './fixture.js';

const CATALOG_ID = 'https://example.com/star/catalog.json';
const toolVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {version: string}
).version;

const reasons = (result: StellifyResult) => result.findings.map(f => f.reason);

describe('packing the fixture catalog', () => {
  test('no findings, the descriptor, the files', async () => {
    const dir = copyFixture();
    const result = await stellify(dir);
    expect(result.findings).toEqual([]);
    expect(result.descriptor).toEqual({
      catalogId: CATALOG_ID,
      entry: 'index.js',
      schema: 'catalog.json',
      hostInterface: '0.9.1',
      files: expect.any(Object),
      package: {name: 'star-catalog', version: '1.2.3'},
      packedBy: {tool: '@a2uiverse/stellify', version: toolVersion},
    });
    expect([...result.files.keys()]).toEqual([
      'catalog.json',
      'index.js',
      'lib/fonts/star.woff2',
      'lib/theme.css',
      'node_modules/star-dialog/lib/dialog.css',
      'node_modules/star-dialog/lib/tokens.css',
    ]);
    const descriptor = result.descriptor!;
    expect(Object.keys(descriptor.files)).toEqual([...result.files.keys()]);
    expect(validateArtifactDescriptor(descriptor).ok).toBe(true);
    expect(await verifyArtifactFiles(descriptor, result.files)).toEqual([]);
    expect(decode(result.files.get('catalog.json')!)).toBe(
      readFileSync(join(dir, 'catalogs/v0.9.1/catalog.json'), 'utf8'),
    );
    expect(decode(result.files.get('lib/theme.css')!)).toBe(
      readFileSync(join(dir, 'lib/theme.css'), 'utf8'),
    );
  });

  test('host imports become reads from the interface, stylesheet imports loads through it', async () => {
    const result = await stellify(copyFixture());
    const entry = decode(result.files.get('index.js')!);
    for (const specifier of [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'zod',
    ]) {
      expect(entry).toContain(`__a2uiverse_host__.modules[${JSON.stringify(specifier)}]`);
    }
    expect(entry).toContain('__a2uiverse_host__.modules["@a2ui/web_core/v0_9"]');
    expect(entry).toContain('__a2uiverse_host__.modules["@a2ui/react/v0_9"]');
    expect(entry).not.toMatch(/^import /m);
    expect(entry).toContain('loadStylesheet(new URL("lib/theme.css", import.meta.url).href)');
    expect(entry).toContain(
      'loadStylesheet(new URL("node_modules/star-dialog/lib/dialog.css", import.meta.url).href)',
    );
    expect(entry).not.toContain('tokens.css');
  });

  test('the entry runs against a host, its loads awaited', async () => {
    const dir = copyFixture();
    const result = await stellify(dir);
    const out = join(dir, 'evaluated');
    mkdirSync(out);
    writeFileSync(join(out, 'index.js'), result.files.get('index.js')!);
    const loaded: string[] = [];
    const modules: Record<string, unknown> = {};
    for (const specifier of HOST_SPECIFIERS) {
      modules[specifier] = specifier.startsWith('@a2ui/react')
        ? {
            createComponentImplementation: (api: {name: string}, render: unknown) => ({
              name: api.name,
              render,
            }),
          }
        : await import(specifier);
    }
    (globalThis as Record<string, unknown>).__a2uiverse_host__ = {
      version: '0.9.1',
      modules,
      loadStylesheet: async (url: string) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        loaded.push(url);
      },
    };
    const module = (await import(pathToFileURL(join(out, 'index.js')).href)) as Record<
      string,
      unknown
    >;
    expect(checkCatalogExports(module, CATALOG_ID)).toEqual([]);
    // The dependency's static stylesheet import ran at evaluation, awaited.
    expect(loaded).toEqual([
      pathToFileURL(join(out, 'node_modules/star-dialog/lib/dialog.css')).href,
    ]);
    await (module.loadTheme as () => Promise<unknown>)();
    expect(loaded[1]).toBe(pathToFileURL(join(out, 'lib/theme.css')).href);
  });

  test('the loads made as the entry evaluates start together, in import order; a later one waits for its own sheet', async () => {
    const dir = copyFixture();
    write(dir, 'lib/base.css', '.star-base { color: black; }\n');
    edit(dir, 'lib/index.js', text => `import './base.css';\n${text}`);
    const result = await stellify(dir);
    expect(result.findings).toEqual([]);
    const out = join(dir, 'evaluated');
    mkdirSync(out);
    writeFileSync(join(out, 'index.js'), result.files.get('index.js')!);
    const modules: Record<string, unknown> = {};
    for (const specifier of HOST_SPECIFIERS) {
      modules[specifier] = specifier.startsWith('@a2ui/react')
        ? {createComponentImplementation: (api: {name: string}) => ({name: api.name})}
        : await import(specifier);
    }
    const asked: string[] = [];
    const finish = new Map<string, () => void>();
    (globalThis as Record<string, unknown>).__a2uiverse_host__ = {
      version: '0.9.1',
      modules,
      loadStylesheet: (url: string) =>
        new Promise<void>(resolve => {
          asked.push(url);
          finish.set(url, resolve);
        }),
    };
    const settle = () => new Promise(resolve => setTimeout(resolve, 20));
    const sheet = (path: string) => pathToFileURL(join(out, path)).href;
    let evaluated = false;
    const importing = import(pathToFileURL(join(out, 'index.js')).href).then(module => {
      evaluated = true;
      return module as Record<string, unknown>;
    });
    await settle();
    // Both started before either finished, the cascade's order kept.
    expect(asked).toEqual([
      sheet('lib/base.css'),
      sheet('node_modules/star-dialog/lib/dialog.css'),
    ]);
    finish.get(sheet('node_modules/star-dialog/lib/dialog.css'))!();
    await settle();
    expect(evaluated).toBe(false);
    finish.get(sheet('lib/base.css'))!();
    const module = await importing;
    expect(checkCatalogExports(module, CATALOG_ID)).toEqual([]);
    // After the entry, a lazy sheet's import resolves only once its sheet has loaded.
    let themed = false;
    const theming = (module.loadTheme as () => Promise<unknown>)().then(() => (themed = true));
    await settle();
    expect(asked.at(-1)).toBe(sheet('lib/theme.css'));
    expect(themed).toBe(false);
    finish.get(sheet('lib/theme.css'))!();
    await theming;
    expect(themed).toBe(true);
  });

  test('deterministic: two copies at two paths pack to the same bytes', async () => {
    const a = await stellify(copyFixture());
    const b = await stellify(copyFixture());
    expect(a.findings).toEqual([]);
    expect(a.descriptor).toEqual(b.descriptor);
    for (const [path, bytes] of a.files) expect(decode(bytes)).toBe(decode(b.files.get(path)!));
  });

  test('deterministic: the package in its checkout and installed in a node_modules pack to the same bytes', async () => {
    const checkout = await stellify(copyFixture());
    const installed = await stellify(copyFixture({installed: true}));
    expect(installed.findings).toEqual([]);
    expect([...installed.files.keys()]).toEqual([...checkout.files.keys()]);
    expect(installed.descriptor).toEqual(checkout.descriptor);
  });

  test('the vendor checkout is untouched', async () => {
    const dir = copyFixture();
    const before = readdirSync(dir, {recursive: true}).sort();
    await stellify(dir);
    expect(readdirSync(dir, {recursive: true}).sort()).toEqual(before);
  });
});

describe('the config', () => {
  test('entry, schema, catalogId and outDir from stellify.config.ts', async () => {
    const dir = copyFixture();
    write(
      dir,
      'stellify.config.ts',
      [
        "import {defineConfig} from '@a2uiverse/stellify';",
        'export default defineConfig({',
        "  entry: 'lib/index.js',",
        "  schema: 'catalogs/v0.9.1/catalog.json',",
        `  catalogId: ${JSON.stringify(CATALOG_ID)},`,
        "  outDir: 'out/star',",
        '});',
      ].join('\n'),
    );
    const result = await stellify(dir);
    expect(result.findings).toEqual([]);
    expect(result.outDir).toBe(join(dir, 'out/star'));
  });

  test('defaults: dist/artifact, the exports entry, the conventional schema path', async () => {
    const result = await stellify(copyFixture());
    expect(result.outDir).toMatch(/[\\/]dist[\\/]artifact$/);
  });

  test('a catalogId that disagrees with the schema', async () => {
    const dir = copyFixture();
    write(dir, 'stellify.config.ts', "export default {catalogId: 'https://example.com/other'};");
    expect(reasons(await stellify(dir))).toEqual([
      expect.stringMatching(/catalogId is "https:\/\/example.com\/other", the schema says/),
    ]);
  });

  test('an unknown key and a wrong type', async () => {
    const dir = copyFixture();
    write(dir, 'stellify.config.ts', 'export default {entree: "x", outDir: 3};');
    const found = reasons(await stellify(dir));
    expect(found).toContainEqual(expect.stringMatching(/unknown key "entree"/));
    expect(found).toContainEqual(expect.stringMatching(/outDir must be a string/));
  });

  test('options stand in for the file', async () => {
    const dir = copyFixture();
    const result = await stellify(dir, {outDir: 'elsewhere'});
    expect(result.outDir).toBe(join(dir, 'elsewhere'));
  });
});

describe('refusals', () => {
  test('a specifier under a host package the host does not lend, with the list', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/catalog.js', s => `import {renderToString} from 'react-dom/server';\n${s}`);
    const found = reasons(await stellify(dir));
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('"react-dom/server" is not lent by the host');
    for (const specifier of HOST_SPECIFIERS) expect(found[0]).toContain(specifier);
  });

  test('the entry not built', async () => {
    const dir = copyFixture();
    rmSync(join(dir, 'lib'), {recursive: true});
    expect(reasons(await stellify(dir))).toEqual([
      expect.stringMatching(/lib\/index\.js is missing — build the package first/),
    ]);
  });

  test('no CATALOG export', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/index.js', s => s.replace("export {CATALOG} from './catalog.js';", ''));
    expect(reasons(await stellify(dir))).toEqual([expect.stringMatching(/exports no CATALOG/)]);
  });

  test('a stylesheet asset escaping the package', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/theme.css', s => s.replace('./fonts/star.woff2', '../../escaped.woff2'));
    writeFileSync(join(dir, '..', 'escaped.woff2'), 'x');
    expect(reasons(await stellify(dir))).toEqual([
      expect.stringMatching(/\.\.\/\.\.\/escaped\.woff2.*outside/),
    ]);
  });

  test('a stylesheet asset that does not exist', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/theme.css', s => s.replace('./fonts/star.woff2', './fonts/missing.woff2'));
    expect(reasons(await stellify(dir))).toEqual([
      expect.stringMatching(/fonts\/missing\.woff2.*does not exist/),
    ]);
  });

  test('a schema that does not compile', async () => {
    const dir = copyFixture();
    edit(dir, 'catalogs/v0.9.1/catalog.json', s => s.replace('#/$defs/tone', '#/$defs/nowhere'));
    const found = reasons(await stellify(dir));
    expect(found.length).toBeGreaterThan(0);
    for (const reason of found) expect(reason).toMatch(/^components\//);
  });

  test('a schema whose id is not the package id it says', async () => {
    const dir = copyFixture();
    edit(dir, 'catalogs/v0.9.1/catalog.json', s =>
      s.replace('"catalogId": "https://example.com/star/catalog.json"', '"catalogId": ""'),
    );
    expect(reasons(await stellify(dir))).toContainEqual(expect.stringMatching(/catalogId/));
  });

  test('every finding carries a file', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/index.js', s => s.replace("export {CATALOG} from './catalog.js';", ''));
    edit(dir, 'catalogs/v0.9.1/catalog.json', s => s.replace('#/$defs/tone', '#/$defs/nowhere'));
    const result = await stellify(dir);
    expect(result.findings.length).toBeGreaterThan(1);
    for (const finding of result.findings) expect(finding.file).toBeTruthy();
  });
});

describe('writeArtifact', () => {
  test('writes every file and the descriptor, emptying what was there', async () => {
    const dir = copyFixture();
    const result = await stellify(dir);
    mkdirSync(result.outDir, {recursive: true});
    writeFileSync(join(result.outDir, 'stale.txt'), 'old');
    await writeArtifact(result);
    expect(existsSync(join(result.outDir, 'stale.txt'))).toBe(false);
    expect(readdirSync(result.outDir)).toContain('artifact.json');
    const descriptor = JSON.parse(readFileSync(join(result.outDir, 'artifact.json'), 'utf8'));
    expect(descriptor).toEqual(result.descriptor);
    for (const [path, bytes] of result.files) {
      expect(readFileSync(join(result.outDir, path))).toEqual(Buffer.from(bytes));
    }
    expect(readFileSync(join(result.outDir, 'artifact.json'), 'utf8')).toMatch(/\n$/);
  });

  test('refuses a result with findings and writes nothing', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/index.js', s => s.replace("export {CATALOG} from './catalog.js';", ''));
    const result = await stellify(dir);
    await expect(writeArtifact(result)).rejects.toThrow(/findings/);
    expect(existsSync(result.outDir)).toBe(false);
  });

  test('artifactFiles is what writeArtifact writes, the descriptor among it', async () => {
    const dir = copyFixture();
    const result = await stellify(dir);
    const files = artifactFiles(result);
    expect([...files.keys()]).toEqual([...result.files.keys(), 'artifact.json']);
    await writeArtifact(result);
    for (const [path, bytes] of files) {
      expect(readFileSync(join(result.outDir, path))).toEqual(Buffer.from(bytes));
    }
  });

  test('artifactFiles refuses a result with findings', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/index.js', s => s.replace("export {CATALOG} from './catalog.js';", ''));
    const result = await stellify(dir);
    expect(() => artifactFiles(result)).toThrow(/findings/);
  });

  test('stellify itself writes nothing', async () => {
    const dir = copyFixture();
    const result = await stellify(dir);
    expect(existsSync(result.outDir)).toBe(false);
  });
});
