const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { isolatedHomeEnv } = require('./isolated-home-env.js');
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
// storageSafe는 잠금 밖에서 conversations/ 파일을 하나씩 잠깐 연다. 그동안 다른 프로세스가 같은 상태 파일을
// 덮어쓰면 Windows가 rename을 EPERM으로 거부한다(gotcha 121). 다른 프로세스가 대상 파일을 열어 두게 한다.
async function holdOpen(file,ms) {
  const child=spawn(process.execPath,['-e',"const fs=require('fs');const fd=fs.openSync(process.argv[1],'r');process.stdout.write('open');setTimeout(()=>fs.closeSync(fd),Number(process.argv[2]))",file,String(ms)],{windowsHide:true});
  const closed=once(child,'close'); await once(child.stdout,'data');
  return {closed}; // Promise를 그대로 돌려주면 await가 자식 종료까지 기다린다
}
test('Shared state writes wait out a short-lived handle on the target and still fail when it stays open',{skip:process.platform!=='win32'},async t=>{
  const root=fixture(t),dir=path.join(root,'conversations'),file=path.join(dir,'.grok-events.json');
  fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(file,'{}');
  let {closed}=await holdOpen(file,100);
  store.atomicJson(file,{version:1}); // 동기 재시도 중에도 다른 프로세스의 핸들은 제때 닫힌다
  await closed;
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{version:1});
  ({closed}=await holdOpen(file,1500));
  assert.throws(()=>store.atomicJson(file,{version:2}),{code:'EPERM'}); // 끝까지 막히면 호출자가 대기 레코드를 남기도록 던진다
  await closed;
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{version:1});
  assert.deepEqual(fs.readdirSync(dir).filter(name=>name.endsWith('.tmp')),[]);
});

