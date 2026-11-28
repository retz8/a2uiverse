/**
 * The two checkouts the converter reads (task-21.11 decision 12): a file by path in either, an old
 * catalog document from git — `main`, then the tag of the last v0.9 commit — and a new one from the
 * checkout's working tree, the flip branch's.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {DocumentPlace} from './catalogMap.js';

/** The refs an old catalog document is read at, in order. */
export const OLD_DOCUMENT_REFS = ['main', 'last-v0.9'];

export class Repos {
  constructor(private readonly roots: Readonly<Record<DocumentPlace['repo'], string>>) {}

  root(repo: DocumentPlace['repo']): string {
    return this.roots[repo];
  }

  /** Every path the checkout tracks. */
  tracked(repo: DocumentPlace['repo']): string[] {
    return execFileSync('git', ['-C', this.root(repo), 'ls-files'], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    })
      .split('\n')
      .filter(Boolean);
  }

  read(place: DocumentPlace): string {
    return readFileSync(join(this.root(place.repo), place.path), 'utf8');
  }

  write(place: DocumentPlace, text: string) {
    writeFileSync(join(this.root(place.repo), place.path), text);
  }

  /** A document as git holds it before the flip: at the first of the refs that has it. */
  readOld(place: DocumentPlace): string {
    for (const ref of OLD_DOCUMENT_REFS) {
      try {
        return execFileSync('git', ['-C', this.root(place.repo), 'show', `${ref}:${place.path}`], {
          encoding: 'utf8',
          maxBuffer: 1 << 28,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      } catch {
        // Not at this ref: the next one.
      }
    }
    throw new Error(`${place.repo}:${place.path} is at none of ${OLD_DOCUMENT_REFS.join(', ')}`);
  }
}
