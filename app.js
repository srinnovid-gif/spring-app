let user=null,userRole=null,userName=null,accountId=null;
let products={},menuItems={},orders={},suppliers={},userAccounts={},menuLastChanged=null,menuPrevCount=0;
let currentTab='inventario';
let editKey=null,delKey=null,confFn=null;
let menuView='dia',menuOffset=0;

const ROLES={
  gerente:{label:'★ Gerente',tabs:['inventario','menu','pedidos','proveedores','resumen']},
  chef:{label:'⬡ Chef',tabs:['inventario','menu','pedidos']},
  cocinero:{label:'✂ Cozinheiro',tabs:['inventario','menu']},
  deposito:{label:'▣ Estoque',tabs:['inventario','pedidos']},
  salon:{label:'⬜ Salão',tabs:['menu']},
  bar:{label:'◬ Bar',tabs:['menu','pedidos']},
};
const TAB_LABELS={inventario:'🥩 Inventário',menu:'📋 Menú',pedidos:'🛒 Pedidos',proveedores:'🏪 Fornecedores',resumen:'📊 Resumo'};
const CAT_COLORS={Res:'#c0392b',Pollo:'#e67e22',Cerdo:'#8e44ad',Pescado:'#2980b9',Suplemento:'#27ae60',Lácteos:'#16a085',Vegetales:'#27ae60',Otro:'#7f8c8d'};
const UNITS=['kg','g','Piezas','Paquetes','Frascos','Cajas','Litros','Unidadees'];
const CATS=['Res','Pollo','Cerdo','Pescado','Suplemento','Lácteos','Vegetales','Otro'];
const DISH_CATS=['Entrada','Plato Principal','Acompañamiento','Postre','Bebida'];

function waitFB(cb,t=0){if(window._fb){cb();}else if(t<30){setTimeout(()=>waitFB(cb,t+1),200);}else{alert('Error conectando Firebase');}}

window.addEventListener('load',()=>{
  window._splashStart=Date.now();

  // Detect if running as installed PWA/APK (standalone mode)
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||
                     window.navigator.standalone===true||
                     document.referrer.includes('android-app://');

  const hasSession=localStorage.getItem('spring_session');

  if(hasSession && isStandalone){
    // APK with session: show only logo for 1.5s - fast and clean
    const eslogan=document.getElementById('sp-eslogan');
    const tagline=document.getElementById('sp-tagline');
    const barFill=document.getElementById('sp-bar-fill');
    if(eslogan) eslogan.style.display='none';
    if(tagline) tagline.style.display='none';
    if(barFill){barFill.style.animationDuration='1.5s';}
    const logoCenter=document.getElementById('sp-logo-center');
    if(logoCenter){
      logoCenter.style.animation='none';
      logoCenter.style.opacity='0';
      // Epic scale-in transition
      setTimeout(()=>{
        logoCenter.style.transition='opacity .4s ease, transform .5s cubic-bezier(0.16,1,0.3,1)';
        logoCenter.style.opacity='1';
        logoCenter.style.transform='scale(1)';
      },50);
    }
  } else if(!isStandalone && hasSession){
    // Browser with session: skip splash entirely
    const splash=document.getElementById('splash');
    if(splash) splash.style.display='none';
  }

  waitFB(()=>{
    const{auth,onAuthStateChanged}=window._fb;
    // Add timeout only for splash animation, not for auth
    setTimeout(()=>{
      const s=document.getElementById('splash');
      if(s&&s.style.opacity!=='0'){
        s.style.opacity='0';
        setTimeout(()=>s.style.display='none',1800);
      }
    },8000);
    onAuthStateChanged(auth,u=>{
      hideSplash();
      if(u){user=u;loadUser();}
      else{showAuth();}
    });
  });
});

function hideSplash(){
  const s=document.getElementById('splash');
  if(!s||s.style.display==='none')return;
  const pct=document.getElementById('splash-pct');
  if(pct)pct.textContent='Pronto ✓';
  const hasSession=localStorage.getItem('spring_session');
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||
                     window.navigator.standalone===true||
                     document.referrer.includes('android-app://');
  let minTime=8000; // first login - full splash
  if(hasSession && isStandalone) minTime=1500; // APK with session - 1.5s
  if(!isStandalone && hasSession) minTime=0; // browser - instant
  const elapsed=Date.now()-window._splashStart;
  const remaining=Math.max(0,minTime-elapsed);
  setTimeout(()=>{
    s.style.opacity='0';
    s.style.transition='opacity .5s ease';
    setTimeout(()=>s.style.display='none',500);
  },remaining);
}
function showAuth(){document.getElementById('auth').style.display='flex';}
function showApp(){
  localStorage.setItem('spring_session','1');
  document.getElementById('auth').style.display='none';
  document.getElementById('app').style.display='flex';
  document.getElementById('bottom-nav').style.display='flex';
  initScrollNav();
  // Start alarm checker if active
  const savedAlarm=JSON.parse(localStorage.getItem('spring_alarm')||'{}');
  if(savedAlarm.active) startAlarmChecker();
  // Show mood modal once per day
  const today=dkey(new Date());
  const lastMood=localStorage.getItem('spring_mood_day');
  if(lastMood!==today){
    setTimeout(()=>{
      const modal=document.getElementById('mood-modal');
      if(modal) modal.style.display='flex';
    },1200);
  }
}

function initScrollNav(){
  const nav=document.getElementById('bottom-nav');
  const app=document.getElementById('app');
  if(!nav||!app) return;

  let lastY=0;
  let ticking=false;
  let hideTimer=null;

  app.addEventListener('scroll',()=>{
    if(ticking) return;
    ticking=true;
    requestAnimationFrame(()=>{
      const y=app.scrollTop;
      const delta=y-lastY;

      if(delta>8){
        // Scrolling down - hide nav
        nav.classList.add('hidden');
      } else if(delta<-8){
        // Scrolling up - show nav
        nav.classList.remove('hidden');
      }

      lastY=y;
      ticking=false;
    });
  },{passive:true});

  // Also handle touch swipe on the whole document
  let touchStartY=0;
  document.addEventListener('touchstart',(e)=>{
    touchStartY=e.touches[0].clientY;
  },{passive:true});

  document.addEventListener('touchend',(e)=>{
    const dy=touchStartY-e.changedTouches[0].clientY;
    if(dy>30){
      // Swipe up (scrolling down) - hide
      nav.classList.add('hidden');
    } else if(dy<-30){
      // Swipe down (scrolling up) - show
      nav.classList.remove('hidden');
    }
  },{passive:true});
}

function showWelcomeModal(){
  const modal=document.createElement('div');
  modal.id='welcome-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(20,10,5,0.7);z-index:300;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(10px);animation:fadeIn .3s ease';
  modal.innerHTML=`
    <div style="background:var(--bg);border-radius:28px 28px 0 0;padding:32px 24px 48px;width:100%;max-width:480px;box-shadow:0 -8px 48px rgba(44,26,14,0.18);animation:slideUp .35s cubic-bezier(.32,.72,0,1)">
      <div style="width:40px;height:4px;background:var(--b3);border-radius:2px;margin:0 auto 28px"></div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <div style="width:52px;height:52px;border-radius:16px;background:rgba(196,84,26,0.10);border:1px solid rgba(196,84,26,0.20);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🌿</div>
        <div>
          <div style="font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:3px">Bem-vindo de volta</div>
          <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--t1)">${userName.split(' ')[0]}</div>
        </div>
      </div>
      <div style="background:var(--s1);border:1px solid var(--b1);border-radius:18px;padding:20px;margin-bottom:20px;text-align:center">
        <div style="font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:10px">Seu código de acesso</div>
        <div style="font-family:var(--font-h);font-size:48px;font-weight:700;color:var(--acc);letter-spacing:10px">${accountId}</div>
        <div style="font-size:12px;color:var(--t3);margin-top:8px">Guarde este código com segurança</div>
      </div>
      <p style="font-size:14px;color:var(--t2);margin-bottom:20px;text-align:center">Deseja personalizar seu código de acesso?</p>
      <div style="display:flex;gap:10px">
        <button id="btn-manter" style="flex:1;background:var(--s2);border:1.5px solid var(--b2);border-radius:14px;padding:14px;font-size:14px;font-family:var(--font-b);cursor:pointer;font-weight:600;color:var(--t1);transition:all .2s">Manter</button>
        <button id="btn-alterar" style="flex:1;background:var(--acc);border:none;border-radius:14px;padding:14px;font-size:14px;font-weight:700;font-family:var(--font-b);cursor:pointer;color:#fff;box-shadow:0 4px 16px var(--acc-glow);transition:all .2s">Personalizar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-manter').onclick=()=>modal.remove();
  document.getElementById('btn-alterar').onclick=()=>showChangeCode(modal);
}

function showChangeCode(modal){
  modal.querySelector('div').innerHTML=`
    <div style="width:40px;height:4px;background:var(--b3);border-radius:2px;margin:0 auto 28px"></div>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
      <div style="width:52px;height:52px;border-radius:16px;background:rgba(196,84,26,0.10);border:1px solid rgba(196,84,26,0.20);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🔑</div>
      <div>
        <div style="font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:3px">Personalizar</div>
        <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--t1)">Novo código</div>
      </div>
    </div>
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:18px;padding:20px;margin-bottom:20px">
      <div style="font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:10px;text-align:center">Digite 4 dígitos</div>
      <input id="new-code" type="number" placeholder="0000" oninput="if(this.value.length>4)this.value=this.value.slice(0,4)" 
        style="width:100%;box-sizing:border-box;background:var(--s2);border:1.5px solid var(--b2);border-radius:12px;padding:14px;color:var(--t1);font-size:32px;font-family:var(--font-h);font-weight:700;outline:none;letter-spacing:10px;text-align:center"/>
    </div>
    <div style="display:flex;gap:10px">
      <button id="btn-cancelar" style="flex:1;background:var(--s2);border:1.5px solid var(--b2);border-radius:14px;padding:14px;font-size:14px;font-family:var(--font-b);cursor:pointer;color:var(--t1);font-weight:600">Cancelar</button>
      <button id="btn-salvar" style="flex:1;background:var(--acc);border:none;border-radius:14px;padding:14px;font-size:14px;font-weight:700;font-family:var(--font-b);cursor:pointer;color:#fff;box-shadow:0 4px 16px var(--acc-glow)">Salvar</button>
    </div>`;
  document.getElementById('btn-cancelar').onclick=()=>modal.remove();
  document.getElementById('btn-salvar').onclick=()=>saveNewCode(modal);
}

async function saveNewCode(modal){
  const newCode=document.getElementById('new-code').value.trim();
  if(!newCode||newCode.length!==4||isNaN(newCode)){showToast('O código deve ter exatamente 4 dígitos');return;}
  // Ask confirmation
  const confirmed=confirm(`Tem certeza que deseja alterar seu código para ${newCode}?\n\nGuarde este código com segurança — você precisará dele para entrar.`);
  if(!confirmed)return;
  try{
    const{db,ref,update}=window._fb;
    await update(ref(db,`userAccounts/${user.uid}`),{code:newCode});
    accountId=newCode;
    modal.remove();
    showToast('Código alterado com sucesso ✓');
  }catch(e){
    showToast('Erro ao alterar código');
  }
}

function authTab(t){
  document.getElementById('login-f').style.display=t==='login'?'block':'none';
  document.getElementById('reg-f').style.display=t==='register'?'block':'none';
  document.querySelectorAll('.tab2').forEach((el,i)=>el.classList.toggle('on',(i===0)===(t==='login')));
  document.getElementById('auth-err').textContent='';
}
function setErr(m){document.getElementById('auth-err').textContent=m;}

async function doLogin(){
  const code=document.getElementById('l-code').value.trim();
  if(!code){setErr('Digite seu código de acesso');return;}
  if(code.length!==4){setErr('O código deve ter 4 dígitos');return;}
  try{
    const{auth,db,ref,get,signInWithEmailAndPassword}=window._fb;
    const snap=await get(ref(db,'userAccounts'));
    if(!snap.exists()){setErr('Nenhum usuário encontrado');return;}
    let foundData=null;let foundEmail=null;
    snap.forEach(child=>{
      const d=child.val();
      if(d.code&&String(d.code)===String(code)){foundData=d;foundEmail=d.email;}
    });
    if(!foundData){setErr('Código não encontrado');return;}
    if(foundData.status==='pendente'){setErr('Acesso ainda não aprovado. Aguarde o e-mail com seu código.');return;}
    // Try stored password
    const passwords=[
      foundData.password,
      code,
      foundData.firstName?foundData.firstName.toLowerCase().replace(/\s/g,'')+String(foundData.birthday||'').replace(/-/g,''):'',
    ].filter(Boolean);
    let loggedIn=false;
    for(const p of passwords){
      try{
        await signInWithEmailAndPassword(auth,foundEmail,p);
        loggedIn=true;
        break;
      }catch(e){continue;}
    }
    if(!loggedIn){setErr('Não foi possível autenticar. Contate o administrador.');}
  }catch(e){
    setErr('Erro: '+e.message);
  }
}

async function doRegister(){
  const name=document.getElementById('r-name').value.trim();
  const lastname=document.getElementById('r-lastname')?.value.trim()||'';
  const email=document.getElementById('r-email').value.trim();
  const role=document.getElementById('r-role').value;
  if(!role){showAuthErr('Selecione sua função');return;}
  const phone=document.getElementById('r-phone')?.value.trim()||'';
  const day=document.getElementById('r-day')?.value||'';
  const month=document.getElementById('r-month')?.value||'';
  const year=document.getElementById('r-year')?.value||'';
  const birthday=day&&month&&year?`${year}-${month}-${day}`:'';
  // Auto-generate password: name+birthday digits
  const pass=name.toLowerCase().replace(/\s/g,'')+year+month+day;
  if(!name||!lastname||!email||!phone||!birthday){setErr('Preencha todos os campos obrigatórios (*)');return;}
  try{
    const{auth,db,ref,set,createUserWithEmailAndPassword,signOut}=window._fb;
    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    // Save user as pending - no code yet
    const sede=document.getElementById('r-sede')?.value||'juveve';
    await set(ref(db,`userAccounts/${cred.user.uid}`),{
      code:'',role,
      name:`${name} ${lastname}`.trim(),
      firstName:name,lastName:lastname,
      email,phone,birthday,sede,
      status:'pendente',
      password:pass,
      createdAt:Date.now()
    });
    // Send email to admin
    try{
      const roleLabel=ROLES[role]?.label||role;
      await emailjs.send('service_ch1zqsy','template_uw9djui',{
        name:`${name} ${lastname}`,
        email,
        role:roleLabel,
        phone:phone||'Não informado',
        birthday:birthday||'Não informado',
        code:'Aguardando aprovação'
      },'OVEsOgP7lLroHL8Bo');
    }catch(emailErr){console.warn('EmailJS:',emailErr);}
    // Sign out and show pending screen
    await signOut(auth);
    showPendingScreen();
  }catch(e){
    if(e.code==='auth/email-already-in-use')setErr('Este e-mail já está cadastrado');
    else setErr('Erro: '+e.message);
  }
}

function showPendingScreen(){
  document.getElementById('auth').innerHTML=`
    <div class="auth-wrap">
      <div style="font-family:var(--font-h);font-size:48px;font-weight:700;text-align:center;margin-bottom:4px;color:var(--t1)">Spring<span style="color:var(--acc)">.</span></div>
      <div style="text-align:center;font-size:11px;color:var(--t3);letter-spacing:4px;text-transform:uppercase;margin-bottom:32px">Gestão de Cozinha</div>
      <div style="background:var(--s1);border:1px solid var(--b2);border-radius:24px;padding:32px 24px;text-align:center;box-shadow:0 4px 32px rgba(80,45,20,0.10)">
        <div style="font-size:48px;margin-bottom:16px">🌿</div>
        <div style="font-family:var(--font-h);font-size:24px;font-weight:700;margin-bottom:12px;color:var(--t1)">Solicitação enviada!</div>
        <p style="font-size:15px;color:var(--t2);line-height:1.6;margin-bottom:20px">Seu cadastro foi recebido. Em breve você receberá um <strong>código de acesso</strong> no seu e-mail.</p>
        <div style="background:var(--s2);border-radius:14px;padding:16px;margin-bottom:20px">
          <p style="font-size:12px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;font-weight:600">Próximo passo</p>
          <p style="font-size:14px;color:var(--t1)">Aguarde o e-mail com o código e volte para fazer login</p>
        </div>
        <button onclick="location.reload()" style="background:var(--acc);color:#fff;border:none;border-radius:12px;padding:13px 24px;font-size:15px;font-family:var(--font-b);font-weight:600;cursor:pointer;width:100%;box-shadow:0 4px 14px var(--acc-glow)">Ir para o Login</button>
      </div>
    </div>`;
}

async function doLogout(){
  localStorage.removeItem('spring_session');
  document.getElementById('bottom-nav').style.display='none';
  const{auth,signOut}=window._fb;
  await signOut(auth);
  user=null;userRole=null;accountId=null;
  products={};menuItems={};orders={};suppliers={};
  document.getElementById('app').style.display='none';
  document.getElementById('fab').style.display='none';
  showAuth();
}

async function loadUser(){
  const{db,ref,get,onValue}=window._fb;
  const snap=await get(ref(db,`userAccounts/${user.uid}`));
  if(!snap.exists()){doLogout();return;}
  const data=snap.val();
  // Check if user is pending approval
  if(data.status==='pendente'||!data.code){
    const{auth,signOut}=window._fb;
    await signOut(auth);
    hideSplash();
    showPendingScreen();
    return;
  }
  userRole=data.role||'salon';
  userName=data.name||user.email;
  accountId=data.code||'SPRING-001';
  document.getElementById('role-badge').textContent=ROLES[userRole]?.label||userRole;

  buildNav();
  showApp();
  // Show welcome modal only once ever (localStorage persists across sessions)
  if(!localStorage.getItem('welcomeShown_'+user.uid)){
    localStorage.setItem('welcomeShown_'+user.uid,'1');
    setTimeout(()=>showWelcomeModal(),800);
  }
  // Listen to userAccounts for pending users notification
  onValue(ref(db,'userAccounts'),s=>{userAccounts=s.val()||{};refreshView();});
  onValue(ref(db,`accounts/${accountId}/products`),s=>{products=s.val()||{};refreshView();});
  onValue(ref(db,`accounts/${accountId}/menu`),s=>{
    const newItems=s.val()||{};
    const newCount=Object.keys(newItems).length;
    const today=dkey(new Date());
    const todayItemsNew=Object.values(newItems).filter(m=>m.date===today);
    const todayItemsOld=Object.values(menuItems).filter(m=>m.date===today);
    if(menuPrevCount>0 && (newCount!==menuPrevCount || JSON.stringify(todayItemsNew)!==JSON.stringify(todayItemsOld))){
      menuLastChanged=new Date();
    }
    menuPrevCount=newCount;
    menuItems=newItems;
    refreshView();
  });
  onValue(ref(db,`accounts/${accountId}/orders`),s=>{orders=s.val()||{};refreshView();});
  onValue(ref(db,`accounts/${accountId}/suppliers`),s=>{suppliers=s.val()||{};refreshView();});
}

const NAV_ICONS={
  inventario:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="7" cy="6" r="1" fill="currentColor"/><circle cx="7" cy="12" r="1" fill="currentColor"/><circle cx="7" cy="18" r="1" fill="currentColor"/></svg>`,
  menu:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M8 8h5M8 16h6"/></svg>`,
  pedidos:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  proveedores:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  resumen:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
};
const NAV_LABELS={inventario:'Inventário',menu:'Cardápio do dia',pedidos:'Pedidos',proveedores:'Fornecedores',resumen:'Resumo'};
const NAV_SUBS={inventario:'Estoque e produtos',menu:'Cardápio do buffet',pedidos:'Lista de compras',proveedores:'Contatos',resumen:'Visão gerencial'};
const NAV_COLS={inventario:'inv',menu:'men',pedidos:'ped',proveedores:'pro',resumen:'res'};

