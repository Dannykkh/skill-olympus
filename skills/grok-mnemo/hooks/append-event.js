#!/usr/bin/env node
"use strict";
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const shared = fs.existsSync(path.join(__dirname,'mnemo-record-store.js'))
  ? path.join(__dirname,'mnemo-record-store.js') : path.resolve(__dirname,'../../../hooks/mnemo-record-store.js');
const { journal, record, atomicJson, redact, hash } = require(shared);

async function appendEvent(root, payload, now = new Date(), detailed = false) {
  const event = payload.hookEventName;
  if (event !== 'user_prompt_submit' && (event !== 'stop' || payload.reason !== 'end_turn')) return detailed ? {status:'empty'} : false;
  const role = event === 'user_prompt_submit' ? 'User' : 'Assistant';
  const raw = role === 'User' ? String(payload.prompt || '').replace(/^\s*<user_query>\s*([\s\S]*?)\s*<\/user_query>\s*$/, '$1') : payload.lastAssistantMessage;
  const value = redact(raw);
  if (!value) return detailed ? {status:'empty'} : false;
  const tx = journal(root);
  const result = await tx.locked(async j => {
    const statePath = path.join(root,'conversations','.grok-events.json');
    const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath,'utf8')) : {version:1,seen:{},sessions:{}};
    if (state.version !== 1 || !state.seen || !state.sessions) throw new Error('unsupported Grok event index');
    const sessionId = String(payload.sessionId || payload.transcriptPath || '');
    const session = hash(sessionId || crypto.randomUUID());
    const previous = state.sessions[session] || {sequence:0};
    const textHash = hash(value);
    const field = ['eventId','messageId','promptId','turnId'].find(key => ['string','number'].includes(typeof payload[key]) && String(payload[key]).length);
    const repeatedPhase = previous.role === role && previous.textHash === textHash;
    const sequence = previous.sequence + (role === 'User' && (field || !repeatedPhase) ? 1 : 0);
    const identity = field ? `${field}:${payload[field]}` : `phase:${sequence}:${textHash}`;
    const key = hash(`${session}\0${role}\0${identity}`);
    const entry = record(root,'grok',key,[{role,text:value}],{now,aliases:[`<!-- grok-event:${key} -->`]});
    j.put(entry);
    // seen는 완전한 Markdown 또는 완전한 대기 레코드가 있음을 뜻한다.
    if (!state.seen[key]) state.sessions[session] = {sequence,role,textHash};
    state.seen[key] = true;
    atomicJson(statePath,state);
    const flushed = await j.flush();
    return {status:flushed.results.get(entry.marker) || 'pending',error:flushed.error};
  });
  return detailed ? result : result.status === 'saved';
}
if (require.main === module) {
  (async () => {
    if (/^(1|true|yes)$/i.test(process.env.MNEMO_DISABLE || '')) return;
    const payload = JSON.parse(fs.readFileSync(0,'utf8').replace(/^\uFEFF+/,''));
    const result = await appendEvent(path.resolve(process.argv[2]),payload,new Date(),true);
    if (result.error) console.error(`[grok-mnemo] ${result.error}`);
    process.stdout.write(result.status === 'empty' ? 'duplicate' : result.status);
  })().catch(error => {console.error(`[grok-mnemo] ${error.message}`);process.exitCode=1;});
}
module.exports = {appendEvent};
