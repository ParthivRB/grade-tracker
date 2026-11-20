"use strict";
const TALLY='https://parthivrb.github.io/grade-tracker/';
const $=function(id){ return document.getElementById(id); };
const view=$('view');
let lastRead=null;
const esc=function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); };
const ago=function(t){ if(!t) return 'never'; const m=Math.round((Date.now()-t)/60000); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago'; };
function say(t,cls){ const m=$('msg'); if(m){ m.textContent=t; m.className='msg '+(cls||''); } }
function bar(i,n,name){
  try{ const b=$('pg'); b.hidden=false; b.classList.toggle('ind',!n); b.firstChild.style.width=n?Math.round(((i+1)/n)*100)+'%':'35%'; }catch(e){}
  say(n?'Reading class '+(i+1)+' of '+n+(name?': '+name:''):'Finding your classes…');
}
function barDone(){ try{ const b=$('pg'); b.classList.remove('ind'); b.firstChild.style.width='100%'; }catch(e){} }
chrome.runtime.onMessage.addListener(function(msg){ if(msg&&msg.type==='prog'&&msg.state==='run') bar(msg.i,msg.n,msg.name); });
function failText(status){
  if(status===401||status===403) return 'Canvas did not let this page read your classes. Make sure you are signed in, then try again.';
  return 'Could not read Canvas right now. Reload the Canvas page and try again.';
}
function openTally(){
  chrome.tabs.query({url:TALLY+'*'},function(tabs){
    if(tabs&&tabs.length){ chrome.tabs.update(tabs[0].id,{active:true}); chrome.windows.update(tabs[0].windowId,{focused:true}); }
    else chrome.tabs.create({url:TALLY});
  });
}
function summary(p){
  const s={classes:p.courses.length,assignments:0,graded:0};
  p.courses.forEach(function(c){ if(c.dg){ s.assignments+=c.dg.a; s.graded+=c.dg.scored; } });
  return s;
}
function report(p){
  return JSON.stringify({extension:'1.0.2',readClasses:p.courses.length,canvasListed:p.total,couldNotRead:p.skipped||[],
    classes:p.courses.map(function(c){ return {weighted:c.weighted,sections:c.ng,assignments:c.dg&&c.dg.a,withSubmissionInfo:c.dg&&c.dg.sub,withScore:c.dg&&c.dg.scored,noPoints:c.dg&&c.dg.noPts,unpublished:c.dg&&c.dg.hidden,excusedOrOmitted:c.dg&&c.dg.ex,canvasShowsAScore:c.cs!=null}; })},null,2);
}
async function activeTab(){ const t=await chrome.tabs.query({active:true,currentWindow:true}); return t&&t[0]; }
async function detect(tab){
  try{
    const r=await chrome.scripting.executeScript({target:{tabId:tab.id},func:async function(){
      try{
        const x=await fetch('/api/v1/users/self',{headers:{Accept:'application/json+canvas-string-ids'}});
        if(!x.ok) return {ok:false,status:x.status};
        const d=JSON.parse((await x.text()).replace(/^while\(1\);/,''));
        return {ok:true,name:String(d.name||d.short_name||'')};
      }catch(e){ return {ok:false}; }
    }});
    return (r&&r[0]&&r[0].result)||{ok:false};
  }catch(e){ return {ok:false}; }
}
async function savedSites(){
  const all=await chrome.storage.local.get(null);
  return Object.keys(all).filter(function(k){ return k.indexOf('site:')===0; }).map(function(k){ return all[k]; });
}
async function sync(tab,origin,det){
  const btn=$('go'); btn.disabled=true; say('Asking for permission…');
  let granted=false; try{ granted=await chrome.permissions.request({origins:[origin+'/*']}); }catch(e){}
  say('Reading your classes…');
  try{
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['collector.js']});
    bar(0,0,'');
    const r=await chrome.scripting.executeScript({target:{tabId:tab.id},func:async function(){
      const tell=function(o){ try{ chrome.runtime.sendMessage(Object.assign({type:'prog',host:location.host},o)); }catch(e){} };
      try{ tell({state:'start'}); return {ok:true,p:await canvasCollect(window.fetch.bind(window),location.origin,function(name,i,n){ tell({state:'run',i:i,n:n,name:name}); })}; }
      catch(e){ tell({state:'fail'}); return {ok:false,status:e&&e.status,msg:String((e&&e.message)||e)}; }
    }});
    const out=r&&r[0]&&r[0].result;
    if(!out||!out.ok){ try{ $('pg').hidden=true; }catch(e){} say(failText(out&&out.status),'bad'); btn.disabled=false; return; }
    if(!out.p.courses.length){ try{ $('pg').hidden=true; }catch(e){} say('No active classes found in this Canvas.','bad'); btn.disabled=false; return; }
    await chrome.runtime.sendMessage({type:'data',payload:out.p,origin:origin,name:det.name});
    if(granted){
      const host=new URL(origin).host, id='tally-'+host;
      try{
        const ex=await chrome.scripting.getRegisteredContentScripts({ids:[id]});
        if(!ex.length) await chrome.scripting.registerContentScripts([{id:id,matches:[origin+'/*'],js:['collector.js','auto.js'],runAt:'document_idle',persistAcrossSessions:true}]);
      }catch(e){}
    }
    barDone(); lastRead=out.p; const sm=summary(out.p);
    say('Read '+sm.classes+' class'+(sm.classes===1?'':'es')+', '+sm.assignments+' assignments, '+sm.graded+' with grades. '+(granted?'Sent to Tally. It keeps updating when you visit Canvas.':'Sent to Tally. Allow access next time to keep it updating.'),sm.graded?'ok':'bad');
    const d=$('diag'); if(d) d.hidden=false;
    openTally();
  }catch(e){ say('Something went wrong. Reload the Canvas page and try again.','bad'); btn.disabled=false; }
}
async function main(){
  const tab=await activeTab(); let origin=null;
  try{ const u=new URL(tab.url); if(u.protocol==='https:') origin=u.origin; }catch(e){}
  const det=origin?await detect(tab):{ok:false};
  const sites=await savedSites();
  const list=sites.length?'<div class="card"><b>Connected</b>'+sites.map(function(s){ return '<small>'+esc(s.host)+' · last read '+esc(ago(s.last))+'</small>'; }).join('<br>')+'</div>':'';
  if(det.ok){
    view.innerHTML='<h2>Canvas found</h2><p>'+esc(new URL(origin).host)+(det.name?' · signed in as '+esc(det.name):'')+'</p>'
      +'<button id="go">Sync with Tally</button><button class="ghost" id="tally">Open Tally</button><button class="ghost" id="diag" hidden>Copy a report for support</button><div class="pg" id="pg" hidden><i></i></div><div class="msg" id="msg" role="status"></div>'+list;
    $('go').addEventListener('click',function(){ sync(tab,origin,det); });
    $('diag').addEventListener('click',async function(){ const t=report(lastRead||{courses:[]}); try{ await navigator.clipboard.writeText(t); say('Report copied. It has counts only: no class names, grades or sign-in details.','ok'); }catch(e){ say('Could not copy. Select and copy this instead:\n'+t,'bad'); } });
  }else{
    view.innerHTML='<h2>Open your Canvas</h2><p>Go to your school’s Canvas and sign in, then click this icon again. Tally then builds your classes and keeps them up to date.</p>'
      +'<button id="tally">Open Tally</button><div class="msg" id="msg" role="status"></div>'+list;
  }
  $('tally').addEventListener('click',openTally);
}
main();
