/**
 * The build each paint is drawn in (task-15.6 decisions 1 to 6). The canvas's gate reads the
 * stamp, loads the build it names — else the one the table names — and assigns it to the message;
 * the canvas's processors draw each create in the build assigned to it, so a surface on screen
 * keeps the build it was drawn in beside a newer one of its catalog. A change to a surface's
 * components assigned a newer build moves the surface there — re-created in it, its tree and data
 * carried over, then changed — and is no new paint: the count of paints runs at the wire, never
 * here. A change to the data alone moves nothing. A paint the way back returns to is restored in
 * the build it was drawn in.
 *
 * The processor resolves a create's catalog by id from its own list, so the build assigned is put
 * there just before its create (task-16.7 decision 2): a catalog the processor does not hold comes
 * in through `addCatalog`; another build of one it holds takes the held one's place.
 */
import {linkCatalogs, MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage, A2uiMessageListWrapper, Catalog} from '@a2ui/web_core/v0_9';
import type {ReactCatalogComponent} from '@a2ui/react/v0_9';
import {capturePaint, rebuildMessages} from '../canvas/history/paintCopy';
import type {PaintCopy} from '../canvas/history/fragmentHistory';
import type {ResolvedCatalog} from './clientCatalogs';

export interface PaintBuilds {
  /** The build a message is drawn in, as the gate assigned it; none leaves the lookup by catalog id. */
  of(message: A2uiMessage): ResolvedCatalog | undefined;
  /** Draws `message` in `build`: a create's surface, or the surface a change to its components moves. */
  assign(message: A2uiMessage, build: ResolvedCatalog): void;
  /** A copy's messages, its create assigned the build the paint was drawn in when it is loaded. */
  rebuild(copy: PaintCopy): A2uiMessage[];
}

/** `loaded` finds a build loaded for the page by its artifact id. */
export function createPaintBuilds(
  loaded: (artifactId: string) => ResolvedCatalog | undefined,
): PaintBuilds {
  const assigned = new WeakMap<A2uiMessage, ResolvedCatalog>();
  return {
    of: message => assigned.get(message),
    assign: (message, build) => void assigned.set(message, build),
    rebuild: copy => {
      const messages = rebuildMessages(copy);
      const build = copy.build === undefined ? undefined : loaded(copy.build);
      if (build?.id === copy.catalogId) assigned.set(messages[0]!, build);
      return messages;
    },
  };
}

type Catalogs = Catalog<ReactCatalogComponent>[];

/**
 * The list a processor resolves catalogs from, which its type keeps private: `addCatalog` (PR
 * #3304, carried as a patch) refuses an id the processor holds, and nothing else changes the list.
 */
const catalogsOf = (processor: MessageProcessor<ReactCatalogComponent>) =>
  (processor as unknown as {catalogs: Catalogs}).catalogs;

/** A canvas's processor: each surface drawn in the build its messages were assigned. */
export class BuildProcessor extends MessageProcessor<ReactCatalogComponent> {
  readonly #builds: PaintBuilds;

  constructor(
    catalogs: Catalogs,
    builds: PaintBuilds,
    actionHandler?: ConstructorParameters<typeof MessageProcessor<ReactCatalogComponent>>[1],
  ) {
    super(catalogs, actionHandler);
    this.#builds = builds;
  }

  override processMessages(messages: A2uiMessage[] | A2uiMessageListWrapper): void {
    const list = Array.isArray(messages) ? messages : messages.messages;
    for (const message of list) {
      const build = this.#builds.of(message);
      if (build && 'createSurface' in message) this.#hold(build);
      else if (build && 'updateComponents' in message) this.#move(message, build);
      super.processMessages([message]);
    }
  }

  /** The build a create resolves its catalog in. */
  #hold(build: ResolvedCatalog) {
    const held = catalogsOf(this);
    const at = held.findIndex(catalog => catalog.id === build.id);
    if (at === -1) return this.addCatalog(build.catalog);
    if (held[at] === build.catalog) return;
    // In the held one's place, linked to the others as `addCatalog` links a catalog; changed in
    // place, since the processor's RPC handler holds the same list.
    held.splice(0, held.length, ...linkCatalogs(held.with(at, build.catalog)));
  }

  /** A surface on screen in another build of the same catalog, re-created in `build` as it stands. */
  #move(message: A2uiMessage & {updateComponents: {surfaceId: string}}, build: ResolvedCatalog) {
    const {surfaceId} = message.updateComponents;
    const catalog = this.model.getSurface(surfaceId)?.defaultCatalog;
    if (!catalog || catalog.id !== build.id || catalog === build.catalog) return;
    const copy = capturePaint(this, surfaceId);
    if (!copy) return;
    this.model.deleteSurface(surfaceId);
    this.#hold(build);
    super.processMessages(rebuildMessages(copy));
  }
}
