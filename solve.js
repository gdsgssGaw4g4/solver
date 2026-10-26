'use strict';
const fs=require('fs'), https=require('https');
const L=(s)=>{const line=new Date().toISOString().slice(11,19)+' '+s; try{console.log(line);}catch(e){} try{fs.appendFileSync('step.log',line+'\n');}catch(e){}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function doh(host,type){return new Promise(res=>{
  const req=https.get({host:'1.1.1.1',port:443,path:'/dns-query?name='+encodeURIComponent(host)+'&type='+type,headers:{accept:'application/dns-json'},servername:'cloudflare-dns.com'},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{const j=JSON.parse(b);const want=type==='AAAA'?28:1;const a=(j.Answer||[]).filter(x=>x.type===want);res(a[0]?a[0].data:null);}catch(e){res(null);}});});
  req.setTimeout(4000,()=>{req.destroy();res(null);}); req.on('error',()=>res(null));
});}
async function clickWidget(page){
  for(const f of page.frames()){
    if(/challenges\.cloudflare/.test(f.url())){
      try{ const fe=await f.frameElement(); if(fe){ const b=await fe.boundingBox(); if(b&&b.width>4){ await page.mouse.click(b.x+35, b.y+b.height/2); await sleep(300); await page.mouse.click(b.x+b.width/2, b.y+b.height/2); return JSON.stringify(b); } } }catch(e){}
    }
  }
  return null;
}
(async()=>{
  L('solve v2 (frame-coord clicks)');
  const puppeteer=require('puppeteer-core');
  const EXES=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'];
  const exe=EXES.find(p=>fs.existsSync(p));
  if(!exe){L('no chrome');process.exit(1);} L('chrome '+exe);
  const control=(await doh('challenges.cloudflare.com','A'))||'104.18.94.41';
  const headed=!!process.env.DISPLAY;
  const args=['--no-sandbox','--disable-dev-shm-usage','--window-size=1280,900','--host-resolver-rules=MAP brunhild.challenges.cloudflare.com '+control];
  const browser=await puppeteer.launch({executablePath:exe,headless:!headed,args});
  L('launched headed='+headed);
  const page=await browser.newPage();
  await page.goto('https://velor.win/',{waitUntil:'domcontentloaded',timeout:40000}).catch(e=>L('goto err'));
  let cleared=false,title='';
  for(let i=0;i<150;i++){
    await sleep(1000);
    try{title=await page.title();}catch(e){}
    if(i%15===0)L('tick '+i+' \"'+title+'\"');
    if(i>=3 && i%3===0){ const r=await clickWidget(page); if(r)L('CLICK@'+i+' '+r); }
    if(i===45||i===90||i===135){ await page.reload({waitUntil:'domcontentloaded'}).catch(()=>{}); L('reload@'+i+'s'); }
    if(title&&!/Just a moment|Attention Required/i.test(title)){ cleared=true; L('CLEARED('+i+'s): '+title); break; }
  }
  const cookies=await page.cookies(); const cf=cookies.find(c=>c.name==='cf_clearance');
  const ua=await page.evaluate(()=>navigator.userAgent).catch(()=>'');
  if(cf){ fs.writeFileSync('cf_cookie.txt','cf_clearance='+cf.value); fs.writeFileSync('cf_ua.txt',ua); L('COOKIE SAVED len='+cf.value.length); } else L('no cookie');
  await browser.close(); L('done'); process.exit(0);
})();