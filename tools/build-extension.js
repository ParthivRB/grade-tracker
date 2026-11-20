// Rebuilds the extension's copy of the Canvas reader from js/canvas.js and re-zips the extension.
// Run:  node tools/build-extension.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');

function collectorSource() {
  const src = fs.readFileSync(path.join(root, 'js', 'canvas.js'), 'utf8');
  const i = src.indexOf('async function canvasCollect(');
  const j = src.indexOf('\n}\n', i);
  if (i < 0 || j < 0) throw new Error('could not find canvasCollect in js/canvas.js');
  return '"use strict";\n/* Generated from js/canvas.js by tools/build-extension.js. Do not edit by hand. */\n' + src.slice(i, j + 3);
}
module.exports = { collectorSource };

if (require.main === module) {
  fs.writeFileSync(path.join(root, 'extension', 'collector.js'), collectorSource());
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tally-ext-'));
  const dest = path.join(tmp, 'tally-canvas-extension');
  fs.cpSync(path.join(root, 'extension'), dest, { recursive: true });
  const out = path.join(root, 'tally-canvas-extension.zip');
  if (fs.existsSync(out)) fs.unlinkSync(out);
  cp.execFileSync('zip', ['-r', '-q', '-X', out, 'tally-canvas-extension'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('extension/collector.js and tally-canvas-extension.zip updated');
}
