"use strict";
/* ---------- Canvas: connect, review, keep up to date ---------- */
const CV_KEY='tally-canvas';
function cvCfg(){ try{ const c=JSON.parse(localStorage.getItem(CV_KEY)||'null'); return (c&&c.origin&&c.token)?c:null; }catch(e){ return null; } }
function cvSave(c){ try{ if(c) localStorage.setItem(CV_KEY,JSON.stringify(c)); else localStorage.removeItem(CV_KEY); }catch(e){} }
const cvAgo=function(t){ if(!t) return 'never'; const m=Math.round((Date.now()-t)/60000); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago'; };

/* ---------- the connect step (inside setup) ---------- */
function canvasStepHtml(){
  const cfg=cvCfg();
  if(cfg) return '<span class="tk">Canvas</span><h2>Canvas is connected.</h2>'
    +'<p class="slead">Tally is reading <b>'+esc(cfg.host)+'</b>'+(cfg.name?' as <b>'+esc(cfg.name)+'</b>':'')+'. Grades and new assignments update on their own whenever you open Tally. Last updated '+esc(cvAgo(cfg.last))+'.</p>'
    +'<label class="swrow"><span>Update automatically<small style="display:block;font-weight:500;font-size:12.5px;color:var(--mut);margin-top:2px">Fill in new grades and assignments without asking. You can always undo.</small></span><input type="checkbox" class="swi" id="cvAuto"'+(cfg.auto?' checked':'')+'><i></i></label>'
    +'<div class="cvconn"><button type="button" class="btn pri" data-s="cvnow">Update now</button><button type="button" class="btn danger" data-s="cvoff">Disconnect</button></div>'
    +'<div class="serr" id="cvMsg" role="status"></div>';
  return '<span class="tk">Step 3 · Canvas</span><h2>Connect your Canvas.</h2>'
    +'<p class="slead">Paste a Canvas access token once. Tally then builds every class and section, fills in the grades already posted, and keeps them up to date. The token stays in this browser, and Tally talks straight to your school’s Canvas.</p>'
    +'<ol class="ssteps">'
    +'<li><span class="sn">1</span><div><b>Open Canvas settings</b><small>In Canvas: Account, then Settings. Scroll to “Approved Integrations” and click <b>＋ New Access Token</b>.</small></div></li>'
    +'<li><span class="sn">2</span><div><b>Create the token</b><small>Name it Tally and set an expiry for the end of the semester. Click Generate Token and copy it.</small></div></li></ol>'
    +'<form class="cvform" id="cvForm" autocomplete="off">'
    +'<label class="sfl">Your Canvas address<input type="text" id="cvHost" placeholder="canvas.yourschool.edu" autocapitalize="off" spellcheck="false" inputmode="url"></label>'
    +'<label class="sfl">Access token<input type="password" id="cvTok" placeholder="Paste the token here" autocomplete="off" spellcheck="false"></label>'
    +'<button type="submit" class="btn pri" id="cvGo">Connect and import</button></form>'
    +'<div class="serr" id="cvMsg" role="status"></div>'
    +'<details class="cvmore"><summary>I don’t see “New Access Token”</summary><p>Some schools turn tokens off for students. Then use <b>Set up classes with AI</b> instead: open your Canvas grades page, copy it, and give it to ChatGPT or Claude with the Tally prompt.</p></details>';
}
function canvasStepWire(body,ctl){
  const form=body.querySelector('#cvForm'), msg=body.querySelector('#cvMsg');
  const say=function(t,ok){ if(msg){ msg.textContent=t; msg.className='serr'+(ok?' okmsg':''); } };
  const auto=body.querySelector('#cvAuto');
  if(auto) auto.addEventListener('change',function(){ const c=cvCfg(); if(c){ c.auto=auto.checked; cvSave(c); } });
  body.querySelectorAll('[data-s=cvnow]').forEach(function(b){ b.addEventListener('click',function(){ b.disabled=true; say('Reading Canvas…',true); canvasRefresh(true,say).then(function(){ b.disabled=false; }); }); });
  body.querySelectorAll('[data-s=cvoff]').forEach(function(b){ b.addEventListener('click',function(){ if(confirm('Disconnect Canvas on this device? Your classes and grades stay in Tally. Also delete the token in Canvas settings to be safe.')){ cvSave(null); ctl.refresh(); } }); });
  if(!form) return;
  form.addEventListener('submit',async function(ev){
    ev.preventDefault();
    const h=canvasHost(body.querySelector('#cvHost').value), tok=(body.querySelector('#cvTok').value||'').trim(), go=body.querySelector('#cvGo');
    if(!h){ say('Enter the address you sign in to Canvas with, like canvas.yourschool.edu.'); return; }
    if(tok.length<20){ say('Paste the whole access token from Canvas.'); return; }
    go.disabled=true; say('Connecting…',true);
    try{
      const who=await canvasTest(window.fetch.bind(window),h.origin,tok);
      const raw=await canvasCollect(window.fetch.bind(window),h.origin,function(n,i,t){ say('Reading '+n+' ('+(i+1)+' of '+t+')…',true); },tok);
      const p=canvasClean(raw); if(!p){ say('Connected, but there are no active classes in Canvas to import yet.'); go.disabled=false; return; }
      cvSave({origin:h.origin,host:h.host,token:tok,name:who.name,last:Date.now(),auto:true});
      canvasReview(p,true);
    }catch(e){ say(canvasExplain(e)); go.disabled=false; }
  });
}

/* ---------- review sheet ---------- */
function canvasReview(p,fresh){
  if(typeof tourClose==='function') tourClose(true);
  const old=document.getElementById('cvOv'); if(old) old.remove();
  const host=p.host||'Canvas';
  const rows=p.courses.map(function(pc,i){ const sug=canvasSuggest(S.courses,pc,host); return {pc:pc,sel:sug||'new',on:true,i:i}; });
  const ov=document.createElement('div'); ov.className='wio cvov'; ov.id='cvOv';
  const rel=trapFocus(ov);
  function line(r){
    const ex=r.sel==='new'?null:S.courses.find(function(c){ return c.id===r.sel; });
    const st=canvasPreview(ex,r.pc,host);
    const secs=r.pc.groups.filter(function(g){ return g.items.some(cvUsable); });
    if(!ex){
      return '<div class="cvs">'+st.sections+' section'+(st.sections===1?'':'s')+' · '+st.assignments+' assignment'+(st.assignments===1?'':'s')+(st.graded?' · <b>'+st.graded+' grade'+(st.graded===1?'':'s')+' already posted</b>':'')+'</div>'
        +'<div class="cvchips">'+secs.slice(0,8).map(function(g){ return '<span>'+esc(g.name)+(r.pc.weighted&&g.w?' <em>'+trim(String(g.w))+'%</em>':'')+'</span>'; }).join('')+'</div>';
    }
    const bits=[]; if(st.items) bits.push('+'+st.items+' new assignment'+(st.items===1?'':'s')); if(st.cats) bits.push('+'+st.cats+' new section'+(st.cats===1?'':'s')); if(st.scores) bits.push(st.scores+' new grade'+(st.scores===1?'':'s')); if(st.upd) bits.push(st.upd+' updated');
    return '<div class="cvs">'+(bits.length?bits.join(' · '):'Already up to date')+'</div>';
  }
  const cfg0=cvCfg(); let autoOn=cfg0?!!cfg0.auto:true;
  function draw(){
    const n=rows.filter(function(r){ return r.on; }).length;
    ov.innerHTML='<div class="cvc" role="dialog" aria-modal="true" aria-label="Import from Canvas"><div class="cvh"><div><h3>Found '+p.courses.length+' class'+(p.courses.length===1?'':'es')+' in Canvas</h3><small>Adding to <b>'+esc(S.name)+'</b>. Existing classes are matched and updated, never duplicated.</small></div><button type="button" class="rgx" data-cv="x" aria-label="Close">×</button></div>'
      +'<div class="cvlist">'+rows.map(function(r){
        const ex=S.courses.filter(function(c){ return !c.cv||c.id===r.sel||(c.cv&&c.cv.id===r.pc.id); });
        return '<div class="cvr'+(r.on?'':' off')+'" style="--d:'+(r.i*50)+'ms"><label class="cvt"><input type="checkbox" class="swi" data-cv="on" data-i="'+r.i+'"'+(r.on?' checked':'')+'><i></i><span><b>'+esc(r.pc.name)+'</b><small>'+esc(r.pc.code)+(r.pc.term?' · '+esc(r.pc.term):'')+(r.pc.cs!=null?' · Canvas shows '+trim(String(Math.round(r.pc.cs*100)/100))+'%'+(r.pc.cg?' ('+esc(r.pc.cg)+')':''):'')+'</small></span></label>'
          +'<select data-cv="sel" data-i="'+r.i+'" aria-label="Where to put '+esc(r.pc.name)+'"><option value="new"'+(r.sel==='new'?' selected':'')+'>Create a new class</option>'+ex.map(function(c){ return '<option value="'+c.id+'"'+(r.sel===c.id?' selected':'')+'>Update “'+esc(c.name)+'”</option>'; }).join('')+'</select>'
          +line(r)+'</div>';
      }).join('')+'</div>'
      +(cfg0?'<label class="swrow cvauto"><span>Keep these up to date<small style="display:block;font-weight:500;font-size:12.5px;color:var(--mut);margin-top:2px">New grades and assignments fill in on their own when you open Tally.</small></span><input type="checkbox" class="swi" data-cv="auto"'+(autoOn?' checked':'')+'><i></i></label>':'')
      +'<div class="cva"><button type="button" class="wbtn ghost" data-cv="x">Cancel</button><button type="button" class="wbtn" data-cv="go"'+(n?'':' disabled')+'>Import '+n+' class'+(n===1?'':'es')+'</button></div></div>';
  }
  function close(){ ov.classList.remove('open'); document.removeEventListener('keydown',kd,true); rel(); setTimeout(function(){ ov.remove(); },260); }
  const kd=function(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } };
  document.addEventListener('keydown',kd,true);
  ov.addEventListener('change',function(e){ const t=e.target; if(t.dataset.cv==='auto'){ autoOn=t.checked; return; } const r=rows[+t.dataset.i]; if(!r) return; if(t.dataset.cv==='on') r.on=t.checked; else if(t.dataset.cv==='sel') r.sel=t.value; draw(); });
  ov.addEventListener('click',function(e){
    if(e.target===ov){ close(); return; }
    const b=e.target.closest('[data-cv]'); if(!b||b.tagName==='INPUT'||b.tagName==='SELECT') return;
    if(b.dataset.cv==='x') close();
    else if(b.dataset.cv==='go'){ const c=cvCfg(); if(c){ c.auto=autoOn; c.last=Date.now(); cvSave(c); } canvasApply(rows.filter(function(r){ return r.on; }),host); close(); }
  });
  document.body.appendChild(ov); draw(); requestAnimationFrame(function(){ ov.classList.add('open'); });
}

