/**
 * A converted file judged on v1.0 (task-21.11 decision 9): each paint by the sdk's v1.0 validator
 * against its v1.0 catalog and by the schema-form check against the v1.0 schemas, and the verdict
 * held to the one the validator gave before the flip. A paint accepted then is accepted now and
 * passes the schema-form check; a paint refused then is refused now for the same components, their
 * ids as renamed.
 */
import {
  createA2uiValidator,
  createSchemaFormCheck,
  formatA2uiFinding,
  type A2uiCatalogSchema,
} from '@a2uiverse/sdk';
import {renamedId} from './identifier.js';
import {
  FIXTURE_SURFACE,
  isObject,
  operationOf,
  paintsOf,
  placedMessages,
  type Json,
} from './recorded.js';

/** One paint's verdict as `scripts/recorded-verdicts.json` holds it. */
export interface RecordedVerdict {
  surface: string;
  paint: number;
  verdict: 'accepted' | 'refused';
  components?: string[];
}

export interface PaintJudgement {
  surface: string;
  paint: number;
  /** The validator's findings, formatted. */
  findings: string[];
  /** The schema-form check's findings, formatted. */
  form: string[];
  /** The components the validator refuses. */
  components: string[];
  /** How the verdict differs from the one before the flip, when it does. */
  parity?: string;
}

/** The kit's stamp on a fixture that names no surface, as the validator was handed it before. */
function stamped(message: Json): Json {
  const op = operationOf(message)!;
  const body = message[op] as Json;
  return typeof body.surfaceId === 'string'
    ? message
    : {...message, [op]: {...body, surfaceId: FIXTURE_SURFACE}};
}

/**
 * Each paint of a converted file judged against `catalogOf`'s v1.0 document for the catalog it
 * names, `defaultCatalog` for one the file never creates, and held to `before` when given.
 */
export function judgeConverted(
  file: unknown,
  catalogOf: (catalogId: string) => A2uiCatalogSchema | undefined,
  defaultCatalog: A2uiCatalogSchema | undefined,
  before?: readonly RecordedVerdict[],
): PaintJudgement[] {
  return paintsOf(placedMessages(file)).map(paint => {
    const catalog = paint.catalogId === undefined ? defaultCatalog : catalogOf(paint.catalogId);
    const messages = paint.messages.map(stamped);
    const judgement: PaintJudgement = {
      surface: paint.surface,
      paint: paint.paint,
      findings: [],
      form: [],
      components: [],
    };
    if (!catalog) {
      judgement.findings.push(`no v1.0 catalog document for ${paint.catalogId ?? 'the file'}`);
      return judgement;
    }
    const findings = createA2uiValidator({catalogs: [catalog]}).validate(messages);
    judgement.findings = findings.map(formatA2uiFinding);
    judgement.components = [
      ...new Set(findings.map(f => f.componentId).filter((id): id is string => !!id)),
    ].sort();
    judgement.form = createSchemaFormCheck({catalog})
      .agentToRenderer(messages)
      .map(formatA2uiFinding);
    const held = before?.find(v => v.surface === paint.surface && v.paint === paint.paint);
    if (before) judgement.parity = parity(held, judgement);
    return judgement;
  });
}

function parity(held: RecordedVerdict | undefined, now: PaintJudgement): string | undefined {
  if (!held) return 'no verdict before the flip';
  const refused = now.findings.length > 0;
  if (held.verdict === 'accepted') {
    if (refused) return `accepted before, refused now: ${now.findings[0]}`;
    if (now.form.length > 0) return `accepted, but not in the schema's form: ${now.form[0]}`;
    return undefined;
  }
  if (!refused) return 'refused before, accepted now';
  const expected = (held.components ?? []).map(renamedId).sort();
  const same =
    expected.length === now.components.length &&
    expected.every((id, i) => id === now.components[i]);
  return same
    ? undefined
    : `refused before for ${expected.join(', ') || 'no component'}, now for ${now.components.join(', ') || 'no component'}`;
}

/** Whether a message list is A2UI at all, for a file that holds none. */
export const carriesA2ui = (file: unknown): boolean =>
  placedMessages(file).some(({message}) => isObject(message) && operationOf(message) !== undefined);