function buildNav(){
  // Always go to home screen on login
  document.getElementById('home-screen').style.display='block';
  document.getElementById('inner-screen').style.display='none';
  document.getElementById('fab').style.display='none';
  // Set home as active in bottom nav
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  const homeBtn=document.getElementById('bnav-home');
  if(homeBtn) homeBtn.classList.add('active');
  currentTab=null;
  renderHome();
}

function renderHome(){
  // Date
  const now=new Date();
  document.getElementById('home-date').textContent=now.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
  // Hero header - always centered layout
  const greetEl=document.getElementById('hdr-greeting');
  if(greetEl) greetEl.textContent='Olá,';
  const heroName=document.getElementById('home-hero-name');
  if(heroName) heroName.textContent=userName.split(' ')[0];
  // Force avatar size
  const avatarEl=document.getElementById('user-avatar');
  if(avatarEl){
    avatarEl.style.width='96px';
    avatarEl.style.height='96px';
  }

  // Quick stats - only for estoque and gerente
  const arr=Object.values(products);
  const low=arr.filter(p=>p.quantity<=p.minStock);
  const val=arr.reduce((a,p)=>a+(p.quantity*p.price),0);

  // HOME quick stats - only deposito sees them here
  if(userRole==='deposito'){
    document.getElementById('qs-row').innerHTML=`
      <div class="qs stat-btn" onclick="goTab('inventario')">
        <div class="qs-val">${arr.length}</div>
        <div class="qs-lbl">Produtos</div>
      </div>
      <div class="qs${low.length?' alert':''} stat-btn" onclick="goTabAndFilter()">
        <div class="qs-val${low.length?' r':''}">${low.length}</div>
        <div class="qs-lbl">Acabando ${low.length?'↗':''}</div>
      </div>
      <div class="qs">
        <div class="qs-val g" style="font-size:${val>99999?'14px':'22px'}">R$${Math.round(val/1000)>0?Math.round(val/1000)+'k':Math.round(val)}</div>
        <div class="qs-lbl">Valor</div>
      </div>`;
  } else {
    document.getElementById('qs-row').innerHTML='';
  }

  // Bater Ponto - ALL roles see this
  const baterPontoWrap=document.getElementById('bater-ponto-wrap');
  if(baterPontoWrap) baterPontoWrap.innerHTML='';

  // Alert strip
  // Last minute menu change notification
  const menuChangeRecent=menuLastChanged&&((new Date()-menuLastChanged)<3600000);



  // Pending users notification for gerente
  const pendingCount=userRole==='gerente'?Object.values(userAccounts).filter(u=>u.status==='pendente').length:0;

  // Compact notification dots instead of full banners
  let notifs = [];
  // Update notification dot only
  const notifDot2=document.getElementById('notif-dot');
  const hasNotifs=pendingCount>0||low.length>0||menuChangeRecent;
  if(notifDot2) notifDot2.style.display=hasNotifs?'block':'none';

  // Community categories - same for all roles
  const COMMUNITY_CATS=[
    {id:'equipe',      label:'Equipe'},
    {id:'aniversarios',label:'Aniversários'},
    {id:'cardapio_dia',label:'Cardápio'},
    {id:'folga',       label:'Folga'},
    {id:'eventos',     label:'Eventos'},
  ];

  // Role-specific categories
  const roleTabs=ROLES[userRole]?.tabs||[];
  const CAT_LABELS={inventario:'Inventário',menu:'Cardápio',pedidos:'Pedidos',proveedores:'Fornecedores',resumen:'Resumo'};
  const CAT_ICONS={
    inventario:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    menu:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    pedidos:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    proveedores:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    resumen:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
  };

  // Build all cats: community first, then role-specific
  const roleCats=roleTabs.map(t=>({id:t,label:CAT_LABELS[t]||t,icon:CAT_ICONS[t]||'',role:true}));
  const allCats=[...COMMUNITY_CATS,...roleCats];

  document.getElementById('big-nav').innerHTML=`
    <div style="display:flex;gap:14px;padding:12px 20px 16px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch">
      ${allCats.map(c=>`
        <button onclick="goCategory('${c.id}')" style="display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:none;cursor:pointer;flex-shrink:0;padding:0;">
          <div style="
            width:56px;height:56px;border-radius:50%;
            background:transparent;
            border:1.5px solid rgba(0,0,0,0.15);
            display:flex;align-items:center;justify-content:center;
            transition:all .18s;
          " onpointerdown="this.parentElement.querySelector('div').style.background='rgba(0,0,0,0.06)'" onpointerup="this.parentElement.querySelector('div').style.background='transparent'" onpointerleave="this.parentElement.querySelector('div').style.background='transparent'">
          </div>
          <div style="font-family:var(--font-b);font-size:10px;color:var(--t3);font-weight:500;text-align:center;line-height:1.3;max-width:62px">${c.label}</div>
        </button>`).join('')}
    </div>`;



  // Render ponto button first (sync - no async dependencies)
  const pontoWrapEl=document.getElementById('ponto-wrap');
  if(pontoWrapEl) pontoWrapEl.innerHTML=renderPontoBtn();
  setTimeout(()=>updatePontoUI(), 150);

  // Render async widgets
  const hcardsWrap=document.getElementById('hcards-wrap');
  if(hcardsWrap) renderHorizontalCards(hcardsWrap);
  const muralWrap=document.getElementById('mural-wrap');
  if(muralWrap) renderMural(muralWrap);
  const rankingWrap=document.getElementById('ranking-wrap');
  if(rankingWrap) renderRanking(rankingWrap);

  // Today menu preview
  const td=dkey(new Date());
  const todayItems=Object.values(menuItems).filter(m=>m.date===td);
  const wrap=document.getElementById('today-menu-wrap');
  const roleTabs2=ROLES[userRole]?.tabs||[];
  if(roleTabs2.includes('menu')){
    wrap.innerHTML=`
      <div style="padding:0 20px">
        <div class="today-menu-hdr">
          <div class="today-menu-title">Cardápio de Hoje</div>
          <button class="today-menu-link" onclick="goTab('menu')">Ver tudo →</button>
        </div>
        ${todayItems.length?todayItems.slice(0,3).map(m=>`
          <div class="today-dish">
            <div class="today-dish-cat">🍽️</div>
            <div><div style="font-family:var(--font-b);font-size:16px;font-weight:600;color:var(--t1)">${m.name}</div><div class="today-dish-type">${m.category||''}</div></div>
          </div>`).join(''):`<div class="today-empty">Nenhum prato cadastrado para hoje</div>`}
      </div>`;
  }else{wrap.innerHTML='';}
}

function goHome(){
  document.getElementById('home-screen').style.display='block';
  document.getElementById('inner-screen').style.display='none';
  document.getElementById('fab').style.display='none';
  document.getElementById('bottom-nav').style.display='flex';
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  const homeBtn=document.getElementById('bnav-home');
  if(homeBtn) homeBtn.classList.add('active');
  history.pushState({tab:'home'},'','?tab=home');
  renderHome();
}

function bnavGo(tab){
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('bnav-'+tab);
  if(btn) btn.classList.add('active');
  if(tab==='home'){goHome();return;}
  if(tab==='perfil'){showPerfil();return;}
  if(tab==='taxas'||tab==='escala'){showToast('Em breve!');return;}
  goTab(tab);
}

// Handle browser/phone back button
window.addEventListener('popstate',(e)=>{
  if(!user)return;
  const homeVisible=document.getElementById('home-screen').style.display!=='none';
  if(homeVisible){
    // Already on home - push state again to prevent exit
    history.pushState({tab:'home'},'','?tab=home');
  } else {
    goHome();
  }
});

function refreshView(){
  const homeVisible = document.getElementById('home-screen').style.display !== 'none';
  if(homeVisible){
    renderHome();
  } else {
    renderTab();
  }
}

function goTab(t){
  currentTab=t;
  document.getElementById('home-screen').style.display='none';
  document.getElementById('inner-screen').style.display='block';
  document.getElementById('inner-title').textContent=NAV_LABELS[t]||t;
  renderTab();
}

function renderTab(){
  const c=document.getElementById('main-content');
  const fab=document.getElementById('fab');
  fab.style.display='none';fab.onclick=null;
  c.innerHTML='';
  if(currentTab==='inventario')doInventário(c,fab);
  else if(currentTab==='menu')doMenu(c,fab);
  else if(currentTab==='pedidos')doPedidos(c,fab);
  else if(currentTab==='proveedores')doFornecedores(c,fab);
  else if(currentTab==='resumen')doResumo(c);
}