function canvasApply(rows,host){
  const sn=JSON.stringify(W), v0=view; let made=0, linked=0, scores=0;
  rows.forEach(function(r){
    let c=r.sel==='new'?null:S.courses.find(function(x){ return x.id===r.sel; });
    const isNew=!c;
    if(!c) c=normCourse({name:r.pc.name,code:r.pc.code,prof:r.pc.prof,credits:null,scale:'std',cats:[]});
    const st=canvasMerge(c,r.pc,host);
    if(isNew){ c.color=nextColor(); S.courses.push(c); syncColors(); made++; } else linked++;
    scores+=st.scores;
  });
  view='home'; editing=false; save(); setHash(); render(); window.scrollTo(0,0);
  const msg=(made?made+' new class'+(made===1?'':'es'):'')+(made&&linked?' + ':'')+(linked?linked+' updated':'');
  showUndo('Imported from Canvas: '+msg+(scores?' · '+scores+' grade'+(scores===1?'':'s')+' filled in':''),sn,v0);
}

/* ---------- staying up to date ---------- */
let cvBusy=false;
function cvToast(msg,label,fn){
  let el=document.getElementById('undoBar'); if(el) el.remove();
  el=document.createElement('div'); el.id='undoBar'; el.className='undobar'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite');
  el.innerHTML='<span>'+esc(msg)+'</span><button type="button">'+esc(label)+'</button><i class="uprog"></i>';
  document.body.appendChild(el); requestAnimationFrame(function(){ el.classList.add('in'); });
  const hide=function(){ el.classList.remove('in'); setTimeout(function(){ el.remove(); },300); };
  const t=setTimeout(hide,12000);
  el.querySelector('button').addEventListener('click',function(){ clearTimeout(t); hide(); fn(); });
}
const cvIdle=function(){ const a=document.activeElement; return !document.querySelector('.modal,.wio,.tour,.tpop,.dpop')&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
async function canvasRefresh(manual,say){
  const cfg=cvCfg(); if(!cfg||cvBusy) return;
  if(!manual&&Date.now()-(cfg.last||0)<10*60*1000) return;
  if(!manual&&!cvIdle()){ setTimeout(function(){ canvasRefresh(false); },60000); return; }
  cvBusy=true;
  try{
    const raw=await canvasCollect(window.fetch.bind(window),cfg.origin,null,cfg.token), p=canvasClean(raw);
    cfg.last=Date.now(); cvSave(cfg);
    if(!p){ if(say) say('No active classes found in Canvas.'); return; }
    const plan=canvasSync(W.sems,p,true), t=plan.totals, any=t.items+t.scores+t.upd+t.cats;
    if(cfg.auto||manual&&any){
      if(any){
        const sn=JSON.stringify(W), v0=view; canvasSync(W.sems,p,false); save(); render(true);
        const bits=[]; if(t.scores) bits.push(t.scores+' new grade'+(t.scores===1?'':'s')); if(t.items) bits.push(t.items+' new assignment'+(t.items===1?'':'s')); if(t.upd) bits.push(t.upd+' updated'); if(t.cats) bits.push(t.cats+' new section'+(t.cats===1?'':'s'));
        showUndo('Canvas updated: '+bits.join(' · '),sn,v0);
      }
      if(plan.fresh.length) cvToast(plan.fresh.length+' new class'+(plan.fresh.length===1?'':'es')+' in Canvas','Review',function(){ canvasReview({v:1,host:p.host,courses:plan.fresh}); });
      else if(say) say(any?'Updated.':'Everything is already up to date.',true);
    }else if(any||plan.fresh.length){
      cvToast('Canvas has '+(t.scores?t.scores+' new grade'+(t.scores===1?'':'s'):any+' update'+(any===1?'':'s'))+(plan.fresh.length?' and '+plan.fresh.length+' new class'+(plan.fresh.length===1?'':'es'):''),'Review',function(){ canvasReview(p); });
    }else if(say) say('Everything is already up to date.',true);
  }catch(e){ if(say) say(canvasExplain(e)); else if(e&&(e.status===401||e.status===403)) cvToast('Canvas stopped accepting your token','Reconnect',function(){ setupOpen('canvas'); }); }
  finally{ cvBusy=false; }
}
document.addEventListener('visibilitychange',function(){ if(!document.hidden&&cvCfg()) canvasRefresh(false); });
