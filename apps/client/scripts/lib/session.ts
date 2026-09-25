/**
 * A session of several canvases, driven through the orchestrator the way the canvas drives it and
 * kept as one beat (task-9.8 decision 2): each question opens a canvas of its own, naming the
 * canvas on screen as its parent; an action, a press, a step and a close act on a canvas the
 * script names; the user viewing a canvas is kept too, nothing sent. A question asked while the
 * turn before it still streams is kept beside that turn, on its clock.
 *
 * Each canvas keeps what the client would hold of it — every surface's tree and data model, and
 * each source's paints as a stack counted at the wire (task-9.7 decision 2) — so an action carries
 * the canvas's data model and a step carries the paint it steps to, as the canvas sends them.
 */
import type {A2uiClientAction, A2uiClientDataModel, A2uiMessage} from '@a2ui/web_core/v0_9';
import {DataModel} from '@a2ui/web_core/v0_9';
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {A2AMessageSender} from '../../src/a2a/client';
import {
  buildActionMessageParams,
  buildOperationMessageParams,
  extractContextId,
} from '../../src/a2a/messages';
import type {BeatBatch, BeatTurn} from '../../src/beats/beatFixtures';
import {batchOf} from './batch';
import {driveMessage, driveTurn, type DrivenTurn, type TimedEvent} from './drive';

interface Component {
  id: string;
  component: string;
  children?: unknown;
  child?: unknown;
  action?: {event?: {name?: string; context?: Record<string, unknown>}};
  [key: string]: unknown;
}

interface Surface {
  sendDataModel: boolean;
  components: Map<string, Component>;
  data: DataModel;
}

/** A source's paint as last seen: its surfaces' trees and data models. */
type Paint = Map<string, {sendDataModel: boolean; components: Component[]; data: unknown}>;

const sourceOf = (surfaceId: string) => surfaceId.split(':')[0]!;

/** What the canvas holds: its surfaces, and each vendor source's paints as a stack. */
export class CanvasModel {
  readonly #surfaces = new Map<string, Surface>();
  readonly #stacks = new Map<string, {steps: Array<Paint | undefined>; index: number}>();

  apply(batch: BeatBatch): void {
    const vendor =
      batch.stamp?.role === 'fragment' && batch.stamp.source !== 'shell'
        ? batch.stamp.source
        : undefined;
    for (const message of batch.messages) this.#applyMessage(message, vendor);
  }

  #applyMessage(message: A2uiMessage, vendor: string | undefined) {
    const m = message as unknown as Record<string, Record<string, unknown> | undefined>;
    if (m.createSurface) {
      const surfaceId = m.createSurface.surfaceId as string;
      // Every vendor create is a step the moment it arrives; the paint it replaces is kept.
      if (vendor) this.#push(vendor);
      this.#surfaces.set(surfaceId, {
        sendDataModel: m.createSurface.sendDataModel === true,
        components: new Map(),
        data: new DataModel({}),
      });
    } else if (m.deleteSurface) {
      this.#surfaces.delete(m.deleteSurface.surfaceId as string);
    } else if (m.updateComponents) {
      const surface = this.#surfaces.get(m.updateComponents.surfaceId as string);
      for (const c of (m.updateComponents.components as Component[] | undefined) ?? []) {
        surface?.components.set(c.id, c);
      }
    } else if (m.updateDataModel) {
      const surface = this.#surfaces.get(m.updateDataModel.surfaceId as string);
      surface?.data.set(
        (m.updateDataModel.path as string | undefined) || '/',
        m.updateDataModel.value,
      );
    }
  }

  #capture(source: string): Paint {
    const paint: Paint = new Map();
    for (const [id, surface] of this.#surfaces) {
      if (sourceOf(id) !== source) continue;
      paint.set(id, {
        sendDataModel: surface.sendDataModel,
        components: structuredClone([...surface.components.values()]),
        data: structuredClone(surface.data.get('/')),
      });
    }
    return paint;
  }

  #clear(source: string) {
    for (const id of [...this.#surfaces.keys()])
      if (sourceOf(id) === source) this.#surfaces.delete(id);
  }

  #push(source: string) {
    const stack = this.#stacks.get(source) ?? {steps: [], index: -1};
    this.#stacks.set(source, stack);
    if (stack.index >= 0) stack.steps[stack.index] = this.#capture(source);
    stack.steps.length = stack.index + 1;
    stack.steps.push(undefined);
    stack.index += 1;
    this.#clear(source);
  }

  /** The source's paint at `index` becomes the one on screen, as a step back restores it. */
  stepTo(source: string, index: number): void {
    const stack = this.#stacks.get(source);
    const paint = stack?.steps[index];
    if (!stack || !paint) throw new Error(`${source} has no paint at step ${index}`);
    stack.steps[stack.index] = this.#capture(source);
    this.#clear(source);
    for (const [id, surface] of paint) {
      this.#surfaces.set(id, {
        sendDataModel: surface.sendDataModel,
        components: new Map(surface.components.map(c => [c.id, c])),
        data: new DataModel(structuredClone(surface.data) as Record<string, unknown>),
      });
    }
    stack.index = index;
  }

  /** The canvas's data model, as the processor reports it on every message. */
  clientDataModel(): A2uiClientDataModel | undefined {
    const surfaces: Record<string, unknown> = {};
    for (const [id, surface] of this.#surfaces) {
      if (surface.sendDataModel) surfaces[id] = surface.data.get('/');
    }
    return Object.keys(surfaces).length
      ? ({version: 'v0.9', surfaces} as A2uiClientDataModel)
      : undefined;
  }

  /**
   * The action the reader raises on `source`'s fragment by the component whose event is `name`: on
   * the `item`th entry of the list it is templated over, its context resolved against that entry.
   */
  action(source: string, name: string, item = 0): A2uiClientAction {
    for (const [surfaceId, surface] of this.#surfaces) {
      if (sourceOf(surfaceId) !== source) continue;
      const raiser = [...surface.components.values()].find(c => c.action?.event?.name === name);
      if (!raiser) continue;
      const scope = templateScope(surface, raiser.id, item);
      const context = Object.fromEntries(
        Object.entries(raiser.action!.event!.context ?? {}).map(([key, bound]) => [
          key,
          resolve(surface.data, scope, bound),
        ]),
      );
      return {
        name,
        surfaceId,
        sourceComponentId: raiser.id,
        timestamp: new Date().toISOString(),
        context,
      } as A2uiClientAction;
    }
    throw new Error(`${source} shows nothing raising ${name}`);
  }
}

