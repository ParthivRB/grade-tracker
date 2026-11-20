// Grade-math tests for Tally. Run with:  node tests/engine.test.js
// Loads js/core.js (scales + grade engine) in a sandbox with a tiny fake browser.
const fs = require('fs'), path = require('path'), vm = require('vm');

const noop = () => {};
const fakeEl = () => ({ style: { setProperty: noop, removeProperty: noop }, setAttribute: noop, removeAttribute: noop, classList: { add: noop, remove: noop, toggle: noop } });
const ctx = vm.createContext({
  console,
  Date, Math, JSON, Object, Array, Set, Map, String, Number, parseFloat, isNaN, isFinite,
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  document: { documentElement: fakeEl(), querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener: noop, createElement: fakeEl },
  window: { matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop },
  navigator: {},
  location: { hash: '', protocol: 'http:', hostname: 'localhost' },
  matchMedia: () => ({ matches: false, addEventListener: noop }),
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8'), ctx, { filename: 'core.js' });

let pass = 0, fail = 0;
const T = (name, fn) => {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};
const near = (got, want, tol = 0.01, what = 'value') => {
  if (!(Math.abs(got - want) <= tol)) throw new Error(what + ': got ' + got + ', want ' + want);
};
const is = (got, want, what = 'value') => { if (got !== want) throw new Error(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); };

// helpers that run inside the sandbox
const run = (code) => vm.runInContext(code, ctx);
ctx.__t = {};
const course = (spec) => { ctx.__spec = spec; return run('normCourse(JSON.parse(JSON.stringify(__spec)))'); };
const pct = (c, mode = 'cur', fill) => { ctx.__c = c; ctx.__m = mode; ctx.__f = fill; return run('courseRes(__c,__m,__f).pct'); };
const items = (...v) => v.map((e, i) => ({ n: 'Item ' + (i + 1), p: 100, e }));
const cat = (name, w, rule, its, extra) => Object.assign({ name, w, rule, items: its }, extra || {});

console.log('Tally grade math');

T('weighted categories average to the right percent', () => {
  const c = course({ cats: [cat('HW', 50, 'avg', items(80)), cat('Exam', 50, 'avg', items(90))] });
  near(pct(c), 85);
});
T('categories without scores are left out of the current grade', () => {
  const c = course({ cats: [cat('HW', 50, 'avg', items(80)), cat('Exam', 50, 'avg', items(null))] });
  near(pct(c), 80);
});
T('drop lowest removes the worst score', () => {
  const c = course({ cats: [cat('Q', 100, 'avg', items(100, 50, 90), { drop: 1 })] });
  near(pct(c), 95);
});
T('drop highest removes the best score', () => {
  const c = course({ cats: [cat('Q', 100, 'avg', items(100, 80, 60), { dropHi: 1 })] });
  near(pct(c), 70);
});
T('drop lowest and highest together', () => {
  const c = course({ cats: [cat('Q', 100, 'avg', items(100, 80, 60, 40), { drop: 1, dropHi: 1 })] });
  near(pct(c), 70);
});
T('drop lowest works on the scores you have so far, like Canvas does', () => {
  const c = course({ cats: [cat('Q', 100, 'avg', items(90, 60, null, null), { drop: 1 })] });
  near(pct(c), 90);
});
T('drop lowest never drops your only score', () => {
  const c = course({ cats: [cat('Q', 100, 'avg', items(60, null, null), { drop: 2 })] });
  near(pct(c), 60);
});
T('best N of M keeps only the top scores', () => {
  const c = course({ cats: [cat('HW', 100, 'best', [{ n: 'a', p: 10, e: 10 }, { n: 'b', p: 10, e: 5 }, { n: 'c', p: 10, e: 9 }], { n: 2 })] });
  near(pct(c), 95);
});
T('total points scoring pools points instead of averaging percents', () => {
  const c = course({ cats: [cat('Labs', 100, 'sum', [{ n: 'a', p: 10, e: 8 }, { n: 'b', p: 20, e: 12 }])] });
  near(pct(c), 66.667, 0.01);
});
T('capped points reach 100% at the cap', () => {
  const c = course({ cats: [cat('Pts', 100, 'cap', [{ n: 'a', p: 50, e: 40 }], { cap: 0.8 })] });
  near(pct(c), 100);
});
T('a flagged final replaces the lowest exam when higher (and still counts as the final)', () => {
  const its = [{ n: 'M1', p: 100, e: 70 }, { n: 'M2', p: 100, e: 90 }, { n: 'Final', p: 100, e: 95, rp: true }];
  const c = course({ cats: [cat('Exams', 100, 'avg', its, { rp: true })] });
  near(pct(c), (95 + 90 + 95) / 3);
});
T('a flagged final does not replace anything when it is lower', () => {
  const its = [{ n: 'M1', p: 100, e: 70 }, { n: 'M2', p: 100, e: 90 }, { n: 'Final', p: 100, e: 60, rp: true }];
  const c = course({ cats: [cat('Exams', 100, 'avg', its, { rp: true })] });
  near(pct(c), (70 + 90 + 60) / 3);
});
T('optional items replace the lowest regular score', () => {
  const its = [{ n: 'a', p: 100, e: 60 }, { n: 'b', p: 100, e: 90 }, { n: 'opt', p: 100, e: 80, opt: true }];
  const c = course({ cats: [cat('HW', 100, 'swap', its)] });
  near(pct(c), 85);
});
T('section curve adds points to that section', () => {
  const c = course({ cats: [cat('Exam', 100, 'avg', items(80), { bonus: 3 })] });
  near(pct(c), 83);
});
T('class curve adds points to the final percent', () => {
  const c = course({ curve: 2, cats: [cat('Exam', 100, 'avg', items(80))] });
  near(pct(c), 82);
});
T('rounding to the nearest whole percent', () => {
  const c = course({ round: 'whole', cats: [cat('Exam', 100, 'avg', items(89.6))] });
  near(pct(c), 90, 0.0001);
  is(run('letterOf')(c, pct(c)), 'A-');
});
T('rounding up always goes to the next whole percent', () => {
  const c = course({ round: 'ceil', cats: [cat('Exam', 100, 'avg', items(89.01))] });
  near(pct(c), 90, 0.0001);
});
T('must-pass requirement caps the grade when missed', () => {
  const c = course({ reqs: [{ cat: 1, min: 60, cap: 'D' }], cats: [cat('HW', 50, 'avg', items(100)), cat('Final', 50, 'avg', items(50))] });
  const p = pct(c);
  if (p >= 67) throw new Error('expected a D-range percent, got ' + p);
  ctx.__p = p; ctx.__c = c;
  is(run('letterOf(__c,__p)'), 'D');
});
T('must-pass requirement does nothing when it is met', () => {
  const c = course({ reqs: [{ cat: 1, min: 60, cap: 'D' }], cats: [cat('HW', 50, 'avg', items(100)), cat('Final', 50, 'avg', items(70))] });
  near(pct(c), 85);
});
T('must-pass requirement does nothing before the section has scores', () => {
  const c = course({ reqs: [{ cat: 1, min: 60, cap: 'D' }], cats: [cat('HW', 50, 'avg', items(100)), cat('Final', 50, 'avg', items(null))] });
  near(pct(c), 100);
});
T('total-points classes pool every item together', () => {
  const c = course({ pooled: true, cats: [cat('All', 100, 'sum', [{ n: 'a', p: 50, e: 45 }, { n: 'b', p: 100, e: 80 }])] });
  near(pct(c), 83.333, 0.01);
});
T('what-if overrides earned only in what-if and projected modes', () => {
  const its = [{ n: 'a', p: 100, e: 60, w: 100 }];
  const c = course({ cats: [cat('Exam', 100, 'avg', its)] });
  near(pct(c, 'cur'), 60);
  near(pct(c, 'whatif'), 100);
});
T('projected mode fills missing work at the chosen level', () => {
  const c = course({ cats: [cat('HW', 50, 'avg', items(80)), cat('Exam', 50, 'avg', items(null))] });
  near(pct(c, 'proj', 90), 85);
});
T('extra credit percent is added straight onto the final', () => {
  const c = course({ ec: { pct: { e: 2 } }, cats: [cat('Exam', 100, 'avg', items(85))] });
  near(pct(c), 87);
});
T('letter cutoffs on the plus/minus scale', () => {
  const c = course({ cats: [cat('x', 100, 'avg', items(0))] });
  ctx.__c = c;
  const L = (p) => { ctx.__p = p; return run('letterOf(__c,__p)'); };
  is(L(97), 'A+'); is(L(93), 'A'); is(L(92.9), 'A-'); is(L(90), 'A-');
  is(L(89.9), 'B+'); is(L(60), 'D-'); is(L(59.9), 'F');
});
T('gpa points for letters', () => {
  const c = course({ cats: [cat('x', 100, 'avg', items(0))] });
  ctx.__c = c;
  const G = (p) => { ctx.__p = p; return run('gpaOf(__c,__p)'); };
  is(G(95), 4); is(G(91), 3.75); is(G(85), 3); is(G(50), 0);
});
T('plain letter scale (A at 90, no pluses)', () => {
  const c = course({ scale: 'plain', cats: [cat('x', 100, 'avg', items(0))] });
  ctx.__c = c;
  const L = (p) => { ctx.__p = p; return run('letterOf(__c,__p)'); };
  is(L(90), 'A'); is(L(89.9), 'B'); is(L(79), 'C');
});
T('needed: reports the score required on the remaining work', () => {
  const c = course({ cats: [cat('HW', 50, 'avg', items(80)), cat('Final', 50, 'avg', items(null))] });
  ctx.__c = c;
  const r = run('needed(__c,90)');
  is(r.kind, 'need'); near(r.x, 100, 0.01);
  const lock = run('needed(__c,40)');
  is(lock.kind, 'lock');
  const out = run('needed(__c,95)');
  is(out.kind, 'over');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
