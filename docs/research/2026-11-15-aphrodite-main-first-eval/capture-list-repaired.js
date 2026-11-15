async(page)=>{const results=[];for(const mode of [{"id":"1280","width":1280,"height":800},{"id":"390","width":390,"height":844},{"id":"360","width":360,"height":800},{"id":"text200","width":390,"height":844,"text":2},{"id":"zoom200","width":195,"height":422}]){await page.setViewportSize({width:mode.width,height:mode.height});await page.goto("file:///"+"D:/git/claude-code-agent-customizations/docs/research/2026-11-15-aphrodite-main-first-eval/runs/candidate-list-repaired/docs/design-refs/2026-11-15-wireframe-orders.html");for(let i=0;i<3;i++)await page.locator("tbody input[type=checkbox]").nth(i).check();await page.evaluate(()=>document.activeElement.blur());if(mode.text)await page.evaluate((factor) => { const els=[document.body,...document.body.querySelectorAll("*")]; const was=els.map(e=>{const c=getComputedStyle(e);return[e,parseFloat(c.fontSize),c.lineHeight];});for(const [e,s,l] of was){if(s)e.style.setProperty("font-size",s*factor+"px","important");if(l.endsWith("px"))e.style.setProperty("line-height",parseFloat(l)*factor+"px","important");}},mode.text);await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));scrollTo(0,0);});const metrics=await page.evaluate(() => {
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
});const targets=await page.evaluate(() => Array.from(document.querySelectorAll("button,summary,input,select,textarea,[contenteditable]")).filter(e=>e.checkVisibility()&&e.getBoundingClientRect().width>2).map(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return {tag:e.tagName,text:(e.innerText||e.getAttribute("aria-label")||e.getAttribute("placeholder")||e.value||"").slice(0,55),x:r.x,y:r.y,width:r.width,height:r.height,outOfWidth:r.left<0||r.right>innerWidth+1,onScreen:r.y>=0&&r.bottom<=innerHeight,centerHit:hit===e||e.contains(hit)};}));const skip=await page.locator(".skip").evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,focused:e===document.activeElement};});const fonts=await page.locator("tbody tr").first().evaluate(e=>({row:getComputedStyle(e).fontSize,cell:getComputedStyle(e.querySelector("td")).fontSize}));const screenshot="D:/git/claude-code-agent-customizations/docs/research/2026-11-15-aphrodite-main-first-eval/screenshots/"+"list-repaired-"+mode.id+".png";await page.screenshot({path:screenshot,fullPage:false,scale:"css"});results.push({id:"list-repaired",state:"selected3",mode:mode.id,screenshot,fonts,skip,targets,...metrics});}return results;}
