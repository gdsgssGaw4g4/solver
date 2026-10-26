'use strict';
const fs=require('fs'), https=require('https'), {spawn}=require('child_process');
const L=(s)=>{const line=new Date().toISOString().slice(11,19)+' '+s; try{console.log(line);}catch(e){} try{fs.appendFileSync('step.log',line+'\n');}catch(e){}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function doh(host,type){return new Promise(res=>{ const req=https.get({host:'1.1.1.1',port:443,path:'/dns-query?name='+encodeURIComponent(host)+'&type='+type,headers:{accept:'application/dns-json'},servername:'cloudflare-dns.com'},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{const j=JSON.parse(b);const want=type==='AAAA'?28:1;const a=(j.Answer||[]).filter(x=>x.type===want);res(a[0]?a[0].data:null);}catch(e){res(null);}});}); req.setTimeout(4000,()=>{req.destroy();res(null);}); req.on('error',()=>res(null)); });}
async function clickWidget(page){ for(const f of page.frames()){ if(/challenges\.cloudflare/.test(f.url())){ try{ const fe=await f.frameElement(); if(fe){ const b=await fe.boundingBox(); if(b&&b.width>4){ await page.mouse.click(b.x+35,b.y+b.height/2); await sleep(300); await page.mouse.click(b.x+b.width/2,b.y+b.height/2); return JSON.stringify(b); } } }catch(e){} } } return null; }
(async()=>{
  L('solve v4 (spawn+attach)');
  const puppeteer=require('puppeteer-core');
  const EXES=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'];
  const exe=EXES.find(p=>fs.existsSync(p));
  if(!exe){L('no chrome');process.exit(1);}
  const control=(await doh('challenges.cloudflare.com','A'))||'104.18.94.41';
  const child=spawn(exe,['--user-data-dir=./chrome-solve-prof','--remote-debugging-port=9333','--no-first-run','--no-default-browser-check','--window-size=1280,900','--host-resolver-rules=MAP brunhild.challenges.cloudflare.com '+control,'https://velor.win/'],{detached:true,stdio:'ignore'});
  child.unref();
  await sleep(6000);
  let b=null;
  for(let k=0;k<20&&!b;k++){ try{ b=await puppeteer.connect({browserURL:'http://127.0.0.1:9333'}); }catch(e){ await sleep(1000); } }
  if(!b){ L('attach failed'); process.exit(1); }
  L('attached to spawned chrome');
  const p=(await b.pages()).find(x=>x.url().includes('velor.win'))||(await b.pages())[0];
  let cleared=false,title='';
  for(let i=0;i<150;i++){
    await sleep(1000);
    try{ title=await p.title(); }catch(e){}
    if(i%10===0)L('tick '+i+' \"'+title+'\"');
    if(i>=3 && i%3===0){ const r=await clickWidget(p); if(r&&i<30)L('CLICK@'+i+' '+r); }
    if(i===60||i===120){ await p.reload({waitUntil:'domcontentloaded'}).catch(()=>{}); L('reload@'+i); }
    if(title&&!/Just a moment|Attention Required/i.test(title)){ cleared=true; L('CLEARED('+i+'): '+title); break; }
  }
  const cookies=await p.cookies(); const cf=cookies.find(c=>c.name==='cf_clearance');
  const ua=await p.evaluate(()=>navigator.userAgent).catch(()=>'');
  if(cf){ fs.writeFileSync('cf_cookie.txt','cf_clearance='+cf.value); fs.writeFileSync('cf_ua.txt',ua); L('COOKIE SAVED len='+cf.value.length); } else L('no cookie');
  try{b.disconnect();}catch(e){}
  L('done'); process.exit(0);
})();