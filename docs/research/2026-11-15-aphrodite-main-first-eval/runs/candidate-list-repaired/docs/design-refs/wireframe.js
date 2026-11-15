"use strict";
// Structure-only prototype. All records come from PRODUCT.md; changes last for this page visit.
const records = [
 ["PO-261101","한빛정밀","베어링 6204",1280000,"11/12","지연","미배정"],
 ["PO-261102","새론소재","알루미늄 판재",4560000,"11/13","지연","김민수"],
 ["PO-261103","동진부품","고정 볼트 M8",680000,"11/14","지연","미배정"],
 ["PO-261104","유성산업","포장 케이스",920000,"11/17","진행","이서연"],
 ["PO-261105","한빛정밀","스프링 와셔",340000,"11/18","진행","김민수"],
 ["PO-261106","새론소재","스테인리스 봉",2870000,"11/18","진행","이서연"],
 ["PO-261107","동진부품","실리콘 패킹",510000,"11/19","진행","김민수"],
 ["PO-261108","유성산업","라벨 용지",180000,"11/20","진행","이서연"],
 ["PO-261109","한빛정밀","기어 모듈 2",1760000,"11/10","입고완료","김민수"],
 ["PO-261110","새론소재","구리 배선",890000,"11/11","입고완료","이서연"],
 ["PO-261111","동진부품","커넥터 세트",430000,"11/12","입고완료","김민수"],
 ["PO-261112","유성산업","보호 필름",260000,"11/13","입고완료","이서연"]
].map(([id,vendor,item,amount,due,status,owner])=>({id,vendor,item,amount,due,status,owner,archived:false}));
const $ = id=>document.getElementById(id);
const money = amount=>amount.toLocaleString("ko-KR")+"원";
const selected = new Set();
let shown=[], targets=[], detailId="", archived=false, canAssign=true;
let returnFocus=null;
const filters=["status","vendor","period"];
function openDialog(id){
 document.querySelectorAll("details[open]").forEach(el=>el.removeAttribute("open"));
 if(id==="filter-dialog") filters.forEach(key=>$("mobile-"+key).value=$(key).value);
 document.querySelectorAll("dialog[open]").forEach(el=>el.close());
 returnFocus=document.activeElement;
 $(id).showModal();
}
function closeDialog(el){el.closest("dialog").close();}
document.querySelectorAll("dialog").forEach(el=>el.addEventListener("close",()=>{
 if(returnFocus?.isConnected) returnFocus.focus();
}));
function message(text, action, callback){
 const notice=$("notice");notice.replaceChildren(document.createTextNode(text));notice.hidden=false;
 if(action){const button=document.createElement("button");button.textContent=action;button.addEventListener("click",callback);notice.append(button);}
}
function reset(){
 $("search").value="";filters.forEach(id=>$(id).value="");selected.clear();render();
}
function filtered(){
 const query=$("search").value.trim().toLowerCase(),status=$("status").value,vendor=$("vendor").value,period=$("period").value;
 return records.filter(r=>r.archived===archived && (!query || (r.id+" "+r.vendor).toLowerCase().includes(query)) && (!status || r.status===status) && (!vendor || r.vendor===vendor) && (!period || (period==="12-14" ? Number(r.due.slice(3))>=12&&Number(r.due.slice(3))<=14 : Number(r.due.slice(3))>=17&&Number(r.due.slice(3))<=20))).sort((a,b)=>{
  if($("sort").value==="amount")return b.amount-a.amount;
  if($("sort").value==="date")return a.due.localeCompare(b.due);
  return ({"지연":0,"진행":1,"입고완료":2}[a.status]-{"지연":0,"진행":1,"입고완료":2}[b.status]) || a.due.localeCompare(b.due);
 });
}
function render(){
 const activeSelection=document.activeElement?.dataset.select;
 shown=filtered();
 $("order-rows").innerHTML=shown.map(r=>`<tr class="${selected.has(r.id)?"selected":""}">
 <td class="cell-check"><label class="check-target"><input type="checkbox" data-select="${r.id}" ${selected.has(r.id)?"checked":""}><span class="sr-only">${r.id} 선택</span></label></td>
 <td class="cell-number"><a class="order-link" href="#${r.id}" data-detail="${r.id}">${r.id}</a></td>
 <td class="cell-vendor">${r.vendor}</td><td class="cell-item">${r.item}</td>
 <td class="cell-amount number"><span class="mobile-label">금액</span>${money(r.amount)}</td>
 <td class="cell-due"><span class="mobile-label">납기</span>${r.due}</td>
 <td class="cell-status"><span class="status-pill ${r.status==="지연"?"late":""}">${r.status}</span></td>
 <td class="cell-owner ${r.owner==="미배정"?"unassigned":""}"><span class="mobile-label">담당자</span>${r.owner}</td>
 <td class="cell-menu"><details class="more-menu row-menu"><summary aria-label="${r.id} 행 더보기">···</summary><div class="menu-items"><button data-detail="${r.id}">상세 열기</button><button data-assign="${r.id}" ${canAssign?"":"disabled"}>담당자 변경</button><button data-archive="${r.id}" ${archived?"disabled":""}>보관</button></div></details></td></tr>`).join("");
 $("result-count").textContent=`${shown.length}건 · 지연 ${shown.filter(r=>r.status==="지연").length}건`;
 $("selection-bar").hidden=selected.size===0;$("selected-count").textContent=`${selected.size}건 선택`;
 $("assign-selected").disabled=!canAssign;$("detail-assign").disabled=!canAssign;
 $("select-all").checked=shown.length>0&&shown.every(r=>selected.has(r.id));
 $("select-all").indeterminate=selected.size>0&&!$("select-all").checked;
 $("select-all").disabled=shown.length===0;
 $("empty-state").hidden=shown.length>0;
 $("empty-state").querySelector("h2").textContent=archived&&!$("search").value&&!filters.some(k=>$(k).value)?"보관한 발주가 없습니다":"검색 결과가 없습니다";
 $("active-filters").replaceChildren();
 const active=[...( $("search").value ? ["search"] : []),...filters.filter(key=>$(key).value)];
 active.forEach(key=>{
  const button=document.createElement("button");const label=key==="search"?`검색: ${$(key).value}`:$(key).selectedOptions[0].textContent;
  button.textContent=label+" ×";button.setAttribute("aria-label",label+" 조건 제거");
  button.addEventListener("click",()=>{$(key).value="";selected.clear();render();});$("active-filters").append(button);
 });
 if(active.length){const clear=document.createElement("button");clear.textContent="초기화";clear.className="reset";clear.addEventListener("click",reset);$("active-filters").append(clear);}
 $("active-filters").hidden=!active.length;$("filter-count").textContent=filters.filter(k=>$(k).value).length||"";
 $("page-title").textContent=archived?"보관함":"발주";$("archive-view").textContent=archived?"발주 목록":"보관함";
 if(activeSelection)document.querySelector(`[data-select="${activeSelection}"]`)?.focus();
}
function assign(ids){
 if(!canAssign)return;
 targets=ids;$("assign-target").textContent=`선택한 발주 ${ids.length}건`;
 $("assign-orders").replaceChildren(...ids.map(id=>{const li=document.createElement("li"),r=records.find(r=>r.id===id);li.textContent=`${r.id} · ${r.vendor} · 현재 ${r.owner}`;return li;}));
 $("assignee").value="";openDialog("assign-dialog");
}
function detail(id){
 const r=records.find(r=>r.id===id);detailId=id;
 $("detail-title").textContent=r.id;
 $("detail-fields").innerHTML=[["거래처",r.vendor],["품목",r.item],["금액",money(r.amount)],["납기",r.due],["상태",r.status],["담당자",r.owner]].map(([key,value])=>`<dt>${key}</dt><dd>${value}</dd>`).join("");
 openDialog("detail-dialog");
}
document.addEventListener("click",event=>{
 const target=event.target.closest("[data-open],[data-close],[data-route],[data-detail],[data-assign],[data-archive]");
 if(!target)return;
 if(target.hasAttribute("data-open"))openDialog(target.dataset.open);
 else if(target.hasAttribute("data-close"))closeDialog(target);
 else if(target.hasAttribute("data-route")){$("route-title").textContent=target.dataset.route;openDialog("route-dialog");}
 else if(target.hasAttribute("data-detail")){event.preventDefault();detail(target.dataset.detail);}
 else if(target.hasAttribute("data-assign"))assign([target.dataset.assign]);
 else if(target.hasAttribute("data-archive")){
  const r=records.find(r=>r.id===target.dataset.archive);r.archived=true;selected.delete(r.id);render();
  message(`${r.id}을 보관했습니다.`,"실행 취소",()=>{r.archived=false;render();message("보관을 취소했습니다.");});
 }
});
document.addEventListener("change",event=>{
 if(event.target.dataset.select){event.target.checked?selected.add(event.target.dataset.select):selected.delete(event.target.dataset.select);render();}
});
$("select-all").addEventListener("change",event=>{shown.forEach(r=>event.target.checked?selected.add(r.id):selected.delete(r.id));render();});
$("search").addEventListener("input",()=>{selected.clear();render();});
filters.forEach(key=>$(key).addEventListener("change",()=>{selected.clear();render();}));
$("sort").addEventListener("change",render);
$("reset-empty").addEventListener("click",()=>{if(archived){archived=false;}reset();$("search").focus();});
$("clear-selection").addEventListener("click",()=>{selected.clear();render();});
$("assign-selected").addEventListener("click",()=>assign([...selected]));
$("detail-assign").addEventListener("click",()=>assign([detailId]));
$("assign-form").addEventListener("submit",event=>{
 event.preventDefault();if(!$("assignee").value)return;
 const name=$("assignee").value,count=targets.length;
 targets.forEach(id=>records.find(r=>r.id===id).owner=name);$("assign-dialog").close();selected.clear();render();
 message(`${count}건의 담당자를 ${name}님으로 배정했습니다.`);
});
$("filter-form").addEventListener("submit",event=>{event.preventDefault();filters.forEach(key=>$(key).value=$("mobile-"+key).value);selected.clear();render();$("filter-dialog").close();});
$("reset-filter").addEventListener("click",()=>filters.forEach(key=>$("mobile-"+key).value=""));
function refresh(){canAssign=true;document.body.classList.remove("loading");message("목록을 새로고침했습니다.");render();document.querySelectorAll("details[open]").forEach(el=>el.removeAttribute("open"));}
$("refresh").addEventListener("click",refresh);$("refresh-mobile").addEventListener("click",refresh);
$("archive-view").addEventListener("click",()=>{archived=!archived;selected.clear();reset();document.querySelectorAll("details[open]").forEach(el=>el.removeAttribute("open"));});
$("export").addEventListener("click",()=>{
 const csv="\uFEFF"+["발주번호,거래처,품목,금액,납기,상태,담당자",...shown.map(r=>[r.id,r.vendor,r.item,r.amount,r.due,r.status,r.owner].join(","))].join("\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="sample-orders.csv";link.click();URL.revokeObjectURL(url);message(`현재 결과 ${shown.length}건을 CSV로 내보냈습니다.`);
});
render();
const state=new URLSearchParams(location.search).get("state");
if(state==="empty"){$("search").value="PO-000000";render();}
if(["selected","assign"].includes(state)){selected.add("PO-261101");selected.add("PO-261103");render();if(state==="assign")assign([...selected]);}
if(state==="success"){records[0].owner="이서연";records[2].owner="이서연";render();message("2건의 담당자를 이서연님으로 배정했습니다.");}
if(state==="error")message("목록을 새로 불러오지 못했습니다. 기존 샘플 목록을 표시합니다.","다시 시도",refresh);
if(state==="stale"){canAssign=false;render();message("최신 목록을 확인하지 못했습니다. 배정 전 새로고침해 주세요.","새로고침",refresh);}
if(state==="loading"){canAssign=false;render();document.body.classList.add("loading");message("발주를 불러오는 중입니다. 기존 목록을 유지합니다.");}
if(state==="permission"){canAssign=false;render();message("담당자를 배정할 권한을 확인하지 못했습니다. 목록은 계속 확인할 수 있습니다.","다시 확인",refresh);}
