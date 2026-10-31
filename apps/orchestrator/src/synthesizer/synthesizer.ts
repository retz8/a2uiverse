import {
  createA2uiValidator,
  type A2uiCatalogSchema,
  type A2uiValidator,
  type DerivedModel,
  type SortDeclaration,
  type SynthesisPayload,
} from '@a2uiverse/sdk';
import {RELATIONS} from '@a2uiverse/shell-catalog/schema';
import {streamText, type LanguageModel} from 'ai';
import type {Effort, Reasoning} from '../model/getModel.js';
import {
  AttemptMeasurement,
  measureOf,
  type ModelRequestRecord,
  type RequestClock,
  type StepMeasure,
} from '../model/requests.js';
import {TaggedBlockReader, type BlockPiece} from '../authoring/blockReader.js';
import {extractTaggedBlock} from '../authoring/taggedBlock.js';
import {
  isDecline,
  type Synthesis,
  type SynthesisTree,
  type SynthesizeDataModel,
} from './document.js';
import {
  buildSynthesisTurn,
  SYNTHESIS_TAG,
  type ChangeAccount,
  type JoinedSource,
  type MissingSource,
  type SynthesisSource,
} from './prompt.js';
import {
  validateSynthesis,
  validateSynthesisPiece,
  validateSynthesisTree,
  type SynthesisChecks,
} from './validate.js';

export type {JoinedSource, MissingSource, SynthesisSource};

/** One call of the turn's second model (SPEC §5 ◆ #2): the input as the runtime knows it. */
export interface SynthesisInput {
  utterance: string;
  /** The Planner's request on the synthesis slot: its brief to the merge. */
  request: string;
  /** The column headers the reserved slot showed the user from plan time: the view's starting point. */
  columns?: readonly string[];
  /** Per planned column, the source it belongs to, or null (task-8.3 decision 13). */
  columnSources?: readonly (string | null)[];
  sources: readonly SynthesisSource[];
  /** The dispatched sources that bring no data to this synthesis, and why: their columns stay. */
  missing?: readonly MissingSource[];
  /** The live document, on a re-synthesis (task-5.4 decision 6). */
  previous?: Synthesis;
  changes?: ChangeAccount;
  /** The sources folded into the live view at the reader's press (task-8.4 decision 12). */
  joined?: readonly JoinedSource[];
}

/** What went to the model and what it answered. */
export interface SynthesisCall {
  system: string;
  prompt: string;
  input: SynthesisInput;
  /** Aborts the call when the turn is superseded (task-8.3 decision 4). */
  signal?: AbortSignal;
  /** The answer's text as the model writes it (task 17.10), each delta in order; the whole text still returns. */
  onText?: (text: string) => void;
}

/** One call's answer: the raw text, and the SDK's measure of the request when a model made it (task 17.5). */
export interface SynthesisAnswer {
  text: string;
  step?: StepMeasure;
}

/** The text seam: one call, the raw text back. The AI SDK model behind it, or a fake. */
export interface SynthesisModel {
  generate(call: SynthesisCall): Promise<SynthesisAnswer>;
}

/** One attempt as journaled: the raw text the model returned and why it was refused, if it was. */
export interface SynthesisAttempt {
  text: string;
  errors: string[];
}

/** What the synthesis's model requests cost (task 17.5). */
export interface SynthesisMeasure {
  effort?: Effort;
  requests?: ModelRequestRecord[];
}

export type SynthesisOutcome = SynthesisMeasure &
  (
    | {kind: 'synthesized'; document: Synthesis; attempts: SynthesisAttempt[]}
    | {kind: 'declined'; reason: string; attempts: SynthesisAttempt[]}
    | {kind: 'malformed'; attempts: SynthesisAttempt[]}
  );

/**
 * The view as far as it has passed its own checks, as the turn is told it (task-17.10 decision
 * 1): the tree, and the payload holding what passed — the lists the tree repeats, each row of
 * them that passed, each finished member outside one, the sorts — marked partial. `kind` names
 * what just passed.
 */
export interface SynthesisPiece {
  kind: 'tree' | 'row' | 'member';
  tree: SynthesisTree;
  payload: SynthesisPayload & {partial: true};
}

/** What the turn is told as the Synthesizer's answer is written (task 17.10). */
export interface SynthesisStream {
  /**
   * The view as written so far, in order: first with the tree, once the tree and the sorts have
   * passed and the model holds something to draw — the lists the tree repeats, empty — then with
   * each row and each member that passes, and none past the first piece that fails.
   */
  piece(piece: SynthesisPiece): void;
}

