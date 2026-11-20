"use strict";
/* ---------- Canvas import: reader + smart merge (no screen code here) ---------- */

/* Reads the student's own Canvas. The browser extension runs this inside their signed-in
   Canvas tab, so the requests carry their normal session and never leave their computer.
   (Pass a token as the fourth argument to use an access token instead.) */
async function canvasCollect(f,origin,prog,token){
  const H=token?{headers:{Accept:'application/json+canvas-string-ids',Authorization:'Bearer '+token}}:{credentials:'same-origin',headers:{Accept:'application/json+canvas-string-ids'}};
  const pad=function(n){ return (n<10?'0':'')+n; };
  const J=async function(url){
    const r=await f(url,H); if(!r.ok){ const er=new Error('Canvas answered '+r.status); er.status=r.status; throw er; }
    const t=await r.text(); const d=JSON.parse(t.replace(/^while\(1\);/,''));
    const l=r.headers&&r.headers.get&&r.headers.get('Link'); const m=l&&l.match(/<([^>]+)>;\s*rel="next"/);
    return {d:d,next:m?m[1]:null};
  };
  const ALL=async function(u){
    let out=[],n=u,g=0;
    while(n&&g<30){ g++; const x=await J(n.charAt(0)==='/'?origin+n:n); out=out.concat(Array.isArray(x.d)?x.d:[x.d]); n=x.next; }
    return out;
  };
  const cs=await ALL('/api/v1/courses?enrollment_state=active&include[]=term&include[]=teachers&include[]=total_scores&per_page=100');
  const out=[], skipped=[];
  for(let i=0;i<cs.length;i++){
    const c=cs[i]; if(!c||!c.id||!c.name||c.access_restricted_by_date) continue;
    if(prog) prog(c.name,i,cs.length);
    let gs=[];
    try{ gs=await ALL('/api/v1/courses/'+c.id+'/assignment_groups?include[]=assignments&include[]=submission&per_page=100'); }catch(e){ skipped.push((e&&e.status)||0); continue; }
    const dg={a:0,sub:0,scored:0,noPts:0,hidden:0,ex:0};
    gs.forEach(function(g){ (g.assignments||[]).forEach(function(a){ dg.a++; if(a.submission) dg.sub++; if(a.submission&&a.submission.score!=null) dg.scored++; if(!(a.points_possible>0)) dg.noPts++; if(a.published===false) dg.hidden++; if((a.submission&&a.submission.excused)||a.omit_from_final_grade) dg.ex++; }); });
    const en=(c.enrollments||[]).filter(function(x){ return x&&x.type==='student'; })[0]||(c.enrollments||[])[0]||{};
    out.push({
      id:String(c.id), name:String(c.name), code:String(c.course_code||''), term:String((c.term&&c.term.name)||''),
      prof:String((c.teachers&&c.teachers[0]&&c.teachers[0].display_name)||''),
      weighted:!!c.apply_assignment_group_weights, dg:dg, ng:gs.length,
      cs:(typeof en.computed_current_score==='number')?en.computed_current_score:null, cg:en.computed_current_grade||null,
      groups:gs.map(function(g){
        return {
          id:String(g.id), name:String(g.name||'Assignments'), w:+g.group_weight||0,
          drop:(g.rules&&+g.rules.drop_lowest)||0, dropHi:(g.rules&&+g.rules.drop_highest)||0,
          items:(g.assignments||[]).map(function(a){
            const s=a.submission||{}; let d=null;
            if(a.due_at){ const dt=new Date(a.due_at); if(!isNaN(dt)) d=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate()); }
            return {
              id:String(a.id), n:String(a.name||'Assignment'), p:(a.points_possible==null?null:+a.points_possible), d:d,
              e:(s.score==null||s.excused)?null:+s.score,
              x:!!(s.excused||a.omit_from_final_grade||a.grading_type==='not_graded'), pub:a.published!==false
            };
          })
        };
      })
    });
  }
  return {v:1,src:'canvas',host:String(origin).replace(/^https?:\/\//,''),at:Date.now(),courses:out,skipped:skipped,total:cs.length};
}

/* ---------- checking what arrives (treat it as untrusted) ---------- */
function canvasClean(p){
  if(!p||typeof p!=='object'||p.v!==1||!Array.isArray(p.courses)) return null;
  const S_=function(x,n){ return String(x==null?'':x).slice(0,n||200); };
  const N_=function(x){ if(x==null||x==='') return null; const v=+x; return isFinite(v)?v:null; };
  const out={v:1,host:S_(p.host,120),courses:[]};
  p.courses.slice(0,40).forEach(function(c){
    if(!c||!c.id||!c.name) return;
    const pc={id:S_(c.id,40),name:S_(c.name,160),code:S_(c.code,60),term:S_(c.term,80),prof:S_(c.prof,100),weighted:!!c.weighted,cs:N_(c.cs),cg:c.cg?S_(c.cg,8):null,groups:[]};
    (Array.isArray(c.groups)?c.groups:[]).slice(0,60).forEach(function(g){
      if(!g||!g.id) return;
      const pg={id:S_(g.id,40),name:S_(g.name||'Assignments',100),w:Math.max(0,Math.min(100,N_(g.w)||0)),drop:Math.max(0,Math.floor(N_(g.drop)||0)),dropHi:Math.max(0,Math.floor(N_(g.dropHi)||0)),items:[]};
      (Array.isArray(g.items)?g.items:[]).slice(0,400).forEach(function(a){
        if(!a||!a.id) return;
        const d=/^\d{4}-\d{2}-\d{2}$/.test(String(a.d||''))?String(a.d):null;
        pg.items.push({id:S_(a.id,40),n:S_(a.n||'Assignment',160),p:N_(a.p),d:d,e:a.e==null?null:N_(a.e),x:!!a.x,pub:a.pub!==false});
      });
      pc.groups.push(pg);
    });
    out.courses.push(pc);
  });
  return out.courses.length?out:null;
}

/* ---------- smart merge ---------- */
const cvKey=function(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); };
const cvUsable=function(a){ return !a.x&&a.pub&&a.p>0; };

