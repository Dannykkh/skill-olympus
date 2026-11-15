async (page) => { await page.evaluate(async () => { await document.fonts.ready; }); return await page.evaluate(() => {
  const round = n => Math.round(n * 10) / 10;
  const rect = el => {
    const r=el.getBoundingClientRect();
    return {x:round(r.x), y:round(r.y), width:round(r.width), height:round(r.height), bottom:round(r.bottom), right:round(r.right)};
  };
  const visible = el => {
    if (el.checkVisibility && !el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})) return false;
    const r=el.getBoundingClientRect(), s=getComputedStyle(el);
    return r.width>0 && r.height>0 && s.display!=="none" && s.visibility!=="hidden";
  };
  const identify = el => ({
    tag:el.tagName.toLowerCase(), id:el.id, class:typeof el.className==="string"?el.className:"",
    role:el.getAttribute("role"), label:el.getAttribute("aria-label"),
    text:(el.innerText||el.getAttribute("placeholder")||el.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().slice(0,100),
    ...rect(el)
  });
  const W=innerWidth,H=innerHeight;
  const candidates=Array.from(document.querySelectorAll("main,header,nav,aside,section,article,form,table,thead,tbody,tbody tr,h1,h2,[contenteditable],textarea,[role=toolbar]")).filter(visible).map(identify);
  const controls=Array.from(document.querySelectorAll("button,input,select,textarea,summary,[role=button],a[href]")).filter(visible).map(el=>({...identify(el),parent:el.parentElement?.className||el.parentElement?.tagName}));
  const overflow=Array.from(document.querySelectorAll("body *")).filter(el=>{
    if(!visible(el))return false;
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    if(r.right<=W+1 && r.left>=-1)return false;
    for(let p=el.parentElement;p && p!==document.body;p=p.parentElement){
      const ps=getComputedStyle(p);
      if(["auto","scroll","hidden","clip"].includes(ps.overflowX))return false;
    }
    return r.width>0;
  }).slice(0,16).map(identify);
  const allRows=Array.from(document.querySelectorAll("tbody tr")).filter(visible);
  const fullRows=allRows.filter(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=H;});
  return {
    title:document.title, viewport:{width:W,height:H}, scroll:{x:scrollX,y:scrollY}, document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
    font: {body:getComputedStyle(document.body).font,fontReady:document.fonts.status, koreanFont:getComputedStyle(document.body).fontFamily},
    candidates, controls, visibleTableRows:allRows.filter(el=>el.getBoundingClientRect().top<H).length, completeTableRows:fullRows.length,
    firstTableRow:allRows.length?identify(allRows[0]):null, pageOverflow:document.documentElement.scrollWidth>W+1, overflow
  };
}); }
