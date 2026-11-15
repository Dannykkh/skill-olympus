/* 구조와 상태를 확인하는 로컬 와이어프레임. 서버·인증·영구 저장을 사용하지 않는다. */
const orders = [
  ['PO-261101','한빛정밀','베어링 6204',1280000,'11/12','지연','미배정'],
  ['PO-261102','새론소재','알루미늄 판재',4560000,'11/13','지연','김민수'],
  ['PO-261103','동진부품','고정 볼트 M8',680000,'11/14','지연','미배정'],
  ['PO-261104','유성산업','포장 케이스',920000,'11/17','진행','이서연'],
  ['PO-261105','한빛정밀','스프링 와셔',340000,'11/18','진행','김민수'],
  ['PO-261106','새론소재','스테인리스 봉',2870000,'11/18','진행','이서연'],
  ['PO-261107','동진부품','실리콘 패킹',510000,'11/19','진행','김민수'],
  ['PO-261108','유성산업','라벨 용지',180000,'11/20','진행','이서연'],
  ['PO-261109','한빛정밀','기어 모듈 2',1760000,'11/10','입고완료','김민수'],
  ['PO-261110','새론소재','구리 배선',890000,'11/11','입고완료','이서연'],
  ['PO-261111','동진부품','커넥터 세트',430000,'11/12','입고완료','김민수'],
  ['PO-261112','유성산업','보호 필름',260000,'11/13','입고완료','이서연']
].map(([id,vendor,item,amount,due,status,owner]) => ({id,vendor,item,amount,due,status,owner,archived:false}));
const $ = id => document.getElementById(id);
const selected = new Set();
let visible = [], assignmentIds = [], detailId = null, archiveId = null, lastArchive = null;
const money = value => value.toLocaleString('ko-KR')+'원';
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function say(message,undo=false){$('feedback-text').textContent=message;$('feedback').hidden=false;$('undo').hidden=!undo;}
function filterValues(){return {query:$('query').value.trim(),status:$('status-filter').value,vendor:$('vendor-filter').value,start:$('date-start').value,end:$('date-end').value};}
function render(){
  const f=filterValues(),query=f.query.toLowerCase();
  visible=orders.filter(o=>!o.archived&&(!query||(o.id+' '+o.vendor).toLowerCase().includes(query))&&(!f.status||o.status===f.status)&&(!f.vendor||o.vendor===f.vendor)&&(!f.start||'2026-'+o.due.replace('/','-')>=f.start)&&(!f.end||'2026-'+o.due.replace('/','-')<=f.end));
  const sort=$('sort').value;
  visible.sort((a,b)=>sort==='amount'?b.amount-a.amount:sort==='due'?a.due.localeCompare(b.due):sort==='number'?a.id.localeCompare(b.id):({'지연':0,'진행':1,'입고완료':2}[a.status]-{'지연':0,'진행':1,'입고완료':2}[b.status]||a.id.localeCompare(b.id)));
  $('order-rows').innerHTML=visible.map(o=>`<tr class="${selected.has(o.id)?'selected':''}"><td class="selection-cell"><input type="checkbox" data-select="${o.id}" aria-label="${o.id} 선택" ${selected.has(o.id)?'checked':''}></td><td class="number-cell"><a href="#${o.id}" class="order-link" data-detail="${o.id}">${o.id}</a></td><td class="vendor-cell">${o.vendor}</td><td class="item-cell">${o.item}</td><td class="amount-cell">${money(o.amount)}</td><td class="due-cell"><span class="cell-label">납기</span>${o.due}</td><td class="status-cell"><span class="status ${o.status==='지연'?'late':''}">${o.status}</span></td><td class="owner-cell"><span class="cell-label">담당자</span>${o.owner}</td><td class="actions-cell"><details class="row-tools"><summary aria-label="${o.id} 작업">⋯</summary><div class="menu"><button type="button" data-detail="${o.id}">상세 열기</button><button type="button" data-assign="${o.id}">담당자 변경</button><button type="button" data-archive="${o.id}">보관</button></div></details></td></tr>`).join('');
  $('result-count').textContent=`발주 ${visible.length}건`;
  $('range').textContent=`${visible.length}건 모두 표시`;
  $('results').hidden=!visible.length;$('empty-state').hidden=!!visible.length;
  const chips=[];if(f.query)chips.push(['검색: '+f.query,'query']);if(f.status)chips.push(['상태: '+f.status,'status-filter']);if(f.vendor)chips.push(['거래처: '+f.vendor,'vendor-filter']);if(f.start||f.end)chips.push(['납기: '+(f.start||'시작 없음')+' ~ '+(f.end||'종료 없음'),'dates']);
  $('active-filters').innerHTML=chips.map(([label,key])=>`<button class="chip" type="button" data-remove="${key}" aria-label="${escapeHtml(label)} 필터 해제">${escapeHtml(label)} ×</button>`).join('');
  $('empty-summary').textContent=chips.map(c=>c[0]).join(' · ');
  $('filter-summary').textContent='상세 필터'+((f.vendor?1:0)+(f.start||f.end?1:0)?' ('+((f.vendor?1:0)+(f.start||f.end?1:0))+')':'');
  $('late-shortcut').textContent=f.status==='지연'?'전체 상태 보기':`지연 ${orders.filter(o=>!o.archived&&o.status==='지연').length}건 보기`;
  syncSelection();
}
function syncSelection(){
  $('batch').hidden=!selected.size;$('selection-count').textContent=`${selected.size}건 선택`;
  $('select-all').checked=visible.length>0&&visible.every(o=>selected.has(o.id));
  $('select-all').indeterminate=visible.some(o=>selected.has(o.id))&&!$('select-all').checked;
}
function filtersChanged(){selected.clear();render();}
function resetFilters(){['query','status-filter','vendor-filter','date-start','date-end'].forEach(id=>$(id).value='');$('sort').value='priority';$('panel-sort').value='priority';filtersChanged();$('query').focus();}
function openAssignment(ids){
  assignmentIds=ids;$('assign-summary').textContent=`선택한 발주 ${ids.length}건`;
  $('assign-orders').innerHTML=ids.map(id=>{const o=orders.find(x=>x.id===id);return `<li>${o.id} · ${o.vendor} · ${o.owner}</li>`}).join('');
  $('assignee').value='';$('assign-dialog').showModal();
}
function detail(id){const o=orders.find(x=>x.id===id);detailId=id;$('detail-title').textContent=o.id;$('detail-fields').innerHTML=[['거래처',o.vendor],['품목',o.item],['금액',money(o.amount)],['납기',o.due],['상태',o.status],['담당자',o.owner]].map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');$('detail-dialog').showModal();}
$('filter-form').addEventListener('submit',e=>{e.preventDefault();filtersChanged();});
$('query').addEventListener('input',filtersChanged);
['status-filter','vendor-filter','date-start','date-end'].forEach(id=>$(id).addEventListener('change',filtersChanged));
$('sort').addEventListener('change',()=>{$('panel-sort').value=$('sort').value;render();});
$('panel-sort').addEventListener('change',()=>{$('sort').value=$('panel-sort').value;render();});
$('close-filters').addEventListener('click',()=>{$('advanced-filters').open=false;render();});
$('late-shortcut').addEventListener('click',()=>{$('status-filter').value=$('status-filter').value==='지연'?'':'지연';filtersChanged();});
$('select-all').addEventListener('change',e=>{visible.forEach(o=>e.target.checked?selected.add(o.id):selected.delete(o.id));render();});
$('clear-selection').addEventListener('click',()=>{selected.clear();render();});
$('assign-selected').addEventListener('click',()=>openAssignment([...selected]));
$('assign-form').addEventListener('submit',e=>{e.preventDefault();if(!$('assignee').value)return;const owner=$('assignee').value;assignmentIds.forEach(id=>orders.find(o=>o.id===id).owner=owner);$('assign-dialog').close();selected.clear();render();say(`발주 ${assignmentIds.length}건의 담당자를 ${owner} 님으로 배정했습니다.`);});
$('detail-assign').addEventListener('click',()=>{$('detail-dialog').close();openAssignment([detailId]);});
$('archive-confirm').addEventListener('click',()=>{const o=orders.find(x=>x.id===archiveId);o.archived=true;selected.delete(o.id);lastArchive=o.id;$('archive-dialog').close();render();say(`${o.id} 발주를 보관했습니다.`,true);});
$('undo').addEventListener('click',()=>{if(lastArchive){orders.find(o=>o.id===lastArchive).archived=false;render();lastArchive=null;say('보관을 취소했습니다.');}});
$('dismiss-feedback').addEventListener('click',()=>{$('feedback').hidden=true;});
$('refresh').addEventListener('click',e=>{e.target.closest('details').open=false;say('샘플 목록을 새로고침했습니다.');render();});
$('export-csv').addEventListener('click',e=>{const rows=[['발주번호','거래처','품목','금액','납기','상태','담당자'],...visible.map(o=>[o.id,o.vendor,o.item,o.amount,o.due,o.status,o.owner])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(c=>'"'+String(c).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='발주-샘플.csv';link.click();URL.revokeObjectURL(url);e.target.closest('details').open=false;say(`현재 검색 결과 ${visible.length}건을 CSV로 내보냈습니다.`);});
document.addEventListener('click',e=>{const reset=e.target.closest('[data-reset]');if(reset){resetFilters();return;}const remove=e.target.closest('[data-remove]');if(remove){const key=remove.dataset.remove;if(key==='dates'){$('date-start').value='';$('date-end').value='';}else $(key).value='';filtersChanged();return;}const close=e.target.closest('[data-close-dialog]');if(close){close.closest('dialog').close();return;}const d=e.target.closest('[data-detail]');if(d){e.preventDefault();detail(d.dataset.detail);return;}const a=e.target.closest('[data-assign]');if(a){a.closest('details').open=false;openAssignment([a.dataset.assign]);return;}const archive=e.target.closest('[data-archive]');if(archive){archiveId=archive.dataset.archive;archive.closest('details').open=false;$('archive-summary').textContent=`${archiveId} 발주를 보관할까요?`;$('archive-dialog').showModal();}});
$('order-rows').addEventListener('change',e=>{if(e.target.dataset.select){const id=e.target.dataset.select;e.target.checked?selected.add(id):selected.delete(id);e.target.closest('tr').classList.toggle('selected',e.target.checked);syncSelection();}});
render();
