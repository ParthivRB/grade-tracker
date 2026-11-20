// Canvas import tests. Run with:  node tests/canvas.test.js
// Uses a fake Canvas (paging, "while(1);" prefix, string ids) and the real merge code.
const fs = require('fs'), path = require('path'), vm = require('vm');
const noop = () => {};
const fakeEl = () => ({ style: { setProperty: noop, removeProperty: noop }, setAttribute: noop, removeAttribute: noop, classList: { add: noop, remove: noop, toggle: noop } });
const ctx = vm.createContext({
  console, Date, Math, JSON, Object, Array, Set, Map, String, Number, parseFloat, isNaN, isFinite, URL, Promise, encodeURIComponent, setTimeout,
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  document: { documentElement: fakeEl(), querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener: noop, createElement: fakeEl },
  window: { matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop },
  navigator: {}, location: { hash: '', protocol: 'http:', hostname: 'canvas.example.edu' }, matchMedia: () => ({ matches: false, addEventListener: noop }),
});
for (const f of ['core.js', 'canvas.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });

let pass = 0, fail = 0;
const results = [];
const T = (name, fn) => results.push([name, fn]);
const is = (got, want, what = 'value') => { if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); };
const run = (code) => vm.runInContext(code, ctx);
const call = (fn, ...args) => { ctx.__a = args; return run(fn + '(...__a)'); };

// ---- fake Canvas -----------------------------------------------------------
function fakeCanvas(state) {
  const calls = [];
  const resp = (body, link) => ({ ok: true, status: 200, headers: { get: (k) => (k === 'Link' ? link || null : null) }, text: async () => 'while(1);' + JSON.stringify(body) });
  const f = async (url, opts) => {
    calls.push(url);
    if (!opts || !opts.headers || opts.headers.Authorization !== 'Bearer tok_123456789012345678') { return { ok: false, status: 401, headers: { get: () => null }, text: async () => '{}' }; }
    if (!/canvas-string-ids/.test(opts.headers.Accept)) throw new Error('must ask for string ids');
    const u = new URL(url);
    if (u.pathname === '/api/v1/courses') {
      if (u.searchParams.get('page') === '2') return resp(state.courses.slice(1));
      return resp([state.courses[0]], '<https://canvas.example.edu/api/v1/courses?page=2&per_page=100>; rel="next", <x>; rel="last"');
    }
    const m = u.pathname.match(/^\/api\/v1\/courses\/(\d+)\/assignment_groups$/);
    if (m) return state.groups[m[1]] ? resp(state.groups[m[1]]) : { ok: false, status: 401, headers: { get: () => null }, text: async () => '{}' };
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '{}' };
  };
  return { f, calls };
}
const sub = (score, extra) => Object.assign({ score }, extra || {});
const baseState = () => ({
  courses: [
    { id: '101', name: 'Intro to Neuroscience', course_code: 'NROSCI 1000', term: { name: 'Fall 2026' }, teachers: [{ display_name: 'Dr. Rivera' }], apply_assignment_group_weights: true, enrollments: [{ type: 'student', computed_current_score: 91.2, computed_current_grade: 'A-' }] },
    { id: '202', name: 'Locked Course', course_code: 'X', access_restricted_by_date: true },
  ].concat([{ id: '303', name: 'Statistics', course_code: 'STAT 1100', apply_assignment_group_weights: false }]),
  groups: {
    101: [
      { id: '11', name: 'Homework', group_weight: 30, rules: { drop_lowest: 1 }, assignments: [
        { id: '1', name: 'HW 1', points_possible: 10, due_at: '2026-09-10T03:59:00Z', submission: sub(9), published: true },
        { id: '2', name: 'HW 2', points_possible: 10, due_at: '2026-09-17T03:59:00Z', submission: sub(6), published: true },
        { id: '3', name: 'HW 3', points_possible: 10, due_at: '2026-09-24T03:59:00Z', submission: sub(null), published: true },
        { id: '4', name: 'Excused HW', points_possible: 10, submission: sub(null, { excused: true }), published: true },
        { id: '5', name: 'Hidden', points_possible: 10, submission: sub(null), published: false },
      ] },
      { id: '12', name: 'Exams', group_weight: 70, rules: {}, assignments: [{ id: '6', name: 'Midterm', points_possible: 100, submission: sub(88), published: true }] },
      { id: '13', name: 'Empty', group_weight: 0, rules: {}, assignments: [] },
    ],
    303: [{ id: '31', name: 'Assignments', group_weight: 0, rules: {}, assignments: [{ id: '40', name: 'Quiz', points_possible: 20, submission: sub(18), published: true }] }],
  },
});

