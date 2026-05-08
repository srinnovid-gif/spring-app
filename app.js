let user=null,userRole=null,userName=null,accountId=null;
let products={},menuItems={},orders={},suppliers={},menuLastChanged=null,menuPrevCount=0;
let currentTab='inventario';
let editKey=null,delKey=null,confFn=null;
let menuView='dia',menuOffset=0;

const ROLES={
  gerente:{label:'👩‍💼 Gerente',tabs:['inventario','menu','pedidos','proveedores','resumen']},
  chef:{label:'👨‍🍳 Chef',tabs:['inventario','menu','pedidos']},
  cocinero:{label:'🧑‍🍳 Cozinheiro',tabs:['inventario','menu']},
  deposito:{label:'📦 Estoque',tabs:['inventario','pedidos']},
  salon:{label:'🍽️ Salão',tabs:['menu']},
};
const TAB_LABELS={inventario:'🥩 Inventário',menu:'📋 Menú',pedidos:'🛒 Pedidos',proveedores:'🏪 Fornecedores',resumen:'📊 Resumo'};
const CAT_COLORS={Res:'#c0392b',Pollo:'#e67e22',Cerdo:'#8e44ad',Pescado:'#2980b9',Suplemento:'#27ae60',Lácteos:'#16a085',Vegetales:'#27ae60',Otro:'#7f8c8d'};
const UNITS=['kg','g','Piezas','Paquetes','Frascos','Cajas','Litros','Unidadees'];
const CATS=['Res','Pollo','Cerdo','Pescado','Suplemento','Lácteos','Vegetales','Otro'];
const DISH_CATS=['Entrada','Plato Principal','Acompañamiento','Postre','Bebida'];

function waitFB(cb,t=0){if(window._fb){cb();}else if(t<30){setTimeout(()=>waitFB(cb,t+1),200);}else{alert('Error conectando Firebase');}}