// ── INVENTARIO ──
function doInventário(el,fab){
  const arr=Object.values(products);
  const low=arr.filter(p=>p.quantity<=p.minStock);
  const val=arr.reduce((a,p)=>a+(p.quantity*p.price),0);
  const canEdit=['gerente','chef','cocinero','deposito'].includes(userRole);

  // Show FAB immediately
  if(canEdit){
    fab.style.display='flex';
    fab.onclick=()=>openProd(null);
  }

  el.innerHTML=`
    <div style="padding:0 20px 14px">
      <div class="hero">
        <div class="hero-stats">
          <div class="hero-stat stat-btn" onclick="doInventário(document.getElementById('main-content'),document.getElementById('fab'))">
            <div class="hero-val">${arr.length}</div>
            <div class="hero-lbl">Produtos</div>
          </div>
          <div class="hero-divider"></div>
          <div class="hero-stat stat-btn" onclick="goTabAndFilter()">
            <div class="hero-val r">${low.length}</div>
            <div class="hero-lbl">Estoque Baixo</div>
          </div>
          <div class="hero-divider"></div>
          <div class="hero-stat">
            <div class="hero-val g" style="font-size:${val>99999?'14px':'22px'}">R$${Math.round(val).toLocaleString('pt-BR')}</div>
            <div class="hero-lbl">Valor</div>
          </div>
        </div>
      </div>
      ${low.length>0?`<div class="alert-banner" onclick="goTabAndFilter()">
        <div class="alert-banner-ico">⚠️</div>
        <div class="alert-banner-text">
          <div class="alert-banner-title">${low.length} produto${low.length>1?'s':''} com estoque baixo</div>
          <div class="alert-banner-sub">Toque para ver e adicionar ao pedido</div>
        </div>
        <div class="alert-banner-arr">›</div>
      </div>`:''}
    </div>
    <div class="srow" style="padding:0 20px">
      <input class="sinput" id="srch" placeholder="🔍 Buscar produto..." oninput="renderProductList()"/>
      <select class="sfilt" id="sfilt" onchange="renderProductList()">
        <option value="">Todos</option>${CATS.map(c=>`<option>${c}</option>`).join('')}
      </select>
    </div>
    <div style="padding:0 20px;display:flex;justify-content:flex-end;margin-bottom:8px">
      <div style="display:flex;background:var(--s2);border-radius:10px;border:1px solid var(--b2);overflow:hidden">
        <button id="btn-list" onclick="setView('list')" style="background:var(--acc);color:#fff;border:none;padding:7px 14px;font-size:12px;font-family:var(--font-b);font-weight:600;cursor:pointer">☰ Lista</button>
        <button id="btn-grid" onclick="setView('grid')" style="background:none;color:var(--t2);border:none;padding:7px 14px;font-size:12px;font-family:var(--font-b);font-weight:600;cursor:pointer">⊞ Grid</button>
      </div>
    </div>
    <div id="plist" style="padding:0 20px"></div>`;

  renderProductList();
}

let productView='list';
function setView(v){
  productView=v;
  document.getElementById('btn-list').style.background=v==='list'?'var(--acc)':'none';
  document.getElementById('btn-list').style.color=v==='list'?'#fff':'var(--t2)';
  document.getElementById('btn-grid').style.background=v==='grid'?'var(--acc)':'none';
  document.getElementById('btn-grid').style.color=v==='grid'?'#fff':'var(--t2)';
  renderProductList();
}

