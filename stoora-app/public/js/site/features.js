/* ================= Stoora feature layer =================
   Loaded after app.js. Adds, on top of the base build:
   1. Business categories (chosen at sign-up, editable in Profile) and category-aware Home / navigation
   2. Sign-up onboarding: business type -> business details -> ready
   3. Payments: Razorpay guidance, demo overview, transactions, help
   4. Grouped, collapsible navigation, plus Help & Support and Profile pages
   5. A lighter Home

   Nothing here talks to a server. Where a real backend is needed it says so on screen and in README.md. */

/* ---------- business categories ---------- */
const CATS=[
 {id:'retail',i:'storefront',t:'Retail & Product Selling',d:'Shop owners, boutiques, clothing and jewellery sellers, handmade and other physical products.',kind:'product',subs:['Clothing & fashion','Jewellery','Handmade','Home & decor','Grocery & general','Other products']},
 {id:'online',i:'public',t:'Online & Social Commerce',d:'Orders through an online storefront, social platforms, a website or direct enquiries.',kind:'product',subs:['Online store','Social media seller','Website orders','Direct enquiries']},
 {id:'tutoring',i:'school',t:'Tutoring & Education',d:'Tutors, teachers, coaching centres, online educators and other educational services.',kind:'service',w:{one:'class',many:'classes',client:'student',clients:'students',Book:'Classes'},subs:['School subjects','Test preparation','Music & arts','Languages','Skills & hobbies']},
 {id:'fitness',i:'fitness_center',t:'Fitness & Wellness',d:'Fitness trainers, yoga instructors, wellness coaches and similar service providers.',kind:'service',w:{one:'session',many:'sessions',client:'client',clients:'clients',Book:'Sessions'},subs:['Personal training','Yoga','Nutrition & wellness','Group classes']},
 {id:'professional',i:'work',t:'Professional Services',d:'Consultants, freelancers, designers, photographers and independent professionals.',kind:'service',w:{one:'booking',many:'bookings',client:'client',clients:'clients',Book:'Bookings'},subs:['Consulting','Design','Photography','Writing & content','Technology']},
 {id:'beauty',i:'spa',t:'Beauty & Personal Care',d:'Makeup artists, salons, beauty professionals and related businesses.',kind:'service',w:{one:'appointment',many:'appointments',client:'client',clients:'clients',Book:'Appointments'},subs:['Makeup','Salon','Skin & hair','Mehendi & styling']},
 {id:'food',i:'cake',t:'Food & Homemade Products',d:'Home bakers, food businesses, caterers and small food sellers.',kind:'product',subs:['Bakery','Snacks & sweets','Catering','Tiffin & meals','Packaged food']},
 {id:'digital',i:'cloud_download',t:'Digital Products & Services',d:'Creators selling digital downloads, courses, templates and other digital offerings.',kind:'digital',subs:['Courses','Templates','E-books','Software & tools','Music & media']},
 {id:'other',i:'category',t:'Other',d:'A business that doesn’t fit the others. You can still use every part of Stoora.',kind:'product',subs:[]}];
const DEFAULT_CAT=CATS.find(c=>c.id==='other');
const profile=()=>{ if(!SESSION) return {}; return {category:SESSION.category,sub:SESSION.sub,city:SESSION.city,bizPhone:SESSION.bizPhone} };
const catOf=()=>CATS.find(c=>c.id===profile().category)||DEFAULT_CAT;
const hasCat=()=>!!CATS.find(c=>c.id===profile().category);
function saveProfile(patch){ if(!SESSION) return; Object.assign(SESSION,patch);
 if(!SESSION.demo) api('PATCH','/api/me',patch).catch(e=>toast(e.message,null,'error')) }
const needsOnboarding=()=>!!(SESSION&&!SESSION.demo&&SESSION.onboarding==='pending');

const _applySession=applySession;
applySession=function(se){ _applySession(se); if(!se) return; const p=profile(); if(p.city) S.shop.city=p.city; if(p.bizPhone) S.shop.phone=p.bizPhone };

