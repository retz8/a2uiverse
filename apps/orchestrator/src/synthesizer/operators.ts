import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {OPERATORS} from '@a2uiverse/shell-catalog/operators';

/**
 * The operator vocabulary the Synthesizer is offered: the shell catalog's
 * operator list (task-4.3 decision 1) with each function's agent-facing
 * description from the catalog schema — the same words the catalog gives any
 * generating agent. Read once at boot from the catalog package; no second copy.
 */
export interface OperatorDescription {
  name: string;
  description: string;
}

export function operatorVocabulary(): OperatorDescription[] {
  const require = createRequire(import.meta.url);
  const schema = JSON.parse(
    readFileSync(require.resolve('@a2uiverse/shell-catalog/catalog.json'), 'utf8'),
  ) as {functions: Record<string, {description?: string}>};
  return OPERATORS.map(name => ({
    name,
    description: schema.functions[name]?.description ?? name,
  }));
}

export {OPERATORS};