window.addEventListener('load',()=>{
  waitFB(()=>{
    const{auth,onAuthStateChanged}=window._fb;
    // Add timeout only for splash animation, not for auth
    setTimeout(()=>{
      const s=document.getElementById('splash');
      if(s&&s.style.opacity!=='0'){
        s.style.opacity='0';
        setTimeout(()=>s.style.display='none',500);
      }
    },3000);
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
  if(pct)pct.textContent='Listo ✓';
  setTimeout(()=>{
    s.style.opacity='0';
    setTimeout(()=>s.style.display='none',1400);
  },1500);
}
function showAuth(){document.getElementById('auth').style.display='flex';}
function showApp(){document.getElementById('auth').style.display='none';document.getElementById('app').style.display='flex';}

function authTab(t){
  document.getElementById('login-f').style.display=t==='login'?'block':'none';
  document.getElementById('reg-f').style.display=t==='register'?'block':'none';
  document.querySelectorAll('.tab2').forEach((el,i)=>el.classList.toggle('on',(i===0)===(t==='login')));
  document.getElementById('auth-err').textContent='';
}
function setErr(m){document.getElementById('auth-err').textContent=m;}

async function doLogin(){
  const email=document.getElementById('l-email').value.trim();
  const pass=document.getElementById('l-pass').value;
  if(!email||!pass){setErr('Preencha todos os campos');return;}
  try{const{auth,signInWithEmailAndPassword}=window._fb;await signInWithEmailAndPassword(auth,email,pass);}
  catch(e){setErr('E-mail o contraseña incorrectos');}
}

async function doRegister(){
  const name=document.getElementById('r-name').value.trim();
  const email=document.getElementById('r-email').value.trim();
  const pass=document.getElementById('r-pass').value;
  const role=document.getElementById('r-role').value;
  const phone=document.getElementById('r-phone')?.value.trim()||'';
  if(!name||!email||!pass){setErr('Preencha todos os campos obrigatórios (*)');return;}
  if(pass.length<6){setErr('Mínimo 6 caracteres');return;}
  try{
    const{auth,db,ref,set,createUserWithEmailAndPassword,signOut}=window._fb;
    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    // Save user as pending - no code yet
    await set(ref(db,`userAccounts/${cred.user.uid}`),{
      code:'',role,name,email,phone,
      status:'pendente',
      createdAt:Date.now()
    });
    // Send email to admin
    try{
      await emailjs.send('ch1zqsy','template_uw9djui',{
        name,email,
        role:ROLES[role]?.label||role,
        phone:phone||'Não informado',
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
      <div style="font-family:var(--font-h);font-size:48px;font-weight:700;font-style:italic;text-align:center;margin-bottom:4px;color:var(--t1)">Spring<span style="color:var(--acc)">.</span></div>
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
  buildNav();
  showApp();
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

const NAV_ICONS={inventario:'🥩',menu:'📋',pedidos:'🛒',proveedores:'🏪',resumen:'📊'};
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
  document.getElementById('hdr-greeting').textContent=`Hola, ${userName} 👋`;

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
  alertWrap.innerHTML=low.length?`
    <div class="alert-strip" onclick="goTabAndFilter()">
      <div class="alert-strip-ico">⚠️</div>
      <div class="alert-strip-text">
        <div class="alert-strip-title">${low.length} producto${low.length>1?'s':''} con stock baixo</div>
        <div class="alert-strip-sub">Toque para ver e adicionar ao pedido</div>
      </div>
      <div class="alert-strip-arr">›</div>
    </div>`:'';

  // Big nav buttons
  const tabs=ROLES[userRole]?.tabs||['menu'];
  document.getElementById('big-nav').innerHTML=tabs.map(t=>`
    <button class="big-btn ${NAV_COLS[t]}" onclick="goTab('${t}')">
      <div class="btn-ico-wrap">${NAV_ICONS[t]}</div>
      <div>
        <div class="big-btn-title">${NAV_LABELS[t]}</div>
        <div class="big-btn-sub">${NAV_SUBS[t]}</div>
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
            <div><div class="today-dish-name">${m.name}</div><div class="today-dish-type">${m.category||''}</div></div>
          </div>`).join(''):`<div class="today-empty">Nenhum prato cadastrado para hoje</div>`}
      </div>`;
  }else{wrap.innerHTML='';}
}

function goHome(){
  document.getElementById('home-screen').style.display='block';
  document.getElementById('inner-screen').style.display='none';
  document.getElementById('fab').style.display='none';
  renderHome();
}

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

  el.innerHTML=`
    <div class="stats">
      <div class="stat" onclick="doInventário(document.getElementById('main-content'),document.getElementById('fab'))" style="cursor:pointer"><div class="stat-v">${arr.length}</div><div class="stat-l">Todos ↓</div></div>
      <div class="stat warn" onclick="filterLowStock()" style="cursor:pointer"><div class="stat-v r">${low.length}</div><div class="stat-l">Estoque Baixo ↓</div></div>
      <div class="stat"><div class="stat-v g" style="font-size:14px">R$${Math.round(val).toLocaleString('pt-BR')}</div><div class="stat-l">Valor</div></div>
    </div>
    <div class="srow">
      <input class="sinput" id="srch" placeholder="🔍 Buscar produto..." oninput="renderProductList()"/>
      <select class="sfilt" id="sfilt" onchange="renderProductList()">
        <option value="">Todos</option>${CATS.map(c=>`<option>${c}</option>`).join('')}
      </select>
    </div>
    <div id="plist"></div>`;

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

  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div style="font-size:18px;font-weight:700;font-family:var(--font-h);font-style:italic">Fornecedores</div>
    <button onclick="openSup(null)" style="background:var(--acc);color:#fff;border:none;border-radius:12px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer">+ Novo</button>
  </div>${filterHtml}`;

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
        ${s.notes?'<div style="font-size:12px;color:var(--t3);font-style:italic;margin-bottom:8px">'+s.notes+'</div>':''}
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

  el.innerHTML=`
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
}

// ── UTILS ──
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
