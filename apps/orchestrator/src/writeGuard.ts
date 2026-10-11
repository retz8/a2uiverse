/**
 * Browser writes (SPEC §10; task-14.3 decisions 1, 2). Every write on `orchestratorApi` carries
 * the JSON content type — a foreign page cannot send it without the browser asking first, the
 * answer checked against the page's real origin, so a dev tunnel rewriting `Origin` lets no form
 * through — and is the trusted page's when it comes from an allowed origin, else takes the write
 * token, the launcher's and the registry command's.
 */
import {timingSafeEqual} from 'node:crypto';
import type {Request, RequestHandler, Response} from 'express';

/** Who made a write: the trusted page, from an allowed origin, or a caller with the token. */
export type WriteCaller = 'page' | 'token';

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
/** A dev tunnel's host: `<tunnel>-<port>.<region>.devtunnels.ms` (tunnel-environment.md). */
const TUNNEL_HOST = /^([a-z0-9-]+)-\d+\.([a-z0-9]+)\.devtunnels\.ms$/;

/**
 * The origins the orchestrator admits, CORS and writes alike: localhost and 127.0.0.1 on any
 * port, and, when its own address is a dev tunnel, that tunnel's hosts on any port.
 */
export function originAllowed(baseUrl: string): (origin: string) => boolean {
  let tunnel: RegExp | undefined;
  try {
    const {protocol, hostname} = new URL(baseUrl);
    const match = protocol === 'https:' ? TUNNEL_HOST.exec(hostname) : null;
    if (match) tunnel = new RegExp(`^https://${match[1]}-\\d+\\.${match[2]}\\.devtunnels\\.ms$`);
  } catch {
    // An address that does not parse admits localhost alone.
  }
  return origin => LOCAL.test(origin) || (tunnel?.test(origin) ?? false);
}

/** The guard every write route runs before its body is read; `callerOf` then names the caller. */
export function writeGuard({
  token,
  allowed,
}: {
  /** The token this run issued; none yet, no token caller is let in. */
  token: () => string | undefined;
  allowed: (origin: string) => boolean;
}): RequestHandler {
  return (req, res, next) => {
    if (!req.is('application/json')) {
      res.status(415).json({ok: false, findings: ['a write carries a JSON body']});
      return;
    }
    if (req.get('authorization') !== undefined) {
      const issued = token();
      if (issued === undefined || !bearerIs(req, issued)) {
        res.status(401).json({ok: false, findings: ['the write token is missing or wrong']});
        return;
      }
      res.locals.writeCaller = 'token' satisfies WriteCaller;
      return next();
    }
    const origin = req.get('origin');
    if (origin === undefined) {
      res.status(401).json({ok: false, findings: ['the write token is missing or wrong']});
      return;
    }
    if (!allowed(origin)) {
      res.status(403).json({ok: false, findings: [`writes from ${origin} are not accepted`]});
      return;
    }
    res.locals.writeCaller = 'page' satisfies WriteCaller;
    next();
  };
}

/** The caller the guard let in. */
export function callerOf(res: Response): WriteCaller {
  return res.locals.writeCaller as WriteCaller;
}

function bearerIs(req: Request, token: string): boolean {
  const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
  if (!match) return false;
  const given = Buffer.from(match[1]!);
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
