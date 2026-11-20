"use strict";
/* Runs on the Tally page only. Hands the latest Canvas reading to Tally. */
(function(){
  var V=1;
  function send(){
    try{
      chrome.storage.local.get(['latest'],function(r){
        if(r&&r.latest) window.postMessage({tallyExt:'canvas',id:r.latest.id,at:r.latest.at,host:r.latest.host,payload:r.latest.payload},location.origin);
      });
    }catch(e){}
  }
  window.addEventListener('message',function(e){
    if(e.source!==window||!e.data||typeof e.data!=='object') return;
    if(e.data.tallyExt==='ping'){ window.postMessage({tallyExt:'pong',v:V},location.origin); send(); }
  });
  try{ chrome.storage.onChanged.addListener(function(ch,area){ if(area==='local'&&ch.latest) send(); }); }catch(e){}
})();