function renderProductList(){
  const srch=(document.getElementById('srch')?.value||'').toLowerCase();
  const cat=document.getElementById('sfilt')?.value||'';
  const canEdit=['gerente','chef','cocinero','deposito'].includes(userRole);
  const filtered=Object.entries(products).filter(([k,p])=>p.name.toLowerCase().includes(srch)&&(!cat||p.category===cat));
  const plist=document.getElementById('plist');
  if(!plist)return;

  if(!filtered.length){plist.innerHTML='<div class="empty"><div class="empty-ico">🥩</div><p>Nenhum produto</p></div>';return;}
  plist.innerHTML=filtered.map(([key,p])=>{
    const isLow=p.quantity<=p.minStock;
    const pct=Math.min(100,(p.quantity/Math.max(1,p.minStock*2))*100);
    const cc=CAT_COLORS[p.category]||'#7f8c8d';
    return`<div class="card${isLow?' low':''}" style="border-left-color:${cc}">
      <div class="card-top">
        <div>
          <div class="card-name">${p.name}${isLow?'<span class="low-tag">baixo</span>':''}</div>
          <div class="card-sub" style="color:${cc}">${p.category}</div>
        </div>
        <div class="card-acts">
          <button class="ic-btn grn" title="Agregar a pedido" onclick="quickOrder('${key}')">🛒</button>
          ${canEdit?`<button class="ic-btn" onclick="openProd('${key}')">✏️</button><button class="ic-btn red" onclick="askDel('${key}','${p.name.replace(/'/g,"\\'")}',delProd)">🗑️</button>`:''}
        </div>
      </div>
      <div class="sbar"><div class="sbar-fill" style="width:${pct}%;background:${isLow?'var(--acc)':'var(--grn)'}"></div></div>
      <div class="card-bot">
        <div class="qty-c">
          ${canEdit?`<button class="qty-btn" onclick="chgQty('${key}',-1)">−</button>`:''}
          <div class="qty-v">${p.quantity} <span class="qty-u">${p.unit}</span></div>
          ${canEdit?`<button class="qty-btn" onclick="chgQty('${key}',1)">+</button>`:''}
        </div>
        <div class="card-val">
          <div class="val-t">R$ ${Math.round(p.quantity*p.price).toLocaleString('pt-BR')}</div>
          <div class="val-m">Mín: ${p.minStock} ${p.unit}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  if(canEdit){fab.style.display='flex';fab.onclick=()=>openProd(null);}
}

function chgQty(key,d){
  const p=products[key];if(!p)return;
  const{db,ref,update}=window._fb;
  update(ref(db,`accounts/${accountId}/products/${key}`),{quantity:Math.max(0,p.quantity+d)});
}

function openProd(key){
  editKey=key;const p=key?products[key]:null;
  const sups=Object.entries(suppliers).map(([k,s])=>`<option value="${k}"${p?.supplierId===k?' selected':''}>${s.name}</option>`).join('');
  showSheet(`${p?'Editar':'Nuevo'} Producto`,`
    <div class="sh-fld"><label>Nome <span style="color:var(--acc);font-weight:700">*</span></label><input id="pf-n" value="${p?.name||''}" placeholder="Ex: Picanha"/></div>
    <div class="sh-row">
      <div class="sh-fld"><label>Categoria</label><select id="pf-c">${CATS.map(c=>`<option${p?.category===c?' selected':''}>${c}</option>`).join('')}</select></div>
      <div class="sh-fld"><label>Unidade</label><select id="pf-u">${UNITS.map(u=>`<option${p?.unit===u?' selected':''}>${u}</option>`).join('')}</select></div>
    </div>
    <div class="sh-row">
      <div class="sh-fld"><label>Quantidade <span style="color:var(--acc);font-weight:700">*</span></label><input type="number" id="pf-q" value="${p?.quantity||''}" placeholder="0"/></div>
      <div class="sh-fld"><label>Estoque mínimo <span style="color:var(--acc);font-weight:700">*</span></label><input type="number" id="pf-m" value="${p?.minStock||''}" placeholder="0"/></div>
    </div>
    <div class="sh-fld"><label>Preço (R$)</label><input type="number" id="pf-p" value="${p?.price||''}" placeholder="0"/></div>
    <div class="sh-fld"><label>Fornecedor</label><select id="pf-s"><option value="">Sem fornecedor</option>${sups}</select></div>
    <div class="sh-acts"><button class="btn-cancel" onclick="closeSheet()">Cancelar</button><button class="btn-save" onclick="saveProd()">Salvar</button></div>
  `);
}

async function saveProd(){
  const name=document.getElementById('pf-n').value.trim();
  const qty=parseFloat(document.getElementById('pf-q').value);
  const min=parseFloat(document.getElementById('pf-m').value);
  if(!name||isNaN(qty)||isNaN(min)){showToast('Preencha os campos obrigatórios');return;}
  const data={name,category:document.getElementById('pf-c').value,unit:document.getElementById('pf-u').value,quantity:qty,minStock:min,price:parseFloat(document.getElementById('pf-p').value)||0,supplierId:document.getElementById('pf-s').value,updatedAt:Date.now()};
  const{db,ref,set,push}=window._fb;
  if(editKey)await set(ref(db,`accounts/${accountId}/products/${editKey}`),{...products[editKey],...data});
  else{data.createdAt=Date.now();await push(ref(db,`accounts/${accountId}/products`),data);}
  closeSheet();showToast(editKey?'Produto atualizado ✓':'Produto adicionado ✓');
}

function delProd(){
  const{db,ref,remove}=window._fb;
  remove(ref(db,`accounts/${accountId}/products/${delKey}`));
  showToast('Excluído');closeConf();
}

// ── MENÚ ──
function doMenu(el,fab){
  const canEdit=['gerente','chef'].includes(userRole);
  el.innerHTML=`
    <div class="cal-tabs">
      <button class="cal-tab${menuView==='dia'?' on':''}" onclick="setMV('dia')">Dia</button>
      <button class="cal-tab${menuView==='semana'?' on':''}" onclick="setMV('semana')">Semana</button>
      <button class="cal-tab${menuView==='mes'?' on':''}" onclick="setMV('mes')">Mês</button>
    </div>
    <div class="cal-nav">
      <button class="cal-btn" onclick="mNav(-1)">‹</button>
      <div class="cal-title" id="cal-title"></div>
      <button class="cal-btn" onclick="mNav(1)">›</button>
    </div>
    <div id="menu-body"></div>`;
  renderMenuBody();
  if(canEdit){fab.style.display='flex';fab.onclick=()=>openDish(null);}
}

function setMV(v){menuView=v;menuOffset=0;doMenu(document.getElementById('main-content'),document.getElementById('fab'));}
function mNav(d){menuOffset+=d;renderMenuBody();}
function dkey(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

function renderMenuBody(){
  const body=document.getElementById('menu-body');
  const title=document.getElementById('cal-title');
  if(!body)return;
  const today=new Date();
  const canEdit=['gerente','chef'].includes(userRole);

  if(menuView==='dia'){
    const d=new Date(today);d.setDate(d.getDate()+menuOffset);
    title.textContent=d.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'});
    const items=Object.entries(menuItems).filter(([k,m])=>m.date===dkey(d));
    body.innerHTML=items.length?items.map(([k,m])=>dishCard(k,m,canEdit)).join(''):'<div class="empty"><div class="empty-ico">🍽️</div><p>Nenhum prato para este dia</p></div>';
  }else if(menuView==='semana'){
    const start=new Date(today);
    const dow=start.getDay()||7;
    start.setDate(start.getDate()-dow+1+menuOffset*7);
    title.textContent=`Semana del ${start.toLocaleDateString('es',{day:'numeric',month:'short'})}`;
    let html='';
    for(let i=0;i<7;i++){
      const d=new Date(start);d.setDate(d.getDate()+i);
      const items=Object.entries(menuItems).filter(([k,m])=>m.date===dkey(d));
      html+=`<div class="menu-day">
        <div class="menu-date">${d.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'short'})}</div>
        ${items.length?items.map(([k,m])=>dishRow(k,m,canEdit)).join(''):'<p style="color:var(--t3);font-size:13px">Sem pratos</p>'}
      </div>`;
    }
    body.innerHTML=html;
  }else{
    const d=new Date(today.getFullYear(),today.getMonth()+menuOffset,1);
    title.textContent=d.toLocaleDateString('es',{month:'long',year:'numeric'});
    const days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    let html='';
    for(let i=1;i<=days;i++){
      const day=new Date(d.getFullYear(),d.getMonth(),i);
      const items=Object.entries(menuItems).filter(([k,m])=>m.date===dkey(day));
      if(items.length)html+=`<div class="menu-day">
        <div class="menu-date">${day.toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'})}</div>
        ${items.map(([k,m])=>dishRow(k,m,canEdit)).join('')}
      </div>`;
    }
    body.innerHTML=html||'<div class="empty"><div class="empty-ico">📅</div><p>Sem pratos este mes</p></div>';
  }
}

function dishCard(key,m,canEdit){
  return`<div class="card">
    <div class="card-top">
      <div><div class="card-name">${m.name}</div><div class="card-sub" style="color:var(--ylw)">${m.category||''}</div></div>
      ${canEdit?`<div class="card-acts"><button class="ic-btn" onclick="openDish('${key}')">✏️</button><button class="ic-btn red" onclick="askDel('${key}','${m.name.replace(/'/g,"\\'")}',delDish)">🗑️</button></div>`:''}
    </div>
    ${m.description?`<p style="font-size:13px;color:var(--t2);line-height:1.5">${m.description}</p>`:''}
  </div>`;
}

function dishRow(key,m,canEdit){
  return`<div class="menu-dish">
    <div><div class="dish-name">${m.name}</div><div class="dish-cat">${m.category||''}</div></div>
    ${canEdit?`<div class="dish-acts"><button class="ic-btn" onclick="openDish('${key}')">✏️</button><button class="ic-btn red" onclick="askDel('${key}','${m.name.replace(/'/g,"\\'")}',delDish)">🗑️</button></div>`:''}
  </div>`;
}

function openDish(key){
  editKey=key;const m=key?menuItems[key]:null;
  const td=dkey(new Date());
  showSheet(`${m?'Editar':'Nuevo'} Plato`,`
    <div class="sh-fld"><label>Nome del plato</label><input id="df-n" value="${m?.name||''}" placeholder="Ex: Churrasco"/></div>
    <div class="sh-fld"><label>Categoria</label><select id="df-c">${DISH_CATS.map(c=>`<option${m?.category===c?' selected':''}>${c}</option>`).join('')}</select></div>
    <div class="sh-fld"><label>Data <span style="color:var(--acc);font-weight:700">*</span></label><input type="date" id="df-d" value="${m?.date||td}"/></div>
    <div class="sh-fld"><label>Descrição (opcional)</label><textarea id="df-desc" placeholder="Ingredientes, observações...">${m?.description||''}</textarea></div>
    <div class="sh-acts"><button class="btn-cancel" onclick="closeSheet()">Cancelar</button><button class="btn-save" onclick="saveDish()">Salvar</button></div>
  `);
}

async function saveDish(){
  const name=document.getElementById('df-n').value.trim();
  const date=document.getElementById('df-d').value;
  if(!name||!date){showToast('Preencha nome e data');return;}
  const data={name,category:document.getElementById('df-c').value,date,description:document.getElementById('df-desc').value.trim(),updatedAt:Date.now()};
  const{db,ref,set,push}=window._fb;
  if(editKey)await set(ref(db,`accounts/${accountId}/menu/${editKey}`),data);
  else{data.createdAt=Date.now();await push(ref(db,`accounts/${accountId}/menu`),data);}
  closeSheet();showToast(editKey?'Prato atualizado ✓':'Prato adicionado ✓');
}

function delDish(){
  const{db,ref,remove}=window._fb;
  remove(ref(db,`accounts/${accountId}/menu/${delKey}`));
  showToast('Prato excluído');closeConf();
}

// ── PEDIDOS ──
function doPedidos(el,fab){
  const canEdit=['gerente','chef','deposito'].includes(userRole);
  const pend=Object.entries(orders).filter(([k,o])=>o.status==='pendente');
  const done=Object.entries(orders).filter(([k,o])=>o.status==='concluído');
  el.innerHTML=`
    <div class="sec-hdr"><div class="sec-ttl">Pedidos</div>${canEdit?'<button class="btn-sm" onclick="openOrder(null)">+ Nuevo</button>':''}</div>
    ${pend.length?`<p class="sec-label">Pendentes (${pend.length})</p>${pend.map(([k,o])=>orderCard(k,o,canEdit)).join('')}`:''}
    ${done.length?`<p class="sec-label">Concluídos (${done.length})</p>${done.map(([k,o])=>orderCard(k,o,false)).join('')}`:''}
    ${!pend.length&&!done.length?'<div class="empty"><div class="empty-ico">🛒</div><p>Nenhum pedido</p></div>':''}`;
}

function orderCard(key,o,canEdit){
  const sup=suppliers[o.supplierId];
  return`<div class="order-card">
    <div class="order-top">
      <div><div class="order-name">${o.productName}</div>${sup?`<div class="order-prov">📦 ${sup.name}</div>`:''}</div>
      <span class="order-status ${o.status==='pendente'?'status-pend':'status-done'}">${o.status}</span>
    </div>
    <p style="font-size:13px;color:var(--t2)">Quantidade: <strong style="color:var(--t1)">${o.quantity} ${o.unit||''}</strong></p>
    ${o.notes?`<p style="font-size:12px;color:var(--t3);margin-top:6px">${o.notes}</p>`:''}
    ${canEdit?`<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      ${o.status==='pendente'?`<button class="btn-sm-ghost" onclick="completeOrd('${key}')">✓ Concluído</button>`:''}
      <button class="btn-sm-ghost" onclick="openOrder('${key}')">✏️ Editar</button>
      <button class="ic-btn red" onclick="askDel('${key}','${o.productName.replace(/'/g,"\\'")}',delOrder)">🗑️</button>
    </div>`:''}
  </div>`;
}

function quickOrder(prodKey){
  const p=products[prodKey];if(!p)return;
  editKey=null;
  const sups=Object.entries(suppliers).map(([k,s])=>`<option value="${k}"${p.supplierId===k?' selected':''}>${s.name}</option>`).join('');
  showSheet('Adicionar ao Pedido',`
    <div class="sh-fld"><label>Producto</label><input id="of-n" value="${p.name}" readonly style="opacity:.7"/></div>
    <div class="sh-row">
      <div class="sh-fld"><label>Quantidade <span style="color:var(--acc);font-weight:700">*</span></label><input type="number" id="of-q" value="${p.minStock}" placeholder="0"/></div>
      <div class="sh-fld"><label>Unidade</label><input id="of-u" value="${p.unit}" readonly style="opacity:.7"/></div>
    </div>
    <div class="sh-fld"><label>Fornecedor</label><select id="of-s"><option value="">Sem fornecedor</option>${sups}</select></div>
    <div class="sh-fld"><label>Observações</label><input id="of-notes" placeholder="Observações adicionais"/></div>
    <div class="sh-acts"><button class="btn-cancel" onclick="closeSheet()">Cancelar</button><button class="btn-save" onclick="saveOrd('${p.name}','${p.unit}')">Agregar</button></div>
  `);
}

function openOrder(key){
  editKey=key;const o=key?orders[key]:null;
  const sups=Object.entries(suppliers).map(([k,s])=>`<option value="${k}"${o?.supplierId===k?' selected':''}>${s.name}</option>`).join('');
  showSheet(`${o?'Editar':'Nuevo'} Pedido`,`
    <div class="sh-fld"><label>Producto</label><input id="of-n" value="${o?.productName||''}" placeholder="Nome del producto"/></div>
    <div class="sh-row">
      <div class="sh-fld"><label>Quantidade <span style="color:var(--acc);font-weight:700">*</span></label><input type="number" id="of-q" value="${o?.quantity||''}" placeholder="0"/></div>
      <div class="sh-fld"><label>Unidade</label><select id="of-u">${UNITS.map(u=>`<option${o?.unit===u?' selected':''}>${u}</option>`).join('')}</select></div>
    </div>
    <div class="sh-fld"><label>Fornecedor</label><select id="of-s"><option value="">Sem fornecedor</option>${sups}</select></div>
    <div class="sh-fld"><label>Observações</label><input id="of-notes" value="${o?.notes||''}" placeholder="Observações adicionais"/></div>
    <div class="sh-acts"><button class="btn-cancel" onclick="closeSheet()">Cancelar</button><button class="btn-save" onclick="saveOrd('','')">Salvar</button></div>
  `);
}

async function saveOrd(pName,pUnit){
  const name=(document.getElementById('of-n')?.value.trim())||pName;
  const qty=parseFloat(document.getElementById('of-q').value);
  if(!name||isNaN(qty)){showToast('Preencha nome e quantidade');return;}
  const data={productName:name,quantity:qty,unit:document.getElementById('of-u')?.value||pUnit,supplierId:document.getElementById('of-s').value,notes:document.getElementById('of-notes').value.trim(),status:'pendente',updatedAt:Date.now()};
  const{db,ref,set,push}=window._fb;
  if(editKey)await set(ref(db,`accounts/${accountId}/orders/${editKey}`),{...orders[editKey],...data});
  else{data.createdAt=Date.now();await push(ref(db,`accounts/${accountId}/orders`),data);}
  closeSheet();showToast('Pedido salvo ✓');
}

async function completeOrd(key){
  const{db,ref,update}=window._fb;
  await update(ref(db,`accounts/${accountId}/orders/${key}`),{status:'concluído',completedAt:Date.now()});
  showToast('Marcado como concluído ✓');
}

function delOrder(){
  const{db,ref,remove}=window._fb;
  remove(ref(db,`accounts/${accountId}/orders/${delKey}`));
  showToast('Pedido excluído');closeConf();
}

// ── PROVEEDORES ──
let supTagFilter='';

function doFornecedores(el,fab){
  fab.style.display='flex';
  fab.onclick=()=>openSup(null);
  const arr=Object.entries(suppliers);
  
  // Tag filter buttons
  const allTags=[...new Set(arr.flatMap(([k,s])=>s.tags||[]))];
  const filterHtml=allTags.length?`
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      <button onclick="filterByTag('')" style="background:${supTagFilter===''?'var(--t1)':'var(--s2)'};color:${supTagFilter===''?'var(--bg)':'var(--t2)'};border:1px solid var(--b2);border-radius:20px;padding:6px 12px;font-size:12px;font-family:var(--font-b);cursor:pointer;font-weight:600">Todos</button>
      ${allTags.map(t=>`<button onclick="filterByTag('${t}')" style="background:${supTagFilter===t?'var(--acc)':'var(--s2)'};color:${supTagFilter===t?'#fff':'var(--t2)'};border:1px solid ${supTagFilter===t?'var(--acc)':'var(--b2)'};border-radius:20px;padding:6px 12px;font-size:12px;font-family:var(--font-b);cursor:pointer;font-weight:500">${t}</button>`).join('')}
    </div>`:'';

  const filtered=supTagFilter?arr.filter(([k,s])=>(s.tags||[]).includes(supTagFilter)):arr;

  let html=`<div style="margin-bottom:14px">${filterHtml}</div>`;

  if(!arr.length){
    html+='<div class="empty"><div class="empty-ico">🏪</div><p>Nenhum fornecedor cadastrado</p></div>';
  }else if(!filtered.length){
    html+='<div class="empty"><div class="empty-ico">🔍</div><p>Nenhum fornecedor nesta categoria</p></div>';
  }else{
    filtered.forEach(([key,s])=>{
      const prods=Object.values(products).filter(p=>p.supplierId===key);
      const tagsHtml=(s.tags||[]).map(t=>`<span style="background:rgba(196,84,26,0.10);color:var(--acc);border:1px solid rgba(196,84,26,0.20);border-radius:20px;font-size:11px;padding:3px 10px;font-weight:600">${t}</span>`).join('');
      html+=`<div class="sup-card">
        <div class="card-top">
          <div>
            <div class="sup-name">${s.name}</div>
            ${s.contact?'<div style="font-size:13px;color:var(--t2);margin-top:2px">👤 '+s.contact+'</div>':''}
            <div class="sup-info" style="margin-top:6px">${s.phone?'📞 '+s.phone+' ':''}${s.email?'✉️ '+s.email:''}</div>
          </div>
          <div class="card-acts">
            <button class="ic-btn" onclick="openSup('${key}')">✏️</button>
            <button class="ic-btn red" onclick="askDel('${key}','${s.name.replace(/'/g,"\'")}',delSup)">🗑️</button>
          </div>
        </div>
        ${tagsHtml?'<div style="display:flex;flex-wrap:wrap;gap:4px;margin:10px 0">'+tagsHtml+'</div>':''}
        ${s.deliveryDays?'<div style="font-size:12px;color:var(--t3);margin-bottom:6px">🚚 '+s.deliveryDays+'</div>':''}
        ${s.notes?'<div style="font-size:12px;color:var(--t3);margin-bottom:8px">'+s.notes+'</div>':''}
        <div class="sup-prods">${prods.length?prods.map(p=>'<span class="sup-tag">🥩 '+p.name+'</span>').join(''):'<span style="font-size:12px;color:var(--t3)">Sem produtos associados</span>'}</div>
      </div>`;
    });
  }
  el.innerHTML=html;
}

function filterByTag(tag){
  supTagFilter=tag;
  doFornecedores(document.getElementById('main-content'),document.getElementById('fab'));
}

const SUP_TAGS=['🥩 Carnes','🐔 Aves','🐟 Pescados','🐷 Suínos','🐑 Cordeiro','🥦 Legumes','🫛 Verduras','🧀 Laticínios','🍚 Grãos','🧂 Temperos','🍷 Bebidas','🧃 Sucos','🧊 Congelados','🫙 Enlatados','🧹 Limpeza','📦 Embalagens'];

function openSup(key){
  editKey=key;const s=key?suppliers[key]:null;
  const existingTags=s?.tags||[];
  const tagsHtml=SUP_TAGS.map(t=>`<button type="button" onclick="toggleTag(this)" data-tag="${t}" style="background:${existingTags.includes(t)?'var(--acc)':'var(--s2)'};color:${existingTags.includes(t)?'#fff':'var(--t2)'};border:1px solid ${existingTags.includes(t)?'var(--acc)':'var(--b2)'};border-radius:20px;padding:6px 12px;font-size:12px;font-family:var(--font-b);cursor:pointer;margin:3px;transition:all .2s">${t}</button>`).join('');
  showSheet(`${s?'Editar':'Novo'} Fornecedor`,`
    <div class="sh-fld"><label>Nome da empresa <span style="color:var(--acc);font-weight:700">*</span></label><input id="sf-n" value="${s?.name||''}" placeholder="Ex: Frigorífico Central"/></div>
    <div class="sh-fld"><label>Responsável</label><input id="sf-contact" value="${s?.contact||''}" placeholder="Nome do contato"/></div>
    <div class="sh-row">
      <div class="sh-fld"><label>Telefone <span style="color:var(--acc);font-weight:700">*</span></label><input id="sf-p" value="${s?.phone||''}" placeholder="+55 41 ..."/></div>
      <div class="sh-fld"><label>WhatsApp</label><input id="sf-wa" value="${s?.whatsapp||''}" placeholder="+55 41 ..."/></div>
    </div>
    <div class="sh-fld"><label>E-mail</label><input type="email" id="sf-e" value="${s?.email||''}" placeholder="fornecedor@email.com"/></div>
    <div class="sh-fld"><label>Dias de entrega</label><input id="sf-days" value="${s?.deliveryDays||''}" placeholder="Ex: Segunda e Quinta"/></div>
    <div class="sh-fld">
      <label>Categorias fornecidas</label>
      <p style="font-size:12px;color:var(--t3);margin-bottom:8px">Toque para selecionar</p>
      <div style="display:flex;flex-wrap:wrap;gap:2px">${tagsHtml}</div>
    </div>
    <div class="sh-fld"><label>Observações</label><textarea id="sf-no" placeholder="Condições, prazos, valores...">${s?.notes||''}</textarea></div>
    <div class="sh-acts"><button class="btn-cancel" onclick="closeSheet()">Cancelar</button><button class="btn-save" onclick="saveSup()">Salvar</button></div>
  `);
}

function toggleTag(btn){
  const isOn=btn.style.background.includes('acc')||btn.style.background===getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
  if(isOn){
    btn.style.background='var(--s2)';btn.style.color='var(--t2)';btn.style.borderColor='var(--b2)';
  }else{
    btn.style.background='var(--acc)';btn.style.color='#fff';btn.style.borderColor='var(--acc)';
  }
}

async function saveSup(){
  try{
    const nameEl=document.getElementById('sf-n');
    if(!nameEl){showToast('Erro no formulário');return;}
    const name=nameEl.value.trim();
    if(!name){showToast('O nome é obrigatório');return;}
    const g=id=>document.getElementById(id)?.value.trim()||'';
    const selectedTags=[...document.querySelectorAll('[data-tag]')].filter(b=>b.style.background&&(b.style.background.includes('196')||b.style.background.includes('c45'))).map(b=>b.dataset.tag);
    const data={
      name,
      contact:g('sf-contact'),
      phone:g('sf-p'),
      whatsapp:g('sf-wa'),
      email:g('sf-e'),
      deliveryDays:g('sf-days'),
      tags:selectedTags,
      notes:g('sf-no'),
      updatedAt:Date.now()
    };
    const{db,ref,set,push}=window._fb;
    if(editKey)await set(ref(db,`accounts/${accountId}/suppliers/${editKey}`),{...suppliers[editKey],...data});
    else{data.createdAt=Date.now();await push(ref(db,`accounts/${accountId}/suppliers`),data);}
    closeSheet();
    showToast(editKey?'Fornecedor atualizado ✓':'Fornecedor adicionado ✓');
  }catch(e){
    showToast('Erro ao salvar: '+e.message);
    console.error(e);
  }
}

function delSup(){
  const{db,ref,remove}=window._fb;
  remove(ref(db,`accounts/${accountId}/suppliers/${delKey}`));
  showToast('Fornecedor eliminado');closeConf();
}

// ── RESUMEN ──
function doResumo(el){
  const arr=Object.values(products);
  const low=arr.filter(p=>p.quantity<=p.minStock);
  const val=arr.reduce((a,p)=>a+(p.quantity*p.price),0);
  const pend=Object.values(orders).filter(o=>o.status==='pendente');
  const td=dkey(new Date());
  const todayMenu=Object.values(menuItems).filter(m=>m.date===td);
  const bySup={};
  pend.forEach(o=>{const n=suppliers[o.supplierId]?.name||'Sem fornecedor';if(!bySup[n])bySup[n]=[];bySup[n].push(o);});
  // Load pending users
  const{db,ref,get}=window._fb;
  get(ref(db,'userAccounts')).then(snap=>{
    const pending=[];
    if(snap.exists()){
      snap.forEach(child=>{
        const d=child.val();
        if(d.status==='pendente')pending.push({uid:child.key,...d});
      });
    }
    const usersEl=document.getElementById('pending-users');
    if(!usersEl)return;
    if(!pending.length){
      usersEl.innerHTML='<p style="font-size:13px;color:var(--t3);font-weight:500">Nenhum usuário pendente</p>';
      return;
    }
    usersEl.innerHTML=pending.map(u=>`
      <div style="background:var(--s2);border:1px solid var(--b1);border-radius:14px;padding:14px;margin-bottom:10px">
        <div style="font-size:16px;font-weight:700;color:var(--t1);margin-bottom:4px">${u.name||u.email}</div>
        <div style="font-size:12px;color:var(--t2);margin-bottom:2px">✉️ ${u.email}</div>
        <div style="font-size:12px;color:var(--t2);margin-bottom:2px">${ROLES[u.role]?.label||u.role}</div>
        ${u.phone?`<div style="font-size:12px;color:var(--t2);margin-bottom:8px">📞 ${u.phone}</div>`:''}
        <button onclick="approveUser('${u.uid}','${u.email}','${u.name||''}')" 
          style="width:100%;background:var(--grn);color:#fff;border:none;border-radius:10px;padding:10px;font-size:14px;font-family:var(--font-b);font-weight:600;cursor:pointer;box-shadow:0 4px 12px var(--grn-glow)">
          ✓ Aprovar e enviar código
        </button>
      </div>`).join('');
  });

  el.innerHTML=`
    ${userRole==='gerente'?`
    <div class="sum-card" style="margin-bottom:16px">
      <div class="sum-title" style="display:flex;align-items:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        Solicitações de Acesso
      </div>
      <div id="pending-users"><p style="font-size:13px;color:var(--t3);font-weight:500">Carregando...</p></div>
    </div>`:''}
    <div class="sum-section">
      <div class="sum-title">📊 Resumo General</div>
      <div class="sum-row"><span class="sum-label">Total de produtos</span><span class="sum-val">${arr.length}</span></div>
      <div class="sum-row"><span class="sum-label">Estoque baixo</span><span class="sum-val" style="color:var(--acc)">${low.length}</span></div>
      <div class="sum-row"><span class="sum-label">Valor do inventário</span><span class="sum-val" style="color:var(--grn)">R$ ${Math.round(val).toLocaleString('pt-BR')}</span></div>
      <div class="sum-row"><span class="sum-label">Pedidos pendentes</span><span class="sum-val" style="color:var(--ylw)">${pend.length}</span></div>
      <div class="sum-row"><span class="sum-label">Pratos no cardápio hoje</span><span class="sum-val">${todayMenu.length}</span></div>
    </div>
    ${low.length?`<div class="sum-section">
      <div class="sum-title">⚠️ Estoque Baixo</div>
      ${low.map(p=>`<div class="sum-row"><span class="sum-label">${p.name}</span><span class="sum-val" style="color:var(--acc)">${p.quantity} ${p.unit} <span style="color:var(--t3);font-size:12px">(mín ${p.minStock})</span></span></div>`).join('')}
    </div>`:''}
    ${pend.length?`<div class="sum-section">
      <div class="sum-title">🛒 Pedidos por Fornecedor</div>
      ${Object.entries(bySup).map(([sup,items])=>`
        <p style="font-size:11px;color:var(--blu);letter-spacing:1px;text-transform:uppercase;margin:12px 0 6px;font-weight:600">${sup}</p>
        ${items.map(o=>`<div class="sum-row"><span class="sum-label">${o.productName}</span><span class="sum-val">${o.quantity} ${o.unit||''}</span></div>`).join('')}
      `).join('')}
    </div>`:''}
    ${todayMenu.length?`<div class="sum-section">
      <div class="sum-title">🍽️ Cardápio de Hoje</div>
      ${todayMenu.map(m=>`<div class="sum-row"><span class="sum-label">${m.name}</span><span class="sum-val" style="color:var(--ylw);font-size:12px">${m.category}</span></div>`).join('')}
    </div>`:''}
  `;
  // Reload pending users
  const{db:db2,ref:ref2,get:get2}=window._fb;
  get2(ref2(db2,'userAccounts')).then(snap=>{const pending=[];if(snap.exists()){snap.forEach(child=>{const d=child.val();if(d.status==='pendente')pending.push({uid:child.key,...d});});}const usersEl=document.getElementById('pending-users');if(!usersEl)return;if(!pending.length){usersEl.innerHTML='<p style="font-size:13px;color:var(--t3);font-weight:500">Nenhum usuário pendente</p>';return;}usersEl.innerHTML=pending.map(u=>`<div style="background:var(--s2);border:1px solid var(--b1);border-radius:14px;padding:14px;margin-bottom:10px"><div style="font-size:16px;font-weight:700;color:var(--t1);margin-bottom:4px">${u.name||u.email}</div><div style="font-size:12px;color:var(--t2);margin-bottom:2px">✉️ ${u.email}</div><div style="font-size:12px;color:var(--t2);margin-bottom:2px">${ROLES[u.role]?.label||u.role}</div>${u.phone?`<div style="font-size:12px;color:var(--t2);margin-bottom:8px">📞 ${u.phone}</div>`:''}<button onclick="approveUser('${u.uid}','${u.email}','${u.name||''}')" style="width:100%;background:var(--grn);color:#fff;border:none;border-radius:10px;padding:10px;font-size:14px;font-family:var(--font-b);font-weight:600;cursor:pointer">✓ Aprovar e enviar código</button></div>`).join('');});
}

// ── PERFIL ──
function showPerfil(){
  currentTab='perfil';
  document.getElementById('home-screen').style.display='none';
  document.getElementById('inner-screen').style.display='flex';
  document.getElementById('inner-title').textContent='Meu Perfil';
  const el=document.getElementById('main-content');
  el.innerHTML=`
    <div style="padding:20px">
      <!-- Avatar -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 0">
        <div style="width:80px;height:80px;border-radius:50%;background:var(--s2);border:2px solid var(--b2);display:flex;align-items:center;justify-content:center;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="text-align:center">
          <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--t1)">${userName}</div>
          <div style="font-size:12px;color:var(--t3);margin-top:4px">${ROLES[userRole]?.label||userRole}</div>
        </div>
      </div>
      <!-- Info -->
      <div style="background:var(--s1);border-radius:16px;overflow:hidden;border:1px solid var(--b1)">
        <div style="padding:14px 18px;border-bottom:1px solid var(--b1)">
          <div style="font-size:10px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Código de acesso</div>
          <div style="font-size:20px;font-weight:700;color:var(--acc);letter-spacing:6px">${accountId||'—'}</div>
        </div>
        <div style="padding:14px 18px;border-bottom:1px solid var(--b1)">
          <div style="font-size:10px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Função</div>
          <div style="font-size:15px;font-weight:600;color:var(--t1)">${ROLES[userRole]?.label||userRole}</div>
        </div>
        <div style="padding:14px 18px">
          <div style="font-size:10px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Membro desde</div>
          <div style="font-size:15px;font-weight:600;color:var(--t1)">${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</div>
        </div>
      </div>
      <!-- Change code button -->
      <button onclick="showWelcomeModal()" style="width:100%;margin-top:12px;background:var(--s2);border:1.5px solid var(--b2);border-radius:14px;padding:14px;font-family:var(--font-b);font-size:14px;font-weight:600;color:var(--t1);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Alterar código de acesso
      </button>
      <button onclick="doLogout()" style="width:100%;margin-top:10px;background:none;border:1.5px solid var(--b2);border-radius:14px;padding:14px;font-family:var(--font-b);font-size:14px;font-weight:600;color:var(--t3);cursor:pointer">
        Sair da conta
      </button>
    </div>`;
}


// ── HOME WIDGETS ──

// Mood handled via modal - see showMoodModal()

// 2. HORIZONTAL CARDS ROW
async function renderHorizontalCards(container){
  const aniversarios=getAniversariosHoje();
  const evento=getProximoEvento();
  const meta=await fetchMetaDia();
  const pct=meta.goal>0?Math.min(100,Math.round(meta.sold/meta.goal*100)):0;

  container.innerHTML=`
    <!-- META DO DIA -->
    <div style="margin:16px 20px 14px">
      <div class="meta-board">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Meta do Dia</div>
            <div style="font-family:var(--font-b);font-size:42px;font-weight:700;color:#fff;line-height:1">${meta.sold}<span style="font-size:18px;color:rgba(255,255,255,0.35)"> /${meta.goal}</span></div>
            <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">pratos servidos hoje</div>
          </div>
          <div style="position:relative;width:64px;height:64px;flex-shrink:0">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/>
              <circle cx="32" cy="32" r="26" fill="none"
                stroke="${pct>=100?'#2ECC71':'rgba(255,255,255,0.75)'}"
                stroke-width="5"
                stroke-dasharray="163.4"
                stroke-dashoffset="${Math.round(163.4*(1-pct/100))}"
                stroke-linecap="round"
                transform="rotate(-90 32 32)"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-b);font-size:13px;font-weight:700;color:#fff">${pct}%</div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:3px;overflow:hidden;margin-bottom:${userRole==='gerente'?'12':'0'}px">
          <div style="background:${pct>=100?'#2ECC71':'rgba(255,255,255,0.6)'};height:100%;width:${pct}%;border-radius:4px;transition:width 1.2s ease"></div>
        </div>
        ${userRole==='gerente'?`<button onclick="updateMetaDia()" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.55);border-radius:10px;padding:9px;font-family:var(--font-b);font-size:12px;font-weight:600;cursor:pointer">+ Atualizar pratos</button>`:''}
      </div>
    </div>

    <!-- Encuesta button (temp for testing) -->
    <div style="padding:0 20px 4px">
      <button onclick="showMoodModal()" style="width:100%;background:var(--s2);border:1.5px dashed var(--b3);border-radius:14px;padding:12px;font-family:var(--font-b);font-size:13px;font-weight:600;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Enquete do Dia
      </button>
    </div>

    <!-- Horizontal mini cards -->
    <div style="display:flex;gap:10px;padding:8px 20px 4px;overflow-x:auto;scrollbar-width:none;" class="hcards-row">

      ${aniversarios.length?`
      <div class="hcard hcard-birthday">
        <div class="hcard-ico">🎂</div>
        <div class="hcard-title">Aniversário</div>
        <div class="hcard-val" style="font-size:15px;color:var(--acc)">${aniversarios[0]}</div>
        <div class="hcard-sub">hoje! 🎉</div>
      </div>`:''}

      ${evento?`
      <div class="hcard hcard-evento" onclick="showEventoModal()">
        <div class="hcard-ico">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="hcard-title">Nos Vemos Em</div>
        <div class="hcard-val" style="color:var(--t1)">${evento.days}</div>
        <div class="hcard-sub">dias · ${evento.name}</div>
        <div style="margin-top:8px;background:var(--grn);color:#fff;border-radius:8px;padding:4px 8px;font-size:10px;font-weight:600;text-align:center">Participar</div>
      </div>`:''}

    </div>`;
}

async function updateMetaDia(){
  const n=prompt('Quantos pratos foram servidos hoje?');
  if(!n||isNaN(n))return;
  const today=dkey(new Date());
  const{db,ref,set}=window._fb;
  const snap=await (window._fb.get)(ref(db,`accounts/${accountId}/meta/${today}`));
  const current=snap.exists()?snap.val():{goal:150};
  await set(ref(db,`accounts/${accountId}/meta/${today}`),{...current,sold:parseInt(n)});
  showToast('Meta atualizada ✓');
  renderHome();
}



function getAniversariosHoje(){
  const hoje=new Date();
  const mm=String(hoje.getMonth()+1).padStart(2,'0');
  const dd=String(hoje.getDate()).padStart(2,'0');
  return Object.values(userAccounts||{})
    .filter(u=>u.birthday&&u.birthday.slice(5,10)===`${mm}-${dd}`)
    .map(u=>u.firstName||u.name?.split(' ')[0]||'Alguém');
}

function getProximoEvento(){
  // Events stored in Firebase - for now return null if none
  return window._proximoEvento||null;
}

async function fetchMetaDia(){
  // Meta do dia from Firebase
  const today=dkey(new Date());
  try{
    const{db,ref,get}=window._fb;
    const snap=await get(ref(db,`accounts/${accountId}/meta/${today}`));
    if(snap.exists()) return snap.val();
  }catch(e){}
  return{sold:0,goal:150};
}

// 3. MURAL DO TIME
async function renderMural(container){
  try{
    const{db,ref,get}=window._fb;
    const snap=await get(ref(db,`accounts/${accountId}/mural`));
    const posts=snap.exists()?Object.values(snap.val()).sort((a,b)=>b.ts-a.ts):[];
    const latest=posts[0];
    const unread=posts.filter(p=>p.ts>(parseInt(localStorage.getItem('muralRead')||0))).length;

    container.innerHTML=`
      <div class="widget-card" style="margin:0 20px 12px;cursor:pointer" onclick="goTab('mural')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:600">Mural do Time</div>
          ${unread>0?`<div style="background:var(--acc);color:#fff;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700">${unread} novo${unread>1?'s':''}</div>`:''}
        </div>
        ${latest?`
          <div style="font-size:13px;color:var(--t1);line-height:1.5;margin-bottom:6px">${latest.text?.slice(0,80)}${latest.text?.length>80?'...':''}</div>
          <div style="font-size:11px;color:var(--t3)">${latest.author||'Gerente'} · ${new Date(latest.ts).toLocaleDateString('pt-BR')}</div>
        `:`<div style="font-size:13px;color:var(--t3);font-style:italic">Nenhum aviso ainda.</div>`}
      </div>`;
  }catch(e){}
}

// 4. RANKING DE PONTUALIDADE
async function renderRanking(container){
  try{
    const{db,ref,get}=window._fb;
    const snap=await get(ref(db,`accounts/${accountId}/pontos`));
    if(!snap.exists()){container.innerHTML='';return;}

    const pontos=snap.val();
    const counts={};
    Object.entries(pontos).forEach(([uid,days])=>{
      counts[uid]=Object.keys(days||{}).length;
    });

    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const medals=['🥇','🥈','🥉'];
    const names={};
    Object.values(userAccounts||{}).forEach(u=>{if(u.uid)names[u.uid]=u.firstName||u.name?.split(' ')[0];});
    
    container.innerHTML=`
      <div class="widget-card" style="margin:0 20px 12px">
        <div style="font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:12px">Ranking de Pontualidade</div>
        ${sorted.map(([uid,count],i)=>`
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;${i<sorted.length-1?'border-bottom:1px solid var(--b1)':''}">
            <div style="font-size:22px">${medals[i]}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600;color:${uid===user.uid?'var(--acc)':'var(--t1)'}">${names[uid]||'Membro'}${uid===user.uid?' (você)':''}</div>
              <div style="font-size:11px;color:var(--t3)">${count} dia${count!==1?'s':''} registrado${count!==1?'s':''}</div>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--grn)">${count}d</div>
          </div>`).join('')}
      </div>`;
  }catch(e){}
}


// ── MOOD MODAL ──
let _selectedMoodEmoji='';
let _selectedMoodIdx=-1;

function showMoodModal(){
  const modal=document.getElementById('mood-modal');
  if(modal) modal.style.display='flex';
}

function closeMoodModal(){
  const modal=document.getElementById('mood-modal');
  if(modal) modal.style.display='none';
}

function selectMoodModal(emoji,idx){
  _selectedMoodEmoji=emoji;
  _selectedMoodIdx=idx;
  for(let i=0;i<5;i++){
    const btn=document.getElementById('moodm-'+i);
    if(btn){
      btn.style.background=i===idx?'var(--t1)':'var(--s2)';
      btn.style.transform=i===idx?'scale(1.2)':'scale(1)';
    }
  }
  const justify=document.getElementById('mood-justify-modal');
  if(justify) justify.style.display=idx===4?'block':'none';
  if(idx!==4) submitMoodModal();
}

async function submitMoodModal(){
  const today=dkey(new Date());
  const text=document.getElementById('mood-text-modal')?.value||'';
  const{db,ref,set}=window._fb;
  await set(ref(db,`accounts/${accountId}/moods/${user.uid}/${today}`),{
    mood:_selectedMoodEmoji,
    idx:_selectedMoodIdx,
    note:text,
    name:userName,
    role:userRole,
    timestamp:Date.now()
  });
  localStorage.setItem('spring_mood_day',today);
  closeMoodModal();
  showToast('Obrigado! ✅');
}


// ── ALARM CONFIG ──
let _alarmActive=false;
let _alarmSound='beep';

function selectAlarmSound(btn, sound){
  _alarmSound=sound;
  // Update UI
  document.querySelectorAll('.alarm-sound-btn').forEach(b=>{
    b.style.background='var(--s2)';
    b.style.borderColor='var(--b2)';
    b.querySelector('div:last-child').style.color='var(--t1)';
  });
  btn.style.background='var(--t1)';
  btn.style.borderColor='var(--t1)';
  btn.querySelector('div:last-child').style.color='#fff';
  // Preview the sound
  playAlarmSound(sound);
}

function playAlarmSound(sound){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const sounds={
      beep:()=>{
        [0,0.3,0.6].forEach(d=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.connect(g);g.connect(ctx.destination);
          o.frequency.value=880;o.type='sine';
          g.gain.setValueAtTime(0,ctx.currentTime+d);
          g.gain.linearRampToValueAtTime(0.4,ctx.currentTime+d+0.05);
          g.gain.linearRampToValueAtTime(0,ctx.currentTime+d+0.35);
          o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.4);
        });
      },
      pulse:()=>{
        [0,0.5,1.0].forEach((d,i)=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.connect(g);g.connect(ctx.destination);
          o.frequency.value=440+i*110;o.type='sine';
          g.gain.setValueAtTime(0,ctx.currentTime+d);
          g.gain.linearRampToValueAtTime(0.35,ctx.currentTime+d+0.1);
          g.gain.linearRampToValueAtTime(0,ctx.currentTime+d+0.45);
          o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.5);
        });
      },
      chime:()=>{
        [523,659,784,1047].forEach((freq,i)=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.connect(g);g.connect(ctx.destination);
          o.frequency.value=freq;o.type='sine';
          g.gain.setValueAtTime(0.3,ctx.currentTime+i*0.18);
          g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.18+0.8);
          o.start(ctx.currentTime+i*0.18);o.stop(ctx.currentTime+i*0.18+0.8);
        });
      },
      alert:()=>{
        [0,0.15,0.3,0.45,0.6].forEach(d=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.connect(g);g.connect(ctx.destination);
          o.frequency.value=1200;o.type='square';
          g.gain.setValueAtTime(0.2,ctx.currentTime+d);
          g.gain.linearRampToValueAtTime(0,ctx.currentTime+d+0.12);
          o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.12);
        });
      },
      soft:()=>{
        const freqs=[392,494,587];
        freqs.forEach((freq,i)=>{
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.connect(g);g.connect(ctx.destination);
          o.frequency.value=freq;o.type='sine';
          g.gain.setValueAtTime(0,ctx.currentTime+i*0.4);
          g.gain.linearRampToValueAtTime(0.25,ctx.currentTime+i*0.4+0.2);
          g.gain.linearRampToValueAtTime(0,ctx.currentTime+i*0.4+0.7);
          o.start(ctx.currentTime+i*0.4);o.stop(ctx.currentTime+i*0.4+0.8);
        });
      },
      digital:()=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.setValueAtTime(1000,ctx.currentTime);
        o.frequency.setValueAtTime(800,ctx.currentTime+0.1);
        o.frequency.setValueAtTime(1000,ctx.currentTime+0.2);
        o.frequency.setValueAtTime(800,ctx.currentTime+0.3);
        o.frequency.setValueAtTime(1200,ctx.currentTime+0.5);
        o.type='square';
        g.gain.setValueAtTime(0.15,ctx.currentTime);
        g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.8);
        o.start(ctx.currentTime);o.stop(ctx.currentTime+0.8);
      }
    };
    (sounds[sound]||sounds.beep)();
  }catch(e){ console.warn('Sound error:',e); }
}
let _alarmDays=[];

function showAlarmConfig(){
  const panel=document.getElementById('alarm-panel');
  if(panel) panel.style.display='flex';
  // Load saved config
  const saved=JSON.parse(localStorage.getItem('spring_alarm')||'{}');
  if(saved.time) document.getElementById('alarm-time').value=saved.time;
  if(saved.active) setAlarmToggleUI(true);
  if(saved.days){
    _alarmDays=saved.days;
    saved.days.forEach(d=>{
      const btn=document.querySelector(`.alarm-day-btn[data-day="${d}"]`);
      if(btn) activateAlarmDay(btn);
    });
  }
  if(saved.sound){
    _alarmSound=saved.sound;
    const soundBtn=document.querySelector(`.alarm-sound-btn[data-sound="${saved.sound}"]`);
    if(soundBtn){
      document.querySelectorAll('.alarm-sound-btn').forEach(b=>{
        b.style.background='var(--s2)';b.style.borderColor='var(--b2)';
        b.querySelector('div:last-child').style.color='var(--t1)';
      });
      soundBtn.style.background='var(--t1)';soundBtn.style.borderColor='var(--t1)';
      soundBtn.querySelector('div:last-child').style.color='#fff';
    }
  }
  // Show dot if active
  const dot=document.getElementById('alarm-dot');
  if(dot) dot.style.display=saved.active?'block':'none';
}

function toggleAlarmDay(btn,day){
  const idx=_alarmDays.indexOf(day);
  if(idx>-1){
    _alarmDays.splice(idx,1);
    btn.style.background='rgba(255,255,255,0.08)';
    btn.style.borderColor='rgba(255,255,255,0.15)';
    btn.style.color='rgba(255,255,255,0.5)';
  } else {
    _alarmDays.push(day);
    activateAlarmDay(btn);
  }
}

function activateAlarmDay(btn){
  btn.style.background='var(--t1)';
  btn.style.borderColor='var(--t1)';
  btn.style.color='var(--bg)';
}

function toggleAlarm(){
  _alarmActive=!_alarmActive;
  setAlarmToggleUI(_alarmActive);
}

function setAlarmToggleUI(active){
  _alarmActive=active;
  const toggle=document.getElementById('alarm-toggle');
  const thumb=document.getElementById('alarm-thumb');
  if(toggle) toggle.style.background=active?'var(--t1)':'var(--b3)';
  if(thumb){
    thumb.style.left=active?'25px':'3px';
    thumb.style.background='#fff';
  }
}

function saveAlarmConfig(){
  const time=document.getElementById('alarm-time').value;
  const config={time,active:_alarmActive,days:_alarmDays,sound:_alarmSound};
  localStorage.setItem('spring_alarm',JSON.stringify(config));
  document.getElementById('alarm-panel').style.display='none';

  // Update UI dots
  const dot=document.getElementById('alarm-dot');
  if(dot) dot.style.display=_alarmActive?'block':'none';
  const lbl=document.getElementById('alarm-btn-label');
  const sdot=document.getElementById('alarm-status-dot');
  if(lbl) lbl.textContent=_alarmActive?`Alarme · ${time}`:'Ativar alarme';
  if(sdot) sdot.style.display=_alarmActive?'block':'none';

  if(_alarmActive){
    // Request notification permission
    if('Notification' in window){
      Notification.requestPermission().then(perm=>{
        if(perm==='granted'){
          showToast(`Alarme ativo às ${time} ✓`);
          startAlarmChecker();
        } else {
          showToast('Permissão de notificação negada. Ative nas configurações.');
        }
      });
    } else {
      showToast(`Alarme salvo às ${time} ✓`);
      startAlarmChecker();
    }
  } else {
    showToast('Alarme desativado');
    stopAlarmChecker();
  }
}

let _alarmInterval=null;

function startAlarmChecker(){
  stopAlarmChecker();
  _alarmInterval=setInterval(()=>{
    const config=JSON.parse(localStorage.getItem('spring_alarm')||'{}');
    if(!config.active) return;
    const now=new Date();
    const hm=now.toTimeString().slice(0,5); // "HH:MM"
    const day=now.getDay(); // 0=Sun
    const dayMatch=!config.days||config.days.length===0||config.days.includes(day);
    if(hm===config.time&&dayMatch){
      const fired=localStorage.getItem('alarm_fired_'+hm+'_'+now.toDateString());
      if(!fired){
        localStorage.setItem('alarm_fired_'+hm+'_'+now.toDateString(),'1');
        fireAlarm(config.time);
      }
    }
  },10000); // check every 10 seconds
}

function stopAlarmChecker(){
  if(_alarmInterval) clearInterval(_alarmInterval);
  _alarmInterval=null;
}

function fireAlarm(time){
  // Play selected sound (repeat 3 times)
  const config=JSON.parse(localStorage.getItem('spring_alarm')||'{}');
  const sound=config.sound||'beep';
  playAlarmSound(sound);
  setTimeout(()=>playAlarmSound(sound),1000);
  setTimeout(()=>playAlarmSound(sound),2000);

  // Show notification
  if(Notification.permission==='granted'){
    new Notification('⏱ Spring · Hora de bater ponto!',{
      body:`São ${time}. Não esqueça de registrar seu ponto.`,
      icon:'/icon-192.png',
      badge:'/icon-72.png',
      vibrate:[200,100,200]
    });
  }

  // Also show in-app banner
  showToast(`⏱ Hora de bater ponto! · ${time}`);
}

function showNotifications(){
  const panel=document.getElementById('notif-panel');
  if(panel) panel.style.display=panel.style.display==='none'?'block':'none';
}


// ── CATEGORIES ──
function goCategory(id){
  if(['inventario','menu','pedidos','proveedores','resumen'].includes(id)){
    goTab(id); return;
  }
  // Community categories - show placeholder
  const labels={equipe:'Mi Equipo',aniversarios:'Cumpleaños',cardapio_dia:'Cardápio do Dia',folga:'Solicitar Folga',eventos:'Próximos Eventos'};
  showToast(`${labels[id]||id} · Em breve!`);
}

// ── PONTO STATS TOGGLE ──
let _pontoViewStats=false;

function togglePontoView(){
  _pontoViewStats=!_pontoViewStats;
  const wrap=document.getElementById('ponto-wrap');
  if(!wrap) return;

  // Animate the sliding ball
  const ball=document.getElementById('switch-ball');
  const ballIcon=document.getElementById('ball-icon');
  const ghostLeft=document.getElementById('ghost-left');
  const ghostRight=document.getElementById('ghost-right');
  const pill=document.getElementById('ponto-switch');

  if(_pontoViewStats){
    // Slide right → stats (naranja)
    if(ball) ball.style.left='56px';
    if(ball) ball.style.background='var(--acc)';
    if(pill) pill.style.background='rgba(230,126,34,0.08)';
    if(pill) pill.style.borderColor='rgba(230,126,34,0.3)';
    if(ballIcon) ballIcon.innerHTML='<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>';
    if(ghostLeft) ghostLeft.style.opacity='0.3';
    if(ghostRight) ghostRight.style.opacity='0';
  } else {
    // Slide left → ponto (verde)
    if(ball) ball.style.left='4px';
    if(ball) ball.style.background='#1a3a1a';
    if(pill) pill.style.background='var(--s2)';
    if(pill) pill.style.borderColor='var(--b2)';
    if(ballIcon) ballIcon.innerHTML='<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
    if(ghostLeft) ghostLeft.style.opacity='0';
    if(ghostRight) ghostRight.style.opacity='0.3';
  }

  // Animate content
  wrap.style.opacity='0';
  wrap.style.transform='scale(0.96)';

  setTimeout(async()=>{
    if(_pontoViewStats){
      wrap.innerHTML=await renderPontoStats();
    } else {
      wrap.innerHTML=renderPontoBtn();
      setTimeout(()=>updatePontoUI(),100);
    }
    wrap.style.opacity='1';
    wrap.style.transform='scale(1)';
  },280);
}

async function renderPontoStats(){
  const today=dkey(new Date());
  const{db,ref,get}=window._fb;
  const HOURS_PER_DAY=8;
  const DAYS_PER_WEEK=6;
  const HOURS_PER_MONTH=192;

  // Get this month's pontos
  const now=new Date();
  const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  let totalMinutes=0;
  let daysWorked=0;
  let todayPontos=[];
  let weekMinutes=0;

  try{
    const snap=await get(ref(db,`accounts/${accountId}/pontos/${user.uid}`));
    if(snap.exists()){
      const allDays=snap.val();
      // Today
      if(allDays[today]) todayPontos=Object.values(allDays[today]).sort((a,b)=>a.ts-b.ts);

      // This week
      const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay());
      Object.entries(allDays).forEach(([day,pontos])=>{
        const d=new Date(day);
        if(day.startsWith(monthKey)){
          const pts=Object.values(pontos).sort((a,b)=>a.ts-b.ts);
          if(pts.length>=2){
            daysWorked++;
            // Calc hours from first to last ponto
            const mins=(pts[pts.length-1].ts-pts[0].ts)/60000;
            totalMinutes+=mins;
            if(d>=weekStart) weekMinutes+=mins;
          }
        }
      });
    }
  }catch(e){}

  const totalH=Math.floor(totalMinutes/60);
  const totalM=Math.round(totalMinutes%60);
  const weekH=Math.floor(weekMinutes/60);
  const weekM=Math.round(weekMinutes%60);
  const hoursOwed=Math.max(0,HOURS_PER_MONTH-totalH);
  const pct=Math.min(100,Math.round((totalH/HOURS_PER_MONTH)*100));
  const weekPct=Math.min(100,Math.round((weekH/(HOURS_PER_DAY*DAYS_PER_WEEK))*100));

  // Today's ponto timeline
  const steps=getPontoSteps();
  const timelineHTML=steps.map((s,i)=>{
    const p=todayPontos[i];
    const done=!!p;
    return`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;${i<steps.length-1?'border-bottom:1px solid var(--b1)':''}">
      <div style="width:8px;height:8px;border-radius:50%;background:${done?'#2ECC71':'var(--b3)'};flex-shrink:0"></div>
      <div style="flex:1;font-family:var(--font-b);font-size:13px;color:${done?'var(--t1)':'var(--t3)'};font-weight:${done?'600':'400'}">${s}</div>
      <div style="font-family:var(--font-b);font-size:12px;color:${done?'var(--grn)':'var(--t3)'};font-weight:600">${done?p.time:'--:--'}</div>
    </div>`;
  }).join('');

  return`
    <div style="padding:0 20px 8px">
      <!-- Toggle back button -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-family:var(--font-b);font-size:14px;font-weight:700;color:var(--t1)">Meus Pontos</div>
        <button onclick="togglePontoView()" style="display:flex;align-items:center;gap:6px;background:var(--t1);border:none;border-radius:20px;padding:6px 14px;cursor:pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style="font-family:var(--font-b);font-size:11px;font-weight:700;color:#fff">Bater Ponto</span>
        </button>
      </div>

      <!-- Today timeline -->
      <div style="background:var(--s1);border:1px solid var(--b1);border-radius:18px;padding:16px;margin-bottom:12px">
        <div style="font-size:10px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Hoje</div>
        ${timelineHTML}
      </div>

      <!-- Stats grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:16px;padding:14px">
          <div style="font-size:10px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Esta semana</div>
          <div style="font-family:var(--font-b);font-size:22px;font-weight:700;color:var(--t1)">${weekH}h${weekM>0?weekM+'m':''}</div>
          <div style="background:var(--s3);border-radius:4px;height:4px;margin-top:8px;overflow:hidden">
            <div style="background:var(--grn);height:100%;width:${weekPct}%;border-radius:4px;transition:width .8s ease"></div>
          </div>
          <div style="font-size:10px;color:var(--t3);margin-top:4px">${weekPct}% de 48h</div>
        </div>
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:16px;padding:14px">
          <div style="font-size:10px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Este mês</div>
          <div style="font-family:var(--font-b);font-size:22px;font-weight:700;color:var(--t1)">${totalH}h${totalM>0?totalM+'m':''}</div>
          <div style="background:var(--s3);border-radius:4px;height:4px;margin-top:8px;overflow:hidden">
            <div style="background:${pct>=100?'var(--grn)':'var(--acc)'};height:100%;width:${pct}%;border-radius:4px;transition:width .8s ease"></div>
          </div>
          <div style="font-size:10px;color:var(--t3);margin-top:4px">${pct}% de 192h</div>
        </div>
      </div>

      <!-- Hours owed -->
      <div style="background:var(--t1);border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Horas a cumprir</div>
          <div style="font-family:var(--font-b);font-size:28px;font-weight:700;color:#fff">${hoursOwed}h</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">${daysWorked} dias trabalhados</div>
        </div>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
    </div>`;
}

// ── PONTO BUTTON ──
const PONTO_4 = ['chef','cocinero','gerente'];
const PONTO_STEPS_4 = ['Entrada','Saída almoço','Retorno almoço','Saída'];
const PONTO_STEPS_2 = ['Entrada','Saída'];

function getPontoSteps(){
  return PONTO_4.includes(userRole) ? PONTO_STEPS_4 : PONTO_STEPS_2;
}

async function getPontosHoje(){
  const today=dkey(new Date());
  const{db,ref,get}=window._fb;
  try{
    const snap=await get(ref(db,`accounts/${accountId}/pontos/${user.uid}/${today}`));
    if(!snap.exists()) return [];
    return Object.values(snap.val()).sort((a,b)=>a.ts-b.ts);
  }catch(e){ return []; }
}

function renderPontoBtn(){
  const steps=getPontoSteps();
  const n=steps.length;
  const now=new Date();
  const timeStr=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

  // WhatsApp stories style - 4 segments with big gaps
  const COLORS=['#2ECC71','#F1C40F','#E67E22','#E74C3C'];
  const cx=110,cy=110,R=98;
  const GAP_DEG=8; // big gap between segments like WhatsApp
  const segDeg=(360/n)-GAP_DEG;

  function polar(cx,cy,r,deg){
    const rad=(deg-90)*Math.PI/180;
    return{x:+(cx+r*Math.cos(rad)).toFixed(2),y:+(cy+r*Math.sin(rad)).toFixed(2)};
  }
  function arc(startDeg,endDeg){
    const s=polar(cx,cy,R,startDeg);
    const e=polar(cx,cy,R,endDeg);
    const large=endDeg-startDeg>180?1:0;
    return`M${s.x},${s.y} A${R},${R},0,${large},1,${e.x},${e.y}`;
  }

  // 4 segment tracks (gray) + fills (colored)
  const segs=steps.map((_,i)=>{
    const start=i*(360/n)+GAP_DEG/2;
    const end=start+segDeg;
    const c=COLORS[i];
    return`<path d="${arc(start,end)}" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="5" stroke-linecap="round"/>