/** The data path of the `item`th entry a template over `id` — or an ancestor of it — renders. */
function templateScope(surface: Surface, id: string, item: number): string {
  const parents = new Map<string, {parent: Component; template: boolean}>();
  for (const c of surface.components.values()) {
    const children = c.children as {path?: string; componentId?: string} | string[] | undefined;
    if (children && !Array.isArray(children) && children.componentId) {
      parents.set(children.componentId, {parent: c, template: true});
    } else if (Array.isArray(children)) {
      for (const child of children) parents.set(child, {parent: c, template: false});
    }
    if (typeof c.child === 'string') parents.set(c.child, {parent: c, template: false});
  }
  for (let at: string | undefined = id; at; at = parents.get(at)?.parent.id) {
    const link = parents.get(at);
    if (link?.template) {
      const path = (link.parent.children as {path: string}).path;
      return `${path.replace(/\/$/, '')}/${item}`;
    }
  }
  return '';
}

function resolve(data: DataModel, scope: string, bound: unknown): unknown {
  if (!bound || typeof bound !== 'object' || !('path' in bound)) return bound;
  const path = (bound as {path: string}).path;
  return data.get(path.startsWith('/') ? path : `${scope}/${path}`);
}

/** A canvas the session opened. */
export interface SessionCanvas {
  /** Its place among the session's questions: what a beat's `askedFrom` and `canvas` name. */
  ordinal: number;
  model: CanvasModel;
  /** Its question's stream: settles when it closes. */
  done: Promise<DrivenTurn>;
  /** The context the orchestrator minted for it. */
  context(): string;
}

/** A question's options: the canvas it is asked from, and whether it runs beside the turn streaming. */
export interface AskOptions {
  from?: SessionCanvas;
  beside?: boolean;
}

/**
 * A recorded session: the turns of one beat in the order the script made them. A question, not
 * asked beside, and an action each start a turn of their own; everything else — a question asked
 * beside, a press, a step, a view, a close — runs beside the turn before it, timed on its clock.
 */
export class Session {
  readonly turns: BeatTurn[] = [];
  readonly canvases: SessionCanvas[] = [];
  #viewed: SessionCanvas | undefined;
  #groupStart = performance.now();
  readonly #sender: A2AMessageSender;
  readonly #catalogIds: string[];

  constructor(sender: A2AMessageSender, catalogIds: string[]) {
    this.#sender = sender;
    this.#catalogIds = catalogIds;
  }

  #since = () => Math.round(performance.now() - this.#groupStart);

