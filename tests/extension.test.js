// Tests for the Tally Chrome extension. Run with:  node tests/extension.test.js
// The browser is simulated: a fake "chrome" API, a fake Canvas, and a fake Tally page.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ext = path.join(root, 'extension');
const { collectorSource } = require(path.join(root, 'tools', 'build-extension.js'));
const read = (f) => fs.readFileSync(path.join(ext, f), 'utf8');

const results = [];
const T = (name, fn) => results.push([name, fn]);
const is = (got, want, what = 'value') => { if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); };
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// ---- fake Chrome -----------------------------------------------------------
function fakeChrome(opts = {}) {
  const store = {}; const listeners = { msg: [], changed: [] }; const log = { tabsCreated: [], registered: [], permissions: [], executed: [] };
  const chrome = {
    storage: {
      local: {
        get: (keys, cb) => { const out = {}; const list = keys == null ? Object.keys(store) : [].concat(keys); list.forEach((k) => { if (k in store) out[k] = store[k]; }); if (cb) { cb(out); return; } return Promise.resolve(out); },
        set: (obj, cb) => { const ch = {}; Object.keys(obj).forEach((k) => { ch[k] = { newValue: obj[k] }; store[k] = obj[k]; }); listeners.changed.forEach((f) => f(ch, 'local')); if (cb) { cb(); return; } return Promise.resolve(); },
      },
      onChanged: { addListener: (f) => listeners.changed.push(f) },
    },
    runtime: {
      onMessage: { addListener: (f) => listeners.msg.push(f) },
      sendMessage: (msg) => new Promise((res) => { let replied = false; const reply = (r) => { replied = true; res(r); }; let async_ = false; listeners.msg.forEach((f) => { if (f(msg, {}, reply) === true) async_ = true; }); if (!async_ && !replied) res(undefined); }),
    },
    permissions: { request: async (p) => { log.permissions.push(p); return opts.grant !== false; } },
    scripting: {
      executeScript: async (o) => { log.executed.push(o.files ? { files: o.files } : { func: true }); return opts.executeScript ? opts.executeScript(o) : [{ result: undefined }]; },
      getRegisteredContentScripts: async () => log.registered.map((r) => ({ id: r.id })),
      registerContentScripts: async (list) => { list.forEach((r) => log.registered.push(r)); },
    },
    tabs: { query: (q, cb) => { const r = opts.tabs ? opts.tabs(q) : []; if (cb) { cb(r); return; } return Promise.resolve(opts.activeTab ? [opts.activeTab] : r); }, update: () => {}, create: (o) => { log.tabsCreated.push(o.url); } },
    windows: { update: () => {} },
  };
  return { chrome, store, log };
}

// ---- fake Canvas -----------------------------------------------------------
function fakeCanvasFetch() {
  const resp = (body) => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => 'while(1);' + JSON.stringify(body) });
  const calls = [];
  const f = async (url, o) => {
    calls.push({ url, o });
    const u = new URL(url, 'https://canvas.pitt.edu');
    if (u.pathname === '/api/v1/users/self') return resp({ name: 'Pat Student' });
    if (u.pathname === '/api/v1/courses') return resp([{ id: '101', name: 'Intro to Neuroscience', course_code: 'NROSCI 1000', apply_assignment_group_weights: true }]);
    if (/assignment_groups$/.test(u.pathname)) return resp([{ id: '11', name: 'Homework', group_weight: 100, rules: {}, assignments: [{ id: '1', name: 'HW 1', points_possible: 10, submission: { score: 9 }, published: true }] }]);
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '' };
  };
  return { f, calls };
}

T('the extension’s copy of the Canvas reader matches the app (run tools/build-extension.js if not)', () => {
  is(read('collector.js'), collectorSource());
});
T('manifest is valid and every file it names exists', () => {
  const m = JSON.parse(read('manifest.json'));
  is(m.manifest_version, 3);
  const files = [m.action.default_popup, m.background.service_worker].concat(Object.values(m.icons), Object.values(m.action.default_icon));
  m.content_scripts.forEach((c) => files.push(...c.js));
  files.forEach((f) => { if (!fs.existsSync(path.join(ext, f))) throw new Error('missing ' + f); });
  if (!m.permissions.includes('activeTab') || !m.permissions.includes('scripting')) throw new Error('needs activeTab and scripting');
  is(m.host_permissions.every((h) => h.startsWith('https://parthivrb.github.io/')), true, 'only Tally is always allowed');
  if (!m.optional_host_permissions) throw new Error('Canvas sites must be optional permissions');
});
T('scripts registered for Canvas sites exist', () => { ['collector.js', 'auto.js'].forEach((f) => { if (!fs.existsSync(path.join(ext, f))) throw new Error('missing ' + f); }); });

