
/* hopta workspace navigation: clusters, quick center switching, and configurable panels */
let hwCluster='all',hwActiveCenter='all';
const hwSafe=s=>esc(String(s??''));
async function hwClusters(){return (await all('settings')).filter(x=>x.kind==='hoptaCluster')}
async function hwOpenCenter(id){hwActiveCenter=id;await hoptaCenter(id);hwDecorate();}
async function hwClusterSave(){
 const name=document.getElementById('hw-cluster-name')?.value.trim();
 if(!name)return toast('Introduce un nombre para el clúster');
 const ids=Array.from(document.querySelectorAll('.hw-member:checked')).map(x=>x.value);
 if(!ids.length)return toast('Selecciona al menos un centro');
 const id=document.getElementById('hw-cluster-id')?.value||'hopta-cluster-'+uid();
 await put('settings',{id,kind:'hoptaCluster',name,siteIds:ids,at:now()});
 toast('Clúster guardado');await hwSettings();
}
async function hwClusterDelete(id){
 if(!confirm('¿Eliminar este clúster? Los centros y sus datos se conservarán.'))return;
 await del('settings',id);if(hwCluster===id)hwCluster='all';toast('Clúster eliminado');await hwSettings();
}
async function hwClusterEdit(id){
 const clusters=await hwClusters(),c=clusters.find(x=>x.id===id);
 const sites=await all('sites');if(!c)return;
 document.getElementById('hw-cluster-id').value=c.id;
 document.getElementById('hw-cluster-name').value=c.name;
 document.querySelectorAll('.hw-member').forEach(x=>x.checked=(c.siteIds||[]).includes(x.value));
 document.getElementById('hw-cluster-editor').open=true;
 document.getElementById('hw-cluster-editor').scrollIntoView({behavior:'smooth',block:'center'});
}
async function hwSettings(){
 const [sites,clusters]=await Promise.all([all('sites'),hwClusters()]);
 app().innerHTML='<div class="hw-heading"><div class="hc-eyebrow">HOPTA / WORKSPACE</div><h2>Configuración</h2><p>Organiza tu portfolio y personaliza el espacio de trabajo.</p></div>'+
 '<div class="hw-settings-grid"><section class="card"><div class="hw-icon">▦</div><h3>Centros y organización</h3><p>'+sites.length+' centros · '+clusters.length+' clústers</p><button class="secondary" onclick="go(\'centros\')">Gestionar centros</button></section><section class="card"><div class="hw-icon">⚙</div><h3>Parámetros y datos</h3><p>Indicadores, fichas, exportaciones y utilidades existentes.</p><button class="secondary" onclick="go(\'mas\')">Abrir administración</button></section></div>'+
 '<div class="hw-section-title"><h3>Clústers de centros</h3><p>Agrupa restaurantes por zona, marca, tipología o cualquier criterio operativo. Un centro puede pertenecer a varios clústers.</p></div>'+
 '<div class="hw-cluster-list">'+(clusters.length?clusters.map(c=>'<article class="card hw-cluster-card"><div><b>'+hwSafe(c.name)+'</b><small>'+(c.siteIds||[]).length+' centros</small></div><div class="hw-cluster-actions"><button class="secondary" onclick="hwClusterEdit(\''+hwSafe(c.id)+'\')">Editar</button><button class="secondary" onclick="hwClusterDelete(\''+hwSafe(c.id)+'\')">Eliminar</button></div></article>').join(''):'<div class="card hw-empty">Todavía no hay clústers. Crea uno para filtrar tu portfolio rápidamente.</div>')+'</div>'+
 '<details id="hw-cluster-editor" class="card hw-editor" open><summary>+ Crear o editar clúster</summary><input type="hidden" id="hw-cluster-id"><label for="hw-cluster-name">Nombre del clúster</label><input id="hw-cluster-name" placeholder="Ej. Madrid Norte, QSR, Zona Centro"><div class="hw-members">'+sites.map(s=>'<label><input type="checkbox" class="hw-member" value="'+hwSafe(s.id)+'"> '+hwSafe(s.name)+'</label>').join('')+'</div><div class="actions"><button onclick="hwClusterSave()">Guardar clúster</button><button class="secondary" onclick="document.getElementById(\'hw-cluster-id\').value=\'\';document.getElementById(\'hw-cluster-name\').value=\'\';document.querySelectorAll(\'.hw-member\').forEach(x=>x.checked=false)">Nuevo / limpiar</button></div></details>'+
 '<div class="card hw-tip"><h3>Personaliza tus paneles</h3><p>Usa el icono de contraer en cada panel para dejar a la vista solo la información que necesitas. La preferencia se conserva en este navegador.</p></div>';
 await hwDecorate();
}
async function hwDecorate(){
 const siteRows=await all('sites'),clusters=await hwClusters();
 let bar=document.getElementById('hw-workspace-bar');
 if(!bar){bar=document.createElement('div');bar.id='hw-workspace-bar';app().before(bar)}
 const active=siteRows.some(s=>s.id===hwActiveCenter)?hwActiveCenter:'all';
 bar.innerHTML='<div class="hw-switch"><label for="hw-quick-site">Centro activo</label><select id="hw-quick-site" onchange="hwQuickSwitch(this.value)"><option value="all">Todos los centros</option>'+siteRows.map(s=>'<option value="'+hwSafe(s.id)+'" '+(active===s.id?'selected':'')+'>'+hwSafe(s.name)+'</option>').join('')+'</select><button class="hw-settings-button" onclick="go(\'configuracion\')" aria-label="Configuración" title="Configuración">⚙</button></div>';
 if(tab==='centros'&&app().querySelector('.hc-centers')){
  const listing=app().querySelector('.hc-centers'),cards=Array.from(listing.querySelectorAll('.hc-site'));
  let picker=document.getElementById('hw-cluster-picker');
  if(!picker){picker=document.createElement('div');picker.id='hw-cluster-picker';listing.before(picker)}
  picker.innerHTML='<label for="hw-cluster-select">Ver clúster</label><select id="hw-cluster-select" onchange="hwClusterFilter(this.value)"><option value="all">Todos los centros</option>'+clusters.map(c=>'<option value="'+hwSafe(c.id)+'" '+(hwCluster===c.id?'selected':'')+'>'+hwSafe(c.name)+'</option>').join('')+'</select><button class="secondary" onclick="go(\'configuracion\')">Administrar clústers</button><span id="hw-visible-count"></span>';
  cards.forEach((card,i)=>card.dataset.hwSiteId=siteRows[i]?.id||'');
  hwClusterFilter(hwCluster);
 }
 hwCollapsiblePanels();
}
function hwClusterFilter(id){
 hwCluster=id;
 const list=document.querySelector('.hc-centers');if(!list)return;
 const select=document.getElementById('hw-cluster-select');
 const chosen=select?Array.from(select.options).some(o=>o.value===id):false;
 if(!chosen)hwCluster='all';
 const option=select?.selectedOptions[0];if(select&&select.value!==hwCluster)select.value=hwCluster;
 const settings=window.hwCurrentClusters||[];
 // Use stored cluster membership cached by hwDecorate.
 const cluster=settings.find(x=>x.id===hwCluster),members=cluster?.siteIds||[];
 let visible=0;
 list.querySelectorAll('.hc-site').forEach(card=>{const show=hwCluster==='all'||members.includes(card.dataset.hwSiteId);card.hidden=!show;if(show)visible++});
 const count=document.getElementById('hw-visible-count');if(count)count.textContent=visible+' visibles';
}
async function hwQuickSwitch(id){
 hwActiveCenter=id;
 if(id==='all'){await go('centros');return}
 tab='centros';renderNav();await hwOpenCenter(id);
}
function hwCollapsiblePanels(){
 const sections=app().querySelectorAll('.card');
 sections.forEach((card,i)=>{
  if(card.classList.contains('hw-editor')||card.classList.contains('hw-cluster-card')||card.classList.contains('hw-empty')||card.classList.contains('hc-site')||card.querySelector(':scope > .hw-collapse-toggle'))return;
  const heading=card.querySelector(':scope > h3');if(!heading)return;
  const key='hopta-panel:'+tab+':'+heading.textContent.trim();
  const toggle=document.createElement('button');toggle.className='hw-collapse-toggle';toggle.type='button';toggle.setAttribute('aria-label','Contraer o expandir '+heading.textContent);
  const collapsed=localStorage.getItem(key)==='1';
  const children=Array.from(card.children).filter(el=>el!==heading);
  const body=document.createElement('div');body.className='hw-panel-body';children.forEach(el=>body.append(el));card.append(body);
  const update=()=>{const closed=localStorage.getItem(key)==='1';body.hidden=closed;toggle.textContent=closed?'＋':'−';toggle.setAttribute('aria-expanded',String(!closed))};
  heading.classList.add('hw-collapsible-heading');heading.append(toggle);
  toggle.onclick=()=>{localStorage.setItem(key,body.hidden?'0':'1');update()};
  if(collapsed)body.hidden=true;update();
 });
}
const hwRenderNav=renderNav;
renderNav=function(){
 hwRenderNav();
 const nav=document.getElementById('nav');
 const existing=Array.from(nav.querySelectorAll('button')).find(b=>b.textContent.includes('Más'));
 if(existing){existing.innerHTML='<span>☷</span>Config.';existing.onclick=()=>go('configuracion');existing.classList.toggle('active',tab==='configuracion');}
};
const hwGo=go;
go=async function(t){
 if(t==='configuracion'){tab=t;renderNav();await hwSettings();window.scrollTo(0,0);return}
 await hwGo(t);
 if(t==='centros'||t==='inicio'||t==='mas'||t==='captura'||t==='assess'||t==='proyectos'||t==='analitica')await hwDecorate();
};
const hwCenter=hoptaCenter;
hoptaCenter=async function(id){hwActiveCenter=id;await hwCenter(id);await hwDecorate()};
const hwCenters=hoptaCenters;
hoptaCenters=async function(){await hwCenters();window.hwCurrentClusters=await hwClusters();await hwDecorate()};