<path id="ps${i}" d="${arc(start,end)}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0" style="transition:opacity .5s ease,stroke .3s"/>`;
  }).join('');

  const labelsHTML=steps.map((s,i)=>`
    <div class="ponto-lbl-item" id="ponto-lbl-${i}">${s}</div>`).join('');

  return`
    <button onclick="doBaterPonto()" class="ponto-circle-btn" id="ponto-main-btn">
      <!-- Story-style ring -->
      <svg style="position:absolute;inset:0;width:220px;height:220px;" viewBox="0 0 220 220">
        ${segs}
      </svg>
      <!-- Center circle -->
      <div class="ponto-inner" id="ponto-inner">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a3a1a" stroke-width="1.8" stroke-linecap="round" id="ponto-icon">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <div class="ponto-label" id="ponto-main-label">Bater<br>Ponto</div>
        <div class="ponto-sublabel">${timeStr}</div>
      </div>
    </button>
    <div class="ponto-labels-row">${labelsHTML}</div>

    <!-- Alarm mini button -->
    <button onclick="showAlarmConfig()" style="margin-top:14px;display:flex;align-items:center;gap:7px;background:none;border:1.5px solid rgba(0,0,0,0.12);border-radius:20px;padding:7px 16px;cursor:pointer;transition:all .2s">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="7"/><polyline points="12 10 12 13 14 15"/><path d="M5 4L2 7M22 7l-3-3"/></svg>
      <span style="font-family:var(--font-b);font-size:11px;font-weight:600;color:var(--t2)" id="alarm-btn-label">Ativar alarme</span>
      <div id="alarm-status-dot" style="display:none;width:7px;height:7px;border-radius:50%;background:#2ECC71;margin-left:2px"></div>
    </button>`;
}

async function updatePontoUI(){
  const pontos=await getPontosHoje();
  const steps=getPontoSteps();
  const n=steps.length;
  const done=pontos.length;
  const stepIdx=done%n;
  const COLORS=['#2ECC71','#F1C40F','#E67E22','#E74C3C'];
  const INNER_COLORS=['#fff','#f0fff4','#fffde7','#fff3e0'];

  // Fill completed segments - using ps0, ps1, ps2, ps3
  for(let i=0;i<n;i++){
    const seg=document.getElementById('ps'+i);
    const lbl=document.getElementById('ponto-lbl-'+i);
    const isDone=i<stepIdx;
    const isNext=i===stepIdx;
    if(seg) seg.style.opacity=isDone?'1':'0';
    if(lbl){
      if(isDone) lbl.className='ponto-lbl-item done';
      else if(isNext) lbl.className='ponto-lbl-item next';
      else lbl.className='ponto-lbl-item';
    }
  }

  // Update inner button color
  const inner=document.getElementById('ponto-inner');
  const label=document.getElementById('ponto-main-label');
  const icon=document.getElementById('ponto-icon');
  if(inner) inner.style.background=INNER_COLORS[stepIdx]||'#fff';
  if(icon) icon.setAttribute('stroke',COLORS[stepIdx]||'#1a3a1a');
  if(label) label.innerHTML=steps[stepIdx];

  // Update time
  const timeEl=document.querySelector('.ponto-sublabel');
  if(timeEl) timeEl.textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

// Colors per step
const PONTO_COLORS=['#2ECC71','#F1C40F','#E67E22','#E74C3C'];

// ── CLOUDINARY CONFIG ──
const CLOUDINARY={
  cloudName:'ddjgwglk2',
  uploadPreset:'spring_pontos', // unsigned preset - needs to be created
  apiKey:'651883899346748'
};

async function uploadSelfie(dataUrl){
  try{
    const formData=new FormData();
    formData.append('file',dataUrl);
    formData.append('upload_preset',CLOUDINARY.uploadPreset);
    formData.append('folder','spring/pontos');
    const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`,{
      method:'POST',body:formData
    });
    const d=await r.json();
    return d.secure_url||null;
  }catch(e){
    console.warn('Cloudinary upload failed:',e);
    return null;
  }
}