T('background keeps the latest reading and which site it came from', async () => {
  const { chrome, store } = fakeChrome(); const ctx = vm.createContext({ chrome, Date, Math, URL });
  vm.runInContext(read('background.js'), ctx);
  const r = await chrome.runtime.sendMessage({ type: 'data', payload: { v: 1, courses: [{ id: '1' }] }, origin: 'https://canvas.pitt.edu', name: 'Pat' });
  is(r.ok, true); is(store.latest.host, 'canvas.pitt.edu'); is(store['site:canvas.pitt.edu'].origin, 'https://canvas.pitt.edu'); is(store.latest.payload.courses.length, 1);
});
T('background ignores junk messages', async () => {
  const { chrome, store } = fakeChrome(); const ctx = vm.createContext({ chrome, Date, Math, URL });
  vm.runInContext(read('background.js'), ctx);
  await chrome.runtime.sendMessage({ type: 'data', payload: {}, origin: 'not a url' }); await chrome.runtime.sendMessage('hello');
  is(Object.keys(store), []);
});

T('the Tally bridge answers pings and delivers readings, also when new ones arrive', async () => {
  const { chrome } = fakeChrome(); const posted = []; const handlers = [];
  const win = { addEventListener: (t, f) => handlers.push(f), postMessage: (m) => posted.push(m) };
  win.window = win;
  const ctx = vm.createContext({ chrome, window: win, location: { origin: 'https://parthivrb.github.io' } });
  vm.runInContext(read('tally-bridge.js'), ctx);
  await chrome.storage.local.set({ latest: { id: 'a1', at: 5, host: 'canvas.pitt.edu', payload: { v: 1, courses: [] } } });
  await tick(); posted.length = 0;
  handlers.forEach((h) => h({ source: win, data: { tallyExt: 'ping' } }));
  await tick();
  is(posted.map((m) => m.tallyExt), ['pong', 'canvas']); is(posted[1].id, 'a1');
  posted.length = 0;
  handlers.forEach((h) => h({ source: {}, data: { tallyExt: 'ping' } })); await tick();
  is(posted.length, 0, 'ignores other windows');
  await chrome.storage.local.set({ latest: { id: 'b2', at: 6, host: 'x', payload: { v: 1, courses: [] } } }); await tick();
  is(posted.some((m) => m.id === 'b2'), true, 'new reading is pushed');
});

T('visiting Canvas refreshes at most every 20 minutes', async () => {
  const mk = async (lastAgoMin) => {
    const { chrome, store } = fakeChrome(); const sent = []; const { f } = fakeCanvasFetch();
    if (lastAgoMin != null) store['site:canvas.pitt.edu'] = { last: Date.now() - lastAgoMin * 60000 };
    chrome.runtime.sendMessage = async (m) => { sent.push(m); };
    const win = {}; win.top = win;
    const ctx = vm.createContext({ chrome, window: win, location: { host: 'canvas.pitt.edu', origin: 'https://canvas.pitt.edu' }, setTimeout: (fn) => { fn(); return 0; }, Date, Math, URL, JSON, Promise, Array, String, Number, isNaN, Set });
    win.fetch = f; win.window = win; ctx.fetch = f;
    vm.runInContext(read('collector.js'), ctx); vm.runInContext(read('auto.js'), ctx);
    await tick(20); return sent;
  };
  is((await mk(null)).length, 1, 'never synced: reads'); is((await mk(60)).length, 1, 'stale: reads'); is((await mk(5)).length, 0, 'fresh: skips');
  const s = await mk(null); is(s[0].payload.courses[0].groups[0].items[0].e, 9); is(s[0].origin, 'https://canvas.pitt.edu');
});

