/**
 * The pages the sign-in popup shows from the orchestrator: the token page for `http` bearer and
 * `apiKey` (task-12.5 decision 2), the code page for the device-code flow (task-20.6 decisions
 * 2–4), and the one-line pages a sign-in ends on. Words for customers: no address, no protocol
 * term. The scheme's description is the vendor's, shown as plain text under whose it is — nothing
 * in it rendered, no address in it made live.
 */

const STYLE = `
:root { color-scheme: light dark; --ink: #1c2024; --soft: #60646c; --line: #d9d9e0;
  --page: #f9f9fb; --card: #fff; --accent: #3e63dd; --on-accent: #fff; }
@media (prefers-color-scheme: dark) { :root { --ink: #edeef0; --soft: #b0b4ba;
  --line: #363a3f; --page: #111113; --card: #18191b; --accent: #5472e4; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
  background: var(--page); color: var(--ink);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { width: 100%; max-width: 420px; background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 24px; display: grid; gap: 16px; }
h1 { font-size: 20px; margin: 0; }
p { margin: 0; color: var(--soft); }
.from { display: grid; gap: 4px; }
.words { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ink);
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; overflow: hidden; }
.words.open { display: block; }
button.link { justify-self: start; padding: 0; border: 0; background: none; color: var(--accent);
  font: inherit; cursor: pointer; }
a.help { justify-self: start; color: var(--accent); }
form { display: grid; gap: 16px; }
label { display: grid; gap: 6px; font-weight: 500; }
.opt { font-weight: 400; color: #6b6b72; }
input { font: inherit; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--page); color: var(--ink); }
button.go { font: inherit; padding: 10px 14px; border: 0; border-radius: 8px;
  background: var(--accent); color: var(--on-accent); cursor: pointer; justify-self: start; }
.yours { display: grid; gap: 6px; }
.yours .label { font-weight: 500; color: var(--ink); }
.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.code { font: 600 28px/1.2 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  letter-spacing: 0.08em; color: var(--ink); overflow-wrap: anywhere; }
.waiting { display: flex; align-items: center; gap: 8px; }
.spinner { flex: none; width: 14px; height: 14px; border: 2px solid var(--line);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
[hidden] { display: none !important; }
`;

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function page(title: string, body: string, script = ''): string {
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>` +
    `<body><main>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`
  );
}

/** How long a sign-in that ended well stays open, said on the page (task-12.13 decision 31). */
export const END_CLOSE_SECONDS = 5;

/** A page's title and the inside of its card. */
interface Content {
  title: string;
  body: string;
}

/**
 * The end a sign-in came to: one heading, one line. Ended well, it says it closes in five
 * seconds, with Close now beside the count. A pasted key or token says connected (task-12.13
 * decisions 30, 31).
 */
function endContent(ended: boolean, about: {app?: string; connect?: boolean}): Content {
  const app = about.app ? escapeHtml(about.app) : undefined;
  const connect = about.connect === true;
  if (!ended) {
    return connect
      ? {
          title: "Connecting didn't finish",
          body:
            `<h1>${app ? `${app} wasn't connected` : "Connecting didn't finish"}</h1>` +
            '<p>Close this window and try connecting again.</p>',
        }
      : {
          title: "Sign-in didn't finish",
          body: "<h1>Sign-in didn't finish</h1><p>Close this window and try signing in again.</p>",
        };
  }
  const heading = connect
    ? app
      ? `You're connected to ${app}`
      : "You're connected"
    : app
      ? `You're signed in to ${app}`
      : "You're signed in";
  return {
    title: connect ? "You're connected" : "You're signed in",
    body:
      `<h1>${heading}</h1>` +
      `<p id="closing">This window closes in <span id="seconds">${END_CLOSE_SECONDS}</span> seconds.</p>` +
      '<button class="go" id="close" type="button">Close now</button>',
  };
}

/** A device-code attempt whose code ran out (task-20.6 decision 4). */
const EXPIRED: Content = {
  title: 'This code has run out',
  body: '<h1>This code has run out</h1><p>Close this window and try signing in again.</p>',
};

/**
 * The count of an end page that ended well, defined as `closing()`: down from five, then the
 * window closes — and says it can be closed where the browser keeps it open.
 */
const CLOSING_SCRIPT = [
  'function closing() {',
  `  let left = ${END_CLOSE_SECONDS};`,
  "  const said = document.getElementById('closing');",
  "  const seconds = document.getElementById('seconds');",
  '  const close = () => { clearInterval(timer); window.close();',
  "    setTimeout(() => { said.textContent = 'You can close this window.'; }, 300); };",
  "  document.getElementById('close').addEventListener('click', close);",
  '  const timer = setInterval(() => { left -= 1;',
  '    if (left <= 0) close(); else seconds.textContent = String(left); }, 1000);',
  '}',
].join('\n');

/** A sign-in ended: the window says how, and closes itself when it ended well. */
export function endPage(ended: boolean, about: {app?: string; connect?: boolean} = {}): string {
  const {title, body} = endContent(ended, about);
  return page(title, body, ended ? `${CLOSING_SCRIPT}\nclosing();` : '');
}

/** The end a device-code attempt came to, as the code page shows it when reloaded after. */
export function codeEndPage(state: 'signedIn' | 'failed' | 'expired', app: string): string {
  if (state === 'expired') return page(EXPIRED.title, EXPIRED.body);
  return endPage(state === 'signedIn', {app});
}

