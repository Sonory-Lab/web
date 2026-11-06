'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const channels = {
  whatsapp:{name:'WhatsApp',symbol:'W',cls:'whatsapp'},
  telegram:{name:'Telegram',symbol:'T',cls:'telegram'},
  facebook:{name:'Facebook',symbol:'f',cls:'facebook'},
  instagram:{name:'Instagram',symbol:'◎',cls:'instagram'},
  messenger:{name:'Messenger',symbol:'M',cls:'messenger'}
};
const statuses = {
  draft:['Borrador','status-draft'],scheduled:['Programada','status-scheduled'],
  publishing:['Publicando','status-scheduled'],published:['Publicada','status-published'],
  partial:['Parcial','status-partial'],failed:['Fallida','status-failed']
};
let campaigns=[], integrations=[], filter='all', toastTimer;
async function api(url, options={}) {
  const response=await fetch(url,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||'No se pudo completar la solicitud.');
  return data;
}
function toast(message,error=false){
  const node=$('#toast');node.textContent=message;node.classList.toggle('error',error);node.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),3500);
}
function showLogin(message=''){$('#loginScreen').hidden=false;$('#appShell').hidden=true;$('#loginError').textContent=message;}
function showApp(){$('#loginScreen').hidden=true;$('#appShell').hidden=false;loadAll();}
function dateText(value){
  if(!value)return 'Sin fecha';const d=new Date(value);if(Number.isNaN(d.getTime()))return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function statusPill(value){const info=statuses[value]||statuses.draft;const el=document.createElement('span');el.className='status '+info[1];el.textContent=info[0];return el;}
function empty(title,detail){
  const el=document.createElement('div');el.className='empty';const icon=document.createElement('div');icon.className='empty-symbol';icon.textContent='✦';
  const b=document.createElement('b');b.textContent=title;const p=document.createElement('p');p.textContent=detail;
  const btn=document.createElement('button');btn.className='secondary';btn.textContent='Crear primera campaña';btn.addEventListener('click',openComposer);
  el.append(icon,b,p,btn);return el;
}
function channelTags(items){
  const wrap=document.createElement('div');wrap.className='card-channels';
  items.forEach(id=>{const c=channels[id];if(!c)return;const tag=document.createElement('span');tag.className='mini-channel';const i=document.createElement('i');i.className='dot '+c.cls;i.textContent=c.symbol;tag.append(i,document.createTextNode(c.name));wrap.append(tag);});
  return wrap;
}
function renderRecent(item){
  const row=document.createElement('div');row.className='recent-row';
  const symbol=document.createElement('span');symbol.className='campaign-symbol';symbol.textContent=item.channels.map(x=>channels[x]?.symbol||'').join('').slice(0,2)||'N';
  const copy=document.createElement('div');copy.className='recent-copy';const b=document.createElement('b');b.textContent=item.title;
  const small=document.createElement('small');small.textContent=(item.scheduleAt?'Programada · '+dateText(item.scheduleAt):'Creada · '+dateText(item.createdAt))+' · '+item.channels.length+' canales';
  copy.append(b,small);row.append(symbol,copy,statusPill(item.status));return row;
}
function renderCard(item){
  const card=document.createElement('article');card.className='campaign-card';
  const head=document.createElement('div');head.className='card-head';const created=document.createElement('small');created.textContent=dateText(item.createdAt);head.append(created,statusPill(item.status));
  const h=document.createElement('h3');h.textContent=item.title;const p=document.createElement('p');p.textContent=item.text.length>220?item.text.slice(0,220)+'…':item.text;
  card.append(head,h,p,channelTags(item.channels));
  if(item.scheduleAt){const time=document.createElement('small');time.className='scheduled-meta';time.textContent='Publicación prevista: '+dateText(item.scheduleAt);card.append(time);}
  if(item.results?.some(x=>!x.ok)){const warn=document.createElement('small');warn.className='warning-meta';warn.textContent='Uno o más canales requieren revisión.';card.append(warn);}
  const actions=document.createElement('div');actions.className='card-actions';
  if(['draft','failed','partial'].includes(item.status)){const pub=document.createElement('button');pub.className='primary';pub.textContent='Publicar ahora';pub.addEventListener('click',()=>publish(item.id,pub));actions.append(pub);}
  if(['draft','failed'].includes(item.status)){const del=document.createElement('button');del.className='secondary';del.textContent='Eliminar';del.addEventListener('click',()=>removeCampaign(item.id));actions.append(del);}
  if(actions.children.length)card.append(actions);return card;
}
function renderOverview(){
  $('#metricTotal').textContent=campaigns.length;
  $('#metricScheduled').textContent=campaigns.filter(x=>x.status==='scheduled').length;
  $('#metricPublished').textContent=campaigns.filter(x=>x.status==='published').length;
  $('#metricAttention').textContent=campaigns.filter(x=>['partial','failed'].includes(x.status)).length;
  const recent=$('#recent');recent.replaceChildren();
  const latest=[...campaigns].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,5);
  if(!latest.length)recent.append(empty('Todavía no hay campañas','Crea tu primera campaña para empezar a organizar tus publicaciones.'));
  else latest.forEach(x=>recent.append(renderRecent(x)));
  const list=$('#channelOverview');list.replaceChildren();
  integrations.forEach(item=>{
    const c=channels[item.id],row=document.createElement('div');row.className='channel-row';
    const dot=document.createElement('i');dot.className='dot '+c.cls;dot.textContent=c.symbol;
    const name=document.createElement('b');name.textContent=c.name;const state=document.createElement('small');state.textContent=item.configured?'Conectado':'Pendiente';if(item.configured)state.className='ready';
    row.append(dot,name,state);list.append(row);
  });
  const next=campaigns.filter(x=>x.status==='scheduled'&&x.scheduleAt).sort((a,b)=>Date.parse(a.scheduleAt)-Date.parse(b.scheduleAt))[0];
  const box=$('#nextCampaign');box.replaceChildren();
  const mark=document.createElement('span');mark.className='next-mark';mark.textContent='◷';
  const copy=document.createElement('div');copy.className='next-copy';const b=document.createElement('b');b.textContent=next?next.title:'Aún no hay publicaciones programadas';
  const p=document.createElement('p');p.textContent=next?dateText(next.scheduleAt)+' · '+next.channels.map(x=>channels[x].name).join(', '):'Programa tu primera campaña y NEXO la pondrá en cola.';
  copy.append(b,p);const button=document.createElement('button');button.className='secondary';button.textContent=next?'Ver calendario':'Programar campaña';
  button.addEventListener('click',()=>next?switchView('calendar'):openComposer());box.append(mark,copy,button);
}
function renderCampaigns(){
  const root=$('#allCampaigns');root.replaceChildren();
  const items=campaigns.filter(x=>filter==='attention'?['failed','partial'].includes(x.status):filter==='all'||x.status===filter);
  $('#campaignCount').textContent=items.length+(items.length===1?' campaña':' campañas');
  if(!items.length)root.append(empty('No hay campañas en esta vista','Prueba otro filtro o crea una campaña nueva.'));
  else items.forEach(x=>root.append(renderCard(x)));
}
function renderCalendar(){
  const root=$('#calendarList');root.replaceChildren();
  const items=campaigns.filter(x=>x.status==='scheduled'&&x.scheduleAt).sort((a,b)=>Date.parse(a.scheduleAt)-Date.parse(b.scheduleAt));
  if(!items.length){root.append(empty('Tu calendario está libre','Las campañas programadas aparecerán aquí.'));return;}
  items.forEach(item=>{
    const d=new Date(item.scheduleAt),row=document.createElement('div');row.className='calendar-item';
    const date=document.createElement('div');date.className='calendar-date';const day=document.createElement('b');day.textContent=new Intl.DateTimeFormat('es',{day:'2-digit'}).format(d);
    const month=document.createElement('small');month.textContent=new Intl.DateTimeFormat('es',{month:'short'}).format(d);date.append(day,month);
    const copy=document.createElement('div');copy.className='calendar-copy';const title=document.createElement('b');title.textContent=item.title;
    const detail=document.createElement('small');detail.textContent=dateText(item.scheduleAt)+' · '+item.channels.map(x=>channels[x].name).join(', ');copy.append(title,detail);
    row.append(date,copy,statusPill(item.status));root.append(row);
  });
}
function renderIntegrations(){
  const root=$('#integrationGrid');root.replaceChildren();
  integrations.forEach(item=>{
    const c=channels[item.id],card=document.createElement('article');card.className='integration';
    const head=document.createElement('div');head.className='integration-head';
    const title=document.createElement('div');title.className='integration-title';const dot=document.createElement('i');dot.className='dot '+c.cls;dot.textContent=c.symbol;
    const copy=document.createElement('div');const b=document.createElement('b');b.textContent=item.name;const small=document.createElement('small');small.textContent=['facebook','instagram'].includes(item.id)?'Meta Graph API':item.id==='telegram'?'Telegram Bot API':'Meta Messaging API';copy.append(b,small);title.append(dot,copy);
    const state=document.createElement('span');state.className='integration-state'+(item.configured?' ready':'');state.textContent=item.configured?'Configurado':'Pendiente';head.append(title,state);
    const p=document.createElement('p');p.textContent=item.detail;const foot=document.createElement('small');foot.className='integration-foot';foot.textContent=item.configured?'Credenciales detectadas en el servidor.':'Añade las variables al entorno y reinicia el servicio.';
    card.append(head,p,foot);root.append(card);
  });
}
function switchView(name){
  const allowed=['overview','campaigns','calendar','integrations','guide'],view=allowed.includes(name)?name:'overview';
  $$('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+view));
  $$('.nav').forEach(x=>{const active=x.dataset.view===view;x.classList.toggle('active',active);if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});
  $('#pageTitle').textContent={overview:'Resumen',campaigns:'Campañas',calendar:'Calendario',integrations:'Canales e integraciones',guide:'Centro de ayuda'}[view];
  $('#sidebar').classList.remove('open');
  if(view==='campaigns')renderCampaigns();if(view==='calendar')renderCalendar();if(view==='integrations')renderIntegrations();
}
async function loadAll(){
  try{const [a,b]=await Promise.all([api('/api/campaigns'),api('/api/integrations')]);campaigns=a.campaigns||[];integrations=b.integrations||[];renderOverview();renderCampaigns();renderCalendar();renderIntegrations();}
  catch(e){toast(e.message,true);}
}
function openComposer(){$('#campaignError').textContent='';$('#campaignDialog').showModal();}
async function publish(id,button){
  const text=button.textContent;button.disabled=true;button.textContent='Publicando…';
  try{const r=await api('/api/campaigns/'+encodeURIComponent(id)+'/publish',{method:'POST',body:'{}'});const failed=(r.campaign.results||[]).filter(x=>!x.ok);toast(failed.length?'Publicación parcial o fallida. Revisa cada canal.':'Campaña publicada correctamente.',Boolean(failed.length));await loadAll();}
  catch(e){toast(e.message,true);}finally{button.disabled=false;button.textContent=text;}
}
async function removeCampaign(id){
  if(!confirm('¿Eliminar esta campaña?'))return;
  try{await api('/api/campaigns/'+encodeURIComponent(id),{method:'DELETE'});toast('Campaña eliminada.');await loadAll();}
  catch(e){toast(e.message,true);}
}
async function saveCampaign(event){
  event.preventDefault();$('#campaignError').textContent='';
  const selected=$$('input[name="channel"]:checked').map(x=>x.value);
  if(!selected.length){$('#campaignError').textContent='Selecciona al menos un canal.';return;}
  const local=$('#scheduleAt').value;let scheduleAt=null;
  if(local){const d=new Date(local);if(Number.isNaN(d.getTime())){$('#campaignError').textContent='Fecha no válida.';return;}scheduleAt=d.toISOString();}
  const payload={
    title:$('#campaignTitle').value,text:$('#campaignText').value,mediaUrl:$('#mediaUrl').value,channels:selected,
    destinations:$('#destinations').value.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean),
    templateName:$('#templateName').value,templateLanguage:$('#templateLanguage').value||'es',
    templateParams:$('#templateParams').value.split(',').map(x=>x.trim()).filter(Boolean),
    consentConfirmed:$('#consentConfirmed').checked,messengerWindowConfirmed:$('#messengerWindowConfirmed').checked,scheduleAt
  };
  const button=$('#saveCampaign');button.disabled=true;button.textContent='Guardando…';
  try{await api('/api/campaigns',{method:'POST',body:JSON.stringify(payload)});$('#campaignDialog').close();$('#campaignForm').reset();toast(scheduleAt?'Campaña programada.':'Borrador guardado.');await loadAll();switchView(scheduleAt?'calendar':'campaigns');}
  catch(e){$('#campaignError').textContent=e.message;}
  finally{button.disabled=false;button.textContent='Guardar campaña →';}
}
async function start(){
  try{const session=await api('/api/session');if(!session.passwordConfigured){showLogin('Configura ADMIN_PASSWORD en el archivo .env.');return;}if(session.authenticated)showApp();else showLogin();}
  catch(e){showLogin(e.message);}
}
$('#loginForm').addEventListener('submit',async event=>{
  event.preventDefault();$('#loginError').textContent='';const button=$('button[type="submit"]',event.currentTarget);button.disabled=true;
  try{await api('/api/login',{method:'POST',body:JSON.stringify({password:$('#password').value})});$('#password').value='';showApp();}
  catch(e){$('#loginError').textContent=e.message;}finally{button.disabled=false;}
});
$('#campaignForm').addEventListener('submit',saveCampaign);
$('#closeDialog').addEventListener('click',()=>$('#campaignDialog').close());
$('#cancelDialog').addEventListener('click',()=>$('#campaignDialog').close());
$('#campaignDialog').addEventListener('click',e=>{if(e.target===$('#campaignDialog'))$('#campaignDialog').close();});
$$('[data-new]').forEach(x=>x.addEventListener('click',openComposer));
$$('[data-go]').forEach(x=>x.addEventListener('click',()=>switchView(x.dataset.go)));
$$('.nav').forEach(x=>x.addEventListener('click',()=>switchView(x.dataset.view)));
$$('.filter').forEach(x=>x.addEventListener('click',()=>{filter=x.dataset.filter;$$('.filter').forEach(y=>y.classList.toggle('active',y===x));renderCampaigns();}));
$('#refresh').addEventListener('click',loadAll);
$('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#logout').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST',body:'{}'});}catch{}showLogin();});
start();setInterval(()=>{if(!$('#appShell').hidden&&!document.hidden)loadAll();},60000);
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
