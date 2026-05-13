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
  const pct=document.getElementById('splash-pct');
  if(pct)pct.textContent='Pronto ✓';
  // Wait minimum 9.5s for full animation
  const elapsed=Date.now()-window._splashStart;
  const remaining=Math.max(0,8000-elapsed);
  setTimeout(()=>{
    s.style.opacity='0';
    setTimeout(()=>s.style.display='none',1800);
  },remaining);
}
function showAuth(){document.getElementById('auth').style.display='flex';}
function showApp(){document.getElementById('auth').style.display='none';document.getElementById('app').style.display='flex';}

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
  // Add change code button to header
  const btnOut=document.querySelector('.btn-out');
  if(btnOut&&!document.getElementById('btn-change-code')){
    const btnCode=document.createElement('button');
    btnCode.id='btn-change-code';
    btnCode.className='btn-out';
    btnCode.innerHTML='🔑';
    btnCode.title='Alterar código';
    btnCode.onclick=()=>showWelcomeModal();
    btnOut.parentNode.insertBefore(btnCode,btnOut);
  }
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
  const tabs=ROLES[userRole]?.tabs||['menu'];
  if(!tabs.includes(currentTab))currentTab=tabs[0];
  renderHome();
}

function renderHome(){
  // Date
  const now=new Date();
  document.getElementById('home-date').textContent=now.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
  document.getElementById('hdr-greeting').textContent=`Olá, ${userName.split(' ')[0]} 👋`;

  // Quick stats
  const arr=Object.values(products);
  const low=arr.filter(p=>p.quantity<=p.minStock);
  const val=arr.reduce((a,p)=>a+(p.quantity*p.price),0);
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

  // Alert strip
  // Last minute menu change notification
  const menuChangeRecent=menuLastChanged&&((new Date()-menuLastChanged)<3600000);

  const alertWrap=document.getElementById('alert-strip-wrap');

  // Pending users notification for gerente
  const pendingCount=userRole==='gerente'?Object.values(userAccounts).filter(u=>u.status==='pendente').length:0;

  // Compact notification dots instead of full banners
  let notifs = [];
  if(pendingCount>0) notifs.push({label:`${pendingCount} acesso${pendingCount>1?'s':''} pendente${pendingCount>1?'s':''}`,color:'var(--burg)',tab:'resumen'});
  if(low.length>0) notifs.push({label:`${low.length} produto${low.length>1?'s':''} com estoque baixo`,color:'var(--acc)',tab:'inventario'});
  if(menuChangeRecent) notifs.push({label:'Cardápio alterado hoje',color:'var(--grn)',tab:'menu'});

  alertWrap.innerHTML=notifs.length?`
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 0 8px">
      ${notifs.map(n=>`
        <button onclick="goTab('${n.tab}')" style="display:flex;align-items:center;gap:5px;background:${n.color};border:none;border-radius:20px;padding:5px 12px;cursor:pointer;transition:all .2s">
          <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.8)"></div>
          <span style="font-family:var(--font-b);font-size:11px;font-weight:600;color:#fff;white-space:nowrap">${n.label}</span>
        </button>`).join('')}
    </div>`:''
  ;

  // Big nav buttons
  const tabs=ROLES[userRole]?.tabs||['menu'];
  document.getElementById('big-nav').innerHTML=tabs.map(t=>`
    <button class="big-btn ${NAV_COLS[t]}" onclick="goTab('${t}')">
      <div style="opacity:0.9;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.18));margin-bottom:10px">${NAV_ICONS[t]}</div>
      <div>
        <div style="font-family:'Jost',sans-serif;font-size:15px;font-weight:600;color:#fff;letter-spacing:.3px;text-transform:uppercase">${NAV_LABELS[t]}</div>
        <div style="font-family:'Jost',sans-serif;font-size:10px;color:rgba(255,255,255,0.7);font-weight:400;margin-top:3px;letter-spacing:.5px;text-transform:uppercase">${NAV_SUBS[t]}</div>
      </div>
      <div class="big-btn-arr">›</div>
    </button>`).join('');

  // Today menu preview
  const td=dkey(new Date());
  const todayItems=Object.values(menuItems).filter(m=>m.date===td);
  const wrap=document.getElementById('today-menu-wrap');
  if(tabs.includes('menu')){
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
  history.pushState({tab:'home'},'','?tab=home');
  renderHome();
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
    // Send email with code
    try{
      await emailjs.send('service_ch1zqsy','template_uw9djui',{
        name:name||email,
        email,
        role:'Acesso aprovado!',
        phone:'—',
        birthday:'—',
        code:`Seu código de acesso: ${code}`
      },'OVEsOgP7lLroHL8Bo');
      showToast(`✓ Código ${code} enviado para ${email}`);
    }catch(emailErr){
      showToast(`✓ Aprovado! Código: ${code} (email falhou)`);
      console.warn(emailErr);
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