/** The number of model calls a synthesis may spend: one, and one retry (task-5.4 decision 4). */
export const MAX_ATTEMPTS = 2;

/**
 * The Synthesizer (SPEC §10): text out, validated after. The model writes one tagged block;
 * the block is extracted, parsed, and validated — the output schema, the tree against the
 * Synthesizer's pruned catalog, the derived-value rule, operators, and refs into the partitions;
 * a failure goes back to the model once with its findings and the failed document, and a second
 * failure is `malformed`. Emits wiring, never values.
 *
 * The answer is followed as it is written (task 17.10) when the turn asks: the tree told once it
 * passes the shell catalog, each row of a list it repeats and each finished member of the derived
 * model told as it passes its own check (decision 1), in whatever order the model writes them
 * (decision 2), nothing past the first piece that fails (decision 5). The whole answer is still
 * checked at its end; the retry is not followed (decision 6).
 */
export class Synthesizer {
  readonly #model: SynthesisModel;
  readonly #effort: Effort | undefined;
  readonly #system: string;
  readonly #tree: A2uiValidator;
  readonly #operators: readonly string[];
  readonly #relations: readonly string[];

  constructor(options: {
    model: SynthesisModel;
    /** The effort tier the model runs at, stamped on the synthesis's record (task-17.5 decision 3). */
    effort?: Effort;
    systemPrompt: string;
    /** The shell catalog pruned to the synthesis surface's keep-set: the one the prompt shows. */
    catalog: A2uiCatalogSchema;
  }) {
    this.#model = options.model;
    this.#effort = options.effort;
    this.#system = options.systemPrompt;
    this.#tree = createA2uiValidator({catalog: options.catalog});
    const functions = Object.keys(options.catalog.functions ?? {});
    this.#relations = functions.filter(name => (RELATIONS as readonly string[]).includes(name));
    this.#operators = functions.filter(name => !this.#relations.includes(name));
  }

