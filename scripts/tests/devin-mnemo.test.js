"use strict";

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { saveEvent } = require("../../skills/devin-mnemo/hooks/save-turn.js");

const source = path.resolve(__dirname, "../../skills/devin-mnemo");

function python(args, options = {}) {
  for (const cmd of process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"]) {
    const result = spawnSync(cmd, cmd === "py" ? ["-3", ...args] : args, { encoding: "utf8", ...options });
    if (!result.error && result.status === 0) return result.stdout;
  }
  throw new Error("Python 3 unavailable");
}

test("Devin hook saves one User and one current Assistant, redacts private text, and deduplicates retries", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devin-mnemo-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".git"));
  const db = path.join(root, "sessions.db");
  python(["-c", "import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); db.execute('create table message_nodes (row_id integer primary key, session_id text, chat_message text, created_at integer)'); db.commit()", db]);
  const session_id = "test-session";
  const prompt_id = "turn-1";
  const user = { hook_event_name: "UserPromptSubmit", session_id, prompt_id, prompt: "hello <private>secret</private>" };
  assert.equal(await saveEvent(user, { root, db }), true);
  assert.ok(fs.existsSync(path.join(root, "memory", "architecture", "index.md")));
  assert.ok(fs.existsSync(path.join(root, "MEMORY.md")));
  assert.equal(await saveEvent(user, { root, db }), false);
  python(["-c", "import sqlite3,json,sys,time; db=sqlite3.connect(sys.argv[1]); db.execute('insert into message_nodes values (1,?,?,?)',(sys.argv[2],json.dumps({'role':'assistant','message_id':'answer-1','content':'Hello back'}),int(time.time()))); db.commit()", db, session_id]);
  const stop = { hook_event_name: "Stop", session_id, prompt_id };
  assert.equal(await saveEvent(stop, { root, db }), true);
  assert.equal(await saveEvent({ ...stop, hook_event_name: "SessionEnd" }, { root, db }), false);
  const file = path.join(root, "conversations", `${new Date().toLocaleDateString("en-CA")}-devin.md`);
  const content = fs.readFileSync(file, "utf8");
  assert.equal((content.match(/## \[.*?\] User/g) || []).length, 1);
  assert.equal((content.match(/## \[.*?\] Assistant/g) || []).length, 1);
  assert.match(content, /hello \[PRIVATE\]/);
  assert.doesNotMatch(content, /secret/);
  assert.match(content, /Hello back/);

  const second = { ...user, prompt_id: "turn-2", prompt: "hello" };
  assert.equal(await saveEvent(second, { root, db }), true);
  assert.equal(await saveEvent({ ...stop, prompt_id: "turn-2" }, { root, db }), false);
  const after = fs.readFileSync(file, "utf8");
  assert.equal((after.match(/## \[.*?\] Assistant/g) || []).length, 1);
});

test("Devin installer preserves user config and removes only its managed entries", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devin-mnemo-install-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configDir = path.join(root, "config");
  fs.mkdirSync(configDir);
  const configPath = path.join(configDir, "config.json");
  fs.writeFileSync(configPath, JSON.stringify({ version: 1, hooks: { Stop: [{ hooks: [{ type: "command", command: "node other.js" }] }] } }));
  const env = { ...process.env, DEVIN_CONFIG_DIR: configDir, CLAUDE_CONFIG_DIR: path.join(root, "claude") };
  execFileSync(process.execPath, [path.join(source, "install.js")], { env });
  execFileSync(process.execPath, [path.join(source, "install.js"), "--check"], { env });
  let config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(config.version, 1);
  assert.equal(config.hooks.Stop.length, 2);
  execFileSync(process.execPath, [path.join(source, "install.js"), "--uninstall"], { env });
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(config.hooks.Stop.length, 1);
  assert.equal(config.hooks.Stop[0].hooks[0].command, "node other.js");
  assert.equal(config.hooks.UserPromptSubmit, undefined);
});
