/* hopta centers — portfolio and per-location workspace. All data stays in existing IndexedDB stores. */
let hoptaSelectedCenter=null;
const hcNum=v=>Number.isFinite(Number(v))&&v!==''&&v!=null?Number(v).toLocaleString('es-ES',{maximumFractionDigits:1}):'—';
const hcMoney=v=>Number.isFinite(Number(v))&&v!==''&&v!=null?Number(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}):'—';
const hcDate=v=>v?new Date(v).toLocaleDateString('es-ES'):'—';
function hcButton(id,label,style=''){return '<button '+(style?'class="'+style+'" ':'')+'onclick="hoptaCenter(\''+esc(id)+'\')">'+label+'</button>'}
async function hoptaCenters(){
 const [sites,obs,ass,projects,tasks]=await Promise.all(['sites','observations','assessments','projects','tasks'].map(all));
 const findings=await exAll('findings'),staff=await exAll('contacts'),recipes=(await all('settings')).filter(x=>x.kind==='recipe');
 app().innerHTML='<div class="hc-heading"><div><div class="hc-eyebrow">HOPTA / PORTFOLIO</div><h2>Todos los centros</h2><p>Una visión de tu operación, centro a centro.</p></div><button class="secondary" onclick="go(\'mas\')">+ Nuevo centro</button></div>'+
 (sites.length?'<div class="hc-summary"><div><small>Centros</small><strong>'+sites.length+'</strong></div><div><small>Mediciones</small><strong>'+obs.length+'</strong></div><div><small>Diagnósticos</small><strong>'+ass.length+'</strong></div><div><small>Hallazgos abiertos</small><strong>'+findings.filter(f=>!['Cerrado','Resuelto','Completado'].includes(f.status)).length+'</strong></div></div><div class="hc-centers">'+sites.map(s=>{
 const so=obs.filter(x=>x.siteId===s.id),sf=findings.filter(x=>x.siteId===s.id),sa=ass.filter(x=>x.siteId===s.id);
 const last=so.slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')))[0];
 const latest=(metric)=>so.filter(x=>x.metric===metric).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')))[0]?.value;
 const sales=latest('Ventas netas')??s.monthlySales, labor=latest('Coste laboral'), food=latest('Coste ingredientes');
 const laborPct=sales>0&&labor!=null?100*labor/sales:s.laborPct;
 return '<article class="hc-site" onclick="hoptaCenter(\''+esc(s.id)+'\')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')hoptaCenter(\''+esc(s.id)+'\')"><div class="hc-site-top"><div class="hc-monogram">'+esc(s.name.slice(0,1).toUpperCase())+'</div><div><h3>'+esc(s.name)+'</h3><span class="hc-sub">'+esc(s.type||'Establecimiento')+' · '+hcNum(s.area)+' m²</span></div><span class="hc-chevron">↗</span></div><div class="hc-site-kpis"><div><small>Ventas</small><b>'+hcMoney(sales)+'</b></div><div><small>Coste laboral</small><b>'+(laborPct!=null?hcNum(laborPct)+' %':'—')+'</b></div></div><div class="hc-site-footer"><span>'+sa.length+' diagnósticos</span><span>'+sf.length+' hallazgos</span><span>'+staff.filter(x=>x.siteId===s.id).length+' personas</span></div><div class="hc-sub">Última medición: '+hcDate(last?.at)+'</div></article>'
 }).join('')+'</div>':'<div class="card"><h3>Tu portfolio empieza aquí</h3><p>Crea el primer centro desde Administración. Después aparecerá aquí con su propia ficha y sus indicadores.</p><button onclick="go(\'mas\')">Crear primer centro</button></div>');
}
async function hoptaCenter(id){
 const s=await get('sites',id);if(!s)return hoptaCenters();hoptaSelectedCenter=id;
 const [observations,assessments,projects,tasks,studies,zones]=await Promise.all([all('observations'),all('assessments'),all('projects'),all('tasks'),all('studies'),nextAll('zones')]);
 const findings=await exAll('findings'),staff=await exAll('contacts'),shifts=await exAll('caseActions'),recipes=(await all('settings')).filter(x=>x.kind==='recipe');
 const so=observations.filter(x=>x.siteId===id),sa=assessments.filter(x=>x.siteId===id),sf=findings.filter(x=>x.siteId===id),sp=projects.filter(x=>x.siteId===id),sz=zones.filter(x=>x.siteId===id),st=staff.filter(x=>x.siteId===id),sr=recipes.filter(x=>x.siteId===id);
 const latest=metric=>so.filter(x=>x.metric===metric).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')))[0]?.value;
 const sales=latest('Ventas netas')??s.monthlySales,lab=latest('Coste laboral'),food=latest('Coste ingredientes');
 const laborPct=sales>0&&lab!=null?lab/sales*100:s.laborPct,foodPct=sales>0&&food!=null?food/sales*100:s.foodPct;
 const metric=(label,value,detail='')=>'<div class="hc-kpi"><small>'+label+'</small><strong>'+value+'</strong><span>'+detail+'</span></div>';
 app().innerHTML='<div class="hc-heading"><div><button class="hc-back" onclick="hoptaCenters()">← Todos los centros</button><div class="hc-eyebrow">HOPTA / CENTRO</div><h2>'+esc(s.name)+'</h2><p>'+esc(s.type||'Establecimiento')+(s.brand?' · '+esc(s.brand):'')+'</p></div><button class="secondary" onclick="hoptaCenterEdit(\''+esc(id)+'\')">Editar configuración</button></div>'+
 '<div class="hc-kpis">'+metric('Ventas registradas',hcMoney(sales),'Último valor disponible')+metric('Coste laboral',laborPct!=null?hcNum(laborPct)+' %':'—','Sobre ventas')+metric('Food cost',foodPct!=null?hcNum(foodPct)+' %':'—','Sobre ventas')+metric('Mediciones',so.length,'En este centro')+'</div>'+
 '<div class="hc-section-title"><h3>Configuración del centro</h3><span>Ficha operativa</span></div><div class="hc-config">'+[['Superficie',hcNum(s.area)+' m²'],['Mesas interiores',hcNum(s.tables)],['Barra',hcNum(s.bar)+' plazas'],['Mesas terraza',hcNum(s.terrace)],['Zonas',sz.length],['Personal',st.length],['Elaboraciones',sr.length],['Turnos',shifts.filter(x=>x.kind==='shift'&&x.siteId===id).length]].map(([a,b])=>'<div><small>'+a+'</small><strong>'+b+'</strong></div>').join('')+'</div>'+
 '<div class="hc-two"><section class="card"><h3>Diagnósticos y mediciones</h3><p>'+sa.length+' assessments · '+studies.filter(x=>x.siteId===id).length+' estudios de tiempos</p>'+sa.slice(-5).reverse().map(a=>'<div class="item"><b>'+esc(a.name)+'</b><div class="muted">'+hcDate(a.at)+'</div><button class="secondary" onclick="editAssessment(\''+esc(a.id)+'\')">Abrir diagnóstico</button></div>').join('')+(sa.length?'':'<p>Aún no hay diagnósticos para este centro.</p>')+'<button onclick="go(\'assess\')">Nuevo diagnóstico</button></section>'+
 '<section class="card"><h3>Hallazgos y acciones</h3><p>'+sf.length+' hallazgos · '+sp.length+' proyectos asociados</p>'+sf.slice(-5).reverse().map(f=>'<div class="item"><b>'+esc(f.title||f.name||'Hallazgo')+'</b><div class="muted">'+esc(f.status||'Sin estado')+' · '+esc(f.priority||'')+'</div></div>').join('')+(sf.length?'':'<p>Sin hallazgos registrados.</p>')+'<button onclick="cases()">Abrir hallazgos</button></section></div>'+
 '<div class="hc-section-title"><h3>Herramientas del centro</h3></div><div class="hc-tools"><button onclick="hoptaCenterOperations(\''+esc(id)+'\')">Personal, turnos y recetas</button><button class="secondary" onclick="processHub()">Procesos</button><button class="secondary" onclick="zonesHub()">Zonas y capacidad</button><button class="secondary" onclick="valueHub()">Valor y ROI</button></div>';
}
async function hoptaCenterOperations(id){opsCurrentSite=id;await opsHub()}
async function hoptaCenterEdit(id){
 const s=await get('sites',id);if(!s)return hoptaCenters();
 const fields=[['name','Nombre','text'],['type','Tipo de establecimiento','text'],['brand','Marca / grupo','text'],['area','Superficie útil (m²)','number'],['tables','Mesas interiores','number'],['bar','Asientos en barra','number'],['terrace','Mesas terraza','number'],['address','Dirección','text'],['notes','Notas del centro','text']];
 app().innerHTML='<button class="hc-back" onclick="hoptaCenter(\''+esc(id)+'\')">← Volver al centro</button><h2>Configuración · '+esc(s.name)+'</h2><div class="card"><p>Los cambios se guardan únicamente en este navegador.</p>'+fields.map(([key,label,type])=>'<label for="hc-'+key+'">'+label+'</label><input id="hc-'+key+'" type="'+type+'" '+(type==='number'?'step="any" ':'')+'value="'+esc(s[key]??'')+'">').join('')+'<div class="actions"><button onclick="hoptaCenterSave(\''+esc(id)+'\')">Guardar cambios</button><button class="secondary" onclick="hoptaCenter(\''+esc(id)+'\')">Cancelar</button></div></div>';
}
async function hoptaCenterSave(id){const s=await get('sites',id);if(!s)return;for(const key of ['name','type','brand','area','tables','bar','terrace','address','notes'])s[key]=document.getElementById('hc-'+key).value.trim();if(!s.name)return toast('Introduce un nombre');await put('sites',s);toast('Centro actualizado');await hoptaCenter(id)}
const hoptaOriginalHome=home;home=async function(){await hoptaOriginalHome();const c=document.createElement('div');c.className='card hc-entry';c.innerHTML='<div class="hc-eyebrow">HOPTA / CENTROS</div><h3>Tu red, de un vistazo</h3><p>Accede al portfolio y abre el espacio operativo de cada establecimiento.</p><button onclick="hoptaCenters()">Explorar todos los centros →</button>';app().prepend(c)};
const hoptaOriginalMore=more;more=async function(){await hoptaOriginalMore();const c=document.createElement('div');c.className='card';c.innerHTML='<h3>Portfolio de centros</h3><p>Vista central, indicadores y configuración individual.</p><button onclick="hoptaCenters()">Ver todos los centros</button>';app().prepend(c)};