const CV_STOP=new Set(['fall','spring','summer','winter','term','semester','section','sec','the','and','of','for','to','in','a','an','i','ii','iii','lec','lecture','rec','recitation','course','class']);
function cvTokens(s){
  return String(s||'').toLowerCase().replace(/\([^)]*\)/g,' ').split(/[^a-z0-9]+/).filter(function(w){ return w&&!CV_STOP.has(w)&&!/^(19|20)\d\d$/.test(w)&&!(w.length===1); });
}
/* How well does an existing class match a Canvas course? 0 to 1. */
function cvScore(c,pc){
  const code=cvKey(c.code), blob=cvKey(pc.name+' '+pc.code);
  if(code&&code.length>=4&&/[0-9]/.test(code)&&blob.indexOf(code)>=0) return 1;
  const a=cvTokens(c.name), b=cvTokens(pc.name);
  if(!a.length||!b.length) return 0;
  const sa=new Set(a), sb=new Set(b); let inter=0; sa.forEach(function(w){ if(sb.has(w)) inter++; });
  const uni=sa.size+sb.size-inter, jac=inter/uni;
  const sub=(inter===sa.size||inter===sb.size)&&Array.from(sa).some(function(w){ return sb.has(w)&&w.length>=5; });
  return Math.max(jac,sub?0.7:0);
}
/* Best existing class for a Canvas course. `used` keeps two Canvas courses from taking the same class. */
function canvasSuggest(courses,pc,host,used){
  const exact=courses.find(function(c){ return c.cv&&c.cv.id===pc.id&&(!c.cv.h||c.cv.h===host); });
  if(exact){ if(used) used.add(exact.id); return exact.id; }
  let best=null,bs=0.6;
  courses.forEach(function(c){
    if(c.cv||(used&&used.has(c.id))) return;
    const s=cvScore(c,pc); if(s>bs){ best=c; bs=s; }
  });
  if(best&&used) used.add(best.id);
  return best?best.id:null;
}

