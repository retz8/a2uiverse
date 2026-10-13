/**
 * The publish form (task-14.2 decisions 14, 15), drawn to the design canvas's form and outcome
 * boards: the app id — filled in and fixed for an update — the app's address, zero or more packed
 * folders and the sample answer file, by drag and drop or by choosing them. The page reads them
 * and posts the body Stellify posts (phase-14 decision 6), after its own checks (task-14.9
 * decisions 15, 16).
 *
 * While its publish runs, and once it lands, the form's place shows how it stands: publishing,
 * published with the Store's summary and notes, or refused with what the Store found — the form
 * kept behind Back to the form (decisions 10, 17, 18).
 */
import {useRef, useState, type FormEvent, type ReactNode} from 'react';
import {Spinner} from '@radix-ui/themes';
import type {StoreListing} from '../../../orchestratorApi';
import type {TrustedPageState} from '../../trail/trailStore';
import {dayOf} from '../appCard';
import {BackIcon, FileIcon, FolderIcon, RemoveIcon} from '../icons';
import {pageLink} from '../pageLink';
import {readChosen, readDrop, readPreview, type FolderRead} from './packedFiles';
import {Field, Findings, Notice, PageButton, Term} from './parts';
import {
  addressProblem,
  changesWho,
  filesWords,
  nameProblem,
  notPackedWords,
  notPreviewWords,
  otherAppPreviewWords,
  previewHint,
  publishRefusedWords,
  publishedWords,
} from './publishWords';
import type {Draft} from './draft';
import type {PublishAct} from './PublishPage';

const PUBLISH: TrustedPageState = {page: 'publish'};

export interface PublishFormProps {
  draft: Draft;
  /** The listing an update goes to; none for a new app. */
  listing?: StoreListing;
  /** The act across Publish: this form's publish, drawn in its place. */
  act: PublishAct;
  busy: boolean;
  /** The app's name as Publish knows it. */
  nameOf: (appId: string) => string;
  onChange: (change: (draft: Draft) => Draft) => void;
  onPublish: (draft: Draft) => void;
  /** The outcome on the form's place seen: the form, or the listings, back. */
  onDismiss: () => void;
  onCancel: () => void;
  onNavigate: (page: TrustedPageState) => void;
}

export function PublishForm(props: PublishFormProps) {
  const {draft, act, nameOf, onDismiss, onNavigate} = props;
  const mine =
    (act.kind === 'publishing' || act.kind === 'published' || act.kind === 'publish-refused') &&
    act.target === draft.target &&
    !(act.kind === 'publish-refused' && changesWho(act.refusal))
      ? act
      : undefined;
  const name = nameOf(mine?.appId ?? draft.appId);

  let body: ReactNode;
  if (mine?.kind === 'publishing') {
    body = (
      <div
        className="publish-card publish-card--outcome"
        role="status"
        data-testid="publish-publishing"
      >
        <h2>Publishing {name}</h2>
        <p>
          The Store fetches your app, checks its files and asks it one question before it lists it.
        </p>
        <span className="publish-step">
          <Spinner size="1" />
          <span className="publish-note">Waiting for the Store’s checks</span>
        </span>
      </div>
    );
  } else if (mine?.kind === 'publish-refused') {
    body = (
      <div className="publish-card publish-card--outcome" data-testid="publish-refused">
        <Notice
          tone="bad"
          role="alert"
          words={publishRefusedWords(mine.refusal, mine.findings, mine.appId, mine.isNew)}
        />
        {mine.refusal !== 'unreached' && (
          <Findings label="What the Store found" term="findings" lines={mine.findings} />
        )}
        <div className="publish-acts">
          <PageButton height="small" onClick={onDismiss}>
            Back to the form
          </PageButton>
        </div>
      </div>
    );
  } else if (mine?.kind === 'published') {
    const words = publishedWords(mine.outcome, name);
    body = (
      <div className="publish-card publish-card--outcome" data-testid="publish-published">
        <Notice tone="done" role="status" words={{lead: words.lead}} />
        <Findings
          label="Summary"
          term="publish summary"
          lines={[mine.outcome.summary, ...mine.outcome.notes].filter(Boolean)}
        />
        <p>{words.rest}</p>
        <div className="publish-acts">
          <PageButton
            height="small"
            onClick={() => {
              onDismiss();
              onNavigate(PUBLISH);
            }}
          >
            Back to your apps
          </PageButton>
        </div>
      </div>
    );
  } else {
    body = <Form {...props} />;
  }

  return (
    <div className="store-col" data-testid="publish-form-view" data-app={draft.target}>
      <a className="store-crumb" {...pageLink(PUBLISH, onNavigate)}>
        <BackIcon />
        Your apps in the Store
      </a>
      {body}
    </div>
  );
}

