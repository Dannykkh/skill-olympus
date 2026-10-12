const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const repo = path.resolve(__dirname, '../..');
const installed = process.env.MNEMO_TEST_INSTALLED === '1';
const home = os.homedir();
const grok = require(installed ? path.join(home,'.grok/hooks/grok-mnemo-append-event.js') : '../../skills/grok-mnemo/hooks/append-event.js');
const agy = require(installed ? path.join(home,'.gemini/config/hooks/olympus-save-turn.js') : '../../skills/antigravity-mnemo/hooks/save-turn.js');
const devin = require(installed ? path.join(process.env.APPDATA,'devin/hooks/devin-mnemo-save-turn.js') : '../../skills/devin-mnemo/hooks/save-turn.js');
const store = require(installed ? path.join(home,'.claude/hooks/mnemo-record-store.js') : '../../hooks/mnemo-record-store.js');
const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const ps = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const hasPs = spawnSync(ps,['-NoProfile','-Command','exit 0'],{windowsHide:true}).status===0;
const hasBash = spawnSync(bash,['-c','command -v jq >/dev/null'],{windowsHide:true}).status===0;
function fixture(t) {
  const root = fs.mkdtempSync(path.join(path.dirname(repo),'.mnemo-integrity-test-'));
  fs.writeFileSync(path.join(root,'.mnemo-root'),'');
  t.after(() => {
    assert.equal(path.dirname(root),path.dirname(repo));
    assert.ok(path.basename(root).startsWith('.mnemo-integrity-test-'));
    fs.rmSync(root,{recursive:true,force:true});
  });
  return root;
}
function history(root,runtime) {
  const dir=path.join(root,'conversations');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(n=>n.endsWith(`-${runtime}.md`)).map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('\n') : '';
}
function count(text, needle) { return text.split(needle).length-1; }
function python(code,args=[]) {
  for (const cmd of process.platform==='win32'?['python','py','python3']:['python3','python']) {
    const result=spawnSync(cmd,[...(cmd==='py'?['-3']:[]),'-B','-X','utf8','-c',code,...args],{encoding:'utf8',windowsHide:true});
    if (!result.error && result.status===0) return result.stdout;
  }
  throw new Error('Python fixture setup failed');
}
async function locked(root,file,action) {
  const script=path.join(root,'hold-file.ps1');
  fs.writeFileSync(script,'$f=[IO.File]::Open($args[0],"Open","ReadWrite","None"); [Console]::WriteLine("LOCKED"); [Console]::Out.Flush(); [Console]::In.ReadLine() | Out-Null; $f.Dispose()');
  const child=spawn(ps,['-NoProfile','-File',script,file],{windowsHide:true});
  const closed=once(child,'close'); await once(child.stdout,'data');
  try { return await action(); } finally {child.stdin.end('\n');await closed;}
}
function claude(root,shell,hook,payload,strict=true) {
  const base=installed ? path.join(home,'.claude/hooks') : path.join(repo,'hooks');
  const script=path.join(base,`${hook}.${shell==='Bash'?'sh':'ps1'}`);
  const env={...process.env,MNEMO_DISABLE:'0',MNEMO_STRICT:strict?'1':'0'};
  for(const key of ['GROK_HOOK_EVENT','DEVIN_PROJECT_DIR','CLAUDE_PROJECT_DIR'])delete env[key];
  const result=spawnSync(shell==='Bash'?bash:ps,shell==='Bash'?[script.replaceAll('\\','/')]:['-NoProfile','-File',script],{
    input:JSON.stringify({session_id:'integrity-test',project_root:root,cwd:root,source:'user',...payload}),env,encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(result.status,0,result.stderr||String(result.error));
  return result;
}
for(const shell of ['PowerShell','Bash']) {
  test(`${shell} Claude preserves short answers, literal text and identical new turns`,{skip:shell==='Bash'?!hasBash:!hasPs},t=>{
    const root=fixture(t);
    const prompt='반복 요청 C:\\new\\test literal \\n <private>hidden</private>';
    for(let i=0;i<2;i++) {
      claude(root,shell,'save-conversation',{prompt});
      claude(root,shell,'save-response',{last_assistant_message:'OK'});
      claude(root,shell,'save-response',{last_assistant_message:'OK'}); // 같은 Stop 재전달만 중복 제거
    }
    const saved=history(root,'claude');
    assert.equal(count(saved,'반복 요청 C:\\new\\test literal \\n [PRIVATE]'),2);
    assert.equal((saved.match(/Assistant\s+OK\s+/g)||[]).length,2);
    assert.ok(!saved.includes('hidden'));
    assert.equal(count(saved,'## ['),4);
  });
}
test('Claude file-lock failure leaves no false UUID and is recovered by the next event',{skip:process.platform!=='win32'},async t=>{
  const root=fixture(t);
  claude(root,'PowerShell','save-conversation',{prompt:'first request'});
  const file=path.join(root,'conversations',fs.readdirSync(path.join(root,'conversations')).find(n=>n.endsWith('-claude.md')));
  const transcript=path.join(root,'transcript.jsonl'),uuid=crypto.randomUUID(),answer='Answer delayed by a Windows file lock';
  fs.writeFileSync(transcript,JSON.stringify({type:'assistant',uuid,message:{role:'assistant',content:[{type:'text',text:answer}]}})+'\n');
  await locked(root,file,()=>claude(root,'PowerShell','save-response',{transcript_path:transcript,last_assistant_message:answer},false));
  assert.ok(!history(root,'claude').includes(answer));
  const index=path.join(root,'conversations','.mnemo-index.json');
  assert.ok(!fs.existsSync(index)||!fs.readFileSync(index,'utf8').includes(uuid));
  claude(root,'PowerShell','save-conversation',{prompt:'next request'});
  assert.equal(count(history(root,'claude'),answer),1);
  assert.ok(fs.readFileSync(index,'utf8').includes(uuid));
});
test('Grok stores short responses and preserves literal text in separate new turns',async t=>{
  const root=fixture(t);
  for(const id of ['one','two']) {
    assert.equal(await grok.appendEvent(root,{hookEventName:'user_prompt_submit',sessionId:'s',turnId:id,prompt:'C:\\new\\test literal \\n'}),true);
    assert.equal(await grok.appendEvent(root,{hookEventName:'stop',reason:'end_turn',sessionId:'s',turnId:id,lastAssistantMessage:'OK'}),true);
  }
  const saved=history(root,'grok');
  assert.equal(count(saved,'C:\\new\\test literal \\n'),2);
  assert.equal((saved.match(/Assistant\s+OK\s+/g)||[]).length,2);
});
test('agy preserves all user inputs, repeated new input and replay without duplication',async t=>{
  const root=fixture(t),transcript=path.join(root,'agy.jsonl');
  const rows=[{step_index:1,source:'USER_EXPLICIT',type:'USER_INPUT',content:'First request C:\\new\\test'},
    {step_index:2,source:'USER_EXPLICIT',type:'USER_INPUT',content:'Follow-up <private>hidden</private>'},
    {step_index:3,source:'MODEL',type:'MESSAGE',content:{text:'OK'}}];
  const payload={conversationId:'integrity',transcriptPath:transcript};
  fs.writeFileSync(transcript,rows.map(v=>JSON.stringify(v)).join('\n'));
  await agy.appendTurn(root,payload,agy.latestTurn(payload));
  const first=history(root,'antigravity');
  assert.ok(first.includes('First request C:\\new\\test'));
  assert.ok(first.includes('Follow-up [PRIVATE]'));
  assert.ok(!first.includes('hidden'));
  await agy.appendTurn(root,payload,agy.latestTurn(payload));
  assert.equal(history(root,'antigravity'),first);
  rows.push({step_index:4,source:'USER_EXPLICIT',type:'USER_INPUT',content:'First request C:\\new\\test'},
    {step_index:5,source:'MODEL',type:'MESSAGE',content:{text:'OK'}});
  fs.writeFileSync(transcript,rows.map(v=>JSON.stringify(v)).join('\n'));
  await agy.appendTurn(root,payload,agy.latestTurn(payload));
  assert.equal(count(history(root,'antigravity'),'First request C:\\new\\test'),2);
  assert.equal((history(root,'antigravity').match(/Assistant\s+OK\s+/g)||[]).length,2);
});
for(const runtime of ['grok','antigravity']) {
  test(`${runtime} file-lock failure persists a pending record and recovers on the next event`,{skip:process.platform!=='win32'},async t=>{
    const root=fixture(t);
    const send=runtime==='grok' ? async(id,text)=>grok.appendEvent(root,{hookEventName:'user_prompt_submit',sessionId:'s',turnId:id,prompt:text})
      : async(id,text)=>agy.appendTurn(root,{conversationId:'s'},{userText:text,assistantText:'',order:id});
    await send('one','First input');
    const file=path.join(root,'conversations',fs.readdirSync(path.join(root,'conversations')).find(n=>n.endsWith(`-${runtime}.md`)));
    await locked(root,file,()=>send('two','Input pending <private>secret</private>'));
    assert.ok(!history(root,runtime).includes('Input pending'));
    const queued=fs.readdirSync(path.join(root,'conversations','.mnemo-pending')).filter(n=>n.endsWith('.json'));
    assert.ok(queued.length>0);
    for(const name of queued)assert.ok(!fs.readFileSync(path.join(root,'conversations','.mnemo-pending',name),'utf8').includes('secret'));
    await send('three','Next input');
    assert.equal(count(history(root,runtime),'Input pending [PRIVATE]'),1);
  });
}
test('Devin stores a locked input before DB lookup and flushes it on the next event',{skip:process.platform!=='win32'},async t=>{
  const root=fixture(t),db=path.join(root,'sessions.db');
  python("import sqlite3,sys;d=sqlite3.connect(sys.argv[1]);d.execute('create table message_nodes(row_id integer primary key,session_id text,chat_message text,created_at integer)');d.commit()",[db]);
  const send=(id,prompt)=>devin.saveEvent({hook_event_name:'UserPromptSubmit',session_id:'s',prompt_id:id,prompt},{root,db});
  await send('one','First input');
  const file=path.join(root,'conversations',fs.readdirSync(path.join(root,'conversations')).find(n=>n.endsWith('-devin.md')));
  await locked(root,file,()=>send('two','Locked input C:\\new\\test'));
  assert.ok(!history(root,'devin').includes('Locked input'));
  await send('three','Next input');
  assert.equal(count(history(root,'devin'),'Locked input C:\\new\\test'),1);
});

test('Devin recovers delayed DB answers within the previous prompt row range',async t=>{
  const root=fixture(t),db=path.join(root,'sessions.db');
  python("import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('create table message_nodes (row_id integer primary key, session_id text, chat_message text, created_at integer)'); c.commit()",[db]);
  const session_id='delayed-db',options={root,db};
  const input=prompt_id=>({hook_event_name:'UserPromptSubmit',session_id,prompt_id,prompt:`request ${prompt_id}`});
  const stop=prompt_id=>({hook_event_name:'Stop',session_id,prompt_id});
  const insert=(row,text)=>python("import sqlite3,json,time,sys; c=sqlite3.connect(sys.argv[1]); c.execute('insert into message_nodes values (?,?,?,?)',(int(sys.argv[2]),sys.argv[3],json.dumps({'role':'assistant','message_id':'answer-'+sys.argv[2],'content':sys.argv[4]}),int(time.time()))); c.commit()",[db,String(row),session_id,text]);
  await devin.saveEvent(input('one'),options);
  assert.equal(await devin.saveEvent(stop('one'),options),false);
  assert.ok(JSON.parse(fs.readFileSync(path.join(root,'conversations','.devin-events.json'),'utf8')).sessions[session_id].awaitingBody);
  insert(1,'Delayed first answer');
  await devin.saveEvent(input('two'),options);
  insert(2,'Current second answer');
  assert.equal(await devin.saveEvent(stop('two'),options),true);
  const text=history(root,'devin');
  assert.equal(count(text,'Delayed first answer'),1);
  assert.equal(count(text,'Current second answer'),1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'conversations','.devin-events.json'),'utf8')).pendingReads.length,0);
  assert.equal(await devin.saveEvent({...stop('two'),hook_event_name:'SessionEnd'},options),false);
  assert.equal(history(root,'devin'),text);
});

