"use strict";
/* Generated from js/canvas.js by tools/build-extension.js. Do not edit by hand. */
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
