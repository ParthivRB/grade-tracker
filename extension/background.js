"use strict";
/* Tally for Canvas: background worker. Stores what the Canvas tabs read and keeps the
   latest reading ready for the Tally page. Nothing is sent to any server. */
chrome.runtime.onMessage.addListener(function(msg,sender,reply){
  if(!msg||typeof msg!=='object') return;
  if(msg.type==='data'&&msg.payload&&msg.origin){
    let host=''; try{ host=new URL(msg.origin).host; }catch(e){ reply({ok:false}); return; }
    const now=Date.now(), id=now.toString(36)+Math.random().toString(36).slice(2,8);
    const sites={}; sites['site:'+host]={origin:msg.origin,host:host,last:now,name:msg.name||''};
    chrome.storage.local.set(Object.assign(sites,{latest:{id:id,at:now,host:host,payload:msg.payload}}),function(){ reply({ok:true,id:id}); });
    return true;
  }
});
