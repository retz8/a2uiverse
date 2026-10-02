/**
 * Where a file of the package or of a dependency sits in the artifact (task-11.3 decision 12): a
 * file of the package at its path relative to the package root; a dependency's file under
 * `node_modules/<package name>/<subpath>`, named by the package that owns it, never by pnpm's real
 * path. Relative `url()`s inside a copied stylesheet keep resolving because the structure around
 * every file is unchanged.
 */
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {basename, dirname, join, relative, sep} from 'node:path';

const posix = (path: string): string => path.split(sep).join('/');

const NODE_MODULES = `${sep}node_modules${sep}`;

/** The nearest directory above `file` that is a package installed under a `node_modules`, with its name. */
function owningPackage(file: string): {dir: string; name: string} | undefined {
  let dir = dirname(file);
  while (true) {
    const parent = dirname(dir);
    const underScope =
      basename(parent).startsWith('@') && basename(dirname(parent)) === 'node_modules';
    if (basename(parent) === 'node_modules' || underScope) {
      const manifest = join(dir, 'package.json');
      if (existsSync(manifest)) {
        const name = (JSON.parse(readFileSync(manifest, 'utf8')) as {name?: unknown}).name;
        if (typeof name === 'string' && name !== '') return {dir, name};
      }
    }
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export class Layout {
  private readonly root: string;

  constructor(packageDir: string) {
    this.root = realpathSync(packageDir);
  }

  /** The artifact path of a file on disk, or undefined when it belongs to neither the package nor a dependency. */
  artifactPathOf(file: string): string | undefined {
    const real = realpathSync(file);
    // Below the root, not the whole path: a package installed in a `node_modules` has it above its root.
    if (real.startsWith(this.root + sep) && !real.slice(this.root.length).includes(NODE_MODULES)) {
      return posix(relative(this.root, real));
    }
    const owner = owningPackage(real);
    if (owner === undefined) return undefined;
    return `node_modules/${owner.name}/${posix(relative(owner.dir, real))}`;
  }
}
