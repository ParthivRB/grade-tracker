"use strict";
const TALLY='https://parthivrb.github.io/grade-tracker/';
const $=function(id){ return document.getElementById(id); };
const view=$('view');
const esc=function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); };
const ago=function(t){ if(!t) return 'never'; const m=Math.round((Date.now()-t)/60000); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago'; };
function say(t,cls){ const m=$('msg'); if(m){ m.textContent=t; m.className='msg '+(cls||''); } }
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
    const r=await chrome.scripting.executeScript({target:{tabId:tab.id},func:async function(){
      try{ return {ok:true,p:await canvasCollect(window.fetch.bind(window),location.origin,null)}; }
      catch(e){ return {ok:false,status:e&&e.status,msg:String((e&&e.message)||e)}; }
    }});
    const out=r&&r[0]&&r[0].result;
    if(!out||!out.ok){ say(failText(out&&out.status),'bad'); btn.disabled=false; return; }
    if(!out.p.courses.length){ say('No active classes found in this Canvas.','bad'); btn.disabled=false; return; }
    await chrome.runtime.sendMessage({type:'data',payload:out.p,origin:origin,name:det.name});
    if(granted){
      const host=new URL(origin).host, id='tally-'+host;
      try{
        const ex=await chrome.scripting.getRegisteredContentScripts({ids:[id]});
        if(!ex.length) await chrome.scripting.registerContentScripts([{id:id,matches:[origin+'/*'],js:['collector.js','auto.js'],runAt:'document_idle',persistAcrossSessions:true}]);
      }catch(e){}
    }
    say(granted?'Sent to Tally. It will keep updating when you visit Canvas.':'Sent to Tally. Allow access next time to keep it updating.','ok');
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
      +'<button id="go">Sync with Tally</button><button class="ghost" id="tally">Open Tally</button><div class="msg" id="msg" role="status"></div>'+list;
    $('go').addEventListener('click',function(){ sync(tab,origin,det); });
  }else{
    view.innerHTML='<h2>Open your Canvas</h2><p>Go to your school’s Canvas and sign in, then click this icon again. Tally then builds your classes and keeps them up to date.</p>'
      +'<button id="tally">Open Tally</button><div class="msg" id="msg" role="status"></div>'+list;
  }
  $('tally').addEventListener('click',openTally);
}
main();
