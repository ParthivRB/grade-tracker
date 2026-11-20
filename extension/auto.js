"use strict";
/* Injected on Canvas sites you have connected. When you visit Canvas, it quietly refreshes
   your grades (at most every 20 minutes) and passes them to the background worker. */
(function(){
  if(window!==window.top) return;
  var KEY='site:'+location.host, GAP=20*60*1000;
  setTimeout(async function(){
    try{
      var st=(await chrome.storage.local.get(KEY))[KEY]||{};
      if(Date.now()-(st.last||0)<GAP) return;
      st.origin=location.origin; st.host=location.host; st.last=Date.now();
      var o={}; o[KEY]=st; await chrome.storage.local.set(o);
      var tell=function(o){ try{ chrome.runtime.sendMessage(Object.assign({type:'prog',host:location.host},o)); }catch(e){} };
      tell({state:'start'});
      var p;
      try{ p=await canvasCollect(window.fetch.bind(window),location.origin,function(name,i,n){ tell({state:'run',i:i,n:n,name:name}); }); }
      catch(e){ tell({state:'fail'}); return; }
      if(p&&p.courses&&p.courses.length) chrome.runtime.sendMessage({type:'data',payload:p,origin:location.origin,name:st.name||''});
    }catch(e){}
  },2500);
})();
