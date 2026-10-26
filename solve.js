'use strict';
const fs=require('fs'), https=require('https');
const L=(s)=>{const line=new Date().toISOString().slice(11,19)+' '+s; try{console.log(line);}catch(e){} try{fs.appendFileSync('step.log',line+'\n');}catch(e){}};
process.on('uncaughtException',e=>L('UNCAUGHT '+e.message));
function doh(host,type){return new Promise(res=>{
  const req=https.get({host:'1.1.1.1',port:443,path:'/dns-query?name='+encodeURIComponent(host)+'&type='+type,headers:{accept:'application/dns-json'},servername:'cloudflare-dns.com'},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{const j=JSON.parse(b);const want=type==='AAAA'?28:1;const a=(j.Answer||[]).filter(x=>x.type===want);res(a[0]?a[0].data:null);}catch(e){res(null);}});});
  req.setTimeout(4000,()=>{req.destroy();res(null);}); req.on('error',()=>res(null));
});}
async function pierceClick(page){ return await page.evaluate(()=>{ let hits=0; function walk(root){ for(const el of root.querySelectorAll('*')){ if(el.shadowRoot) walk(el.shadowRoot); if(el.tagName==='INPUT'||String(el.className).match&&/cb-lb|checkbox|mark/.test(String(el.className))){ try{ el.click(); hits++; }catch(e){} } } } walk(document); return hits; }).catch(()=>0); }
(async()=>{
  L('start');
  const puppeteer=require('puppeteer-core');
  const EXES=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'];
  const exe=EXES.find(p=>fs.existsSync(p));
  if(!exe){L('no chrome');process.exit(1);} L('chrome: '+exe);
  const control=(await doh('challenges.cloudflare.com','A'))||'104.18.94.41';
  const headed=!!process.env.DISPLAY;
  const args=['--no-sandbox','--disable-dev-shm-usage','--window-size=1280,900','--host-resolver-rules=MAP brunhild.challenges.cloudflare.com '+control];
  const browser=await puppeteer.launch({executablePath:exe,headless:!headed,args});
  L('launched headed='+headed);
  const page=await browser.newPage();
  page.on('requestfailed',r=>L('REQFAIL '+(r.failure()&&r.failure().errorText)+' '+r.url().slice(0,60)));
  await page.goto('https://velor.win/',{waitUntil:'domcontentloaded',timeout:40000}).catch(e=>L('goto err '+e.message));
  L('goto done');
  let cleared=false,title='';
  for(let i=0;i<180;i++){
    await new Promise(r=>setTimeout(r,1000));
    try{title=await page.title();}catch(e){}
    if(i%15===0)L('tick '+i+' "'+title+'"');
    if(i>=4 && i%8===4){ const n=await pierceClick(page); if(n) L('clicked '+n); }
    if(title&&!/Just a moment|Attention Required/i.test(title)){cleared=true;break;}
  }
  L('cleared='+cleared+' title="'+title+'"');
  const cookies=await page.cookies(); const cf=cookies.find(c=>c.name==='cf_clearance');
  if(cf){ const ua=await page.evaluate(()=>navigator.userAgent); fs.writeFileSync('cf_cookie.txt','cf_clearance='+cf.value); fs.writeFileSync('cf_ua.txt',ua); L('COOKIE SAVED len='+cf.value.length); }
  await browser.close(); L('done'); process.exit(0);
})();