function canvasMerge(c,pc,host){
  const st={cats:0,items:0,scores:0,upd:0,gone:0,fresh:!c.cv};
  const first=!c.cv;
  c.cv={h:host,id:pc.id};
  const weighted=pc.weighted&&pc.groups.some(function(g){ return g.w>0; });
  if(first){ c.pooled=!weighted; if(!c.name||c.name==='Untitled class') c.name=pc.name; if(!c.code&&pc.code) c.code=pc.code; if(!c.prof&&pc.prof) c.prof=pc.prof; }
  const seen=new Set();
  pc.groups.forEach(function(g){
    const usable=g.items.filter(cvUsable);
    let k=c.cats.find(function(x){ return x.cid===g.id; });
    if(!k) k=c.cats.find(function(x){ return !x.cid&&cvKey(x.name)===cvKey(g.name); });
    if(!k){
      if(!usable.length) return;
      k={name:g.name,w:weighted?g.w:0,rule:'sum',items:[],drop:g.drop,dropHi:g.dropHi,bonus:0,cid:g.id,cw:g.w,cdrop:g.drop,cdrophi:g.dropHi};
      c.cats.push(k); st.cats++;
    }else{
      k.cid=g.id;
      if(weighted&&(k.cw===undefined||k.w===k.cw)) k.w=g.w;
      if((k.cdrop===undefined&&!k.drop)||(k.drop||0)===(k.cdrop||0)) k.drop=g.drop;
      if((k.cdrophi===undefined&&!k.dropHi)||(k.dropHi||0)===(k.cdrophi||0)) k.dropHi=g.dropHi;
      k.cw=g.w; k.cdrop=g.drop; k.cdrophi=g.dropHi;
    }
    usable.forEach(function(a){
      seen.add(a.id);
      let at=null;
      c.cats.forEach(function(kk){ kk.items.forEach(function(it,i){ if(!at&&it.cid===a.id) at={k:kk,i:i,it:it}; }); });
      if(!at){ const j=k.items.findIndex(function(it){ return !it.cid&&cvKey(it.n)===cvKey(a.n); }); if(j>=0) at={k:k,i:j,it:k.items[j]}; }
      if(!at){
        k.items.push(normItem({n:a.n,p:a.p,e:a.e,w:null,d:a.d,cid:a.id,cn:a.n,cs:a.e}));
        st.items++; if(a.e!=null) st.scores++;
        return;
      }
      const it=at.it;
      if(at.k!==k){ at.k.items.splice(at.i,1); k.items.push(it); st.upd++; }
      if(it.n===it.cn||it.cn===undefined) it.n=a.n;
      it.cn=a.n; it.cid=a.id;
      if(it.p!==a.p){ it.p=a.p; st.upd++; }
      if(a.d&&it.d!==a.d) it.d=a.d;
      if(a.e!=null){
        if(it.e!==a.e){ if(it.e==null) st.scores++; else st.upd++; it.e=a.e; }
        it.cs=a.e;
      }else if(it.cs!=null){ it.e=null; it.cs=null; st.upd++; }
    });
  });
  c.cats.forEach(function(k){ k.items.forEach(function(it){ if(it.cid&&!seen.has(it.cid)) st.gone++; }); });
  if(!c.cats.length) c.cats.push({name:'Assignments',w:weighted?100:0,rule:'sum',items:[]});
  return st;
}

/* Preview what would happen for one Canvas course against an optional existing class. */
function canvasPreview(existing,pc,host){
  const draft=existing?JSON.parse(JSON.stringify(existing)):normCourse({name:pc.name,code:pc.code,prof:pc.prof,credits:null,scale:'std',cats:[]});
  const st=canvasMerge(draft,pc,host); st.sections=pc.groups.filter(function(g){ return g.items.some(cvUsable); }).length;
  st.assignments=pc.groups.reduce(function(a,g){ return a+g.items.filter(cvUsable).length; },0);
  st.graded=pc.groups.reduce(function(a,g){ return a+g.items.filter(function(x){ return cvUsable(x)&&x.e!=null; }).length; },0);
  return st;
}

/* Find an already-linked class anywhere in the saved data. */
function canvasFindLinked(sems,pc,host){
  for(let i=0;i<sems.length;i++){ const c=sems[i].courses.find(function(x){ return x.cv&&x.cv.id===pc.id&&(!x.cv.h||x.cv.h===host); }); if(c) return c; }
  return null;
}
/* Apply a fresh Canvas reading to classes that are already linked. New Canvas classes are returned, not added. */
function canvasSync(sems,payload,dry){
  const host=payload.host, out={linked:[],fresh:[],totals:{items:0,scores:0,upd:0,cats:0}};
  payload.courses.forEach(function(pc){
    const c=canvasFindLinked(sems,pc,host);
    if(!c){ out.fresh.push(pc); return; }
    const target=dry?JSON.parse(JSON.stringify(c)):c;
    const st=canvasMerge(target,pc,host);
    out.linked.push({course:c,stats:st});
    ['items','scores','upd','cats'].forEach(function(k){ out.totals[k]+=st[k]; });
  });
  return out;
}
