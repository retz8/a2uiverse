/**
 * The v1.0 identifier rule (UAX #31) as `@a2ui/web_core` 0.16.1 enforces it, and the one rewrite
 * the converter makes of an id it refuses (task-21.11 decision 4): every hyphen an underscore, as
 * upstream's v1 copies of its basic catalog examples have them.
 */

const IDENTIFIER = /^[\p{XID_Start}_][\p{XID_Continue}]*$/u;

/** Whether `name` is a UAX #31 identifier. */
export const isIdentifier = (name: string): boolean => IDENTIFIER.test(name);

/** The id a component takes on v1.0: itself when it conforms, else its hyphens as underscores. */
export const renamedId = (id: string): string => (isIdentifier(id) ? id : id.replaceAll('-', '_'));