/* v1.1: center onboarding, search, demo discovery, and context-safe operations */
async function hoptaCenterNew(){
 app().innerHTML='<button class="hc-back" onclick="hoptaCenters()">← Todos los centros</button><div class="hc-eyebrow">HOPTA / NUEVO CENTRO</div><h2>Crear establecimiento</h2><p>Define los datos básicos. Después podrás completar personal, elaboraciones, mediciones y procesos.</p><div class="card hc-form">'+
 '<label for="hc-new-name">Nombre del centro *</label><input id="hc-new-name" placeholder="Ej. Restaurante Gran Vía" maxlength="120">'+
 '<label for="hc-new-type">Tipo de establecimiento</label><select id="hc-new-type"><option>Restaurante</option><option>Cafetería</option><option>QSR</option><option>Hotel</option><option>Colectividades</option><option>Dark kitchen</option><option>Otro</option></select>'+
 '<label for="hc-new-brand">Marca o grupo</label><input id="hc-new-brand" placeholder="Ej. Mesa Viva">'+
 '<div class="hc-form-grid"><div><label for="hc-new-area">Superficie útil (m²)</label><input id="hc-new-area" type="number" min="0" step="any"></div><div><label for="hc-new-tables">Mesas</label><input id="hc-new-tables" type="number" min="0"></div><div><label for="hc-new-bar">Asientos en barra</label><input id="hc-new-bar" type="number" min="0"></div><div><label for="hc-new-terrace">Mesas terraza</label><input id="hc-new-terrace" type="number" min="0"></div></div>'+
 '<label for="hc-new-address">Dirección</label><input id="hc-new-address" placeholder="Opcional">'+
 '<div class="actions"><button onclick="hoptaCenterCreate()">Crear centro</button><button class="secondary" onclick="hoptaCenters()">Cancelar</button></div></div>';
}
async function hoptaCenterCreate(){
 const v=k=>document.getElementById('hc-new-'+k).value.trim(),name=v('name');if(!name)return toast('Introduce el nombre del centro');
 for(const k of ['area','tables','bar','terrace']){const x=v(k);if(x!==''&&(!Number.isFinite(Number(x))||Number(x)<0))return toast('Revisa '+k)}
 const site={id:uid(),name,type:v('type'),brand:v('brand'),area:v('area'),tables:v('tables'),bar:v('bar'),terrace:v('terrace'),address:v('address'),at:now()};
 await put('sites',site);toast('Centro creado');await hoptaCenter(site.id);
}
async function hoptaCenterSearch(q){
 document.querySelectorAll('.hc-site').forEach(el=>{el.hidden=!el.dataset.search.includes(q.trim().toLocaleLowerCase('es'))});
 const visible=[...document.querySelectorAll('.hc-site')].filter(x=>!x.hidden).length;
 const counter=document.getElementById('hc-filter-count');if(counter)counter.textContent=visible+' centros visibles';
}
const hoptaCentersBase=hoptaCenters;
hoptaCenters=async function(){
 await hoptaCentersBase();
 const heading=document.querySelector('.hc-heading');const list=document.querySelector('.hc-centers');
 if(list){
  const sites=await all('sites');list.querySelectorAll('.hc-site').forEach((el,i)=>{el.dataset.search=(sites[i]?.name+' '+(sites[i]?.brand||'')+' '+(sites[i]?.type||'')).toLocaleLowerCase('es')});
  const toolbar=document.createElement('div');toolbar.className='hc-toolbar';toolbar.innerHTML='<label for="hc-search">Buscar establecimiento</label><input id="hc-search" type="search" placeholder="Nombre, marca o tipo…" oninput="hoptaCenterSearch(this.value)"><span id="hc-filter-count">'+sites.length+' centros visibles</span>';list.before(toolbar);
 }else if(heading){const demo=document.createElement('div');demo.className='card hc-demo-entry';demo.innerHTML='<h3>¿Quieres explorar un ejemplo?</h3><p>Prueba hopta con dos restaurantes ficticios, recetas, personal y diagnósticos.</p><button onclick="hoptaCenterLoadDemo()">Cargar centros de demostración</button>';heading.after(demo)}
}
async function hoptaCenterLoadDemo(){await demoHub();toast('Pulsa «Cargar casos demo» para instalar los centros ficticios')}
const hoptaOpsHubOriginal=opsHub;
opsHub=async function(){await hoptaOpsHubOriginal();let selectEl=document.getElementById('opsSite');if(selectEl){if(opsCurrentSite)selectEl.value=opsCurrentSite;selectEl.onchange=()=>{opsCurrentSite=selectEl.value};}}