T('popup: on Canvas it asks permission, reads your classes, stores them, registers auto-refresh and opens Tally', async () => {
  const cv = fakeCanvasFetch();
  const ctxHolder = {};
  const { chrome, store, log } = fakeChrome({
    activeTab: { id: 7, url: 'https://canvas.pitt.edu/courses/101' },
    tabs: () => [],
    executeScript: async (o) => {
      const ctx = ctxHolder.tab;
      if (o.files) { vm.runInContext(read('collector.js'), ctx); return [{ result: undefined }]; }
      const r = await vm.runInContext('(' + o.func.toString() + ')()', ctx); return [{ result: r }];
    },
  });
  const tabCtx = vm.createContext({ fetch: cv.f, location: { origin: 'https://canvas.pitt.edu', host: 'canvas.pitt.edu' }, window: {}, Date, Math, JSON, Promise, Array, String, Number, isNaN, Set, URL });
  tabCtx.window.fetch = cv.f; ctxHolder.tab = tabCtx;
  const els = {}; const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', className: '', disabled: false, handlers: {}, addEventListener(t, f) { this.handlers[t] = f; } });
  const bg = vm.createContext({ chrome, Date, Math, URL }); vm.runInContext(read('background.js'), bg);
  const ctx = vm.createContext({ chrome, document: { getElementById: el }, Date, Math, URL, JSON, Promise, Object, Array, String, Number, setTimeout });
  vm.runInContext(read('popup.js'), ctx);
  await tick(30);
  if (!/Canvas found/.test(el('view').innerHTML)) throw new Error('popup did not recognise Canvas: ' + el('view').innerHTML.slice(0, 80));
  if (!/Pat Student/.test(el('view').innerHTML)) throw new Error('no name shown');
  await el('go').handlers.click(); await tick(60);
  is(log.permissions[0], { origins: ['https://canvas.pitt.edu/*'] });
  is(store.latest.host, 'canvas.pitt.edu'); is(store.latest.payload.courses[0].name, 'Intro to Neuroscience');
  is(log.registered.map((r) => r.id), ['tally-canvas.pitt.edu']); is(log.registered[0].js, ['collector.js', 'auto.js']); is(log.registered[0].matches, ['https://canvas.pitt.edu/*']);
  is(log.tabsCreated, ['https://parthivrb.github.io/grade-tracker/']);
  if (!/Sent to Tally/.test(el('msg').textContent)) throw new Error('no success message: ' + el('msg').textContent);
});
T('popup: on a page that is not Canvas it says what to do', async () => {
  const { chrome } = fakeChrome({ activeTab: { id: 1, url: 'https://example.com/' }, executeScript: async () => [{ result: { ok: false, status: 404 } }] });
  const els = {}; const el = (id) => els[id] || (els[id] = { innerHTML: '', textContent: '', handlers: {}, addEventListener(t, f) { this.handlers[t] = f; } });
  const ctx = vm.createContext({ chrome, document: { getElementById: el }, Date, Math, URL, JSON, Promise, Object, Array, String, Number, setTimeout });
  vm.runInContext(read('popup.js'), ctx); await tick(30);
  if (!/Open your Canvas/.test(el('view').innerHTML)) throw new Error('wrong message');
});
T('popup: if permission is declined it still syncs once and says so', async () => {
  const cv = fakeCanvasFetch(); const holder = {};
  const { chrome, store, log } = fakeChrome({ grant: false, activeTab: { id: 7, url: 'https://canvas.pitt.edu/' }, tabs: () => [],
    executeScript: async (o) => { const ctx = holder.tab; if (o.files) { vm.runInContext(read('collector.js'), ctx); return [{ result: undefined }]; } return [{ result: await vm.runInContext('(' + o.func.toString() + ')()', ctx) }]; } });
  const tabCtx = vm.createContext({ fetch: cv.f, location: { origin: 'https://canvas.pitt.edu' }, window: {}, Date, Math, JSON, Promise, Array, String, Number, isNaN, Set, URL }); tabCtx.window.fetch = cv.f; holder.tab = tabCtx;
  const els = {}; const el = (id) => els[id] || (els[id] = { innerHTML: '', textContent: '', className: '', handlers: {}, addEventListener(t, f) { this.handlers[t] = f; } });
  const bg = vm.createContext({ chrome, Date, Math, URL }); vm.runInContext(read('background.js'), bg);
  const ctx = vm.createContext({ chrome, document: { getElementById: el }, Date, Math, URL, JSON, Promise, Object, Array, String, Number, setTimeout });
  vm.runInContext(read('popup.js'), ctx); await tick(30); await el('go').handlers.click(); await tick(60);
  is(store.latest.host, 'canvas.pitt.edu'); is(log.registered.length, 0); if (!/Allow access/.test(el('msg').textContent)) throw new Error(el('msg').textContent);
});
T('the reader works with a session (no token) and sends no token header', async () => {
  const cv = fakeCanvasFetch(); const ctx = vm.createContext({ Date, Math, JSON, Promise, Array, String, Number, isNaN, Set, URL, location: { hostname: 'canvas.pitt.edu' } });
  vm.runInContext(read('collector.js'), ctx); ctx.__f = cv.f;
  const p = await vm.runInContext("canvasCollect(__f,'https://canvas.pitt.edu',null)", ctx);
  is(p.courses.length, 1); is(cv.calls[0].o.credentials, 'same-origin'); is(cv.calls[0].o.headers.Authorization, undefined);
});

(async () => {
  console.log('Tally extension');
  let pass = 0, fail = 0;
  for (const [name, fn] of results) {
    try { await fn(); pass++; console.log('  ok   ' + name); }
    catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
