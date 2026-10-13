/**
 * The packed folders and the sample answer file the publish form takes (task-14.2 decision 14,
 * task-14.9 decision 15), read in the browser by drag and drop or by choosing them. A folder is
 * every file under it by its path relative to it, as Stellify's `publish` reads one; it is refused
 * on the spot when no descriptor sits at its top, and labelled from the descriptor otherwise. A
 * file's bytes are read and encoded only when the publish is sent, into the body Stellify posts.
 */
import {validatePreview, type PreviewDocument, type PublishRequest} from '@a2uiverse/sdk';

/** The descriptor at a packed folder's top (SPEC §9.1). */
const DESCRIPTOR = 'artifact.json';

export interface PackedFolder {
  /** The folder's own name, as it was dropped or chosen. */
  folder: string;
  /** The descriptor's package name, or the folder's own name when it gives none. */
  label: string;
  /** Every file under the folder by its posix path relative to it, sorted. */
  files: ReadonlyMap<string, Blob>;
}

/** A folder read: packed, or refused by its name. */
export type FolderRead = {ok: true; folder: PackedFolder} | {ok: false; name: string};

/** A folder from its files: refused with no descriptor at its top, or one that does not read. */
export async function readFolder(
  name: string,
  files: ReadonlyMap<string, Blob>,
): Promise<FolderRead> {
  const descriptor = files.get(DESCRIPTOR);
  if (!descriptor) return {ok: false, name};
  let label = name;
  try {
    const parsed = JSON.parse(await descriptor.text()) as {package?: {name?: unknown}} | null;
    if (typeof parsed !== 'object' || parsed === null) return {ok: false, name};
    if (typeof parsed.package?.name === 'string' && parsed.package.name)
      label = parsed.package.name;
  } catch {
    return {ok: false, name};
  }
  const sorted = new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return {ok: true, folder: {folder: name, label, files: sorted}};
}

/** Every file under a dropped directory, by its path relative to it. */
async function walk(
  directory: FileSystemDirectoryEntry,
  prefix: string,
  into: Map<string, Blob>,
): Promise<void> {
  const reader = directory.createReader();
  // `readEntries` answers in batches until it answers none.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return;
    for (const entry of batch) {
      const path = `${prefix}${entry.name}`;
      if (entry.isDirectory) {
        await walk(entry as FileSystemDirectoryEntry, `${path}/`, into);
      } else if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject),
        );
        into.set(path, file);
      }
    }
  }
}

/**
 * The folders of a drop. The entries are taken while the drop event runs, before anything is
 * awaited — the browser empties the drop's items after it.
 */
export function readDrop(transfer: DataTransfer): Promise<FolderRead[]> {
  const entries = [...transfer.items]
    .map(item => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry !== null);
  return Promise.all(
    entries.map(async entry => {
      if (!entry.isDirectory) return {ok: false as const, name: entry.name};
      const files = new Map<string, Blob>();
      await walk(entry as FileSystemDirectoryEntry, '', files);
      return readFolder(entry.name, files);
    }),
  );
}

/** The folders a folder picker chose: each file under the folder it was chosen in. */
export function readChosen(files: Iterable<File>): Promise<FolderRead[]> {
  const folders = new Map<string, Map<string, Blob>>();
  const loose: string[] = [];
  for (const file of files) {
    const [folder, ...rest] = (file.webkitRelativePath || '').split('/');
    if (!folder || rest.length === 0) {
      loose.push(file.name);
      continue;
    }
    const held = folders.get(folder) ?? new Map<string, Blob>();
    held.set(rest.join('/'), file);
    folders.set(folder, held);
  }
  return Promise.all([
    ...[...folders].map(([name, held]) => readFolder(name, held)),
    ...loose.map(name => Promise.resolve({ok: false as const, name})),
  ]);
}

/** A sample answer file read: Stellify's capture, or refused by its name. */
export type PreviewRead =
  {ok: true; name: string; preview: PreviewDocument} | {ok: false; name: string};

/** A sample answer file, held to the sdk's preview check as Stellify's `publish` holds it. */
export async function readPreview(file: File): Promise<PreviewRead> {
  try {
    const checked = validatePreview(JSON.parse(await file.text()));
    return checked.ok
      ? {ok: true, name: file.name, preview: checked.value}
      : {ok: false, name: file.name};
  } catch {
    return {ok: false, name: file.name};
  }
}

/** A blob's bytes in standard base64, as Stellify encodes each file. */
export async function base64Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  // In slices: one call spreading every byte would overflow the stack on a large file.
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  }
  return btoa(binary);
}

/** The publish body Stellify's `publish` posts (SPEC §9.3): each folder's files, the sample if any. */
export async function publishRequest(form: {
  appId: string;
  cardUrl: string;
  folders: readonly PackedFolder[];
  preview?: PreviewDocument;
}): Promise<PublishRequest> {
  const catalogs = await Promise.all(
    form.folders.map(async ({files}) => {
      const encoded: Record<string, string> = {};
      for (const [path, blob] of files) encoded[path] = await base64Of(blob);
      return {files: encoded};
    }),
  );
  return {
    appId: form.appId,
    cardUrl: form.cardUrl,
    catalogs,
    ...(form.preview ? {preview: form.preview} : {}),
  };
}