/* ---------- router: onboarding gate ---------- */
const _render=render;
render=function(enter){ const h=(location.hash||'').slice(1)||'about';
 if(/^l-[a-z]+$/.test(h)){ history.replaceState(null,'','#about'); const shown=_render(enter); setTimeout(()=>{ const t=document.getElementById(h); if(t) t.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'}) },280); return shown }
 if(h.startsWith('verify=')){ const token=h.slice(7); history.replaceState(null,'','#about'); api('POST','/api/auth/verify',{token}).then(()=>{ toast('Email confirmed. Thank you!'); if(SESSION) SESSION.emailVerified=true }).catch(e=>toast(e.message,null,'error')); return _render(enter) }
 if(h.startsWith('reset=')){ L.resetToken=h.slice(6); closeOv(true); return setMode('auth',()=>renderAuth('reset')) }
 if(h==='onboarding'){ if(!SESSION){ AUTH_NEXT=null; location.replace('#login'); return } if(!needsOnboarding()){ location.replace('#home'); return } closeOv(true); return setMode('auth',()=>renderOnboarding()) }
 if(needsOnboarding()&&h!=='about'){ history.replaceState(null,'','#onboarding'); return render(enter) }
 if(SESSION&&!['about','login','signup','forgot','onboarding'].includes(h)){ location.replace((innerWidth<=760?'dashboard-phone.html':'dashboard.html')+(h==='new-shop'?'#home-setup':'')); return }
 return _render(enter) };

/* ================= ONBOARDING ================= */
let OB=null;
function obInit(){ const a=profile(); OB={step:1,cat:a.category||null,sub:a.sub||'',name:a.shop||SESSION.shop||'',city:a.city||'',phone:a.bizPhone||'',err:{},busy:false,fail:'',email:SESSION.email} }
const OB_STEPS=['Account','Business type','Details','Ready'];
function obProgress(){ return `<ol class="ob-steps" aria-label="Setup progress">${OB_STEPS.map((l,n)=>{ const cur=n+1===OB.step+0, done=n<OB.step; return `<li class="${done&&n!==OB.step?'done':''} ${n===OB.step?'cur':''}" ${n===OB.step?'aria-current="step"':''}><span class="dot">${n<OB.step?ic('check','xs'):n+1}</span><span class="lb">${l}</span></li>` }).join('')}</ol>` }
function obBody(){ const c=CATS.find(x=>x.id===OB.cat);
 if(OB.step===1) return `<div class="stack tight"><h1 class="ob-h">What kind of business do you run?</h1><p class="t-body">Let’s personalize Stoora for the way you work. Choose the category that fits you best.</p></div>
  <div class="cats" role="radiogroup" aria-label="Business category">${CATS.map(x=>`<button type="button" class="cat ${OB.cat===x.id?'on':''}" role="radio" aria-checked="${OB.cat===x.id}" data-fx="ob-cat" data-id="${x.id}"><span class="ci">${ic(x.i)}</span><span class="grow"><b>${x.t}</b><span>${x.d}</span></span><span class="tick" aria-hidden="true">${ic('check','xs')}</span></button>`).join('')}</div>
  ${OB.err.cat?`<p class="err" role="alert">${ic('error','xs')}${OB.err.cat}</p>`:''}`;
 if(OB.step===2) return `<div class="stack tight"><h1 class="ob-h">Tell us a little about your business</h1><p class="t-body">Just the basics. You can change all of this later in Profile.</p></div>
  <div class="stack ob-form">
   <div class="field"><label for="ob-name">Business name</label><input class="input ${OB.err.name?'bad':''}" id="ob-name" data-fx-in="name" value="${esc(OB.name)}" autocomplete="organization" placeholder="Meera Studio">${OB.err.name?`<span class="err">${ic('error','xs')}${OB.err.name}</span>`:''}</div>
   ${c&&c.subs.length?`<div class="field"><span class="flabel" id="ob-sub-l">What do you do? <span class="cap">(optional)</span></span><div class="chips wrap" role="radiogroup" aria-labelledby="ob-sub-l">${c.subs.map(s=>`<button type="button" role="radio" aria-checked="${OB.sub===s}" class="chip ${OB.sub===s?'on':''}" data-fx="ob-sub" data-v="${esc(s)}">${s}</button>`).join('')}</div></div>`:''}
   <div class="grid2"><div class="field"><label for="ob-city">City <span class="cap">(optional)</span></label><input class="input" id="ob-city" data-fx-in="city" value="${esc(OB.city)}" autocomplete="address-level2" placeholder="Jaipur"></div>
   <div class="field"><label for="ob-phone">Business phone <span class="cap">(optional)</span></label><input class="input ${OB.err.phone?'bad':''}" id="ob-phone" data-fx-in="phone" type="tel" inputmode="tel" value="${esc(OB.phone)}" autocomplete="tel" placeholder="98480 21234">${OB.err.phone?`<span class="err">${ic('error','xs')}${OB.err.phone}</span>`:''}</div></div>
  </div>`;
 const pers=homePlan(c||DEFAULT_CAT);
 return `<div class="stack tight"><h1 class="ob-h">${esc(OB.name)} is ready to set up</h1><p class="t-body">Here’s how Stoora will be arranged for a business like yours.</p></div>
  <div class="ob-sum"><div class="row"><span class="ci">${ic((c||DEFAULT_CAT).i)}</span><div class="grow"><b class="t-ink">${(c||DEFAULT_CAT).t}</b>${OB.sub?`<span class="cap" style="display:block">${esc(OB.sub)}</span>`:''}</div><button class="btn quiet sm" data-fx="ob-go" data-s="1">Change</button></div>
   <ul class="ob-list">${pers.map(p=>`<li>${ic('check_circle','sm')}<span>${p}</span></li>`).join('')}</ul></div>
  <p class="cap">${ic('info','xs')} Everything you see is sample data until your shop is connected. Nothing is shared with anyone.</p>
  ${OB.fail?`<div class="banner bad" role="alert">${ic('error')}<span>${OB.fail}</span></div>`:''}`;
}
function renderOnboarding(){ if(!OB||OB.email!==SESSION.email) obInit(); const s=OB.step;
 $('#auth').innerHTML=`<div class="ob"><header class="ob-top"><a class="logo row" href="#about" style="text-decoration:none" aria-label="stoora.in"><span class="appicon" aria-hidden="true" style="width:30px;height:30px;font-size:17px">S</span><span class="wordmark" style="font-size:20px">stoora<i>.in</i></span></a><button class="btn quiet sm" data-act="logout">${ic('logout','sm')}Log out</button></header>
  <main class="ob-main">${obProgress()}<section class="ob-card" style="animation:rise .4s var(--ease-out)" aria-live="polite">${obBody()}</section></main>
  <footer class="ob-foot"><div class="ob-foot-in">${s>1?`<button class="btn line" data-fx="ob-back">${ic('arrow_back','sm')}Back</button>`:'<span></span>'}<button class="btn primary" data-fx="ob-next" ${OB.busy?'disabled':''}>${OB.busy?'<span class="spin" aria-hidden="true"></span>Saving…':s===3?'Enter my dashboard':'Continue'}</button></div></footer></div>`;
 document.title='Set up your shop · Stoora.in'; window.scrollTo(0,0) }
function obValidate(){ OB.err={};
 if(OB.step===1&&!OB.cat) OB.err.cat='Choose the option that fits your business best. You can change it later.';
 if(OB.step===2){ if(!OB.name.trim()) OB.err.name='Add your business name. It appears on your shop page.';
  const d=OB.phone.replace(/[\s-]/g,'').replace(/^(\+91|0)/,''); if(OB.phone.trim()&&!/^\d{10}$/.test(d)) OB.err.phone='Use a 10-digit mobile number, for example 98480 21234.' }
 return !Object.keys(OB.err).length }
async function obFinish(){ OB.busy=true; OB.fail=''; renderOnboarding();
 try{ await new Promise(r=>setTimeout(r,700));
  const name=OB.name.trim();
  const r=await api('PATCH','/api/me',{shop:name,category:OB.cat,sub:OB.sub,city:OB.city.trim(),bizPhone:OB.phone.trim(),onboarding:'done'});
  SESSION=sessionFrom(r.user);
  applySession(SESSION); OB=null; location.hash='new-shop'; setTimeout(()=>toast(`Welcome, ${SESSION.name.split(' ')[0]}. Stoora is set up for your business.`),80)
 }catch(_){ OB.busy=false; OB.fail='We couldn’t save this. Check your connection, then try again.'; renderOnboarding() } }

/* ---------- what Home will show, per category ---------- */
function homePlan(c){ const k=c.kind, w=c.w||{};
 if(k==='service') return [`Home leads with upcoming ${w.many||'bookings'} and unpaid ${w.many||'bookings'}`,`${w.clients?w.clients[0].toUpperCase()+w.clients.slice(1):'Clients'} and payments are one tap away`,'A short setup list starts with adding your first service'];
 if(k==='digital') return ['Home leads with sales, orders and payments waiting','Your digital products are front and centre','A short setup list starts with adding your first digital product'];
 return ['Home leads with sales, orders to ship and payments waiting','Low-stock products are flagged for you','A short setup list starts with adding your first product'] }

/* setup list wording follows the category */
const SETUP_FIRST={...SETUP[0]};
const _newShop=newShopScreen;
newShopScreen=function(){ const c=catOf();
 if(c.kind==='service') Object.assign(SETUP[0],{t:'Add your first service',s:'A name, a price and how long it takes. Buyers book it from your shop link.',b:'Add service',go:'add-service'});
 else if(c.kind==='digital') Object.assign(SETUP[0],{t:'Add your first digital product',s:'A name, a price and what the buyer receives.',b:'Add product',go:'add-product'});
 else Object.assign(SETUP[0],SETUP_FIRST);
 return _newShop() };

/* ================= NAVIGATION ================= */
const navLbl=()=>{ const c=catOf(); return c.kind==='service'?{book:c.w.Book,clients:c.w.clients[0].toUpperCase()+c.w.clients.slice(1)}:{book:'Orders',clients:'Customers'} };
function navGroups(){ const c=catOf(), L2=navLbl(), svc=c.kind==='service';
 const biz=[ svc?{r:'bookings',m:/^(bookings|booking-)/,i:'event',l:L2.book,d:'Everything booked with you',cnt:()=>S.bookings.filter(b=>b.status==='Upcoming').length}
   :{r:'orders',m:/^(orders|order-|bookings|booking-|create-order)/,i:'inbox',l:'Orders',d:'Orders from every place',cnt:()=>S.orders.filter(o=>!o.shipped&&o.pay!=='cash').length,sub:c.kind==='digital'?[]:[{r:'bookings',l:'Bookings'}]},
  svc?{r:'services',m:/^(services|add-service|product-)/,i:'sell',l:'Services',d:'What you offer and its price'}
   :{r:'products',m:/^(products|add-product|product-|services|add-service)/,i:'sell',l:c.kind==='digital'?'Digital products':'Products',d:c.kind==='digital'?'What you sell online':'What you sell and how much is left',sub:c.kind==='digital'?[]:[{r:'services',l:'Services'}]},
  {r:'customers',m:/^customer/,i:'group',l:L2.clients,d:svc?'The people you work with':'People who bought from you'},
  {r:'chats',m:/^chat/,i:'forum',l:'Chats',d:'Messages from your customers',cnt:()=>S.chats.filter(x=>x.unread).length,hot:true},
  {r:'storefront',m:/^storefront/,i:'storefront',l:'Storefront',d:'Your shop page and its link'},
  {r:'about',m:/^about$/,i:'public',l:'Website',d:'The public stoora.in website'},
  {r:'offers',m:/^offers/,i:'local_offer',l:'Discounts & offers',d:'Codes and offers for your customers'}];
 return [
  ['Overview',[{r:'home',m:/^(home|new-shop)$/,i:'home',l:'Home',d:'Today’s summary and what needs you'},{r:'analytics',m:/^analytics/,i:'bar_chart',l:'Analytics',d:'How your business is doing over time'}]],
  ['Business',biz],
  ['Finances',[{r:'payments',m:/^payments/,i:'credit_card',l:'Payments',d:'Online payments and Razorpay set-up'},{r:'money',m:/^money/,i:'account_balance_wallet',l:'Money',d:'Money received and money still owed'}]],
  ['Tools',[{act:'ask',i:'auto_awesome',l:'AI Business Assistant',d:'Ask about your orders, money and customers'}]],
  ['Account',[{act:'alerts',i:'notifications',l:'Notifications',d:'New orders and reminders',cnt:()=>S.alerts.length},{r:'shop-settings',m:/^shop-settings/,i:'settings',l:'Settings',d:'Shop details and shipping'},{r:'help',m:/^help/,i:'help',l:'Help & Support',d:'Guides and answers'},{r:'profile',m:/^profile/,i:'person',l:'Profile',d:'You, your login and business type'}]]] }
const navIsOn=n=>!!(n.m&&n.m.test(route)&&!(n.sub||[]).some(s=>s.r===route));
function navItem(n){ const c=n.cnt?n.cnt():0; const on=navIsOn(n);
 const inner=`${ic(n.i)}<span class="lbl">${n.l}</span>${c?`<span class="cnt ${n.hot?'hot':''}" aria-label="${c} new">${c}</span>`:''}`;
 if(n.act) return `<button class="nav" data-act="${n.act}" title="${n.l} — ${n.d}" style="width:100%;text-align:left">${inner}</button>`;
 const sub=n.sub&&(n.m.test(route)||n.sub.some(s=>s.r===route))?n.sub.map(s=>`<a class="nav sub ${route===s.r?'on':''}" href="#${s.r}">${s.l}</a>`).join(''):'';
 return `<a class="nav ${on?'on':''}" href="#${n.r}" ${on?'aria-current="page"':''} title="${n.l} — ${n.d}">${inner}</a>${sub}` }
sideHTML=function(){ const min=document.body.classList.contains('side-min');
 return `<div class="side-in">
  <div class="brand-row"><a class="brand" href="#home" aria-label="stoora.in home"><span class="appicon" aria-hidden="true">S</span><span class="wordmark">stoora<i>.in</i></span></a>
   <button class="side-toggle" data-fx="collapse" aria-label="${min?'Expand':'Collapse'} menu" aria-pressed="${min}" title="${min?'Expand':'Collapse'} menu">${ic(min?'left_panel_open':'left_panel_close','sm')}</button></div>
  <button class="sbtn-search" data-act="search" title="Search">${ic('search','sm')}<span class="txt">Search</span><kbd>Ctrl K</kbd></button>
  ${navGroups().map(([g,items])=>`<div class="ngroup" role="presentation">${g}</div>${items.map(navItem).join('')}`).join('')}
  <div class="side-foot"><button class="nav" data-act="logout" title="Log out" style="width:100%;text-align:left">${ic('logout')}<span class="lbl">Log out</span></button>
   <a class="shopbtn" href="#profile" title="Profile"><span class="shop-av" aria-hidden="true">${esc(S.shop.name[0].toUpperCase())}</span><span class="txt grow"><b>${esc(S.shop.name)}</b><small>stoora.in/${esc(S.shop.handle)}</small></span></a></div></div>` };
openMenu=function(){
 setLayer(`<div class="drawer" role="dialog" aria-modal="true" aria-label="Menu"><nav class="panel" aria-label="Main">
  <div class="brand" style="padding-left:var(--s2)"><span class="appicon" aria-hidden="true">S</span><span class="wordmark" style="color:var(--on-ink)">stoora<i>.in</i></span></div>
  <button class="sbtn-search" data-act="search" style="margin:var(--s1) 0 var(--s2)">${ic('search','sm')}Search everything</button>
  ${navGroups().map(([g,items])=>`<div class="ngroup">${g}</div>${items.map(n=>{ const c=n.cnt?n.cnt():0; const body=`${ic(n.i)}<span class="grow"><span>${n.l}</span><small>${n.d}</small></span>${c?`<span class="cnt ${n.hot?'hot':''}">${c}</span>`:''}`;
    return n.act?`<button class="nav dnav" data-act="${n.act}" style="width:100%;text-align:left">${body}</button>`:`<a class="nav dnav ${navIsOn(n)?'on':''}" href="#${n.r}">${body}</a>` }).join('')}`).join('')}
  <button class="nav dnav" data-act="logout" style="width:100%;text-align:left">${ic('logout')}<span class="grow"><span>Log out</span></span></button>
  <div class="foot"><button class="btn" data-act="close" aria-label="Close menu" style="padding:0 var(--s3)">${ic('close')}Close</button></div>
 </nav><div class="peek" data-act="close" aria-hidden="true"></div></div>`,'a.nav.on') };
/* phone bottom bar follows the category too */
bbarHTML=function(){ const t=tabOf(route); const svc=catOf().kind==='service'; const unread=S.chats.some(c=>c.unread);
 const tab=(r,i,l,on,b)=>`<a href="#${r}" class="${on?'on':''}" ${on?'aria-current="page"':''}>${ic(i)}<span>${l}</span>${b?'<i class="bd" aria-label="new"></i>':''}</a>`;
 return `<button class="round" data-act="menu" aria-label="Open menu">${ic('menu')}</button>
  <div class="pill" role="navigation" aria-label="Main">${tab('home','home','Home',/^(home|new-shop)$/.test(route))}${svc?tab('bookings','event',navLbl().book,/^(bookings|booking-)/.test(route)):tab('orders','inbox','Orders',/^(orders|order-|create-order)/.test(route))}${tab('payments','credit_card','Payments',/^payments/.test(route))}${tab('chats','forum','Chats',/^chat/.test(route),unread)}</div>
  <button class="round" data-act="ask" aria-label="Ask Stoora"><span class="smark" aria-hidden="true">S</span></button>` };
const _tabOf=tabOf; tabOf=function(r){ if(/^payments/.test(r)) return 'payments'; if(/^(help|profile)$/.test(r)) return r; return _tabOf(r) };

/* ================= HOME (lighter) ================= */
const greetNow=()=>{ const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' };
function metricsFor(c){ const w=moneyWaiting(), wt=w.reduce((a,x)=>a+x.amt,0), cts=counts(), A=AN['7'].v, W=c.w||{};
 const up=S.bookings.filter(b=>b.status==='Upcoming'), unpaidB=S.bookings.filter(b=>!b.paid&&b.status==='Upcoming');
 const earnedB=S.bookings.filter(b=>b.paid).reduce((a,b)=>a+prod(b.svc).price,0);
 const waiting={k:'Waiting for payment',v:wt,pre:'₹',n:`${plural(w.length,'customer')} · <a class="link" href="#money">see who</a>`};
 if(c.kind==='service') return [
  {k:'Upcoming '+(W.many||'bookings'),v:up.length,n:`<a class="link" href="#bookings">Open ${W.many||'bookings'}</a>`},
  {k:'Income so far',v:earnedB,pre:'₹',n:'From paid '+(W.many||'bookings')},
  waiting,
  {k:'Unpaid '+(W.many||'bookings'),v:unpaidB.length,n:unpaidB.length?'Worth a reminder':'All paid'}];
 if(c.kind==='digital') return [
  {k:'Sales today',v:A[6],pre:'₹',n:`Yesterday ${rs(A[5])}`},
  {k:'Orders today',v:S.orders.filter(o=>/Today/.test(o.when)).length,n:`<a class="link" href="#orders">Open orders</a>`},
  waiting,
  {k:'Active products',v:S.products.filter(p=>p.status==='Active').length,n:`<a class="link" href="#products">Open products</a>`}];
 return [
  {k:'Sales today',v:A[6],pre:'₹',n:`Yesterday ${rs(A[5])}`},
  {k:'Orders to ship',v:cts.toShip,n:`<a class="link" href="#orders" data-filter="To ship">Open orders</a>`},
  waiting,
  {k:'Low on stock',v:S.products.filter(p=>p.status==='Active'&&p.stock>0&&p.stock<=3).length,n:`<a class="link" href="#products">Open products</a>`}] }
function attnFor(c){ const out=[]; const w=moneyWaiting(); const r=S.orders.find(o=>!o.paid&&o.pay!=='cod');
 const ready=S.chats.filter(x=>x.mood==='ready'&&x.unread), upset=S.chats.filter(x=>x.mood==='upset'&&x.unread);
 if(c.kind==='service'){ const b=S.bookings.find(x=>!x.paid&&x.status==='Upcoming'); if(b) out.push({i:'currency_rupee',k:'pay',t:`${b.who.split(' ')[0]} hasn’t paid ${rs(prod(b.svc).price)} for ${prod(b.svc).name}.`,b:'Send reminder',a:`data-act="remind" data-who="${esc(b.who)}"`});
  const nx=S.bookings.find(x=>x.status==='Upcoming'); if(nx) out.push({i:'event',k:'shop',t:`Next up: ${prod(nx.svc).name} with ${nx.who.split(' ')[0]}, ${nx.when}.`,b:'Open',a:`data-go="booking-${nx.id}"`}) }
 else { if(r) out.push({i:'currency_rupee',k:'pay',t:`${r.who.split(' ')[0]} hasn’t paid ${rs(r.total)} for order #${r.id}.`,b:'Send reminder',a:`data-act="remind" data-who="${esc(r.who)}"`});
  const ts=counts().toShip; if(ts) out.push({i:'local_shipping',k:'shop',t:`${plural(ts,'paid order is','paid orders are')} waiting to be shipped.`,b:'Ship it',a:'data-act="ai-act" data-a="open_orders_to_ship"'});
  const low=S.products.filter(p=>p.status==='Active'&&p.stock>0&&p.stock<=3)[0]; if(low) out.push({i:'inventory_2',k:'reel',t:`${low.name}: only ${low.stock} left.`,b:'See product',a:`data-go="product-${low.id}"`}) }
 if(upset.length) out.unshift({i:'sentiment_dissatisfied',k:'chat',t:`${upset[0].who.split(' ')[0]} needs a reply about a late parcel.`,b:'Reply now',a:`data-go="chat-${upset[0].id}"`});
 else if(ready.length) out.push({i:'forum',k:'chat',t:`${plural(ready.length,'customer is','customers are')} ready to buy. Replies are drafted for you.`,b:'Review',a:'data-act="ai-act" data-a="review_messages"'});
 return out.slice(0,3) }
function homeLight(){ if(S.newShop) return newShopScreen();
 const c=catOf(), W=c.w||{}, att=attnFor(c), stats=metricsFor(c), A=AN['7'], d=SALES7();
 const idea=(()=>{ const left=S.ideas.filter(i=>!S.ideasGone.includes(i.id)); return c.kind==='service'?left.find(i=>i.id==='i3')||left[0]:left.find(i=>i.id!=='i3')||left[0] })();
 const up=S.bookings.filter(b=>b.status==='Upcoming');
 const today=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
 const brief=c.kind==='service'
  ?`You have <b class="num">${plural(up.length,W.one||'booking',W.many||'bookings')}</b> coming up and <b class="num">${rs(moneyWaiting().reduce((a,x)=>a+x.amt,0))}</b> waiting to be paid.`
  :`Today you’ve made <b class="num">${rs(A.v[6])}</b> so far. Yesterday was ${rs(A.v[5])}.`;
 const side=c.kind==='service'
  ?`<section class="hx-sec"><div class="hx-h"><h2 class="ct">Coming up</h2><a class="link cap" href="#bookings">All ${W.many||'bookings'}${ic('chevron_right','xs')}</a></div>${up.length?`<div class="hx-list">${up.map(b=>`<a class="hx-row" href="#booking-${b.id}">${av(b.who)}<span class="grow"><span class="t">${esc(prod(b.svc).name)}</span><span class="s">${b.when} · ${esc(b.who)}</span></span>${b.paid?bdg('ok','check_circle','Paid'):bdg('warn','schedule','Unpaid')}</a>`).join('')}</div>`:`<p class="t-soft">Nothing booked yet. Share your shop link to get started.</p>`}</section>`
  :`<section class="hx-sec"><div class="hx-h"><h2 class="ct">This week</h2><a class="link cap" href="#analytics">More${ic('chevron_right','xs')}</a></div>${lineChart(d.x,d.v,'Sales over the last 7 days')}</section>`;
 return {title:'Home',crumbTitle:'Home',body:`<div class="hx">
  <header class="hx-head anim"><div><p class="eyebrow">${today}</p><h1 class="hx-h1">${greetNow()}, ${esc(S.shop.owner)}.</h1><p class="t-body">Here’s what matters in your business today.</p></div><span class="hx-demo" title="This preview shows sample data">${ic('info','xs')}Sample data</span></header>
  <section class="hx-ai anim" style="--i:1" aria-labelledby="hx-ai-h">
   <div class="hx-ai-t"><span class="smark" aria-hidden="true">S</span><div><h2 class="ct" id="hx-ai-h">${att.length?`You have ${att.length} thing${att.length>1?'s':''} worth a look today`:'All caught up today'}</h2><p class="cap">Your assistant, from your shop’s numbers</p></div></div>
   <p class="hx-brief">${brief}</p>
   <form class="hx-ask" data-form="home-ask"><label class="sr" for="home-q">Ask Stoora</label><textarea id="home-q" rows="1" placeholder="Ask anything about your business"></textarea><button class="go" type="submit" aria-label="Ask">${ic('arrow_upward','sm')}</button></form>
   <div class="hx-sugg">${['How did my business do yesterday?',c.kind==='service'?'Who hasn’t paid me yet?':'Which orders need attention?','How much have I received today?','What should I focus on first?'].map(q=>`<button data-act="ask" data-q="${q}">${q}</button>`).join('')}</div>
  </section>
  <section class="hx-stats anim" style="--i:2" aria-label="Today at a glance">${stats.map(m=>`<div><span class="k">${m.k}</span><b class="big num">${cnt(m.v,m.pre||'')}</b><span class="n">${m.n}</span></div>`).join('')}</section>
  <div class="hx-cols">
   <section class="hx-sec anim" style="--i:3"><div class="hx-h"><h2 class="ct">Needs your attention</h2></div>
    ${att.length?`<div class="hx-list">${att.map(x=>`<div class="hx-row"><span class="ic ${x.k}">${ic(x.i,'sm')}</span><span class="grow">${x.t}</span><button class="btn line sm" ${x.a}>${x.b}</button></div>`).join('')}</div>`:`<p class="t-soft">Nothing needs you right now.</p>`}
    ${idea?`<div class="hx-next" id="idea-${idea.id}"><span class="label">A good next step</span><p>${idea.text}</p><div class="row" style="gap:var(--s1);flex-wrap:wrap"><button class="btn ink sm" data-act="idea-yes" data-id="${idea.id}">${idea.act}</button><button class="btn quiet sm" data-act="idea-no" data-id="${idea.id}">Not now</button><span class="cap">Stoora’s estimate, not a promise.</span></div></div>`:''}
   </section>
   <div class="anim" style="--i:4">${side}</div>
  </div>
  ${hasCat()?'':`<p class="hx-cat cap anim" style="--i:5">${ic('tune','xs')}Tell Stoora what you sell to arrange this page for you. <a class="link" href="#profile">Choose your business type</a></p>`}
 </div>`} }
SCREENS.home.fn=homeLight;

/* ================= PAYMENTS ================= */
const RZP={site:'https://razorpay.com/',dash:'https://dashboard.razorpay.com/',docs:'https://razorpay.com/docs/'};
const PAY_CONNECTED=false; /* no gateway integration exists yet, see README "Backend work required" */
const TX=[
 {id:'DEMO-1001',who:'Priya Sharma',ref:'#1012',amt:3798,m:'UPI',ago:0,s:'success',set:'awaiting'},
 {id:'DEMO-1002',who:'Sneha Kulkarni',ref:'B-210',amt:499,m:'UPI',ago:1,s:'success',set:'awaiting'},
 {id:'DEMO-1003',who:'Rahul Verma',ref:'#1011',amt:1499,m:'UPI',ago:1,s:'pending'},
 {id:'DEMO-1004',who:'Rohan Das',ref:'B-211',amt:499,m:'UPI',ago:2,s:'failed',why:'The payment wasn’t completed.'},
 {id:'DEMO-1005',who:'Anjali Rao',ref:'#1010',amt:2899,m:'Card',ago:4,s:'success',set:'settled'},
 {id:'DEMO-1006',who:'Kavya Iyer',ref:'B-208',amt:499,m:'UPI',ago:5,s:'success',set:'settled'},
 {id:'DEMO-1007',who:'Neha Joshi',ref:'#1008',amt:1599,m:'UPI',ago:9,s:'refunded'},
 {id:'DEMO-1008',who:'Arjun Mehta',ref:'#1007',amt:1899,m:'Netbanking',ago:12,s:'success',set:'settled'},
 {id:'DEMO-1009',who:'Priya Sharma',ref:'#1006',amt:2299,m:'UPI',ago:16,s:'success',set:'settled'},
 {id:'DEMO-1010',who:'Meena Rao',ref:'#1005',amt:699,m:'UPI',ago:21,s:'failed',why:'The bank didn’t confirm the payment.'},
 {id:'DEMO-1011',who:'Kavya Iyer',ref:'#1004',amt:1499,m:'UPI',ago:26,s:'success',set:'settled'}];
const TXS={success:['ok','check_circle','Successful'],pending:['warn','schedule','Pending'],failed:['bad','error','Failed'],refunded:['neutral','undo','Refunded']};
const txDate=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return n===0?'Today':n===1?'Yesterday':d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) };
const sumTx=f=>TX.filter(f).reduce((a,t)=>a+t.amt,0);
const payUI={q:'',status:'All',range:'30',open:{}};
function payTabs(on){ const T=[['payments','Overview'],['payments-transactions','Transactions'],['payments-setup','Set up'],['payments-help','Help']];
 return `<div class="chips pay-tabs" role="navigation" aria-label="Payments sections">${T.map(([r,l])=>`<a class="chip ${on===r?'on':''}" href="#${r}" ${on===r?'aria-current="page"':''}>${l}</a>`).join('')}</div>` }
const demoBanner=()=>`<div class="banner warn pay-banner" role="note">${ic('science')}<span><b>Razorpay isn’t connected yet.</b> The figures here are demonstration data so you can see how this page will work. They are not real payments. <a href="#payments-setup" style="color:inherit;text-decoration:underline">See how to connect</a></span></div>`;
const payHead=(on,h,p)=>`<div class="phead anim"><div class="l"><h1 class="h1">${h}</h1><p class="t-body">${p}</p></div></div><div class="anim" style="--i:1">${payTabs(on)}</div><div class="anim" style="--i:1;margin-top:var(--s3)">${PAY_CONNECTED?'':demoBanner()}</div>`;
const extA=(href,label,cls='btn line')=>`<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${label}${ic('open_in_new','sm')}</a>`;
function txRow(t){ const [k,i,w]=TXS[t.s]; return `<button class="hx-row tx" data-fx="tx" data-id="${t.id}">${av(t.who)}<span class="grow"><span class="t">${esc(t.who)}</span><span class="s">${t.ref} · ${t.m} · ${txDate(t.ago)}</span></span><span class="end"><b class="money">${rs(t.amt)}</b>${bdg(k,i,w)}</span></button>` }
function paymentsOverview(){ const got=sumTx(t=>t.s==='success'), aw=sumTx(t=>t.set==='awaiting'), st=sumTx(t=>t.set==='settled');
 const n=s=>TX.filter(t=>t.s===s).length;
 return {title:'Payments',crumbTitle:'Payments',body:`${payHead('payments','Payments','Online payments from your customers, and where that money is.')}
 ${PAY_CONNECTED?'':`<section class="pay-cta anim" style="--i:2"><div class="grow"><h2 class="ct">Start accepting online payments</h2><p class="t-body">Let customers pay you by UPI at your shop link. You’ll create a Razorpay account, then connect it to Stoora. We guide you through each step.</p></div><a class="btn primary" href="#payments-setup">See the steps${ic('arrow_forward','sm')}</a></section>`}
 <section class="pay-flow anim" style="--i:3" aria-label="Where your money is"><div><span class="k">Received from customers</span><b class="big num">${rs(got)}</b><span class="n">Payments that went through</span></div><span class="ar" aria-hidden="true">${ic('arrow_forward')}</span>
  <div><span class="k">Awaiting settlement</span><b class="big num">${rs(aw)}</b><span class="n">Paid by customers, not in your bank yet</span></div><span class="ar" aria-hidden="true">${ic('arrow_forward')}</span>
  <div><span class="k">Settled to your bank</span><b class="big num">${rs(st)}</b><span class="n">Already transferred to you</span></div></section>
 <section class="hx-stats anim" style="--i:4" aria-label="Payment counts"><div><span class="k">Successful</span><b class="big num">${n('success')}</b><span class="n">payments</span></div><div><span class="k">Pending</span><b class="big num">${n('pending')}</b><span class="n">${rs(sumTx(t=>t.s==='pending'))} not confirmed yet</span></div><div><span class="k">Failed</span><b class="big num">${n('failed')}</b><span class="n">Customers can try again</span></div><div><span class="k">Refunded</span><b class="big num">${rs(sumTx(t=>t.s==='refunded'))}</b><span class="n">${n('refunded')} refund</span></div></section>
 <section class="hx-sec anim" style="--i:5"><div class="hx-h"><h2 class="ct">Recent payments</h2><a class="link cap" href="#payments-transactions">All payments${ic('chevron_right','xs')}</a></div><div class="hx-list">${TX.slice(0,5).map(txRow).join('')}</div>
  <p class="cap" style="margin-top:var(--s2)">Stoora’s list is a summary. For full payment and settlement details, use your Razorpay Dashboard.</p></section>`} }
function txFiltered(){ const q=payUI.q.trim().toLowerCase(); return TX.filter(t=>(payUI.status==='All'||t.s===payUI.status)&&(payUI.range==='all'||t.ago<=+payUI.range)&&(!q||(t.who+' '+t.id+' '+t.ref).toLowerCase().includes(q))) }
function txList(){ const l=txFiltered(); if(!l.length) return `<div class="empty">${ART('done',80)}<div class="ct">No payments match</div><p class="t-body">Try another status or a wider date range.</p></div>`;
 return `<div class="tbl-wrap only-wide"><table class="tbl"><thead><tr><th>Payment ID</th><th>Customer</th><th>Order</th><th>Method</th><th>Date</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>${l.map(t=>{ const [k,i,w]=TXS[t.s]; return `<tr data-fx="tx" data-id="${t.id}" tabindex="0"><td class="num">${t.id}</td><td><b>${esc(t.who)}</b></td><td>${t.ref}</td><td>${t.m}</td><td>${txDate(t.ago)}</td><td class="r num"><b>${rs(t.amt)}</b></td><td>${bdg(k,i,w)}</td><td class="cap">Details</td></tr>` }).join('')}</tbody></table></div>
  <div class="hx-list only-narrow">${l.map(txRow).join('')}</div>` }
function paymentsTransactions(){ const cnts=s=>s==='All'?TX.length:TX.filter(t=>t.s===s).length;
 return {title:'Payments · Transactions',crumbTitle:'Transactions',crumb:[['Payments','payments']],body:`${payHead('payments-transactions','Transactions','Every online payment, with its status.')}
 <div class="row pay-filter anim" style="--i:2;flex-wrap:wrap"><label class="search" style="max-width:380px">${ic('search','sm')}<span class="sr">Search payments</span><input type="search" data-fx-in="paysearch" placeholder="Search customer, order or payment ID" value="${esc(payUI.q)}"></label>
  <div class="seg inline" role="group" aria-label="Date range">${[['7','7 days'],['30','30 days'],['all','All']].map(([v,l])=>`<button class="${payUI.range===v?'on':''}" data-fx="pay-range" data-v="${v}">${l}</button>`).join('')}</div></div>
 <div class="chips anim" style="--i:2;margin-top:var(--s2)" role="group" aria-label="Status">${[['All','All'],['success','Successful'],['pending','Pending'],['failed','Failed'],['refunded','Refunded']].map(([v,l])=>`<button class="chip ${payUI.status===v?'on':''}" data-fx="pay-status" data-v="${v}">${l}<span class="n">${cnts(v)}</span></button>`).join('')}</div>
 <div id="pay-list" class="anim" style="--i:3;margin-top:var(--s3)">${txList()}</div>`} }
function openTx(id){ const t=TX.find(x=>x.id===id); if(!t) return; const [k,i,w]=TXS[t.s];
 const set=t.s==='success'?(t.set==='settled'?'Settled to your bank':'Awaiting settlement'):'Not applicable';
 setLayer(sheet('tx',`Payment ${t.id}`,`<div class="stack"><div class="row">${bdg(k,i,w)}<span class="grow"></span><b class="big num" style="font-size:28px">${rs(t.amt)}</b></div>
  <div class="kv"><div class="r"><span>Customer</span><b class="t-ink">${esc(t.who)}</b></div><div class="r"><span>Related order</span><a class="link" href="#${t.ref.startsWith('#')?'order-'+t.ref.slice(1):'booking-'+t.ref}">${t.ref}</a></div><div class="r"><span>Method</span><span>${t.m}</span></div><div class="r"><span>Date</span><span>${txDate(t.ago)}</span></div><div class="r"><span>Settlement</span><span>${set}</span></div></div>
  ${t.why?`<div class="banner info">${ic('info')}<span>${t.why} The customer can try the payment again.</span></div>`:''}
  ${t.s==='refunded'?`<div class="banner info">${ic('info')}<span>This payment was refunded to the customer.</span></div>`:''}
  <div class="banner warn">${ic('science')}<span>Demonstration data. When Razorpay is connected, this panel shows the real payment, and Razorpay’s record is the one to trust.</span></div></div>`,
  `<button class="btn line" data-act="copy" data-text="${t.id}">${ic('content_copy')}Copy ID</button>${extA(RZP.dash,'Open Razorpay Dashboard','btn ink')}`)) }
function paySteps(){ const chk=store.get('stoora.rzpChecklist')||{}; const items=[['biz','Business details'],['id','Identity details'],['bank','Bank account for settlements'],['docs','Anything else Razorpay asks for']];
 const flow=['Customer opens your payment link','Chooses how to pay, such as UPI','Razorpay processes the payment','Razorpay tells Stoora it succeeded (verified)','Stoora marks the order paid'];
 const S5=(n,t,body,st)=>`<li class="pay-step"><span class="no">${n}</span><div class="stack tight grow"><div class="row" style="flex-wrap:wrap"><h2 class="ct grow">${t}</h2>${st||''}</div>${body}</div></li>`;
 return `<ol class="pay-steps">
 ${S5(1,'Create your Razorpay account',`<p class="t-body">Razorpay is the payment company that handles online payments and sends the money to your bank. You register with Razorpay directly, on their website. Stoora doesn’t collect your Razorpay details.</p><div>${extA(RZP.site,'Create Razorpay Account','btn primary')}</div>`)}
 ${S5(2,'Complete account verification',`<p class="t-body">Razorpay may ask for business, identity and bank details before you can accept payments. What it asks for can differ from one account to another, so follow what Razorpay shows you.</p><div class="pay-check" role="group" aria-label="Your own checklist">${items.map(([k,l])=>`<label class="check"><input type="checkbox" data-fx-chk="${k}" ${chk[k]?'checked':''}>${l}</label>`).join('')}</div><p class="cap">This is your own reminder list. Stoora can’t see or confirm your Razorpay verification.</p>`)}
 ${S5(3,'Connect Razorpay to Stoora',`<p class="t-body">Once your Razorpay account is ready, you’ll connect it here with a sign-in through Razorpay. You never type secret keys into Stoora.</p><div class="row" style="flex-wrap:wrap"><button class="btn line" data-fx="rzp-connect">${ic('link','sm')}Connect Razorpay</button><span class="cap">Needs Stoora’s server first</span></div>`,bdg('neutral','schedule','Not connected'))}
 ${S5(4,'Start accepting online payments',`<p class="t-body">When your shop is connected, customers can pay online. UPI is available when it’s turned on for your Razorpay account. This is how one payment moves:</p><ol class="pay-flowline">${flow.map(f=>`<li>${f}</li>`).join('')}</ol><p class="cap">An order is only marked paid after Stoora receives that verified confirmation. Opening a payment page doesn’t count.</p>`)}
 ${S5(5,'Track your payments',`<p class="t-body">Stoora shows each payment next to its order. For full payment and settlement details, open your Razorpay Dashboard.</p><div class="btns"><a class="btn line" href="#payments-transactions">View payments in Stoora</a>${extA(RZP.dash,'Open Razorpay Dashboard')}</div>`)}</ol>` }
function paymentsSetup(){ return {title:'Payments · Set up',crumbTitle:'Set up',crumb:[['Payments','payments']],body:`${payHead('payments-setup','Start accepting online payments','Five steps. You do the first two with Razorpay, and Stoora takes it from there.')}
 <div class="pay-grid"><div class="anim" style="--i:2">${paySteps()}</div>
 <aside class="anim" style="--i:3"><section class="hx-sec pay-dev"><h2 class="ct">${ic('code','sm')}For your developer</h2><p class="cap">Backend work needed before payments go live:</p><ul class="notes">
  <li><b>Connect flow.</b> Authorise the seller’s Razorpay account on the server. Keys and tokens stay server-side.</li>
  <li><b>Create payments.</b> A server endpoint that creates the order or payment link.</li>
  <li><b>Verify.</b> A webhook endpoint that checks Razorpay’s signature, then marks the order paid.</li>
  <li><b>Store and sync.</b> Save payment, refund and settlement records and show them here.</li></ul><p class="cap">Details are in README.md.</p></section></aside></div>`} }
function paymentsHelp(){ const FAQ=[
 ['How do I create a Razorpay account?',`Go to Razorpay’s website and register there. Razorpay will tell you what it needs to verify your account. Stoora doesn’t handle that registration. ${extA(RZP.site,'Razorpay website','link')}`],
 ['How do I connect Razorpay to Stoora?','The connection is made with a sign-in through Razorpay once Stoora’s payment connection is switched on. You never need to paste secret keys into Stoora. In this preview the connection isn’t available yet.'],
 ['How can I check whether a customer paid?','Open the order or the Payments list in Stoora and look at the status. A payment shows as Successful only after Razorpay confirms it. You can always check the same payment in your Razorpay Dashboard.'],
 ['Why is my payment pending?','Pending means the payment isn’t confirmed yet. The customer may not have finished paying, or the bank may not have confirmed it. Check its status in your Razorpay Dashboard. Stoora marks the order paid only after confirmation.'],
 ['Where can I check my settlement?',`Settlements are the transfers from Razorpay to your bank account. Open your Razorpay Dashboard to see them. ${extA(RZP.dash,'Razorpay Dashboard','link')}`],
 ['What should I do if a payment fails?','Ask the customer to try again, or send them the payment link again. If money left their account but the order isn’t marked paid, ask them to check with their bank, and look for the payment in your Razorpay Dashboard.']];
 return {title:'Payments · Help',crumbTitle:'Help',crumb:[['Payments','payments']],body:`${payHead('payments-help','Payments help','Short answers to common questions.')}
 <section class="hx-sec anim" style="--i:2"><div class="faq">${FAQ.map(([q,a])=>`<details><summary>${q}${ic('expand_more','sm')}</summary><div class="a">${a}</div></details>`).join('')}</div>
  <p class="cap" style="margin-top:var(--s3)">For anything about your Razorpay account, Razorpay’s own documentation is the best place to look. ${extA(RZP.docs,'Razorpay documentation','link')}</p></section>`} }
SCREENS.payments={fn:paymentsOverview}; SCREENS['payments-transactions']={fn:paymentsTransactions}; SCREENS['payments-setup']={fn:paymentsSetup}; SCREENS['payments-help']={fn:paymentsHelp};

/* Money keeps its job; it points to Payments for online payments */
const _money=SCREENS.money.fn;
SCREENS.money.fn=function(){ const m=_money(); m.body+=`<section class="hx-sec" style="margin-top:var(--s4)"><div class="row" style="flex-wrap:wrap;gap:var(--s3)"><div class="grow" style="min-width:220px"><h2 class="ct">Online payments</h2><p class="cap">Accept UPI at your shop link with Razorpay, and track those payments separately from cash and manual entries.</p></div><a class="btn line" href="#payments">Open Payments</a></div></section>`; return m };

/* ================= HELP & SUPPORT ================= */
SCREENS.help={fn:()=>{ const FAQ=[
 ['How do I add my first product or service?','Open Products (or Services) and tap Add. A name and a price are enough to start.'],
 ['How do I share my shop link?','Open Storefront, copy your link, and send it to your customers.'],
 ['How do I accept online payments?','Open Payments and follow the five steps.'],
 ['How do I change my business type?','Open Profile, then choose Change next to your business type.'],
 ['Does Stoora change anything by itself?','No. Stoora suggests, and nothing is sent or changed until you tap.']];
 return {title:'Help & Support',body:`<div class="phead anim"><div class="l"><h1 class="h1">Help & Support</h1><p class="t-body">Quick answers and where to go next.</p></div></div>
 <div class="hx-cols"><section class="hx-sec anim" style="--i:1"><div class="hx-h"><h2 class="ct">Common questions</h2></div><div class="faq">${FAQ.map(([q,a])=>`<details><summary>${q}${ic('expand_more','sm')}</summary><div class="a">${a}</div></details>`).join('')}</div></section>
 <div class="stack anim" style="--i:2"><section class="hx-sec"><h2 class="ct">Guides</h2><div class="hx-list" style="margin-top:var(--s2)"><a class="hx-row" href="#payments-setup"><span class="ic pay">${ic('credit_card','sm')}</span><span class="grow"><span class="t">Start accepting online payments</span><span class="s">Razorpay, step by step</span></span>${ic('chevron_right','t-cap')}</a><a class="hx-row" href="#payments-help"><span class="ic chat">${ic('help','sm')}</span><span class="grow"><span class="t">Payments help</span><span class="s">Pending, failed and settlements</span></span>${ic('chevron_right','t-cap')}</a></div></section>
 <section class="hx-sec"><h2 class="ct">Talk to Stoora support</h2><p class="cap">Support chat and email aren’t connected in this preview. They need Stoora’s support system behind them.</p></section></div></div>`} }};

/* ================= PROFILE ================= */
SCREENS.profile={fn:()=>{ const c=catOf(), p=profile();
 return {title:'Profile',narrow:true,body:`<div class="phead anim"><div class="l"><h1 class="h1">Profile</h1><p class="t-body">You, your login and your business type.</p></div></div>
 <div class="stack loose">
 <section class="hx-sec anim" style="--i:1"><div class="row" style="gap:var(--s3);flex-wrap:wrap"><span class="shop-av" style="width:56px;height:56px;font-size:22px;border-radius:16px" aria-hidden="true">${esc((SESSION?SESSION.name:S.shop.owner)[0].toUpperCase())}</span><div class="grow"><h2 class="ct">${esc(SESSION?SESSION.name:S.shop.owner)}</h2><p class="cap">${esc(SESSION?SESSION.email:S.shop.email)}${SESSION&&SESSION.demo?' · sample shop':''}</p></div></div>
  <div class="kv" style="margin-top:var(--s3)"><div class="r"><span>Business</span><b class="t-ink">${esc(S.shop.name)}</b></div><div class="r"><span>Shop link</span><span>stoora.in/${esc(S.shop.handle)}</span></div>${p.city?`<div class="r"><span>City</span><span>${esc(p.city)}</span></div>`:''}${p.bizPhone?`<div class="r"><span>Business phone</span><span>${esc(p.bizPhone)}</span></div>`:''}</div></section>
 <section class="hx-sec anim" style="--i:2"><div class="row" style="gap:var(--s3);flex-wrap:wrap"><span class="ci cat-ico">${ic(c.i)}</span><div class="grow"><span class="label">Business type</span><h2 class="ct">${hasCat()?c.t:'Not chosen yet'}${p.sub?` <span class="cap">· ${esc(p.sub)}</span>`:''}</h2><p class="cap">${hasCat()?'Home and the menu follow this.':'Choose one so Stoora can arrange Home for you.'}</p></div><button class="btn line" data-fx="cat-change">${hasCat()?'Change':'Choose'}</button></div></section>
 <section class="hx-sec anim" style="--i:3"><div class="row" style="flex-wrap:wrap"><div class="grow"><h2 class="ct">Log out</h2><p class="cap">You’ll go back to the stoora.in website.</p></div><button class="btn line" data-act="logout">${ic('logout','sm')}Log out</button></div></section></div>`} }};
function openCatPicker(){ const cur=profile().category; ui._cat=cur||null;
 setLayer(sheet('cp','Your business type',`<div class="cats cats-sheet" role="radiogroup" aria-label="Business category">${CATS.map(x=>`<button type="button" class="cat ${cur===x.id?'on':''}" role="radio" aria-checked="${cur===x.id}" data-fx="cp-pick" data-id="${x.id}"><span class="ci">${ic(x.i)}</span><span class="grow"><b>${x.t}</b><span>${x.d}</span></span><span class="tick" aria-hidden="true">${ic('check','xs')}</span></button>`).join('')}</div>`,
  `<button class="btn line" data-act="close">Cancel</button><button class="btn primary" data-fx="cp-save">Save</button>`)) }

/* ================= events ================= */
document.addEventListener('click',e=>{ const el=e.target.closest('[data-fx]'); if(!el) return; const k=el.dataset.fx, d=el.dataset;
 switch(k){
  case 'collapse': { const on=document.body.classList.toggle('side-min'); store.set('stoora.sideMin',on); return render(false) }
  case 'ob-cat': OB.cat=d.id; OB.err={}; if(!CATS.find(x=>x.id===OB.cat).subs.includes(OB.sub)) OB.sub=''; return renderOnboarding();
  case 'ob-sub': OB.sub=OB.sub===d.v?'':d.v; return renderOnboarding();
  case 'ob-back': OB.step=Math.max(1,OB.step-1); OB.err={}; OB.fail=''; return renderOnboarding();
  case 'ob-go': OB.step=+d.s; return renderOnboarding();
  case 'ob-next': if(OB.busy) return; if(!obValidate()){ renderOnboarding(); const f=$('.ob .bad,.ob .err'); f&&f.scrollIntoView({block:'center'}); return }
   if(OB.step<3){ OB.step++; return renderOnboarding() } return obFinish();
  case 'tx': return openTx(d.id);
  case 'pay-range': payUI.range=d.v; return render(false);
  case 'pay-status': payUI.status=d.v; return render(false);
  case 'rzp-connect': return setLayer(sheet('rz','Connecting Razorpay',`<div class="stack"><p class="t-soft">The connection isn’t switched on in this preview, so nothing has been connected and no payments can be taken yet.</p><p class="t-soft">When it’s ready, you’ll sign in through Razorpay to allow Stoora to receive payment confirmations. You will never be asked to paste secret API keys into Stoora.</p><div class="banner info">${ic('code')}<span>Needs server work: authorising the seller’s account, creating payments and verifying Razorpay’s signed confirmations. See README.md.</span></div></div>`,`<button class="btn ink" data-act="close">Got it</button>`));
  case 'cat-change': return openCatPicker();
  case 'cp-pick': ui._cat=d.id; document.querySelectorAll('.cats-sheet .cat').forEach(b=>{ const on=b.dataset.id===d.id; b.classList.toggle('on',on); b.setAttribute('aria-checked',on) }); return;
  case 'cp-save': if(!ui._cat) return toast('Choose a business type first',null,'info'); saveProfile({category:ui._cat,sub:ui._cat===profile().category?profile().sub:''}); closeOv(true); render(false); return toast('Business type updated') } });
document.addEventListener('input',e=>{ const t=e.target;
 if(t.dataset.fxIn&&OB){ OB[t.dataset.fxIn]=t.value; if(OB.err[t.dataset.fxIn]){ delete OB.err[t.dataset.fxIn]; t.classList.remove('bad'); const er=t.parentElement.querySelector('.err'); er&&er.remove() } return }
 if(t.dataset.fxIn==='paysearch'){ payUI.q=t.value; $('#pay-list').innerHTML=txList() } });
document.addEventListener('change',e=>{ const t=e.target; if(t.dataset.fxChk){ const c=store.get('stoora.rzpChecklist')||{}; c[t.dataset.fxChk]=t.checked; store.set('stoora.rzpChecklist',c) } });
document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('tr[data-fx="tx"]')) openTx(e.target.dataset.id) });

/* ---------- boot ---------- */
if(store.get('stoora.sideMin')) document.body.classList.add('side-min');
/* ask the server who is logged in, then draw the first screen */
api('GET','/api/public-config').then(c=>{ PUBLIC_CONFIG=c }).catch(()=>{})
  .then(()=>api('GET','/api/me')).then(r=>{ SESSION=sessionFrom(r.user); applySession(SESSION) }).catch(()=>{ SESSION=null }).finally(()=>render(true));