T('reader follows paging, strips while(1), skips locked courses, keeps ids as strings', async () => {
  const { f, calls } = fakeCanvas(baseState());
  ctx.__f = f;
  const p = await run("canvasCollect(__f,'https://canvas.example.edu',null,'tok_123456789012345678')");
  is(p.courses.map((c) => c.id), ['101', '303']);
  is(p.courses[0].prof, 'Dr. Rivera'); is(p.courses[0].weighted, true); is(p.courses[0].cs, 91.2); is(p.courses[1].weighted, false);
  is(p.courses[0].groups[0].drop, 1); is(p.courses[0].groups[0].w, 30);
  is(p.courses[0].groups[0].items.length, 5);
  is(p.courses[0].groups[0].items[3].x, true, 'excused marked');
  is(p.courses[0].groups[0].items[2].e, null, 'ungraded stays null');
  if (!calls.some((u) => /page=2/.test(u))) throw new Error('did not follow the next page link');
});
T('reader reports a friendly error when Canvas refuses', async () => {
  ctx.__f = async () => ({ ok: false, status: 401, headers: { get: () => null }, text: async () => '' });
  let msg = '';
  try { await run("canvasCollect(__f,'https://x')"); } catch (e) { msg = e.message; }
  if (!/401/.test(msg)) throw new Error('expected a 401 message, got: ' + msg);
});
T('the reader sends the token and never a session cookie', async () => {
  const seen = [];
  ctx.__f = async (url, opts) => { seen.push(opts); return { ok: true, status: 200, headers: { get: () => null }, text: async () => '[]' }; };
  await run("canvasCollect(__f,'https://canvas.example.edu',null,'tok_123456789012345678')");
  is(seen[0].headers.Authorization, 'Bearer tok_123456789012345678'); is(seen[0].credentials, undefined);
});
T('a wrong token gives a clear message', async () => {
  const { f } = fakeCanvas(baseState()); ctx.__f = f; let e1;
  try { await run("canvasCollect(__f,'https://canvas.example.edu',null,'wrong')"); } catch (e) { e1 = e; }
  is(e1.status, 401); ctx.__e = e1;
  if (!/did not accept that token/.test(run('canvasExplain(__e)'))) throw new Error('unclear message');
});
T('network and browser-blocked failures get a helpful message', () => {
  ctx.__e = new (run('TypeError'))('Failed to fetch');
  if (!/could not reach Canvas/.test(run('canvasExplain(__e)'))) throw new Error('unclear message');
});
T('school addresses are cleaned up', () => {
  is(call('canvasHost', 'canvas.pitt.edu'), { origin: 'https://canvas.pitt.edu', host: 'canvas.pitt.edu' });
  is(call('canvasHost', ' https://pitt.instructure.com/login/canvas '), { origin: 'https://pitt.instructure.com', host: 'pitt.instructure.com' });
  is(call('canvasHost', 'http://evil.example.com'), null); is(call('canvasHost', 'not a site'), null); is(call('canvasHost', ''), null);
});
T('the connection test returns your name', async () => {
  ctx.__f = async (url, opts) => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => 'while(1);' + JSON.stringify({ name: 'Pat Student' }) });
  is((await run("canvasTest(__f,'https://canvas.example.edu','tok_123456789012345678')")).name, 'Pat Student');
});
const make = async () => { const { f } = fakeCanvas(baseState()); ctx.__f = f; return null.then ? null : null; };
const payload = async (mut) => { const st = baseState(); if (mut) mut(st); const { f } = fakeCanvas(st); ctx.__f = f; const p = await run("canvasCollect(__f,'https://canvas.example.edu',null,'tok_123456789012345678')"); ctx.__p = p; return run('canvasClean(__p)'); };
const newCourse = () => run("normCourse({name:'',cats:[]})");

