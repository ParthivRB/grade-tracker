"use strict";
/* ---------- Canvas import: screens ---------- */
function tallyUrl(){ return location.origin+location.pathname; }

function canvasStepHtml(){
  return '<span class="tk">Step 3 · Canvas</span><h2>Connect your Canvas.</h2>'
    +'<p class="slead">Tally reads your classes, sections, weights and grades from your own signed-in Canvas page. No password, no token, and nothing leaves your browser.</p>'
    +'<ol class="ssteps">'
    +'<li><span class="sn">1</span><div><b>Add the Tally bookmark</b><small>Drag this button up into your bookmarks bar.</small></div><a class="cvmark" id="cvMark" draggable="true" href="#" title="Drag me to your bookmarks bar">⇩ Send Canvas to Tally</a></li>'
    +'<li><span class="sn">2</span><div><b>Open Canvas and sign in</b><small>Use your school’s normal Canvas page, on a computer.</small></div></li>'
    +'<li><span class="sn">3</span><div><b>Click the bookmark</b><small>Tally opens in a new tab, builds every class and section, and fills in the grades already posted.</small></div></li></ol>'
    +'<div class="cvwait"><i></i><span>Waiting for your Canvas…</span></div>'
    +'<details class="cvmore"><summary>I can’t drag it</summary><p>Show your bookmarks bar (Ctrl or ⌘ + Shift + B), then right-click it, choose Add page, name it “Send Canvas to Tally”, and paste the copied text as the address.</p><button type="button" class="btn sm" data-s="cvcopy">Copy bookmark text</button></details>';
}
function canvasStepWire(body){
  const a=body.querySelector('#cvMark'); if(!a) return;
  a.setAttribute('href',canvasBookmarklet(tallyUrl()));
  a.addEventListener('click',function(e){ e.preventDefault(); const w=body.querySelector('.cvwait span'); if(w){ w.textContent='Drag the button into your bookmarks bar, then click it while you are on Canvas.'; } });
}
function canvasCopyBookmark(btn){
  const t=canvasBookmarklet(tallyUrl()); const done=function(){ btn.textContent='Copied ✓'; setTimeout(function(){ btn.textContent='Copy bookmark text'; },2000); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done,function(){ fallbackCopy(t); done(); }); else { fallbackCopy(t); done(); }
}

/* ---------- review sheet ---------- */
function canvasReview(p){
  if(typeof tourClose==='function') tourClose(true);
  const old=document.getElementById('cvOv'); if(old) old.remove();
  const host=p.host||'Canvas';
  const rows=p.courses.map(function(pc,i){
    const sug=canvasSuggest(S.courses,pc,host);
    return {pc:pc,sel:sug||'new',on:true,i:i};
  });
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
  function draw(){
    const n=rows.filter(function(r){ return r.on; }).length;
    ov.innerHTML='<div class="cvc" role="dialog" aria-modal="true" aria-label="Import from Canvas"><div class="cvh"><div><h3>Found '+p.courses.length+' class'+(p.courses.length===1?'':'es')+' in Canvas</h3><small>Adding to <b>'+esc(S.name)+'</b>. Existing classes are matched and updated, never duplicated.</small></div><button type="button" class="rgx" data-cv="x" aria-label="Close">×</button></div>'
      +'<div class="cvlist">'+rows.map(function(r){
        const ex=S.courses.filter(function(c){ return !c.cv||c.id===r.sel||(c.cv&&c.cv.id===r.pc.id); });
        return '<div class="cvr'+(r.on?'':' off')+'" style="--d:'+(r.i*50)+'ms"><label class="cvt"><input type="checkbox" class="swi" data-cv="on" data-i="'+r.i+'"'+(r.on?' checked':'')+'><i></i><span><b>'+esc(r.pc.name)+'</b><small>'+esc(r.pc.code)+(r.pc.term?' · '+esc(r.pc.term):'')+(r.pc.cs!=null?' · Canvas shows '+trim(String(Math.round(r.pc.cs*100)/100))+'%'+(r.pc.cg?' ('+esc(r.pc.cg)+')':''):'')+'</small></span></label>'
          +'<select data-cv="sel" data-i="'+r.i+'" aria-label="Where to put '+esc(r.pc.name)+'"><option value="new"'+(r.sel==='new'?' selected':'')+'>Create a new class</option>'+ex.map(function(c){ return '<option value="'+c.id+'"'+(r.sel===c.id?' selected':'')+'>Update “'+esc(c.name)+'”</option>'; }).join('')+'</select>'
          +line(r)+'</div>';
      }).join('')+'</div>'
      +'<div class="cva"><button type="button" class="wbtn ghost" data-cv="x">Cancel</button><button type="button" class="wbtn" data-cv="go"'+(n?'':' disabled')+'>Import '+n+' class'+(n===1?'':'es')+'</button></div></div>';
  }
  function close(){ ov.classList.remove('open'); document.removeEventListener('keydown',kd,true); rel(); setTimeout(function(){ ov.remove(); },260); }
  const kd=function(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } };
  document.addEventListener('keydown',kd,true);
  ov.addEventListener('change',function(e){ const t=e.target, r=rows[+t.dataset.i]; if(!r) return; if(t.dataset.cv==='on') r.on=t.checked; else if(t.dataset.cv==='sel') r.sel=t.value; draw(); });
  ov.addEventListener('click',function(e){
    if(e.target===ov){ close(); return; }
    const b=e.target.closest('[data-cv]'); if(!b||b.tagName==='INPUT'||b.tagName==='SELECT') return;
    if(b.dataset.cv==='x') close();
    else if(b.dataset.cv==='go'){ canvasApply(rows.filter(function(r){ return r.on; }),host); close(); }
  });
  document.body.appendChild(ov); draw(); requestAnimationFrame(function(){ ov.classList.add('open'); });
}