/**
 * The code page (task-20.6 decisions 2–4): the user code under "Your code" with Copy, and the
 * button that opens the app's page in a second window under the popup rule — the address with the
 * code in it where the server gave one, the line under it saying what to check — then the wait.
 * It asks the orchestrator how the attempt stands, as the canvas does, and turns into how it
 * ended: signed in, closing itself; didn't finish; or the code ran out. It shows no address and
 * offers no new code.
 */
export function codePage(params: {
  app: string;
  userCode: string;
  /** What the button opens; never shown. */
  opens: string;
  /** Whether that address carries the code already. */
  complete: boolean;
  /** Where the attempt's outcome is asked. */
  outcomeUrl: string;
}): string {
  const app = escapeHtml(params.app);
  const ended = {
    signedIn: endContent(true, {app: params.app}),
    failed: endContent(false, {app: params.app}),
    expired: EXPIRED,
  };
  const templates = Object.entries(ended)
    .map(
      ([state, {title, body}]) =>
        `<template id="end-${state}" data-title="${escapeHtml(title)}">${body}</template>`,
    )
    .join('');
  const line = params.complete
    ? `Check that ${app}'s page shows this same code.`
    : `${app}'s page will ask for this code.`;
  const body =
    `<h1>Sign in to ${app}</h1>` +
    '<div class="yours"><span class="label">Your code</span>' +
    `<div class="row"><span class="code" id="code">${escapeHtml(params.userCode)}</span>` +
    '<button type="button" class="link" id="copy">Copy</button></div></div>' +
    `<button class="go" id="open" type="button">Open ${app}'s sign-in</button>` +
    '<p class="waiting" id="waiting" role="status" hidden><span class="spinner" aria-hidden="true"></span>' +
    'Waiting for you to finish signing in</p>' +
    `<button type="button" class="link" id="again" hidden>Open ${app}'s sign-in again</button>` +
    `<p>${line}</p>`;
  // Inside a script, `<` is written escaped so no address or code can close the element.
  const literal = (value: string) => JSON.stringify(value).replaceAll('<', '\\u003c');
  const script = [
    CLOSING_SCRIPT,
    `const opens = ${literal(params.opens)};`,
    `const outcomeUrl = ${literal(params.outcomeUrl)};`,
    "const main = document.querySelector('main');",
    "const open = () => window.open(opens, '_blank', 'noopener,noreferrer');",
    "document.getElementById('open').addEventListener('click', () => { open();",
    "  document.getElementById('open').hidden = true;",
    "  document.getElementById('waiting').hidden = false;",
    "  document.getElementById('again').hidden = false; });",
    "document.getElementById('again').addEventListener('click', open);",
    "const copy = document.getElementById('copy');",
    "copy.addEventListener('click', async () => {",
    "  const code = document.getElementById('code');",
    "  try { await navigator.clipboard.writeText(code.textContent); copy.textContent = 'Copied'; }",
    '  catch { const range = document.createRange(); range.selectNodeContents(code);',
    '    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); }',
    "  setTimeout(() => { copy.textContent = 'Copy'; }, 2000); });",
    'const end = state => { clearInterval(asking);',
    '  const template = document.getElementById(`end-${state}`);',
    '  document.title = template.dataset.title;',
    '  main.replaceChildren(template.content.cloneNode(true));',
    "  if (state === 'signedIn') closing(); };",
    'const ask = async () => {',
    "  try { const answer = await fetch(outcomeUrl, {cache: 'no-store'});",
    "    const {state} = answer.status === 404 ? {state: 'unknown'} : await answer.json();",
    "    if (state === 'signedIn' || state === 'expired') end(state);",
    "    else if (state !== 'pending') end('failed');",
    '  } catch { /* lost on the way: asked again */ } };',
    'const asking = setInterval(ask, 1000);',
  ].join('\n');
  return page(`Sign in to ${params.app}`, body + templates, script);
}

export function refusedPage(): string {
  return page(
    "This sign-in can't start",
    "<h1>This sign-in can't start</h1><p>Close this window and try signing in again.</p>",
  );
}

/** The token page (task-12.5 decision 2). */
export function keyPage(params: {
  app: string;
  attempt: string;
  action: string;
  description?: string;
  helpUrl?: string;
  /** A new account's name field, its hint the name it gets left blank (task-14.11 decision 36). */
  name?: {placeholder: string; maxLength: number};
}): string {
  const app = escapeHtml(params.app);
  const from = params.description
    ? `<div class="from"><p>From ${app}:</p>` +
      `<div class="words" id="words">${escapeHtml(params.description)}</div>` +
      '<button type="button" class="link" id="all" hidden>Show all</button></div>'
    : '';
  const help = params.helpUrl
    ? `<a class="help" href="${escapeHtml(params.helpUrl)}" target="_blank" rel="noopener noreferrer">Open ${app}'s help page</a>`
    : '';
  const body =
    `<h1>Connect ${app}</h1>${from}${help}` +
    `<form method="post" action="${escapeHtml(params.action)}">` +
    `<input type="hidden" name="attempt" value="${escapeHtml(params.attempt)}">` +
    '<label>Paste your key<input name="key" type="password" autocomplete="off" spellcheck="false" required></label>' +
    (params.name
      ? `<label>Name this account <span class="opt">(optional)</span><input name="name" type="text" maxlength="${params.name.maxLength}" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(params.name.placeholder)}"></label>`
      : '') +
    '<button class="go" type="submit">Connect</button></form>';
  const script =
    "const w=document.getElementById('words'),b=document.getElementById('all');" +
    "if(w&&b&&w.scrollHeight>w.clientHeight+1){b.hidden=false;b.onclick=()=>{w.classList.add('open');b.hidden=true;};}";
  return page(`Connect ${params.app}`, body, script);
}