T('first import builds sections with weights, drop rules and points-based scoring', async () => {
  const p = await payload(); ctx.__pc = p.courses[0]; ctx.__c = newCourse();
  const st = run("canvasMerge(__c,__pc,'canvas.example.edu')"); const c = ctx.__c;
  is(c.name, 'Intro to Neuroscience'); is(c.prof, 'Dr. Rivera'); is(c.pooled, false);
  is(c.cats.map((k) => k.name), ['Homework', 'Exams']);
  is(c.cats[0].w, 30); is(c.cats[0].drop, 1); is(c.cats[0].rule, 'sum');
  is(c.cats[0].items.map((i) => i.n), ['HW 1', 'HW 2', 'HW 3']);
  is(c.cats[0].items.map((i) => i.e), [9, 6, null]);
  is(c.cats[0].items[0].d, c.cats[0].items[0].d && /^\d{4}-\d{2}-\d{2}$/.test(c.cats[0].items[0].d) ? c.cats[0].items[0].d : 'bad date');
  is([st.cats, st.items, st.scores], [2, 4, 3]);
});
T('unweighted Canvas classes become total-points classes', async () => {
  const p = await payload(); ctx.__pc = p.courses[1]; ctx.__c = newCourse();
  run("canvasMerge(__c,__pc,'canvas.example.edu')"); is(ctx.__c.pooled, true);
});
T('the imported class grades like Canvas does', async () => {
  const p = await payload(); ctx.__pc = p.courses[0]; ctx.__c = newCourse();
  run("canvasMerge(__c,__pc,'canvas.example.edu')");
  // homework: drop lowest of (9/10, 6/10) leaves 9/10 = 90%; exams 88%; weighted 30/70
  const pct = run('courseRes(__c,"cur").pct');
  if (Math.abs(pct - (0.3 * 90 + 0.7 * 88)) > 0.01) throw new Error('got ' + pct);
});
T('a new assignment lands in the matching section on the next import', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  const p2 = await payload((st) => st.groups[101][0].assignments.push({ id: '7', name: 'HW 4', points_possible: 10, submission: sub(10), published: true }));
  ctx.__pc = p2.courses[0]; const st = run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is(ctx.__c.cats[0].items.map((i) => i.n), ['HW 1', 'HW 2', 'HW 3', 'HW 4']); is(ctx.__c.cats[1].items.length, 1);
  is([st.items, st.scores, st.cats], [1, 1, 0]);
});
T('a newly posted grade fills the existing item instead of duplicating it', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  const p2 = await payload((st) => { st.groups[101][0].assignments[2].submission = sub(8); });
  ctx.__pc = p2.courses[0]; const st = run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is(ctx.__c.cats[0].items.length, 3); is(ctx.__c.cats[0].items[2].e, 8); is([st.items, st.scores, st.upd], [0, 1, 0]);
});
T('a changed score is updated and counted', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  const p2 = await payload((st) => { st.groups[101][1].assignments[0].submission = sub(95); });
  ctx.__pc = p2.courses[0]; const st = run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is(ctx.__c.cats[1].items[0].e, 95); is(st.upd, 1);
});
T('your own what-ifs, curve and renames survive a refresh', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  const c = ctx.__c; c.cats[0].items[2].w = 10; c.curve = 3; c.cats[0].items[0].n = 'My name for HW 1'; c.cats[0].w = 25;
  const p2 = await payload((st) => { st.groups[101][0].assignments[0].name = 'HW 1 (renamed in Canvas)'; st.groups[101][0].group_weight = 35; });
  ctx.__pc = p2.courses[0]; run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is(c.cats[0].items[2].w, 10, 'what-if kept'); is(c.curve, 3, 'curve kept');
  is(c.cats[0].items[0].n, 'My name for HW 1', 'your rename kept'); is(c.cats[0].w, 25, 'your weight kept');
});
T('an untouched weight follows Canvas when the instructor changes it', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  const p2 = await payload((st) => { st.groups[101][0].group_weight = 40; st.groups[101][1].group_weight = 60; });
  ctx.__pc = p2.courses[0]; run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is([ctx.__c.cats[0].w, ctx.__c.cats[1].w], [40, 60]);
});
T('a grade removed in Canvas is cleared, but a score you typed yourself is kept', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  ctx.__c.cats[0].items[2].e = 7;
  const p2 = await payload((st) => { st.groups[101][1].assignments[0].submission = sub(null); });
  ctx.__pc = p2.courses[0]; run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is(ctx.__c.cats[1].items[0].e, null, 'canvas-sourced score cleared'); is(ctx.__c.cats[0].items[2].e, 7, 'hand-typed score kept');
});
T('an assignment moved to another group follows it', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  const p2 = await payload((st) => { const a = st.groups[101][0].assignments.splice(1, 1)[0]; st.groups[101][1].assignments.push(a); });
  ctx.__pc = p2.courses[0]; run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is(ctx.__c.cats[1].items.map((i) => i.n), ['Midterm', 'HW 2']);
});
T('an existing class is linked by name and keeps its own settings', async () => {
  const mine = run("normCourse({name:'Intro to Neuroscience',credits:3,scale:'plain',cats:[{name:'Homework',w:30,rule:'avg',items:[{n:'HW 1',p:10,e:null}]}]})");
  ctx.__list = [mine]; const p = await payload(); ctx.__pc = p.courses[0];
  is(run("canvasSuggest(__list,__pc,'canvas.example.edu')"), mine.id);
  ctx.__c = mine; run("canvasMerge(__c,__pc,'canvas.example.edu')");
  is(mine.credits, 3); is(mine.scale, 'plain'); is(mine.cats[0].cid, '11'); is(mine.cats[0].items[0].cid, '1'); is(mine.cats[0].items[0].e, 9);
  is(mine.cats[0].items.length, 3, 'only the missing items were added');
});
T('survives saving and loading (ids are kept)', async () => {
  const p = await payload(); ctx.__pc = p.courses[0]; ctx.__c = newCourse(); run("canvasMerge(__c,__pc,'canvas.example.edu')");
  ctx.__json = JSON.stringify(ctx.__c); const c2 = run('normCourse(JSON.parse(__json))');
  is(c2.cv.id, '101'); is(c2.cats[0].cid, '11'); is(c2.cats[0].items[1].cid, '2'); is(c2.cats[0].items[1].cs, 6);
});
T('junk from outside is rejected or trimmed', () => {
  is(call('canvasClean', null), null); is(call('canvasClean', { v: 2, courses: [] }), null); is(call('canvasClean', { v: 1, courses: [{ id: 1 }] }), null);
  const c = call('canvasClean', { v: 1, courses: [{ id: 5, name: 'X'.repeat(500), groups: [{ id: 1, name: 'G', w: 999, items: [{ id: 2, n: 'A', p: 'abc', d: 'tomorrow', e: 'x' }] }] }] });
  is(c.courses[0].name.length, 160); is(c.courses[0].groups[0].w, 100); is(c.courses[0].groups[0].items[0].p, null); is(c.courses[0].groups[0].items[0].d, null);
});
T('missing numbers stay missing (not zero)', () => {
  const c = call('canvasClean', { v: 1, courses: [{ id: 1, name: 'A', cs: null, groups: [{ id: 2, name: 'G', w: null, items: [{ id: 3, n: 'x', p: 10, e: null }] }] }] });
  is(c.courses[0].cs, null); is(c.courses[0].groups[0].items[0].e, null);
});
T('auto-update changes linked classes and reports new ones separately', async () => {
  const p1 = await payload(); ctx.__pc = p1.courses[0]; const mine = newCourse(); ctx.__c = mine; run("canvasMerge(__c,__pc,'canvas.example.edu')");
  const p2 = await payload((st) => { st.groups[101][0].assignments[2].submission = sub(8); st.groups[101][0].assignments.push({ id: '7', name: 'HW 4', points_possible: 10, submission: sub(10), published: true }); });
  p2.host = 'canvas.example.edu'; ctx.__sems = [{ courses: [mine] }]; ctx.__p2 = p2;
  const dry = run('canvasSync(__sems,__p2,true)');
  is(dry.totals.items, 1); is(dry.totals.scores, 2); is(dry.fresh.map((c) => c.id), ['303']); is(mine.cats[0].items.length, 3, 'dry run changed nothing');
  const live = run('canvasSync(__sems,__p2,false)');
  is(mine.cats[0].items.map((i) => i.e), [9, 6, 8, 10]); is(live.totals.items, 1);
});
T('preview counts match what applying does', async () => {
  const p = await payload(); ctx.__pc = p.courses[0];
  const pv = run("canvasPreview(null,__pc,'canvas.example.edu')");
  is([pv.sections, pv.assignments, pv.graded], [2, 4, 3]); is([pv.cats, pv.items], [2, 4]);
});

(async () => {
  console.log('Canvas import');
  for (const [name, fn] of results) {
    try { await fn(); pass++; console.log('  ok   ' + name); }
    catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