  async synthesize(
    input: SynthesisInput,
    partitions: SynthesisChecks['partitions'],
    signal?: AbortSignal,
    /** The synthesis's clock its requests are placed on, and the task their lines name (task 17.5). */
    clock?: RequestClock,
    /** The first attempt's answer followed as it is written (task 17.10); none, and it lands whole. */
    stream?: SynthesisStream,
  ): Promise<SynthesisOutcome> {
    const columns = columnChecks(input);
    const checks: SynthesisChecks = {
      tree: this.#tree,
      operators: this.#operators,
      relations: this.#relations,
      partitions,
      ...(columns ? {columns} : {}),
    };
    const attempts: SynthesisAttempt[] = [];
    const requests: ModelRequestRecord[] = [];
    const measured: SynthesisMeasure = {
      ...(this.#effort ? {effort: this.#effort} : {}),
      requests,
    };
    let previous: unknown = input.previous;
    let errors: string[] | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const prompt = buildSynthesisTurn({
        utterance: input.utterance,
        request: input.request,
        ...(input.columns ? {columns: input.columns} : {}),
        ...(input.columnSources ? {columnSources: input.columnSources} : {}),
        sources: input.sources,
        ...(input.missing && input.missing.length > 0 ? {missing: input.missing} : {}),
        previous,
        ...(errors ? {errors} : {}),
        ...(input.changes && !errors ? {changes: input.changes} : {}),
        ...(input.joined && input.joined.length > 0 && !errors ? {joined: input.joined} : {}),
      });
      signal?.throwIfAborted();
      // The request measured from the SDK's own step result (task-17.5 decision 2).
      const measurement = new AttemptMeasurement('Synthesizer', attempt + 1, clock);
      // The first attempt followed as it is written; the retry drawn whole once checked (decision 6).
      const follower =
        stream && attempt === 0 ? new AnswerFollower(stream, checks, this.#tree) : undefined;
      let answer: SynthesisAnswer;
      try {
        answer = await this.#model.generate({
          system: this.#system,
          prompt,
          input,
          ...(signal ? {signal} : {}),
          ...(follower ? {onText: (text: string) => follower.read(text)} : {}),
        });
      } catch (err) {
        if (!signal?.aborted) measurement.failed(err);
        throw err;
      }
      if (answer.step) requests.push(measurement.step(answer.step));
      signal?.throwIfAborted();
      const {text} = answer;
      const result = this.#accept(text, checks);
      attempts.push({text, errors: result.errors});
      if (result.ok) {
        const {document} = result;
        return isDecline(document)
          ? {kind: 'declined', reason: document.reason, attempts, ...measured}
          : {kind: 'synthesized', document, attempts, ...measured};
      }
      previous = result.document ?? text;
      errors = result.errors;
    }
    return {kind: 'malformed', attempts, ...measured};
  }

  #accept(
    text: string,
    checks: SynthesisChecks,
  ):
    | {ok: true; document: SynthesizeDataModel; errors: string[]}
    | {ok: false; document?: unknown; errors: string[]} {
    const block = extractTaggedBlock(text, SYNTHESIS_TAG);
    if (!block.ok) return {ok: false, errors: [block.error]};
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.body);
    } catch (err) {
      return {
        ok: false,
        document: block.body,
        errors: [
          `the block is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
    const validation = validateSynthesis(parsed, checks);
    if (!validation.ok) return {ok: false, document: parsed, errors: validation.errors};
    return {ok: true, document: validation.document, errors: []};
  }
}

/** What the validator checks the Table's column marks against, from the brief. */
function columnChecks(input: SynthesisInput): SynthesisChecks['columns'] {
  const sources = [
    ...input.sources.map(s => s.source),
    ...(input.missing ?? []).map(s => s.source),
  ];
  if (sources.length === 0) return undefined;
  return {
    sources: [...new Set(sources)],
    planned: (input.columns ?? []).map((header, i) => ({
      header,
      source: input.columnSources?.[i] ?? null,
    })),
    missing: (input.missing ?? []).map(s => s.source),
    surfaces: Object.fromEntries(input.sources.map(s => [s.surface, s.source])),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The derived model's root member its pieces are read under. */
const MODEL = 'dataModel';

/**
 * One attempt's answer followed as it is written (task 17.10): the tree checked against the shell
 * catalog the moment it is written, the lists it repeats at the model's root watched from then on
 * and seeded empty; each row of one, and each finished member of the model outside one, checked on
 * its own and told — a piece written before the tree and the sorts told once both have passed
 * (decision 2) — and nothing past the first piece that fails (decision 5). The whole answer is
 * still read and checked at its end.
 */
class AnswerFollower {
  readonly #stream: SynthesisStream;
  readonly #checks: SynthesisChecks;
  readonly #validator: A2uiValidator;
  readonly #reader = new TaggedBlockReader(SYNTHESIS_TAG, {elements: [[MODEL]]});
  #tree: SynthesisTree | undefined;
  #sorts: SortDeclaration[] | undefined;
  /** The lists the tree repeats at the model's root, each handed over row by row. */
  readonly #lists = new Set<string>();
  /** What has passed so far: the lists seeded empty, each row and member as it passes. */
  readonly #model: DerivedModel = {};
  /** The rows told per list, by its key. */
  readonly #rows = new Map<string, number>();
  /** The model's pieces written before the tree and the sorts. */
  #waiting: BlockPiece[] = [];
  #telling = true;

  constructor(stream: SynthesisStream, checks: SynthesisChecks, validator: A2uiValidator) {
    this.#stream = stream;
    this.#checks = checks;
    this.#validator = validator;
  }

  read(text: string): void {
    for (const piece of this.#reader.push(text)) this.#take(piece);
  }

  #take(piece: BlockPiece): void {
    if (!this.#telling) return;
    if (piece.kind === 'member' && piece.path.length === 0) {
      switch (piece.key) {
        case 'tree':
          return this.#treeWritten(piece.value);
        case 'sorts':
          return this.#sortsWritten(piece.value);
        // The model's members were handed over one by one; the note and a decline are the
        // whole answer's to read.
        default:
          return;
      }
    }
    if (!this.#ready()) {
      this.#waiting.push(piece);
      return;
    }
    this.#modelPiece(piece);
  }

  #ready(): boolean {
    return this.#tree !== undefined && this.#sorts !== undefined;
  }

  #treeWritten(value: unknown): void {
    if (this.#tree !== undefined) return;
    if (
      !isRecord(value) ||
      !Array.isArray(value.components) ||
      !value.components.every(
        c => isRecord(c) && typeof c.id === 'string' && typeof c.component === 'string',
      )
    ) {
      return this.#stop();
    }
    const tree = value as unknown as SynthesisTree;
    if (validateSynthesisTree(tree, this.#validator).length > 0) return this.#stop();
    this.#tree = tree;
    for (const key of repeatedLists(tree)) {
      this.#lists.add(key);
      this.#reader.watch([MODEL, key]);
      this.#model[key] ??= [];
    }
    this.#replay();
  }

  #sortsWritten(value: unknown): void {
    if (this.#sorts !== undefined) return;
    if (!Array.isArray(value)) return this.#stop();
    this.#sorts = value as SortDeclaration[];
    this.#replay();
  }

  /** The tree and the sorts have passed: what waited is told, the lists first if nothing did. */
  #replay(): void {
    if (!this.#ready()) return;
    const waiting = this.#waiting;
    this.#waiting = [];
    if (waiting.length === 0 && Object.keys(this.#model).length > 0) {
      if (this.#fails(this.#model)) return this.#stop();
      this.#tell('tree');
    }
    for (const piece of waiting) this.#modelPiece(piece);
  }

  #modelPiece(piece: BlockPiece): void {
    if (!this.#telling) return;
    if (piece.kind === 'member') {
      // A list whose rows went one by one is finished; one written before the tree, or empty,
      // is drawn whole.
      const list = this.#model[piece.key];
      if (
        this.#lists.has(piece.key) &&
        Array.isArray(piece.value) &&
        Array.isArray(list) &&
        (this.#rows.get(piece.key) ?? 0) === piece.value.length
      ) {
        return;
      }
      if (this.#fails({[piece.key]: piece.value as DerivedModel[string]})) return this.#stop();
      this.#model[piece.key] = piece.value as DerivedModel[string];
      if (Array.isArray(piece.value)) this.#rows.set(piece.key, piece.value.length);
      return this.#tell('member');
    }
    const key = piece.path[1]!;
    const list = this.#model[key];
    if (!Array.isArray(list)) return this.#stop();
    if (this.#fails({[key]: [piece.value as DerivedModel[string]]})) return this.#stop();
    list.push(piece.value as DerivedModel[string]);
    this.#rows.set(key, list.length);
    this.#tell('row');
  }

  /** Whether a partial model fails its own check, beside the tree and the sorts. */
  #fails(dataModel: DerivedModel): boolean {
    return (
      validateSynthesisPiece(
        {tree: this.#tree!, dataModel, sorts: this.#sorts!, note: ''},
        this.#checks,
      ).length > 0
    );
  }

  #tell(kind: SynthesisPiece['kind']): void {
    this.#stream.piece({
      kind,
      tree: this.#tree!,
      payload: {dataModel: structuredClone(this.#model), sorts: this.#sorts!, partial: true},
    });
  }

  #stop(): void {
    this.#telling = false;
  }
}

/** The keys of the lists the tree repeats at the model's root: each template path of one key. */
function repeatedLists(tree: SynthesisTree): string[] {
  const keys: string[] = [];
  for (const component of tree.components) {
    const {children} = component as {children?: unknown};
    if (!isRecord(children) || typeof children.path !== 'string') continue;
    const match = /^\/([^/*]+)$/.exec(children.path);
    if (match) keys.push(match[1]!.replace(/~1/g, '/').replace(/~0/g, '~'));
  }
  return keys;
}

/**
 * The AI SDK behind the text seam; the effort tier's word as the Planner carries it. The answer is
 * streamed (task-17.10 decision 9): each delta handed to the call as it arrives, the request's time
 * to its first token on the step's measure.
 */
export class AiSdkSynthesisModel implements SynthesisModel {
  #model: LanguageModel;
  #reasoning: Reasoning | undefined;

  constructor(options: {model: LanguageModel; reasoning?: Reasoning}) {
    this.#model = options.model;
    this.#reasoning = options.reasoning;
  }

  async generate(call: SynthesisCall): Promise<SynthesisAnswer> {
    const result = streamText({
      model: this.#model,
      system: call.system,
      prompt: call.prompt,
      ...(this.#reasoning ? {reasoning: this.#reasoning} : {}),
      ...(call.signal ? {abortSignal: call.signal} : {}),
      // A failed request is read off the stream below.
      onError: () => {},
    });
    let failed: {error: unknown} | undefined;
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') call.onText?.(part.text);
      else if (part.type === 'error') failed ??= {error: part.error};
    }
    call.signal?.throwIfAborted();
    if (failed) throw failed.error;
    const steps = await result.steps;
    const step = steps[0];
    const measure = step ? stepMeasure(step) : undefined;
    return {text: await result.text, ...(measure ? {step: measure} : {})};
  }
}

/** The step's measure, or none when it cannot be read: diagnostics never fail the call. */
function stepMeasure(step: Parameters<typeof measureOf>[0]): StepMeasure | undefined {
  try {
    return measureOf(step);
  } catch {
    return undefined;
  }
}