test('Grok does not accept an old leading marker without the complete body',async t=>{
  const root=fixture(t),payload={hookEventName:'user_prompt_submit',sessionId:'legacy',eventId:'legacy-input',prompt:'Full input must survive'};
  assert.equal(await grok.appendEvent(root,payload),true);
  const dir=path.join(root,'conversations'),file=fs.readdirSync(dir).find(n=>n.endsWith('-grok.md'));
  const state=JSON.parse(fs.readFileSync(path.join(dir,'.grok-events.json'),'utf8'));
  const key=Object.keys(state.seen)[0];
  fs.writeFileSync(path.join(dir,file),`<!-- grok-event:${key} -->\n\n## [12:00] User\n\nFull input`);
  assert.equal(await grok.appendEvent(root,payload),true);
  assert.equal(count(history(root,'grok'),'Full input must survive'),1);
  assert.equal(await grok.appendEvent(root,payload),false);
});

test('A malformed pending record does not block valid text containing an HTML comment',async t=>{
  const root=fixture(t),tx=store.journal(root);
  const malformed=path.join(root,'conversations','.mnemo-pending',`${'a'.repeat(64)}.json`);
  fs.writeFileSync(malformed,JSON.stringify({runtime:'grok',date:'2026-10-12',marker:'<!-- mnemo-grok-event:bad -->',header:'',content:'',queuedAt:'invalid'}));
  const entry=store.record(root,'grok','html-input',[{role:'User',text:'literal <!-- comment --> and \\n'}]);
  const first=await store.storeRecords(root,[entry]);
  assert.deepEqual(first.statuses,['saved']);
  assert.match(first.error,/Invalid pending Mnemo timestamp/);
  assert.ok(fs.existsSync(malformed));
  assert.deepEqual((await store.storeRecords(root,[entry])).statuses,['duplicate']);
  assert.equal(count(history(root,'grok'),'literal <!-- comment --> and \\n'),1);
});