// ── SEDES / LOCATION CONFIG ──
const SEDES={
  juveve:{name:'Juvevê',lat:-25.4129874,lng:-49.2614169,radius:50},
  batel:{name:'Batel',lat:-25.4129874,lng:-49.2614169,radius:50},
  comendador:{name:'Comendador',lat:-25.4129874,lng:-49.2614169,radius:50},
};
const DEFAULT_RADIUS=50; // meters

function getDistanceMeters(lat1,lng1,lat2,lng2){
  const R=6371000;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function validateLocation(){
  return new Promise((resolve)=>{
    if(!navigator.geolocation){
      resolve({ok:false,msg:'Geolocalização não suportada neste dispositivo'});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const{latitude:lat,longitude:lng}=pos.coords;
        // Check all sedes
        for(const[key,sede] of Object.entries(SEDES)){
          const dist=getDistanceMeters(lat,lng,sede.lat,sede.lng);
          if(dist<=sede.radius){
            resolve({ok:true,sede:sede.name,dist:Math.round(dist)});
            return;
          }
        }
        // Not near any sede - find closest
        let closest=null,minDist=Infinity;
        for(const[key,sede] of Object.entries(SEDES)){
          const dist=getDistanceMeters(lat,lng,sede.lat,sede.lng);
          if(dist<minDist){minDist=dist;closest=sede;}
        }
        resolve({
          ok:false,
          msg:`Você está a ${Math.round(minDist)}m do restaurante. É necessário estar no estabelecimento.`,
          dist:Math.round(minDist)
        });
      },
      (err)=>{
        let msg='Não foi possível obter sua localização.';
        if(err.code===1) msg='Permissão de localização negada. Ative nas configurações.';
        if(err.code===2) msg='Localização indisponível. Tente novamente.';
        if(err.code===3) msg='Tempo esgotado. Tente novamente.';
        resolve({ok:false,msg});
      },
      {
        enableHighAccuracy:true,
        timeout:10000,
        maximumAge:0
      }
    );
  });
}
let _pendingPontoStep=null;
let _pendingPontoIdx=0;

