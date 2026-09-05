import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {buildSynthesisSystemPrompt} from '@a2uiverse/sdk';

/**
 * The Synthesizer's prompt (task-5.4 decisions 1–2): the sdk's builder over the shell
 * catalog's two files — its `catalog.json` verbatim and its guidance doc — and the role. The
 * sdk carries the composition doc and the examples; the shell catalog carries what is specific
 * to it; this module is the two reads and the role. Read once at boot; no second copy.
 */

export const SYNTHESIZER_ROLE =
  'You are the synthesizer of a canvas shell that composes the answers of independent agents onto one screen. When several agents have answered the same question, you author the merged view over their answers: a component tree in the shell’s own catalog, wired to the agents’ data through a derived data model whose every leaf is a formula over references into their data — never a copied value. You write JSON as text; the shell validates it, evaluates the wiring, and paints the tree.';

export interface ShellCatalogFiles {
  /** `catalog.json`, verbatim. */
  schema: string;
  /** `guidance.md`: how to build a merged view out of the catalog. */
  guidance: string;
}

export function readShellCatalogFiles(): ShellCatalogFiles {
  const require = createRequire(import.meta.url);
  return {
    schema: readFileSync(require.resolve('@a2uiverse/shell-catalog/catalog.json'), 'utf8'),
    guidance: readFileSync(require.resolve('@a2uiverse/shell-catalog/guidance.md'), 'utf8'),
  };
}

export function synthesizerSystemPrompt(
  files: ShellCatalogFiles = readShellCatalogFiles(),
): string {
  return buildSynthesisSystemPrompt({
    role: SYNTHESIZER_ROLE,
    catalogSchema: files.schema,
    uiGuidance: files.guidance,
  });
}
