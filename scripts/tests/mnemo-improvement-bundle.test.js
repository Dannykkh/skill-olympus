const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { bundleImprovement } = require('../../skills/mnemo/scripts/bundle-improvement');

const repo = path.resolve(__dirname, '../..');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mnemo-improvement-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('mnemo-improvement-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

for (const name of ['mnemo', 'codex-mnemo', 'antigravity-mnemo', 'grok-mnemo']) {
  test(`${name}: standalone installer includes project improvement without library sync`, t => {
    const root = fixture(t);
    const claude = path.join(root, 'claude');
    const codex = path.join(root, 'codex');
    const google = path.join(root, 'google');
    const destinations = {
      mnemo: path.join(claude, 'skills/mnemo'),
      'codex-mnemo': path.join(codex, 'skills/codex-mnemo'),
      'antigravity-mnemo': path.join(google, 'antigravity-cli/skills/antigravity-mnemo'),
      'grok-mnemo': path.join(claude, 'skills/grok-mnemo'),
    };
    const env = { ...process.env, HOME: root, USERPROFILE: root,
      CLAUDE_CONFIG_DIR: claude, CODEX_HOME: codex, ANTIGRAVITY_HOME: google,
      GROK_HOME: path.join(root, 'grok') };
    const run = spawnSync(process.execPath, [path.join(repo, 'skills', name, 'install.js'), '--force'],
      { env, cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    const dest = destinations[name];
    for (const relative of ['references/self-improvement.md', 'references/project-skill-improvement.md',
      'references/project-storage.md', 'references/session-learning.md',
      'references/project-skill-evaluation.md']) {
      assert.ok(fs.existsSync(path.join(dest, relative)), `${name}: ${relative}`);
    }
    assert.equal(fs.existsSync(path.join(dest, 'internal')), false);
  });
  test(`${name}: isolated package can rebundle without other skills or catalog`, t => {
    const root = fixture(t);
    const installed = path.join(root, name);
    bundleImprovement(path.join(repo, 'skills', name), installed);
    const required = [
      'SKILL.md', 'references/self-improvement.md', 'references/project-skill-improvement.md',
      'references/session-learning.md', 
      'references/project-skill-evaluation.md',
    ];
    const before = required.map(f => fs.readFileSync(path.join(installed, f)));
    // Run the copied helper in a new process: no repository module imports.
    const second = path.join(root, 'second');
    const run = spawnSync(process.execPath, ['-e',
      'require(process.argv[1]).bundleImprovement(process.argv[2],process.argv[3])',
      path.join(installed, 'scripts/bundle-improvement.js'), installed, second],
      { encoding: 'utf8', windowsHide: true });
    assert.equal(run.status, 0, run.stderr);
    for (const [i, file] of required.entries()) {
      assert.deepEqual(fs.readFileSync(path.join(second, file)), before[i]);
    }
    assert.equal(fs.existsSync(path.join(installed, 'internal')), false);
    bundleImprovement(installed, installed); // in-place reinstall
    for (const [i, file] of required.entries()) {
      assert.deepEqual(fs.readFileSync(path.join(installed, file)), before[i]);
    }
    // A partial package must not silently fall back to the user's global skills.
    fs.unlinkSync(path.join(installed, 'references/project-skill-evaluation.md'));
    const broken = path.join(root, 'broken');
    assert.throws(() => bundleImprovement(installed, broken));
    assert.equal(fs.existsSync(broken), false);
  });
}
