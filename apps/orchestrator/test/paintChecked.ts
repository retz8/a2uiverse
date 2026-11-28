/**
 * What every painter test paints through (task-21.13 decision 16): the shell painter's and the
 * synthesis painter's output held to the sdk's schema-form check against the shell catalog's v1.0
 * document, each message as it would reach the client. A tree the check refuses fails the test that
 * painted it; no check holds the painters in production.
 */
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import type {Part} from '@a2a-js/sdk';
import {
  A2UI_VERSION,
  createSchemaFormCheck,
  formatA2uiFinding,
  type A2uiCatalogSchema,
  type A2uiComponent,
} from '@a2uiverse/sdk';
import {dataOf} from '../src/a2a/parts.js';
import {paintLayout} from '../src/composition/shellPainter.js';
import type {CompositionState} from '../src/composition/state.js';

const require = createRequire(import.meta.url);
const SHELL_CATALOG = JSON.parse(
  readFileSync(require.resolve('@a2uiverse/shell-catalog/catalog.json'), 'utf8'),
) as A2uiCatalogSchema;
const check = createSchemaFormCheck({catalog: SHELL_CATALOG});

/** Throws with every finding the schema form makes over the message. */
function held(message: unknown): void {
  const findings = check.agentToRenderer(message);
  if (findings.length > 0) {
    throw new Error(
      `a painted message fails the schema form:\n${findings.map(formatA2uiFinding).join('\n')}`,
    );
  }
}

/** The shell painter's components for the state, held to the schema form as their update. */
export function paintChecked(state: CompositionState): A2uiComponent[] {
  const components = paintLayout(state);
  held({version: A2UI_VERSION, updateComponents: {surfaceId: 'shell:main', components}});
  return components;
}

/** Each A2UI message a painter's parts carry, held to the schema form; the parts back. */
export function partsChecked(parts: readonly Part[]): Part[] {
  for (const part of parts) {
    const data = dataOf(part);
    if (data && typeof data.version === 'string') held(data);
  }
  return [...parts];
}