function canvasApply(rows,host){
  const sn=JSON.stringify(W), v0=view; let made=0, linked=0, items=0, scores=0;
  rows.forEach(function(r){
    let c=r.sel==='new'?null:S.courses.find(function(x){ return x.id===r.sel; });
    const isNew=!c;
    if(!c){ c=normCourse({name:r.pc.name,code:r.pc.code,prof:r.pc.prof,credits:null,scale:'std',cats:[]}); }
    const st=canvasMerge(c,r.pc,host);
    if(isNew){ c.color=nextColor(); S.courses.push(c); syncColors(); made++; } else linked++;
    items+=st.items; scores+=st.scores;
  });
  view='home'; editing=false; save(); setHash(); render(); window.scrollTo(0,0);
  const msg=(made?made+' new class'+(made===1?'':'es'):'')+(made&&linked?' + ':'')+(linked?linked+' updated':'');
  showUndo('Imported from Canvas: '+msg+(scores?' · '+scores+' grade'+(scores===1?'':'s')+' filled in':''),sn,v0);
}

/* ---------- receiving data from the bookmark ---------- */
let cvWaitEl=null, cvWaitT=null;
function cvWaiting(on,text){
  if(cvWaitEl){ cvWaitEl.remove(); cvWaitEl=null; } clearInterval(cvWaitT);
  if(!on) return;
  const el=document.createElement('div'); el.className='cvwaiting'; el.setAttribute('role','status'); el.innerHTML='<i></i><span>'+esc(text||'Reading your Canvas…')+'</span>';
  document.body.appendChild(el); cvWaitEl=el; requestAnimationFrame(function(){ el.classList.add('in'); });
}
(function(){
  let got=false, poll=null;
  function stop(){ clearInterval(poll); cvWaiting(false); }
  window.addEventListener('message',function(e){
    const d=e.data; if(!d||typeof d!=='object') return;
    if(window.opener&&e.source!==window.opener) return;
    if(d.tallyCanvasError){ got=true; stop(); setStat('Canvas: '+String(d.tallyCanvasError).slice(0,140),'warn'); return; }
    if(!d.tallyCanvas) return;
    got=true; stop();
    const p=canvasClean(d.tallyCanvas);
    if(!p){ setStat('Tally could not read that Canvas data','warn'); return; }
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(x){}
    canvasReview(p);
  });
  if(location.hash==='#canvas'&&window.opener){
    cvWaiting(true,'Reading your Canvas… keep that tab open');
    const t0=Date.now();
    poll=setInterval(function(){ if(got||Date.now()-t0>90000){ stop(); return; } try{ window.opener.postMessage({tallyReady:1},'*'); }catch(x){} },400);
  }
})();