  #group(turn: BeatTurn) {
    this.#groupStart = performance.now();
    this.turns.push(turn);
  }

  #beside(turn: BeatTurn) {
    this.turns.push({...turn, atMs: this.#since()});
  }

  /** A turn's batches as they arrive, each also applied to the canvas it lands on. */
  #collect(turn: BeatTurn, model: CanvasModel) {
    return ({atMs, event}: TimedEvent) => {
      const batch = batchOf(event, atMs);
      if (!batch) return;
      turn.batches.push(batch);
      model.apply(batch);
    };
  }

  #finish(turn: BeatTurn, driven: Promise<DrivenTurn>): Promise<DrivenTurn> {
    return driven.then(d => {
      turn.taskId = d.taskId;
      turn.durationMs = d.durationMs;
      turn.outcome = turn.batches.some(b => b.messages.some(m => 'createSurface' in m))
        ? 'completed'
        : 'apology';
      return d;
    });
  }

  /** The user asks: a canvas of its own, a child of the one on screen, now on screen itself. */
  ask(prompt: string, {from, beside = false}: AskOptions = {}): SessionCanvas {
    if (from) this.#viewed = from;
    const parent = this.#viewed?.context();
    const model = new CanvasModel();
    const turn: BeatTurn = {
      taskId: null,
      kind: 'utterance',
      prompt,
      action: null,
      ...(from ? {askedFrom: from.ordinal} : {}),
      batches: [],
      outcome: 'completed',
      durationMs: 0,
    };
    if (beside) this.#beside(turn);
    else this.#group(turn);
    const recorded = beside ? this.turns.at(-1)! : turn;
    let contextId: string | undefined;
    const done = this.#finish(
      recorded,
      driveTurn(this.#sender, prompt, parent, this.#catalogIds, timed => {
        this.#collect(recorded, model)(timed);
        contextId ??= extractContextId(timed.event);
      }),
    );
    const canvas: SessionCanvas = {
      ordinal: this.canvases.length,
      model,
      done,
      context: () => {
        if (!contextId) throw new Error(`“${prompt}” has no context yet`);
        return contextId;
      },
    };
    this.canvases.push(canvas);
    this.#viewed = canvas;
    return canvas;
  }

  /** Wait until the canvas's context is known: its first event arrived. */
  async opened(canvas: SessionCanvas): Promise<void> {
    for (;;) {
      try {
        canvas.context();
        return;
      } catch {
        await sleep(50);
      }
    }
  }

  /** The user views a canvas: nothing is sent. */
  view(canvas: SessionCanvas): void {
    this.#viewed = canvas;
    this.#beside(this.#event('view', canvas));
  }

  /** The user closes a canvas from the trail: the close is sent on its context. */
  close(canvas: SessionCanvas): Promise<DrivenTurn> {
    this.#beside(this.#event('close', canvas));
    if (this.#viewed === canvas) this.#viewed = this.canvases.at(-1);
    return driveMessage(
      this.#sender,
      buildOperationMessageParams({kind: 'close', sources: []}, canvas.context(), this.#catalogIds),
      canvas.context(),
    );
  }

  #event(kind: 'view' | 'close', canvas: SessionCanvas): BeatTurn {
    return {
      taskId: null,
      kind,
      prompt: '',
      action: null,
      canvas: canvas.ordinal,
      batches: [],
      outcome: 'completed',
      durationMs: 0,
    };
  }

  /** The reader acts inside `source`'s fragment on `canvas`: a turn of its own. */
  act(canvas: SessionCanvas, source: string, name: string, item = 0): Promise<DrivenTurn> {
    const action = canvas.model.action(source, name, item);
    const turn: BeatTurn = {
      taskId: null,
      kind: 'surface-action',
      prompt: '',
      action: action as unknown as Record<string, unknown>,
      canvas: canvas.ordinal,
      batches: [],
      outcome: 'completed',
      durationMs: 0,
    };
    this.#group(turn);
    return this.#finish(
      turn,
      driveMessage(
        this.#sender,
        buildActionMessageParams(
          action,
          canvas.context(),
          canvas.model.clientDataModel(),
          this.#catalogIds,
        ),
        canvas.context(),
        this.#collect(turn, canvas.model),
      ),
    );
  }

  /** The reader's press on `canvas`, beside the turn before it. */
  press(canvas: SessionCanvas, operation: CompositionOperation): Promise<DrivenTurn> {
    const turn: BeatTurn = {
      taskId: null,
      kind: 'press',
      prompt: '',
      action: null,
      operation,
      canvas: canvas.ordinal,
      batches: [],
      outcome: 'completed',
      durationMs: 0,
    };
    this.#beside(turn);
    const recorded = this.turns.at(-1)!;
    const dataModel = operation.kind === 'step' ? canvas.model.clientDataModel() : undefined;
    return this.#finish(
      recorded,
      driveMessage(
        this.#sender,
        buildOperationMessageParams(operation, canvas.context(), this.#catalogIds, dataModel),
        canvas.context(),
        this.#collect(recorded, canvas.model),
      ),
    );
  }

  /** A step inside `source`'s fragment: the paint restored at once, then sent as the canvas sends it. */
  step(canvas: SessionCanvas, source: string, to: number): Promise<DrivenTurn> {
    canvas.model.stepTo(source, to);
    return this.press(canvas, {kind: 'step', sources: [source], step: to});
  }
}

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
