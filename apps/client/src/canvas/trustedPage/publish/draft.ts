/**
 * What the publish form holds (task 14.9), kept across Publish until it is published or cancelled
 * (decision 8), so a refusal's Back to the form finds it as it was (decisions 10, 18).
 */
import type {PreviewDocument} from '@a2uiverse/sdk';
import type {StoreListing} from '../../../orchestratorApi';
import type {PackedFolder} from './packedFiles';

export interface Draft {
  /** The form it fills: the app an update goes to, `''` for a new app. */
  target: string;
  appId: string;
  cardUrl: string;
  folders: PackedFolder[];
  /** Folders refused on the spot, by their names (decision 15). */
  notPacked: string[];
  preview: {name: string; preview: PreviewDocument} | null;
  previewError?: string;
  appIdError?: string;
  cardUrlError?: string;
  /** A dropped file that could not be read when the publish was sent. */
  filesError?: string;
}

/** A fresh form: for an update, the app id and its address filled in from its listing. */
export const draftFor = (target: string, listing?: StoreListing): Draft => ({
  target,
  appId: target,
  cardUrl: listing?.entry.cardUrl ?? '',
  folders: [],
  notPacked: [],
  preview: null,
});
