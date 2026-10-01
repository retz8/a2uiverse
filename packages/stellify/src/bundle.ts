/**
 * The bundler inside (task-11.3 decision 9): esbuild over the built entry, one ESM, no splitting,
 * no minification, no source maps. Two rewrites, both as virtual modules: a host specifier becomes
 * a CommonJS read of the host's module namespace, so every named import is a property read at
 * runtime and no export list is needed; a stylesheet import becomes a load through the host, on a
 * URL resolved from the entry's own URL, and the sheet with everything it reaches joins the
 * artifact's files. Any other specifier under a host package is refused with the list.
 *
 * The loads a stylesheet import makes while the entry evaluates start at once, each `<link>`
 * appended in import order, and the entry waits for all of them before it finishes; a load after
 * that — a Provider's lazy theme — waits for its own sheet (the 11.5 follow-up to task-11.3
 * decision 11). The cascade is the import order either way; the wait is the slowest sheet's, not
 * the sum of every sheet's.
 */
import {
  classifySpecifier,
  HOST_INTERFACE_GLOBAL,
  HOST_SPECIFIERS,
  HOST_STYLESHEET_LOADER,
} from '@a2uiverse/sdk';
import {build, type Message, type Plugin} from 'esbuild';
import {relative, sep} from 'node:path';
import {Layout} from './layout.js';
import {copyStylesheet, type CopiedFiles} from './stylesheets.js';
import type {Finding} from './types.js';

export interface Bundle {
  /** The entry's text, when it built. */
  code?: string;
  /** The entry's export names, from the bundler. */
  exports: string[];
  /** The stylesheets and assets reached, by artifact path. */
  copied: Map<string, Uint8Array>;
  findings: Finding[];
}

const HOST_NAMESPACE = 'a2uiverse-host';
const STYLESHEET_NAMESPACE = 'a2uiverse-stylesheet';
const LOADS_NAMESPACE = 'a2uiverse-stylesheet-loads';
/** The module the entry's stylesheet loads are kept in until it finishes evaluating. */
const LOADS = 'a2uiverse:stylesheet-loads';
const STYLESHEET = /\.css(\?.*)?$/i;

const lent = (): string =>
  `the host lends ${HOST_SPECIFIERS.map(s => JSON.stringify(s)).join(', ')}`;

function hostPlugin(): Plugin {
  return {
    name: 'a2uiverse-host',
    setup(api) {
      api.onResolve({filter: /^[^./]/}, args => {
        if (args.namespace === HOST_NAMESPACE) return undefined;
        switch (classifySpecifier(args.path)) {
          case 'host':
            return {path: args.path, namespace: HOST_NAMESPACE};
          case 'refuse':
            return {
              errors: [{text: `${JSON.stringify(args.path)} is not lent by the host; ${lent()}`}],
            };
          default:
            return undefined;
        }
      });
      api.onLoad({filter: /.*/, namespace: HOST_NAMESPACE}, args => ({
        contents: `module.exports = globalThis.${HOST_INTERFACE_GLOBAL}.modules[${JSON.stringify(args.path)}];`,
        loader: 'js',
      }));
    },
  };
}

function stylesheetPlugin(layout: Layout, copied: CopiedFiles): Plugin {
  return {
    name: 'a2uiverse-stylesheet',
    setup(api) {
      api.onResolve({filter: STYLESHEET}, async args => {
        if (args.namespace === STYLESHEET_NAMESPACE || args.pluginData === STYLESHEET_NAMESPACE) {
          return undefined;
        }
        const resolved = await api.resolve(args.path, {
          resolveDir: args.resolveDir,
          importer: args.importer,
          kind: args.kind,
          pluginData: STYLESHEET_NAMESPACE,
        });
        if (resolved.errors.length > 0) return {errors: resolved.errors};
        const artifactPath = layout.artifactPathOf(resolved.path);
        if (artifactPath === undefined) {
          return {
            errors: [
              {
                text: `${JSON.stringify(args.path)} resolves outside the package and its dependencies`,
              },
            ],
          };
        }
        copyStylesheet(layout, resolved.path, artifactPath, copied);
        return {path: artifactPath, namespace: STYLESHEET_NAMESPACE};
      });
      api.onLoad({filter: /.*/, namespace: STYLESHEET_NAMESPACE}, args => ({
        contents: [
          `import {loads} from ${JSON.stringify(LOADS)};`,
          `const load = globalThis.${HOST_INTERFACE_GLOBAL}.${HOST_STYLESHEET_LOADER}(new URL(${JSON.stringify(args.path)}, import.meta.url).href);`,
          'if (loads.done) await load;',
          'else loads.early.push(load);',
        ].join('\n'),
        loader: 'js',
      }));
      api.onResolve({filter: /^a2uiverse:stylesheet-loads$/}, () => ({
        path: LOADS,
        namespace: LOADS_NAMESPACE,
      }));
      api.onLoad({filter: /.*/, namespace: LOADS_NAMESPACE}, () => ({
        contents: 'export const loads = {early: [], done: false};',
        loader: 'js',
      }));
    },
  };
}

const posix = (path: string): string => path.split(sep).join('/');

function findingOf(packageDir: string, entryRel: string, message: Message): Finding {
  const file = message.location?.file;
  return {
    file: file === undefined ? entryRel : posix(relative(packageDir, file)) || file,
    reason: message.text,
  };
}

export async function bundleEntry(packageDir: string, entryRel: string): Promise<Bundle> {
  const layout = new Layout(packageDir);
  const copied: CopiedFiles = {files: new Map(), findings: []};
  try {
    const result = await build({
      absWorkingDir: packageDir,
      // The entry, then the wait for every stylesheet load it started (the module header). Its
      // named exports pass through; a default export is no part of the catalog export contract.
      stdin: {
        contents: [
          `export * from ${JSON.stringify(`./${posix(entryRel)}`)};`,
          `import {loads} from ${JSON.stringify(LOADS)};`,
          'await Promise.all(loads.early);',
          'loads.done = true;',
        ].join('\n'),
        resolveDir: packageDir,
        sourcefile: 'stellify-entry.js',
        loader: 'js',
      },
      outfile: 'index.js',
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      splitting: false,
      minify: false,
      sourcemap: false,
      treeShaking: true,
      charset: 'utf8',
      legalComments: 'none',
      write: false,
      metafile: true,
      logLevel: 'silent',
      plugins: [hostPlugin(), stylesheetPlugin(layout, copied)],
    });
    const output = result.metafile.outputs['index.js'];
    return {
      code: result.outputFiles[0]!.text,
      exports: output?.exports ?? [],
      copied: copied.files,
      findings: [...copied.findings, ...result.errors.map(m => findingOf(packageDir, entryRel, m))],
    };
  } catch (error) {
    const messages = (error as {errors?: Message[]}).errors;
    const findings =
      messages === undefined
        ? [{file: entryRel, reason: (error as Error).message}]
        : messages.map(m => findingOf(packageDir, entryRel, m));
    return {exports: [], copied: copied.files, findings: [...copied.findings, ...findings]};
  }
}