// 답이 진행 중일 때 보낸 입력은 프롬프트 훅으로 저장되지 않는다(gotcha 123). Stop 훅이 원본 세션에서
// 따라잡고, SessionStart 복구도 같은 표식으로 확인해 세 경로가 서로의 기록을 알아본다.
const sid='integrity-test';
const at=seconds=>new Date(Date.now()-seconds*1000).toISOString();
const promptLine=(uuid,promptId,text,source='typed',seconds=50)=>({type:'user',uuid,sessionId:sid,promptId,promptSource:source,timestamp:at(seconds),message:{role:'user',content:text}});
const midTurnLine=(uuid,text,kind='human',seconds=40)=>({type:'attachment',uuid,sessionId:sid,timestamp:at(seconds),attachment:{type:'queued_command',prompt:text,origin:{kind},commandMode:'prompt',timestamp:at(seconds+1)}});
const answerLine=(uuid,text)=>({type:'assistant',uuid,sessionId:sid,timestamp:at(5),message:{role:'assistant',content:[{type:'text',text}]}});
const writeLines=(file,lines)=>fs.writeFileSync(file,lines.map(line=>JSON.stringify(line)).join('\n')+'\n');
const headingTime=iso=>new Date(iso).toTimeString().slice(0,8);
for(const shell of ['PowerShell','Bash']) {
  test(`${shell} Claude Stop catches up inputs the prompt hook missed, once and before the answer`,{skip:shell==='Bash'?!hasBash:!hasPs},t=>{
    const root=fixture(t),transcript=path.join(root,'transcript.jsonl');
    const midTurn=midTurnLine('a1','mid-turn note');
    const lines=[promptLine('u1','p1','first typed prompt'),midTurn,midTurnLine('a2','<task-notification>bg</task-notification>','task-notification'),
      {type:'user',uuid:'t1',sessionId:sid,promptId:'p1',timestamp:at(35),message:{role:'user',content:[{type:'tool_result',tool_use_id:'x',content:'tool output'}]}},
      promptLine('s1','p9','<task-notification>done</task-notification>','system',30),answerLine('r1','first answer')];
    claude(root,shell,'save-conversation',{prompt:'first typed prompt',prompt_id:'p1'});
    claude(root,shell,'save-conversation',{prompt:'mid-turn note',prompt_id:'p1'}); // 진행 중인 턴의 prompt_id로 온 입력
    writeLines(transcript,lines);
    claude(root,shell,'save-response',{transcript_path:transcript,last_assistant_message:'first answer'});
    const queued=promptLine('u2','p2','queued follow-up','queued',20);
    writeLines(transcript,[...lines,queued,answerLine('r2','second answer')]);
    claude(root,shell,'save-response',{transcript_path:transcript,last_assistant_message:'second answer'});
    claude(root,shell,'save-response',{transcript_path:transcript,last_assistant_message:'second answer'}); // 재전달
    const saved=history(root,'claude');
    for(const text of ['first typed prompt','mid-turn note','queued follow-up','first answer','second answer']) assert.equal(count(saved,`\n${text}\n`),1,text);
    assert.ok(!saved.includes('<task-notification>')&&!saved.includes('tool output'));
    assert.ok(saved.indexOf('mid-turn note')<saved.indexOf('first answer'));
    assert.ok(saved.indexOf('queued follow-up')<saved.indexOf('second answer'));
    assert.ok(saved.includes(`## [${headingTime(midTurn.attachment.timestamp)}] User\n\nmid-turn note`)); // 보낸 시각을 남긴다
    assert.ok(saved.includes(`## [${headingTime(queued.timestamp)}] User\n\nqueued follow-up`));
    assert.match(fs.readFileSync(path.join(root,'.claude','mnemo-errors.log'),'utf8'),/same prompt_id with a different prompt/);
  });
}
test('Claude Stop does not duplicate a prompt the hook saved without prompt_id',{skip:!hasPs},t=>{
  const root=fixture(t),transcript=path.join(root,'transcript.jsonl');
  const first=[promptLine('u1','p1','prompt without id'),answerLine('r1','answer')];
  claude(root,'PowerShell','save-conversation',{prompt:'prompt without id'});
  writeLines(transcript,first);
  claude(root,'PowerShell','save-response',{transcript_path:transcript,last_assistant_message:'answer'});
  // 커서가 생긴 다음 턴에서, 원본과 다른 식별자로 저장된 훅 기록을 문장으로 짝짓는지 본다.
  claude(root,'PowerShell','save-conversation',{prompt:'second without id'});
  writeLines(transcript,[...first,promptLine('u2','p2','second without id','typed',10),answerLine('r2','answer two')]);
  claude(root,'PowerShell','save-response',{transcript_path:transcript,last_assistant_message:'answer two'});
  const saved=history(root,'claude');
  assert.equal(count(saved,'\nprompt without id\n'),1);
  assert.equal(count(saved,'\nsecond without id\n'),1);
});
function reconcile(root,config,args=[]) {
  const script=installed ? path.join(home,'.claude/skills/mnemo/scripts/reconcile_conversations.py') : path.join(repo,'skills/mnemo/scripts/reconcile_conversations.py');
  const fakeHome=path.join(root,'home');
  fs.mkdirSync(fakeHome,{recursive:true});
  // 실제 ~/.claude와 CLAUDE_CONFIG_DIR의 원본 세션을 읽지 않도록 둘 다 바꾼다(gotcha 120).
  const env=isolatedHomeEnv(fakeHome,{CLAUDE_CONFIG_DIR:config,MNEMO_DISABLE:'0'});
  for (const cmd of process.platform==='win32'?['python','py','python3']:['python3','python']) {
    const result=spawnSync(cmd,[...(cmd==='py'?['-3']:[]),'-B','-X','utf8',script,'--project-root',root,...args],{encoding:'utf8',env,windowsHide:true,timeout:60000});
    if (!result.error && (result.status===0||result.status===1)) return result;
  }
  throw new Error('Python reconcile could not run');
}
test('SessionStart reconcile reads CLAUDE_CONFIG_DIR and backfills missed user inputs with the hook marker',t=>{
  const root=fixture(t),config=path.join(root,'config');
  let encoded=root.replace(/[\\/:]/g,'-'); while(encoded.includes('---')) encoded=encoded.replace('---','--');
  const dir=path.join(config,'projects',encoded),transcript=path.join(dir,`${sid}.jsonl`);
  fs.mkdirSync(dir,{recursive:true});
  // 첫 턴: 중간 진행 문장 → 최종 답 → 턴 끝 표시. 둘째 턴은 아직 열려 있다(파일이 방금 바뀜).
  writeLines(transcript,[promptLine('u1','p1','already saved prompt'),answerLine('i1','progress note'),midTurnLine('a1','lost mid-turn'),
    answerLine('r1','answer one'),{type:'system',subtype:'stop_hook_summary',uuid:'stop1',sessionId:sid,timestamp:at(25)},
    promptLine('u2','p2','lost queued prompt','queued',20),answerLine('r2','answer two')]);
  if (hasPs) claude(root,'PowerShell','save-conversation',{prompt:'already saved prompt',prompt_id:'p1'});
  const first=reconcile(root,config,['--days','1']);
  assert.equal(first.status,0,first.stderr);
  assert.match(first.stdout,new RegExp(`user_inputs=3 user_written=${hasPs?2:3}`));
  assert.match(first.stdout,/assistant_turns=1 .*newly_written=1 /); // 끝난 턴의 최종 답만
  assert.match(reconcile(root,config,['--days','1']).stdout,/user_written=0/);
  let saved=history(root,'claude');
  assert.equal(count(saved,'answer one'),1); // 답 복구도 같은 설정 폴더에서 찾는다
  assert.ok(!saved.includes('progress note')); // 도구 호출 사이의 중간 문장은 복구하지 않는다
  assert.ok(!saved.includes('answer two')); // 진행 중일 수 있는 열린 턴은 건너뛴다
  if (hasPs) {
    claude(root,'PowerShell','save-response',{transcript_path:transcript,last_assistant_message:'answer two'});
    const old=new Date(Date.now()-11*60*1000);
    fs.utimesSync(transcript,old,old); // 열린 턴이 오래되면 끝난 것으로 보지만, Stop이 이미 저장했으면 다시 쓰지 않는다
    assert.match(reconcile(root,config,['--days','1']).stdout,/assistant_turns=2 .*newly_written=0 /);
  }
  saved=history(root,'claude');
  for(const text of ['already saved prompt','lost mid-turn','lost queued prompt']) assert.equal(count(saved,`\n${text}\n`),1,text);
  if (hasPs) assert.equal(count(saved,'answer two'),1);
});
test('SessionStart reconcile treats a legacy User record with extra blank lines as saved, but not a prompt that only matches its start',t=>{
  const root=fixture(t),config=path.join(root,'config');
  let encoded=root.replace(/[\\/:]/g,'-'); while(encoded.includes('---')) encoded=encoded.replace('---','--');
  const dir=path.join(config,'projects',encoded);
  fs.mkdirSync(dir,{recursive:true});
  writeLines(path.join(dir,`${sid}.jsonl`),[promptLine('u1','p1','legacy pasted\ntext',undefined,60),promptLine('u2','p2','legacy',undefined,50)]);
  // 표식을 쓰기 전(2026-10-12 이전) 훅은 제목 뒤에 빈 줄을 더 넣고 표식 없이 저장했다.
  const d=new Date(at(60)),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  fs.mkdirSync(path.join(root,'conversations'),{recursive:true});
  fs.writeFileSync(path.join(root,'conversations',`${day}-claude.md`),`# ${day}\n\n## [02:15] User\n\n\n\nlegacy pasted\ntext\n\n\n## [02:16:05] Assistant\n\nold answer\n`);
  const result=reconcile(root,config,['--days','1']);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/user_inputs=2 user_written=1/);
  const saved=history(root,'claude');
  assert.equal(count(saved,'legacy pasted\ntext'),1); // 공백 차이만 있는 옛 기록은 다시 쓰지 않는다
  assert.equal(count(saved,'\nlegacy\n'),1); // 옛 기록의 앞부분과만 같은 새 입력은 저장한다
});
test('PowerShell prompt hook logs a stdin that never arrives instead of exiting silently',{skip:!hasPs},async t=>{
  const root=fixture(t),base=installed ? path.join(home,'.claude/hooks') : path.join(repo,'hooks');
  const env={...process.env,MNEMO_DISABLE:'0',CLAUDE_PROJECT_DIR:root};
  for(const key of ['GROK_HOOK_EVENT','DEVIN_PROJECT_DIR']) delete env[key];
  const child=spawn(ps,['-NoProfile','-File',path.join(base,'save-conversation.ps1')],{cwd:root,env,windowsHide:true}); // stdin을 닫지 않는다
  const [code]=await once(child,'close');
  child.stdin.destroy();
  assert.equal(code,0);
  assert.match(fs.readFileSync(path.join(root,'.claude','mnemo-errors.log'),'utf8'),/\[stdin-timeout\]/);
});
