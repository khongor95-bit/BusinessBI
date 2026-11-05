/* ============================================================
   shell.js — other-levels загварын нийтлэг бүрхүүлийн JS (site.js-тэй хуудас бүр)
   ------------------------------------------------------------
   topbar · толгой гүйлгээ (92→84, доош гүйлгэхэд нуугдана) · хуудас шилжилт ·
   мэдээллийн popup (20с, 7 хоног) · баруун bar · чат товч · Хэрэгслүүд mega menu
   ============================================================ */
(function(){
"use strict";
if(window.__bbiShell) return; window.__bbiShell=1;
const B=document.body;
if(!B.classList.contains('ol')) B.classList.add('ol');
const TOPBAR="<div class=\"bbi-topbar\"><ul class=\"tb-soc\"><li><a href=\"mailto:hello@businessbi.mn\" aria-label=\"И-мэйл\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-10 6L2 7\"/></svg></a></li><li><a href=\"tel:+97699112233\" aria-label=\"Утас\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z\"/></svg></a></li><li><a href=\"contact.html\" aria-label=\"Холбоо барих\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/></svg></a></li></ul><a href=\"ndsh_hhoat_converter.html\">ШИНЭ: ХХОАТ маягтын ТТД регистрээр автоматаар →</a></div>";
const PT="<div class=\"pt\" id=\"pt\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M12 3a9 9 0 1 0 9 9\"/></svg></div>";
const FLOAT="<div class=\"nl-bar\" aria-label=\"Холбоо\">\n  <ul>\n    <li><a href=\"mailto:hello@businessbi.mn\" aria-label=\"И-мэйл\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-10 6L2 7\"/></svg><span class=\"sr\" style=\"position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)\">И-мэйл</span></a></li>\n    <li><a href=\"tel:+97699112233\" aria-label=\"Утас\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z\"/></svg><span class=\"sr\" style=\"position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)\">Утас</span></a></li>\n    <li><a href=\"contact.html\" aria-label=\"Холбоо барих\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/></svg><span class=\"sr\" style=\"position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)\">Холбоо барих</span></a></li>\n  </ul>\n  <button type=\"button\" class=\"nl-bar__btn\" data-nl-open aria-controls=\"nlModal\"><span>Бүртгэл</span></button>\n</div>\n\n<a class=\"chat-fab\" href=\"contact.html\" aria-label=\"Бидэнтэй чатлах\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 4h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4l-4 3v-3H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z\"/></svg></a>\n\n<div class=\"nl-modal\" id=\"nlModal\" role=\"dialog\" aria-modal=\"false\" aria-labelledby=\"nlTitle\">\n  <div class=\"nl-overlay\" data-nl-close></div>\n  <div class=\"nl-inner\">\n    <div class=\"nl-head\"><button type=\"button\" class=\"nl-close\" data-nl-close aria-label=\"Хаах\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"><path d=\"M18 6 6 18M6 6l12 12\"/></svg></button></div>\n    <div class=\"nl-content\"><div class=\"nl-scroll\">\n      <h3 id=\"nlTitle\">BusinessBI мэдээлэлд бүртгүүлэх</h3>\n      <form class=\"nl-form\" id=\"nlForm\" novalidate>\n        <div class=\"nl-field\">\n          <input id=\"nlEmail\" type=\"email\" name=\"email\" placeholder=\"И-мэйл хаягаа оруулна уу\" autocomplete=\"email\" required>\n          <label for=\"nlEmail\">И-мэйл хаягаа оруулна уу</label>\n          <button type=\"submit\" class=\"nl-submit\" aria-label=\"Бүртгүүлэх\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14M13 6l6 6-6 6\"/></svg></button>\n        </div>\n        <p class=\"nl-msg\" id=\"nlMsg\" role=\"status\"></p>\n      </form>\n      <p class=\"nl-text\">Шинэ хэрэгсэл, татварын өөрчлөлт, зөвлөгөөг и-мэйлээр аваарай. Хүссэн үедээ цуцалж болно.</p>\n      <ul class=\"nl-soc\">\n        <li><a href=\"mailto:hello@businessbi.mn\" aria-label=\"И-мэйл\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-10 6L2 7\"/></svg></a></li>\n        <li><a href=\"tel:+97699112233\" aria-label=\"Утас\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z\"/></svg></a></li>\n        <li><a href=\"contact.html\" aria-label=\"Холбоо барих\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/></svg></a></li>\n      </ul>\n    </div></div>\n  </div>\n</div>";
function loadScript(src){ return new Promise((ok,no)=>{ if(document.querySelector('script[src="'+src+'"]')){ ok(); return; } const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
async function loadFirebase(){
  if(window.firebase && window.firebase.firestore) return;
  await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
}
function frag(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content; }
// Topbar — толгойн өмнө
if(!document.querySelector('.bbi-topbar')){
  const nav=document.querySelector('.bbi-nav'); const f=frag(TOPBAR);
  if(nav) nav.before(f); else B.insertBefore(f,B.firstChild);
}
// Хуудас шилжилтийн давхарга (HTML-д байхгүй бол — зөвхөн гарах шилжилтэд)
if(!document.getElementById('pt')){ const f=frag(PT); const el=f.firstElementChild; el.classList.add('done'); B.insertBefore(f,B.firstChild); }
// Хөвөгч элементүүд
if(!document.getElementById('nlModal') && !B.dataset.noFloat) B.appendChild(frag(FLOAT));

/* ═══ Толгой: гүйлгэхэд жижгэрч, доош гүйлгэхэд нуугдана (other-levels header-sticky) ═══ */
(function(){
  const b=document.body; let last=scrollY;
  addEventListener('scroll',()=>{
    const y=scrollY, tb=48;
    b.classList.toggle('hdr-scrolled', y>tb);
    if(y>tb+92 && y>last+2) b.classList.add('hdr-hidden');
    else if(y<last-2 || y<=tb) b.classList.remove('hdr-hidden');
    last=y;
  },{passive:true});
})();

/* ═══ Мэдээллийн popup — 20 сек дараа, 7 хоногт нэг удаа ═══ */
(function(){
  const m=document.getElementById('nlModal'); if(!m) return;
  const KEY='bbi_nl_seen', DELAY=20000, EXPIRY=7*864e5;
  const seen=()=>{ try{ return Date.now()-(+localStorage.getItem(KEY)||0) < EXPIRY; }catch(e){ return false; } };
  const mark=()=>{ try{ localStorage.setItem(KEY, Date.now()); }catch(e){} };
  function open(){ m.setAttribute('open',''); requestAnimationFrame(()=>requestAnimationFrame(()=>m.setAttribute('active',''))); mark(); }
  function close(){ m.removeAttribute('active'); setTimeout(()=>{ if(!m.hasAttribute('active')) m.removeAttribute('open'); },800); }
  if(!seen()) setTimeout(()=>{ if(!seen()) open(); }, DELAY);
  document.querySelectorAll('[data-nl-open]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();open();}));
  m.querySelectorAll('[data-nl-close]').forEach(x=>x.addEventListener('click',close));
  addEventListener('keydown',e=>{ if(e.key==='Escape' && m.hasAttribute('active')) close(); });

  const form=document.getElementById('nlForm'), inp=document.getElementById('nlEmail'), msg=document.getElementById('nlMsg'), btn=form.querySelector('.nl-submit');
  const show=(t,ok)=>{ msg.textContent=t; msg.className='nl-msg '+(ok?'ok':'err'); };
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const email=inp.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length>120){ show('И-мэйл хаягаа зөв оруулна уу.', false); inp.focus(); return; }
    btn.disabled=true;
    try{
      await loadFirebase();
      if(!window.firebase) throw new Error('firebase');
      if(!firebase.apps.length) firebase.initializeApp({apiKey:"AIzaSyAXslBVU1__Ibhk3P7TEeJRS2oi-8fi6Jc",authDomain:"businessbi.firebaseapp.com",projectId:"businessbi",storageBucket:"businessbi.firebasestorage.app",messagingSenderId:"84765528435",appId:"1:84765528435:web:edf7066e6399dbc76af506"});
      await firebase.firestore().collection('leads').add({name:'', phone:'', email, topic:'newsletter', topicText:'Мэдээллийн бүртгэл', message:'', page:location.href, ua:navigator.userAgent.slice(0,160), status:'new', createdAt: firebase.firestore.FieldValue.serverTimestamp()});
      form.reset(); show('Баярлалаа! Бүртгэл амжилттай боллоо.', true);
      try{ localStorage.setItem(KEY, Date.now()+365*864e5); }catch(_){}
      setTimeout(close, 2200);
    }catch(err){
      console.warn('newsletter', err); show('Одоогоор бүртгэж чадсангүй. Дахин оролдоно уу.', false);
    }finally{ btn.disabled=false; }
  });
})();




/* ═══ Хуудас солигдох шилжилт ═══ */
(function(){
  const pt=document.getElementById('pt'); if(!pt) return;
  const hide=()=>{ pt.classList.remove('go'); pt.classList.add('done'); };
  const go=()=>{ requestAnimationFrame(hide); setTimeout(hide,120); };
  if(document.readyState!=='loading') go(); else document.addEventListener('DOMContentLoaded',go);
  addEventListener('pageshow',e=>{ if(e.persisted) hide(); });
  document.addEventListener('click',e=>{
    const a=e.target.closest&&e.target.closest('a[href]'); if(!a) return;
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download')) return;
    const u=new URL(a.href,location.href);
    if(u.origin!==location.origin||!/^https?:$/.test(u.protocol)) return;
    if(u.pathname===location.pathname&&u.hash) return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault(); pt.classList.remove('done'); pt.classList.add('go');
    setTimeout(()=>{ location.href=u.href; },450);
  });
})();




/* ═══ Толгой цэс: pill hover эффект + Хэрэгслүүд mega menu ═══ */
(function(){
  const ARR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const IC={
    tools:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>',
    apps:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    auto:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v12H4z"/><path d="M8 20h8M12 16v4M8 9l2 2 4-4"/></svg>',
    net:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 20c0-2.5 1.5-4.5 4-4.5s3 1.5 3 3"/></svg>'
  };
  const card=(h,img,t,p)=>`<a class="pc" href="${h}"><div class="m"><img src="img/${img}" alt="" loading="lazy"><div class="qa"><span>Үзэх</span></div></div><div class="ct"><span class="t">${t}</span><span class="pr">${p}</span></div></a>`;
  // Давхардалгүй: карт бүр зөвхөн нэг табд, зураг бүр нэг удаа. «Нягтлан олох» дээд цэсэнд тусдаа байгаа тул энд оруулахгүй.
  const TABS=[
    {k:'tools',n:'Хэрэгсэл',all:['tools.html','Бүх хэрэгсэл',''],items:[
      card('ndsh_hhoat_converter.html','tool-ndsh.jpg','НДШ / ХХОАТ хөрвүүлэгч','5,000₮ / тайлан'),
      card('noat_matcher.html','tool-noat.jpg','НӨАТ тулгагч','Үнэгүй'),
      card('invoice_generator.html','tool-invoice.jpg','Нэхэмжлэх үүсгэгч','Үнэгүй'),
      card('receipt_scan.html','tool-receipt.jpg','Баримт уншуулагч','5,000₮ / 24 цаг')]},
    {k:'apps',n:'Програм',all:['pricing.html','Үнэ, багц',''],items:[
      card('businessbi_journal.html','finance.jpg','Санхүүгийн програм','30 хоног үнэгүй · 19,900₮/сараас'),
      card('payroll.html','salary.jpg','Цалин бодогч','Beta · үнэгүй'),
      card('budget.html','budget.jpg','Бизнес төлөвлөлт','Beta · үнэгүй'),
      card('financial_dashboard.html','tool-financial.jpg','Санхүүгийн шинжилгээ','Үнэгүй')]},
    {k:'auto',n:'Excel',all:['templates.html','Бүх Excel загвар',''],items:[
      card('templates.html','tpl/payroll.jpg','Excel загварууд (21)','15,000₮-с'),
      card('dashboard_maker.html','tool-dashmaker.jpg','Дашбоард үүсгэгч','Үнэгүй харах'),
      card('custom_dashboard.html','custom-powerbi.jpg','Захиалгат дашбоард','290,000₮-с'),
      card('templates.html#feasibility','tpl/feasibility.jpg','ТЭЗҮ загвар','49,000₮')]}
  ];
  // Урамшууллын код: ?ref=CODE → 60 хоног хадгална (pay.js төлбөрийн цонхонд автоматаар хэрэглэнэ)
  try{ const rf=new URLSearchParams(location.search).get('ref'); if(rf&&/^[A-Za-z0-9]{4,16}$/.test(rf)) localStorage.setItem('bbi_ref',JSON.stringify({code:rf.toUpperCase(),t:Date.now()})); }catch(e){}
  function init(){
    const nav=document.querySelector('.bbi-nav'), menu=document.getElementById('bbiMenu'); if(!nav||!menu||nav.dataset.home) return !!(nav&&menu);
    nav.dataset.home='1';
    // Санхүүгийн програмыг эхэнд (алтан pill), Хэрэгслүүд хоёрт (mega)
    const links=[...menu.querySelectorAll(':scope > a:not(.bbi-cta)')];
    const fin=links.find(a=>/businessbi_journal/.test(a.getAttribute('href'))), tools=links.find(a=>/tools\.html/.test(a.getAttribute('href')));
    if(fin) menu.insertBefore(fin, menu.firstChild);
    menu.querySelectorAll(':scope > a:not(.bbi-cta)').forEach(a=>{ if(a.querySelector('.t')) return; const t=a.textContent; a.innerHTML=`<span class="t">${t}</span><span class="dup" aria-hidden="true">${t}</span>`; a.classList.remove('active'); });
    if(!tools || matchMedia('(max-width:960px)').matches && false) return true;
    const mega=document.createElement('div'); mega.className='mega'; mega.id='mega';
    mega.innerHTML=`<div class="mega-c"><div class="mega-l">
      <div class="mega-tabs"><p class="lbl">Ангилал</p><div class="mega-nav">${TABS.map((t,i)=>`<button type="button" data-i="${i}" class="${i?'':'on'}"><span class="ic">${IC[t.k]}</span><span class="h">${t.n}</span></button>`).join('')}</div>
        <div class="mega-foot"><a href="learn.html"><span>Зөвлөгөө</span>${ARR}</a></div></div>
      <div class="mega-r">${TABS.map((t,i)=>`<div class="mega-panel ${i?'':'on'}"><div class="mega-head"><p>${t.n}</p><a class="mega-all" href="${t.all[0]}"><span>${t.all[1]} ${t.all[2]!==''?`<small>(${t.all[2]})</small>`:''}</span>${ARR}</a></div><div class="mega-grid">${t.items.join('')}</div></div>`).join('')}</div>
    </div></div>`;
    const ov=document.createElement('div'); ov.className='mega-ov';
    nav.insertBefore(mega, nav.firstChild); nav.appendChild(ov);
    const btns=[...mega.querySelectorAll('.mega-nav button')], panels=[...mega.querySelectorAll('.mega-panel')];
    btns.forEach((b,i)=>{ const act=()=>{ btns.forEach(x=>x.classList.toggle('on',x===b)); panels.forEach((p,j)=>p.classList.toggle('on',j===i)); }; b.addEventListener('mouseenter',act); b.addEventListener('click',act); });
    let tm=null;
    const open=()=>{ if(matchMedia('(max-width:960px)').matches) return; clearTimeout(tm); document.body.classList.add('mega-open'); tools.classList.add('mega-on'); };
    const close=()=>{ clearTimeout(tm); tm=setTimeout(()=>{ document.body.classList.remove('mega-open'); tools.classList.remove('mega-on'); },180); };
    [tools,mega].forEach(el=>{ el.addEventListener('mouseenter',open); el.addEventListener('mouseleave',close); });
    menu.querySelectorAll(':scope > a').forEach(a=>{ if(a!==tools) a.addEventListener('mouseenter',()=>{ clearTimeout(tm); document.body.classList.remove('mega-open'); tools.classList.remove('mega-on'); }); });
    ov.addEventListener('mouseenter',close);
    addEventListener('keydown',e=>{ if(e.key==='Escape'){ document.body.classList.remove('mega-open'); tools.classList.remove('mega-on'); } });
    return true;
  }
  const tryInit=(n)=>{ if(init()) return; if(n<40) setTimeout(()=>tryInit(n+1),50); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>tryInit(0)); else tryInit(0);
})();

})();
