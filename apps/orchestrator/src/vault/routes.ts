/**
 * The sign-in half of `orchestratorApi` (task-12.5 decision 5), reachable from the browser with
 * no write token. Protected against forged requests by what a foreign page cannot hold: the
 * attempt id the client made, a cookie binding the browser that started the attempt, `state`,
 * PKCE and the `nonce`, an `Origin` check on the token page's post — and by taking no scope from
 * the address: the vault decides what a sign-in asks.
 *
 * - `GET  /auth/client.json` — the vault's client ID metadata document.
 * - `GET  /auth/start?attempt&canvas&source` — opened by the popup; redirects to the
 *   authorization server, or to the token page.
 * - `GET  /auth/key?attempt` and `POST /auth/key` — the token page and its form.
 * - `GET  /auth/callback` — the authorization server's return.
 * - `GET  /auth/attempts/:id` — the outcome the client polls.
 */
import express, {type Request, type Response, type Router} from 'express';
import {logLine} from '../log.js';
import {endPage, keyPage, refusedPage} from './pages.js';
import {clientDocument, isSecureOrLocal, type ClientIdentity} from './oauth.js';
import type {Attempt, AuthVault, SlotAsk} from './vault.js';

export const AUTH_ROUTE_PREFIX = '/auth';
export const CLIENT_DOCUMENT_PATH = '/client.json';
export const CALLBACK_PATH = '/callback';
export const COOKIE_PREFIX = 'a2uiverse_signin_';

export interface AuthRoutesDeps {
  vault: AuthVault;
  identity: ClientIdentity;
  /** The orchestrator's public origin: what the token page's form posts from. */
  origin: string;
  /** What the canvas knows of the source: whether it holds a slot, and what it asks. */
  ask(canvas: string, source: string): SlotAsk | undefined;
  /** An app's display name and its card's help page, for the token page. */
  app(appId: string): {name: string; documentationUrl?: string};
}

export function authRoutes(deps: AuthRoutesDeps): Router {
  const router = express.Router();
  const secure = deps.origin.startsWith('https://');

  const html = (res: Response, status: number, body: string) =>
    res
      .status(status)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
      })
      .send(body);

  /** The attempt this browser started: the cookie must carry its binding. */
  const bound = (req: Request, attempt: Attempt | undefined): Attempt | undefined => {
    if (!attempt) return undefined;
    const cookie = readCookies(req.headers.cookie)[`${COOKIE_PREFIX}${attempt.id}`];
    return cookie !== undefined && cookie === attempt.binding ? attempt : undefined;
  };

  router.get(CLIENT_DOCUMENT_PATH, (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(clientDocument(deps.identity));
  });

  router.get('/start', async (req, res) => {
    const {attempt, canvas, source} = req.query;
    if (typeof attempt !== 'string' || typeof canvas !== 'string' || typeof source !== 'string') {
      return html(res, 400, refusedPage());
    }
    const started = await deps.vault.start({attempt, canvas, source, ask: deps.ask});
    if (started.kind === 'refused') {
      logLine(`🔑 sign-in refused for ${source} (${started.reason})`);
      return html(res, 400, refusedPage());
    }
    res.cookie(`${COOKIE_PREFIX}${started.attempt.id}`, started.attempt.binding, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: AUTH_ROUTE_PREFIX,
      maxAge: started.attempt.expiresAt - Date.now(),
    });
    if (started.kind === 'redirect') {
      if (!isSecureOrLocal(started.url)) return html(res, 400, refusedPage());
      return res.set('Cache-Control', 'no-store').redirect(302, started.url);
    }
    return res
      .set('Cache-Control', 'no-store')
      .redirect(302, `${AUTH_ROUTE_PREFIX}/key?attempt=${encodeURIComponent(started.attempt.id)}`);
  });

  router.get('/key', (req, res) => {
    const id = typeof req.query.attempt === 'string' ? req.query.attempt : '';
    const attempt = bound(req, deps.vault.attempt(id));
    if (!attempt || attempt.state !== 'pending' || attempt.scheme.kind === 'oauth') {
      return html(res, 400, refusedPage());
    }
    const app = deps.app(attempt.appId);
    const help =
      app.documentationUrl && isSecureOrLocal(app.documentationUrl)
        ? app.documentationUrl
        : undefined;
    return html(
      res,
      200,
      keyPage({
        app: app.name,
        attempt: attempt.id,
        action: `${AUTH_ROUTE_PREFIX}/key`,
        ...('description' in attempt.scheme && attempt.scheme.description
          ? {description: attempt.scheme.description}
          : {}),
        ...(help ? {helpUrl: help} : {}),
      }),
    );
  });

  router.post('/key', express.urlencoded({extended: false, limit: '16kb'}), async (req, res) => {
    // A foreign page cannot post a key in: the form is the orchestrator's own.
    if (req.headers.origin !== deps.origin) return html(res, 403, refusedPage());
    const id = typeof req.body?.attempt === 'string' ? req.body.attempt : '';
    const attempt = bound(req, deps.vault.attempt(id));
    if (!attempt || typeof req.body?.key !== 'string') return html(res, 400, refusedPage());
    const ended = await deps.vault.submitKey(attempt, req.body.key);
    return html(res, 200, endPage(ended.state === 'signedIn'));
  });

  router.get(CALLBACK_PATH, async (req, res) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const attempt = bound(req, deps.vault.attemptByState(state));
    if (!attempt) return html(res, 400, endPage(false));
    const ended = await deps.vault.callback(attempt, {
      ...(typeof req.query.code === 'string' ? {code: req.query.code} : {}),
      ...(typeof req.query.error === 'string' ? {error: req.query.error} : {}),
    });
    res.clearCookie(`${COOKIE_PREFIX}${attempt.id}`, {path: AUTH_ROUTE_PREFIX});
    return html(res, 200, endPage(ended.state === 'signedIn'));
  });

  router.get('/attempts/:id', (req, res) => {
    const outcome = deps.vault.outcome(req.params.id);
    if (!outcome) return res.status(404).set('Cache-Control', 'no-store').json({state: 'unknown'});
    return res.set('Cache-Control', 'no-store').json(outcome);
  });

  return router;
}

/** The request's cookies by name. */
export function readCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of (header ?? '').split(';')) {
    const index = pair.indexOf('=');
    if (index < 0) continue;
    const name = pair.slice(0, index).trim();
    try {
      cookies[name] = decodeURIComponent(pair.slice(index + 1).trim());
    } catch {
      // A malformed value is no binding.
    }
  }
  return cookies;
}