async function doBaterPonto(){
  const steps=getPontoSteps();
  const pontos=await getPontosHoje();
  const stepIdx=pontos.length%steps.length;
  const stepName=steps[stepIdx];
  const color=PONTO_COLORS[stepIdx]||'#2ECC71';

  _pendingPontoStep=stepName;
  _pendingPontoIdx=stepIdx;

  // Location validation temporarily disabled
  // TODO: re-enable when ready for production

  // 1. FLASH EFFECT
  const flash=document.getElementById('flash-overlay');
  if(flash){
    flash.style.display='block';
    flash.style.background=color;
    flash.style.animation='none';
    void flash.offsetWidth;
    flash.style.animation='flashIn 0.7s ease forwards';
    setTimeout(()=>{ flash.style.display='none'; },700);
  }

  // 3. Show confirm modal after flash
  setTimeout(()=>showPontoModal(stepName,stepIdx,color), 400);
}

function showLocationError(msg){
  // Show friendly location error modal
  const existing=document.getElementById('loc-error-modal');
  if(existing) existing.remove();

  const modal=document.createElement('div');
  modal.id='loc-error-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:502;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(8px)';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:28px 28px 0 0;padding:32px 24px 48px;width:100%;max-width:480px;animation:slideUp .35s cubic-bezier(.32,.72,0,1)">
      <div style="width:40px;height:4px;background:rgba(0,0,0,0.1);border-radius:2px;margin:0 auto 24px"></div>
      <div style="width:56px;height:56px;border-radius:18px;background:#FEF3F2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div style="font-family:var(--font-b);font-size:18px;font-weight:700;color:var(--t1);text-align:center;margin-bottom:8px">Fora do estabelecimento</div>
      <div style="font-family:var(--font-b);font-size:14px;color:var(--t3);text-align:center;line-height:1.6;margin-bottom:24px">${msg}</div>
      <button onclick="document.getElementById('loc-error-modal').remove()" style="width:100%;background:var(--t1);color:#fff;border:none;border-radius:14px;padding:15px;font-family:var(--font-b);font-size:15px;font-weight:700;cursor:pointer">Entendido</button>
    </div>`;
  document.body.appendChild(modal);
}

let _selfieDataUrl=null;

function showPontoModal(stepName,stepIdx,color){
  const modal=document.getElementById('ponto-modal');
  const inner=document.getElementById('ponto-modal-inner');
  const icon=document.getElementById('ponto-modal-icon');
  const stepEl=document.getElementById('ponto-modal-step');
  const btn=document.getElementById('ponto-confirm-btn');
  const input=document.getElementById('ponto-code-input');
  const err=document.getElementById('ponto-modal-err');

  if(!modal) return;

  _selfieDataUrl=null;

  // Set colors and text
  if(icon) icon.style.background=color;
  if(stepEl) stepEl.textContent=stepName;
  if(btn){ btn.style.background=color; btn.textContent='Confirmar Ponto'; }
  if(err){ err.style.display='none'; err.textContent=''; }
  if(input){ input.value=''; }

  // Add selfie section to modal
  const selfieSection=document.getElementById('ponto-selfie-section');
  if(selfieSection){
    selfieSection.innerHTML=`
      <div style="background:var(--s2);border-radius:14px;padding:14px;margin-bottom:14px;text-align:center">
        <div id="selfie-preview" style="width:80px;height:80px;border-radius:50%;background:var(--s3);margin:0 auto 10px;overflow:hidden;display:flex;align-items:center;justify-content:center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <button onclick="takeSelfie()" id="selfie-btn" style="background:var(--t1);color:#fff;border:none;border-radius:10px;padding:8px 18px;font-family:var(--font-b);font-size:13px;font-weight:600;cursor:pointer">
          📷 Tirar selfie
        </button>
        <div style="font-size:11px;color:var(--t3);margin-top:6px">Obrigatório para registrar o ponto</div>
      </div>`;
  }

  modal.style.display='flex';
  setTimeout(()=>{ if(inner) inner.style.transform='translateY(0)'; }, 20);
  setTimeout(()=>{ if(input) input.focus(); }, 400);
}

async function takeSelfie(){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:'user',width:{ideal:1280},height:{ideal:1280}},
      audio:false
    });

    const camDiv=document.createElement('div');
    camDiv.id='camera-ui';
    camDiv.style.cssText='position:fixed;inset:0;z-index:600;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden';
    camDiv.innerHTML=`
      <!-- Video fill -->
      <video id="cam-video" autoplay playsinline
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)">
      </video>

      <!-- Dark overlay top -->
      <div style="position:absolute;top:0;left:0;right:0;height:80px;background:linear-gradient(to bottom,rgba(0,0,0,0.6),transparent);z-index:2;display:flex;align-items:center;padding:0 20px">
        <button onclick="cancelCamera()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:12px;padding:8px 16px;color:#fff;font-family:var(--font-b);font-size:13px;font-weight:600;cursor:pointer">Cancelar</button>
        <div style="flex:1;text-align:center;font-family:var(--font-b);font-size:14px;font-weight:600;color:#fff;letter-spacing:.5px">Selfie para ponto</div>
        <div style="width:80px"></div>
      </div>

      <!-- Face guide circle -->
      <div style="position:relative;z-index:2;width:260px;height:260px;border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 0 0 9999px rgba(0,0,0,0.45);animation:faceGuide 2s ease infinite alternate">
        <!-- Corner markers -->
        <div style="position:absolute;top:-3px;left:30px;width:40px;height:3px;background:#fff;border-radius:2px"></div>
        <div style="position:absolute;top:-3px;right:30px;width:40px;height:3px;background:#fff;border-radius:2px"></div>
        <div style="position:absolute;bottom:-3px;left:30px;width:40px;height:3px;background:#fff;border-radius:2px"></div>
        <div style="position:absolute;bottom:-3px;right:30px;width:40px;height:3px;background:#fff;border-radius:2px"></div>
      </div>

      <!-- Instruction -->
      <div style="position:relative;z-index:2;margin-top:20px;font-family:var(--font-b);font-size:13px;color:rgba(255,255,255,0.8);text-align:center;letter-spacing:.3px">
        Centralize seu rosto no círculo
      </div>

      <!-- Dark overlay bottom -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(to top,rgba(0,0,0,0.7),transparent);z-index:2;display:flex;align-items:center;justify-content:center;padding-bottom:20px">
        <!-- Shutter button -->
        <button onclick="capturePhoto()" id="shutter-btn" style="
          width:78px;height:78px;border-radius:50%;
          background:transparent;
          border:4px solid #fff;
          cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          transition:all .15s;
          position:relative;
        ">
          <div style="width:62px;height:62px;border-radius:50%;background:#fff;transition:all .15s" id="shutter-inner"></div>
        </button>
      </div>

      <!-- Flash effect -->
      <div id="cam-flash" style="position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:10;transition:opacity .1s"></div>`;

    document.body.appendChild(camDiv);
    const video=document.getElementById('cam-video');
    video.srcObject=stream;
    window._camStream=stream;

    // Add shutter press animation
    const shutterBtn=document.getElementById('shutter-btn');
    const shutterInner=document.getElementById('shutter-inner');
    if(shutterBtn){
      shutterBtn.addEventListener('touchstart',()=>{
        shutterInner.style.transform='scale(0.85)';
        shutterInner.style.background='rgba(255,255,255,0.8)';
      },{passive:true});
      shutterBtn.addEventListener('touchend',()=>{
        shutterInner.style.transform='scale(1)';
        shutterInner.style.background='#fff';
      },{passive:true});
    }

  }catch(e){
    if(e.name==='NotAllowedError'){
      showToast('Permissão de câmera negada. Ative nas configurações.');
    } else {
      showToast('Câmera não disponível');
    }
  }
}

function capturePhoto(){
  const video=document.getElementById('cam-video');
  if(!video) return;

  // Flash effect
  const flash=document.getElementById('cam-flash');
  if(flash){
    flash.style.opacity='1';
    setTimeout(()=>flash.style.opacity='0',150);
  }

  // Capture after flash
  setTimeout(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=400;canvas.height=400;
    const ctx=canvas.getContext('2d');
    ctx.translate(400,0);
    ctx.scale(-1,1); // mirror flip
    const size=Math.min(video.videoWidth,video.videoHeight);
    const sx=(video.videoWidth-size)/2;
    const sy=(video.videoHeight-size)/2;
    ctx.drawImage(video,sx,sy,size,size,0,0,400,400);
    _selfieDataUrl=canvas.toDataURL('image/jpeg',0.8);
    cancelCamera();

    // Show circular preview in modal
    const preview=document.getElementById('selfie-preview');
    if(preview){
      preview.innerHTML=`<img src="${_selfieDataUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--grn)"/>`;
    }
    const selfieBtn=document.getElementById('selfie-btn');
    if(selfieBtn){
      selfieBtn.textContent='✓ Tirar novamente';
      selfieBtn.style.background='var(--grn)';
    }
  },120);
}

function cancelCamera(){
  if(window._camStream) window._camStream.getTracks().forEach(t=>t.stop());
  const ui=document.getElementById('camera-ui');
  if(ui) ui.remove();
}

function closePontoModal(){
  const modal=document.getElementById('ponto-modal');
  const inner=document.getElementById('ponto-modal-inner');
  if(inner) inner.style.transform='translateY(100%)';
  setTimeout(()=>{ if(modal) modal.style.display='none'; }, 400);
}

async function confirmPonto(){
  const input=document.getElementById('ponto-code-input');
  const err=document.getElementById('ponto-modal-err');
  const code=input?.value?.trim();

  if(!code||code.length!==4){
    if(err){ err.textContent='Digite os 4 dígitos'; err.style.display='block'; }
    return;
  }

  // Require selfie
  if(!_selfieDataUrl){
    if(err){ err.textContent='Tire uma selfie antes de confirmar'; err.style.display='block'; }
    return;
  }

  // Validate code
  if(String(accountId)!==String(code)){
    if(err){ err.textContent='Código incorreto. Tente novamente.'; err.style.display='block'; }
    input.value='';
    input.focus();
    return;
  }

  // Code correct - close modal and upload
  const btn=document.getElementById('ponto-confirm-btn');
  if(btn){ btn.textContent='Registrando...'; btn.disabled=true; }

  // Upload selfie to Cloudinary
  const selfieUrl=await uploadSelfie(_selfieDataUrl);

  closePontoModal();

  // Register ponto
  const steps=getPontoSteps();
  const now=new Date();
  const time=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const today=dkey(now);
  const color=PONTO_COLORS[_pendingPontoIdx]||'#2ECC71';

  const{db,ref,push,set}=window._fb;
  const pontoRef=push(ref(db,`accounts/${accountId}/pontos/${user.uid}/${today}`));
  await set(pontoRef,{
    step:_pendingPontoStep,
    stepIdx:_pendingPontoIdx,
    time,ts:Date.now(),
    name:userName,
    role:userRole,
    selfie:selfieUrl||null
  });

  // SUCCESS ANIMATION
  setTimeout(()=>{
    const success=document.getElementById('ponto-success');
    const circle=document.getElementById('ponto-success-circle');
    const text=document.getElementById('ponto-success-text');
    if(!success) return;

    success.style.background=color+'dd';
    success.style.display='flex';
    if(circle){ circle.style.background=color; setTimeout(()=>circle.style.transform='scale(1)',50); }
    if(text){ text.textContent=`${_pendingPontoStep} · ${time}`; setTimeout(()=>text.style.opacity='1',100); }

    setTimeout(()=>{
      success.style.opacity='0';
      success.style.transition='opacity .5s ease';
      setTimeout(()=>{ success.style.display='none'; success.style.opacity='1'; success.style.transition=''; if(circle) circle.style.transform='scale(0)'; if(text){ text.style.opacity='0'; } },500);
    },1800);
  },500);

  await updatePontoUI();
}

// ── PONTO ──
function baterPonto(){
  const now=new Date();
  const time=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const date=now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
  const{db,ref,push,set}=window._fb;
  const pontoRef=push(ref(db,`accounts/${accountId}/pontos/${user.uid}`));
  set(pontoRef,{
    uid:user.uid,
    name:userName,
    role:userRole,
    timestamp:Date.now(),
    time,date
  }).then(()=>{
    showToast(`✓ Ponto registrado às ${time}`);
  }).catch(()=>{
    showToast('Erro ao registrar ponto');
  });
}

// ── UTILS ──
async function generateUniqueCode(){
  const{db,ref,get}=window._fb;
  const snap=await get(ref(db,'userAccounts'));
  const usedCodes=new Set();
  if(snap.exists()){
    snap.forEach(child=>{
      if(child.val().code)usedCodes.add(String(child.val().code));
    });
  }
  let code;
  let attempts=0;
  do{
    code=String(Math.floor(1000+Math.random()*9000));
    attempts++;
    if(attempts>100)break; // safety
  }while(usedCodes.has(code));
  return code;
}

async function approveUser(uid,email,name){
  const code=await generateUniqueCode();
  try{
    const{db,ref,update}=window._fb;
    await update(ref(db,`userAccounts/${uid}`),{
      code,
      status:'ativo',
      approvedAt:Date.now()
    });
    // Send email WITH CODE directly to the USER
    try{
      await emailjs.send('service_ch1zqsy','template_uw9djui',{
        to_email:email,
        to_name:name||email,
        name:name||email,
        email:email,
        role:'Bem-vindo ao Spring! Seu acesso foi aprovado.',
        phone:'—',
        birthday:'—',
        sede:'—',
        code:`${code}`
      },'OVEsOgP7lLroHL8Bo');
      showToast(`✓ Código ${code} enviado para ${email}`);
    }catch(emailErr){
      showToast(`✓ Aprovado! Código: ${code} — email falhou, anote!`);
      console.warn('Email error:',emailErr);
    }
    // Refresh resumen
    doResumo(document.getElementById('main-content'));
  }catch(e){
    showToast('Erro ao aprovar: '+e.message);
  }
}

function showSheet(title,body){
  document.getElementById('sheet-inner').innerHTML=`<div class="sh-handle"></div><div class="sh-title">${title}</div>${body}`;
  document.getElementById('sheet-ov').classList.add('on');
}
function closeSheet(){document.getElementById('sheet-ov').classList.remove('on');}
function closeSheetIfOut(e){if(e.target===document.getElementById('sheet-ov'))closeSheet();}
function askDel(key,name,fn){delKey=key;confFn=fn;document.getElementById('conf-item').textContent=name;document.getElementById('conf-ov').classList.add('on');}
function closeConf(){document.getElementById('conf-ov').classList.remove('on');delKey=null;confFn=null;}
function runConf(){if(confFn)confFn();}

function goTabAndFilter(){
  goTab('inventario');
  setTimeout(()=>filterLowStock(),300);
}

function filterLowStock(){
  if(document.getElementById('home-screen').style.display!=='none'){
    goTab('inventario');setTimeout(()=>filterLowStock(),200);return;
  }
  if(currentTab!=='inventario'){goTab('inventario');setTimeout(()=>filterLowStock(),200);return;}
  const low=Object.entries(products).filter(([k,p])=>p.quantity<=p.minStock);
  if(!low.length){showToast('No hay produtos com estoque baixo ✅');return;}
  const plist=document.getElementById('plist');
  if(!plist)return;
  const canEdit=['gerente','chef','cocinero','deposito'].includes(userRole);
  // Reset filters
  const srch=document.getElementById('srch');
  const sfilt=document.getElementById('sfilt');
  if(srch)srch.value='';
  if(sfilt)sfilt.value='';
  plist.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p style="font-size:11px;color:var(--acc);letter-spacing:1px;text-transform:uppercase">⚠️ Estoque baixo (${low.length})</p>
      <button onclick="doInventário(document.getElementById('main-content'),document.getElementById('fab'))" style="background:var(--s2);border:1px solid var(--b2);border-radius:8px;color:var(--t2);padding:6px 12px;font-size:12px;font-family:var(--font-b);cursor:pointer">← Ver todos</button>
    </div>`+low.map(([key,p])=>{
    const cc=CAT_COLORS[p.category]||'#7f8c8d';
    return`<div class="card low" style="border-left-color:${cc}">
      <div class="card-top">
        <div><div class="card-name">${p.name}<span class="low-tag">baixo</span></div><div class="card-sub" style="color:${cc}">${p.category}</div></div>
        <div class="card-acts">
          <button class="ic-btn grn" title="Agregar a pedido" onclick="quickOrder('${key}')">🛒</button>
          ${canEdit?`<button class="ic-btn" onclick="openProd('${key}')">✏️</button><button class="ic-btn red" onclick="askDel('${key}','${p.name.replace(/'/g,"\\'")}',delProd)">🗑️</button>`:''}
        </div>
      </div>
      <div class="sbar"><div class="sbar-fill" style="width:${Math.min(100,(p.quantity/Math.max(1,p.minStock*2))*100)}%;background:var(--acc)"></div></div>
      <div class="card-bot">
        <div class="qty-c">
          ${canEdit?`<button class="qty-btn" onclick="chgQty('${key}',-1)">−</button>`:''}
          <div class="qty-v">${p.quantity} <span class="qty-u">${p.unit}</span></div>
          ${canEdit?`<button class="qty-btn" onclick="chgQty('${key}',1)">+</button>`:''}
        </div>
        <div class="card-val"><div class="val-t">R$ ${Math.round(p.quantity*p.price).toLocaleString('pt-BR')}</div><div class="val-m">Mín: ${p.minStock} ${p.unit}</div></div>
      </div>
    </div>`;
  }).join('');
}


// ── SEED PRODUCTS (run once) ──
async function seedProducts(){
  const{db,ref,push}=window._fb;
  const base=`accounts/${accountId}/products`;
  const products=[
    // RES
    {name:'Alcatra Baby',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Contra-Filé',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Carne Moída',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Filé Argentino',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Fraldinha',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Maminha',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Mignon',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Miolo de Alcatra',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Músculo',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Noah',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Picanha',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Rabo',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Língua',category:'Res',unit:'kg',quantity:0,minStock:5,price:0},
    // POLLO
    {name:'Coxa com Osso',category:'Pollo',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Coxa sem Osso',category:'Pollo',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Frango Inteiro',category:'Pollo',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Peito de Frango',category:'Pollo',unit:'kg',quantity:0,minStock:5,price:0},
    {name:'Pato',category:'Pollo',unit:'kg',quantity:0,minStock:5,price:0},
    // PESCADOS
    {name:'Bacalhau',category:'Pescado',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Camarão',category:'Pescado',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Peixe',category:'Pescado',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Peixe para Domingo',category:'Pescado',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Pescada Amarela',category:'Pescado',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Salmão',category:'Pescado',unit:'kg',quantity:0,minStock:3,price:0},
    // CORDERO
    {name:'Cordeiro',category:'Otro',unit:'kg',quantity:0,minStock:3,price:0},
    // CERDO
    {name:'Charque',category:'Cerdo',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Costelinha Defumada',category:'Cerdo',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Costelinha de Porco Fresca',category:'Cerdo',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Linguiça Fina',category:'Cerdo',unit:'kg',quantity:0,minStock:3,price:0},
    {name:'Pé de Porco',category:'Cerdo',unit:'kg',quantity:0,minStock:3,price:0},
  ];
  for(const p of products){
    await push(ref(db,base),{...p,createdAt:Date.now(),updatedAt:Date.now()});
  }
  showToast('✅ 30 produtos carregados!');
}

function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2500);}
