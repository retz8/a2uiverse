/**
 * The builds each paint is drawn in (task-15.6 decisions 1 to 6; task-21.14 decisions 3, 5). The
 * canvas's gate reads the stamp, loads each build a message names — else the one the table names —
 * and assigns them to the message; the canvas's processors draw each create in the builds
 * assigned to it, so a surface on screen keeps the build of each of its catalogs beside a newer
 * one. A change to a surface's components assigned a build the surface does not hold — a newer
 * one of a catalog it draws in, or a catalog it draws in for the first time — moves the surface
 * there: re-created in it, its tree and data carried over, then changed, and no new paint: the
 * count of paints runs at the wire, never here. A change to the data alone moves nothing. A paint
 * the way back returns to is restored in the builds it was drawn in.
 *
 * The processor resolves a surface's catalogs by id from its own list when the surface is
 * created, so each build assigned is put there just before its create (task-16.7 decision 2): a
 * catalog the processor does not hold comes in through `addCatalog`; another build of one it
 * holds takes the held one's place.
 */
import {MessageProcessor} from '@a2ui/web_core/v1_0';
import type {
  AgentToRendererMessage,
  Catalog,
  ExecutionContext,
  OutboundMessageListener,
  ProcessableMessagePayload,
  SurfaceModel,
} from '@a2ui/web_core/v1_0';
import type {ReactCatalogComponent} from '@a2ui/react';
import {A2UI_VERSION} from '@a2uiverse/sdk';
import {capturePaint, rebuildMessages} from '../canvas/history/paintCopy';
import type {PaintCopy} from '../canvas/history/fragmentHistory';
import {resolvedOf, type ResolvedCatalog} from './clientCatalogs';

export interface PaintBuilds {
  /** The builds a message is drawn in, as the gate assigned them; none leaves the lookup by catalog id. */
  of(message: AgentToRendererMessage): readonly ResolvedCatalog[] | undefined;
  /**
   * Draws `message` in `builds`: a create's surface, the surface a change to its components
   * moves, or the catalog a function call runs in.
   */
  assign(message: AgentToRendererMessage, builds: readonly ResolvedCatalog[]): void;
  /** A copy's messages, its create assigned each build the paint was drawn in that is loaded. */
  rebuild(copy: PaintCopy): AgentToRendererMessage[];
}

/** `loaded` finds a build loaded for the page by its artifact id. */
export function createPaintBuilds(
  loaded: (artifactId: string) => ResolvedCatalog | undefined,
): PaintBuilds {
  const assigned = new WeakMap<AgentToRendererMessage, readonly ResolvedCatalog[]>();
  return {
    of: message => assigned.get(message),
    assign: (message, builds) => void assigned.set(message, builds),
    rebuild: copy => {
      const messages = rebuildMessages(copy);
      const builds = Object.entries(copy.builds ?? {}).flatMap(([catalogId, artifactId]) => {
        const build = loaded(artifactId);
        return build?.id === catalogId ? [build] : [];
      });
      if (builds.length > 0) assigned.set(messages[0]!, builds);
      return messages;
    },
  };
}

type Catalogs = Catalog<ReactCatalogComponent>[];

/**
 * The list a processor resolves catalogs from, which its type keeps private: `addCatalog` refuses
 * an id the processor holds, `catalogs` hands back a copy, and nothing else changes the list.
 */
const catalogsOf = (processor: MessageProcessor<ReactCatalogComponent>) =>
  (processor as unknown as {registeredCatalogs: Catalogs}).registeredCatalogs;

/** The surface whose components a message changes. */
const changedSurface = (message: AgentToRendererMessage): string | undefined =>
  'updateComponents' in message ? message.updateComponents.surfaceId : undefined;

/** The catalog a surface holds under an id: its default, or one of the others it may draw in. */
const catalogOn = (surface: SurfaceModel<ReactCatalogComponent>, catalogId: string) =>
  surface.availableCatalogs.get(catalogId) ??
  (surface.defaultCatalog?.id === catalogId ? surface.defaultCatalog : undefined);

export interface BuildProcessorOptions {
  /**
   * Where what the release sends an agent on its own goes: a renderer function's answer, a
   * component's `callAgentFunction` (task-21.14 decisions 8, 9).
   */
  outboundListener?: OutboundMessageListener;
}

/** A canvas's processor: each surface drawn in the builds its messages were assigned. */
export class BuildProcessor extends MessageProcessor<ReactCatalogComponent> {
  readonly #builds: PaintBuilds;

  constructor(
    catalogs: Catalogs,
    builds: PaintBuilds,
    actionHandler?: ConstructorParameters<typeof MessageProcessor<ReactCatalogComponent>>[1],
    {outboundListener}: BuildProcessorOptions = {},
  ) {
    super(catalogs, actionHandler, {
      version: A2UI_VERSION,
      ...(outboundListener ? {outboundListener} : {}),
    });
    this.#builds = builds;
  }

  /**
   * Each message in turn, in the builds it was assigned. An agent's call is never the person's
   * gesture (task-21.14 decision 7): every message is handed over as not user-activated.
   */
  override processMessages(messages: ProcessableMessagePayload, context?: ExecutionContext): void {
    const list = (Array.isArray(messages) ? messages : [messages]) as AgentToRendererMessage[];
    for (const message of list) {
      const builds = this.#builds.of(message);
      const surfaceId = changedSurface(message);
      if (builds && surfaceId !== undefined) this.#move(surfaceId, builds);
      else if (builds) this.#hold(builds);
      super.processMessages([message], {...context, isUserActivated: false});
    }
  }

  /** The builds the next create, or a function call, resolves its catalogs in. */
  #hold(builds: Iterable<ResolvedCatalog>) {
    const held = catalogsOf(this);
    for (const build of builds) {
      const at = held.findIndex(catalog => catalog.id === build.id);
      if (at === -1) this.addCatalog(build.catalog);
      // In the held one's place, changed in place, since the processor's RPC handler holds the
      // same list.
      else if (held[at] !== build.catalog) held.splice(at, 1, build.catalog);
    }
  }

  /**
   * A surface on screen that does not hold every build assigned — another build of a catalog it
   * draws in, or a catalog it has not drawn in — re-created as it stands, each of its other
   * catalogs kept at its own build.
   */
  #move(surfaceId: string, builds: readonly ResolvedCatalog[]) {
    const surface = this.model.getSurface(surfaceId);
    if (!surface) return this.#hold(builds);
    if (builds.every(build => catalogOn(surface, build.id) === build.catalog)) return;
    const copy = capturePaint(this, surfaceId);
    if (!copy) return;
    const own = [surface.defaultCatalog, ...surface.availableCatalogs.values()].flatMap(catalog => {
      const resolved = catalog && resolvedOf(catalog);
      return resolved ? [resolved] : [];
    });
    this.model.deleteSurface(surfaceId);
    this.#hold([...own, ...builds]);
    super.processMessages(rebuildMessages(copy), {isUserActivated: false});
  }
}