function Form({draft, listing, busy, onChange, onPublish, onCancel}: PublishFormProps) {
  const update = listing !== undefined;

  const addFolders = async (reading: Promise<FolderRead[]>) => {
    const reads = await reading;
    const folders = reads.flatMap(read => (read.ok ? [read.folder] : []));
    const refused = reads.flatMap(read => (read.ok ? [] : [read.name]));
    onChange(d => ({
      ...d,
      folders: [...d.folders, ...folders],
      notPacked: refused,
      filesError: undefined,
    }));
  };

  const setPreview = async (file: File | undefined) => {
    if (!file) return;
    const read = await readPreview(file);
    onChange(d =>
      read.ok
        ? {...d, preview: {name: read.name, preview: read.preview}, previewError: undefined}
        : {...d, preview: null, previewError: notPreviewWords(read.name)},
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const appIdError = update ? undefined : nameProblem(draft.appId, 'app');
    const cardUrlError = addressProblem(draft.cardUrl);
    const sample = draft.preview?.preview.appId;
    const previewError =
      sample !== undefined && sample !== draft.appId
        ? otherAppPreviewWords(sample, draft.appId)
        : undefined;
    onChange(d => ({...d, appIdError, cardUrlError, previewError}));
    if (appIdError || cardUrlError || previewError) return;
    onPublish(draft);
  };

  return (
    <form className="publish-form" onSubmit={submit} noValidate data-testid="publish-form">
      <h1>{update ? `Publish an update to ${listing.entry.card.name}` : 'Publish an app'}</h1>
      <div className="publish-grid2">
        <Field
          label={
            <>
              App name in the Store <Term>(app id)</Term>
            </>
          }
          type="text"
          autoComplete="off"
          spellCheck={false}
          readOnly={update}
          value={draft.appId}
          onChange={event =>
            onChange(d => ({...d, appId: event.target.value, appIdError: undefined}))
          }
          error={draft.appIdError}
        />
        <Field
          label={
            <>
              Your app’s address <Term>(card URL)</Term>
            </>
          }
          type="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
          value={draft.cardUrl}
          onChange={event =>
            onChange(d => ({...d, cardUrl: event.target.value, cardUrlError: undefined}))
          }
          error={draft.cardUrlError}
        />

        <div className="publish-field">
          <span className="publish-label">
            Packed folders <Term>(catalog artifacts)</Term>
          </span>
          <DropZone
            kind="folders"
            onDrop={transfer => void addFolders(readDrop(transfer))}
            onChoose={files => void addFolders(readChosen(files))}
          />
          {draft.folders.length > 0 && (
            <ul className="publish-files" aria-label="Packed folders">
              {draft.folders.map((folder, index) => (
                <li className="publish-file" key={`${folder.folder}-${index}`}>
                  <FolderIcon />
                  <span className="publish-file__name">{folder.label}</span>
                  <span className="publish-file__meta">{filesWords(folder.files.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${folder.label}`}
                    onClick={() =>
                      onChange(d => ({...d, folders: d.folders.filter((_, at) => at !== index)}))
                    }
                  >
                    <RemoveIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {draft.notPacked.map(folder => (
            <span key={folder} className="publish-error" role="alert">
              {notPackedWords(folder)}
            </span>
          ))}
          {draft.filesError && (
            <span className="publish-error" role="alert">
              {draft.filesError}
            </span>
          )}
          <span className="publish-hint">An app drawn only in the basic look needs none.</span>
        </div>

        <div className="publish-field">
          <span className="publish-label">
            Sample answer file <Term>(preview)</Term>
          </span>
          <DropZone
            kind="file"
            onDrop={transfer => void setPreview(transfer.files[0])}
            onChoose={files => void setPreview(files[0])}
          />
          {draft.preview && (
            <ul className="publish-files" aria-label="Sample answer file">
              <li className="publish-file">
                <FileIcon />
                <span className="publish-file__name">{draft.preview.name}</span>
                <span className="publish-file__meta">
                  captured {dayOf(draft.preview.preview.capturedAt)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${draft.preview.name}`}
                  onClick={() => onChange(d => ({...d, preview: null, previewError: undefined}))}
                >
                  <RemoveIcon />
                </button>
              </li>
            </ul>
          )}
          {draft.previewError && (
            <span className="publish-error" role="alert">
              {draft.previewError}
            </span>
          )}
          <span className="publish-hint">{previewHint(listing?.entry.card)}</span>
        </div>
      </div>
      <div className="publish-foot">
        <PageButton look="quiet" type="button" onClick={onCancel}>
          Cancel
        </PageButton>
        <PageButton
          look="primary"
          type="submit"
          disabled={busy || draft.appId === '' || draft.cardUrl === ''}
        >
          Publish
        </PageButton>
      </div>
    </form>
  );
}

/** Where folders, or the sample answer file, are dropped or chosen. */
function DropZone({
  kind,
  onDrop,
  onChoose,
}: {
  kind: 'folders' | 'file';
  onDrop: (transfer: DataTransfer) => void;
  onChoose: (files: File[]) => void;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const folders = kind === 'folders';
  return (
    <div
      className={over ? 'publish-drop publish-drop--over' : 'publish-drop'}
      data-testid={folders ? 'publish-drop-folders' : 'publish-drop-file'}
      onDragOver={event => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault();
        setOver(false);
        onDrop(event.dataTransfer);
      }}
    >
      {folders ? <FolderIcon size={20} /> : <FileIcon size={20} />}
      <span>
        <b>{folders ? 'Drop the folders Stellify packed' : 'Drop the sample Stellify captured'}</b>,
        or{' '}
        <button type="button" className="publish-link" onClick={() => input.current?.click()}>
          {folders ? 'choose folders' : 'choose a file'}
        </button>
      </span>
      <input
        ref={element => {
          input.current = element;
          // A folder picker: React has no prop for it.
          if (element && folders) element.setAttribute('webkitdirectory', '');
        }}
        className="store-visually-hidden"
        type="file"
        tabIndex={-1}
        aria-label={folders ? 'Choose packed folders' : 'Choose the sample answer file'}
        {...(folders ? {multiple: true} : {accept: '.json,application/json'})}
        onChange={event => {
          onChoose([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
