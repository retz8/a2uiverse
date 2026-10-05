/**
 * The vault file (phase-12 decision 10): one owner-only plain-JSON file in the state directory —
 * the accounts per app, each under its ordinal with its label and its credential, and the
 * client registrations per authorization server. Written whole on every change, through a temp
 * file and a rename, owner-only.
 */
import {chmod, mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';

export const VAULT_FILE = join('vault', 'vault.json');

/** How the account's credential rides the request. */
export type CredentialKind = 'oauth' | 'bearer' | 'apiKey';

/** One account of an app as the vault holds it. */
export interface VaultAccount {
  n: number;
  label: string;
  /** The card's scheme key it signed in under. */
  scheme: string;
  kind: CredentialKind;
  /** The token or the key the request carries. */
  secret: string;
  /** For `apiKey`: the header it rides. */
  header?: string;
  /** OAuth: the refresh token, the expiry, where to refresh and revoke, the client used. */
  refresh?: string;
  expiresAt?: number;
  issuer?: string;
  clientId?: string;
  tokenEndpoint?: string;
  revocationEndpoint?: string;
  /** The scope keys the account granted, `openid` left out. */
  scopes: string[];
  /** The ID token's stable subject: one account signed in twice stays one. */
  sub?: string;
  /** A pasted key's hash: the same key pasted again is the same account. */
  keyHash?: string;
  /** The silent refresh failed, or the server refused it: the account must sign in again. */
  again?: boolean;
}

export interface AppAccounts {
  /** The ordinal the next sign-in takes: never one held or held before. */
  next: number;
  accounts: VaultAccount[];
}

export interface Registration {
  clientId: string;
  registeredAt: string;
}

export interface VaultData {
  version: 1;
  apps: Record<string, AppAccounts>;
  /** Dynamic registrations, keyed by the authorization server's issuer and our return address. */
  registrations: Record<string, Registration>;
}

export class VaultStore {
  readonly #path: string;
  #data: VaultData = {version: 1, apps: {}, registrations: {}};
  #writing: Promise<void> = Promise.resolve();

  constructor(stateDir: string) {
    this.#path = join(stateDir, VAULT_FILE);
  }

  get path(): string {
    return this.#path;
  }

  async load(): Promise<void> {
    try {
      const raw = JSON.parse(await readFile(this.#path, 'utf8')) as VaultData;
      if (
        raw.version !== 1 ||
        typeof raw.apps !== 'object' ||
        typeof raw.registrations !== 'object'
      ) {
        throw new Error(`the vault at ${this.#path} is not a vault file`);
      }
      this.#data = raw;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  get data(): VaultData {
    return this.#data;
  }

  app(appId: string): AppAccounts {
    return (this.#data.apps[appId] ??= {next: 1, accounts: []});
  }

  /** Persists the whole file; writes are serialized so the last state always lands. */
  save(): Promise<void> {
    const snapshot = JSON.stringify(this.#data, null, 1);
    this.#writing = this.#writing.then(() => this.#write(snapshot));
    return this.#writing;
  }

  async #write(contents: string): Promise<void> {
    await mkdir(dirname(this.#path), {recursive: true, mode: 0o700});
    const tmp = `${this.#path}.${process.pid}.tmp`;
    await writeFile(tmp, contents, {mode: 0o600});
    await chmod(tmp, 0o600);
    await rename(tmp, this.#path);
  }
}
