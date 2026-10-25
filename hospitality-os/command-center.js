
/* Command Center v1: rearrangeable and collapsible dashboard with grounded operational summaries. */
const hdDefault=['portfolio','attention','tasks','shortcuts','activity'];
let hdOrder=null;
function hdReadOrder(){try{const x=JSON.parse(localStorage.getItem('hopta-dashboard-order'));return Array.isArray(x)&&x.length===hdDefault.length&&hdDefault.every(k=>x.includes(k))?x:hdDefault.slice()}catch{return hdDefault.slice()}}
function hdMove(id,direction){const order=hdReadOrder(),index=order.indexOf(id),target=index+direction;if(target<0||target>=order.length)return;[order[index],order[target]]=[order[target],order[index]];localStorage.setItem('hopta-dashboard-order',JSON.stringify(order));hdReorder()}
function hdReorder(){const grid=document.getElementById('hd-grid');if(!grid)return;for(const id of hdReadOrder()){const el=grid.querySelector('[data-hd-id="'+id+'"]');if(el)grid.append(el)}}
function hdToggle(id){const panel=document.querySelector('[data-hd-id="'+id+'"]');if(!panel)return;const closed=!panel.classList.contains('hd-collapsed');panel.classList.toggle('hd-collapsed',closed);localStorage.setItem('hopta-dashboard-collapse-'+id,closed?'1':'0');panel.querySelector('.hd-toggle').textContent=closed?'＋':'−';panel.querySelector('.hd-toggle').setAttribute('aria-expanded',String(!closed))}
function hdPanel(id,title,subtitle,body){
 const closed=localStorage.getItem('hopta-dashboard-collapse-'+id)==='1';
 return '<section class="card hd-panel '+(closed?'hd-collapsed':'')+'" data-hd-id="'+id+'"><div class="hd-panel-head"><div><h3>'+esc(title)+'</h3><small>'+esc(subtitle)+'</small></div><div class="hd-panel-actions"><button title="Subir panel" aria-label="Subir '+esc(title)+'" onclick="hdMove(\''+id+'\',-1)">↑</button><button title="Bajar panel" aria-label="Bajar '+esc(title)+'" onclick="hdMove(\''+id+'\',1)">↓</button><button class="hd-toggle" title="Contraer o expandir" aria-expanded="'+(!closed)+'" onclick="hdToggle(\''+id+'\')">'+(closed?'＋':'−')+'</button></div></div><div class="hd-panel-body">'+body+'</div></section>';
}
async function hdHome(){
 const [sites,obs,tasks,studies,assessments,projects]=await Promise.all(['sites','observations','tasks','studies','assessments','projects'].map(all));
 const settings=await all('settings'),clusters=settings.filter(x=>x.kind==='hoptaCluster');
 const findings=typeof exAll==='function'?await exAll('findings'):[];
 const openTasks=tasks.filter(x=>!x.done&&!['Cerrado','Completado'].includes(x.status));
 const activeFindings=findings.filter(x=>!['Cerrado','Resuelto','Completado'].includes(x.status));
 const months=[...new Set(obs.map(o=>o.period).filter(x=>/^\d{4}-\d{2}$/.test(x||'')))].sort(),latest=months.at(-1);
 const sales=sites.map(s=>{const records=obs.filter(o=>o.siteId===s.id&&o.period===latest);return {site:s,value:latest&&typeof haValue==='function'?haValue(records,'sales'):null}});
 const totalSales=sales.filter(x=>x.value!=null).reduce((n,x)=>n+x.value,0);
 const hasSales=sales.some(x=>x.value!=null);
 const metric=(label,value,note)=>'<div class="hd-kpi"><small>'+esc(label)+'</small><strong>'+esc(String(value))+'</strong><span>'+esc(note)+'</span></div>';
 const portfolio=sites.length?'<div class="hd-centers">'+sites.map(s=>{const sf=activeFindings.filter(f=>f.siteId===s.id),pending=openTasks.filter(t=>t.siteId===s.id),entry=sales.find(x=>x.site.id===s.id);return '<button class="hd-center" onclick="hwQuickSwitch(\''+esc(s.id)+'\')"><span class="hd-center-avatar">'+esc(s.name.charAt(0).toUpperCase())+'</span><span class="hd-center-main"><b>'+esc(s.name)+'</b><small>'+esc(s.type||'Establecimiento')+' · '+sf.length+' hallazgos · '+pending.length+' tareas</small></span><strong>'+((entry?.value!=null)?hcMoney(entry.value):'Ver ficha')+'</strong><span>›</span></button>'}).join('')+'</div>':'<div class="hd-empty">Aún no hay centros. Crea uno desde Configuración o carga los datos de demostración.</div>';
 const attention=activeFindings.length?activeFindings.slice(0,5).map(f=>'<div class="hd-attention"><span class="hd-dot"></span><div><b>'+esc(f.title||f.name||f.description||'Hallazgo pendiente')+'</b><small>'+esc(sites.find(s=>s.id===f.siteId)?.name||'Sin centro')+' · '+esc(f.status||'Pendiente')+'</small></div></div>').join(''):'<div class="hd-empty">No hay hallazgos abiertos registrados. Esto no sustituye una evaluación operativa.</div>';
 const taskItems=openTasks.length?openTasks.slice(0,6).map(t=>'<div class="hd-task"><span class="hd-task-check">○</span><div><b>'+esc(t.title||t.name||t.text||'Tarea pendiente')+'</b><small>'+esc(sites.find(s=>s.id===t.siteId)?.name||'General')+(t.due?' · Vence '+esc(String(t.due).slice(0,10)):'')+'</small></div></div>').join(''):'<div class="hd-empty">No tienes tareas pendientes registradas.</div>';
 const activity=[{name:'Mediciones',count:obs.length},{name:'Diagnósticos',count:assessments.length},{name:'Estudios de tiempo',count:studies.length},{name:'Proyectos',count:projects.length}];
 const activityMax=Math.max(1,...activity.map(x=>x.count));
 const bars=activity.map(x=>'<div class="hd-activity-row"><span>'+esc(x.name)+'</span><div class="hd-track"><i style="width:'+Math.round(x.count/activityMax*100)+'%"></i></div><b>'+x.count+'</b></div>').join('');
 const panels={
  portfolio:hdPanel('portfolio','Portfolio de centros','Acceso directo a cada establecimiento',portfolio),
  attention:hdPanel('attention','Requieren atención',activeFindings.length+' hallazgos abiertos',attention),
  tasks:hdPanel('tasks','Próximas acciones',openTasks.length+' tareas pendientes',taskItems+'<div class="hd-panel-link"><button class="secondary" onclick="go(\'proyectos\')">Ver proyectos y tareas</button></div>'),
  shortcuts:hdPanel('shortcuts','Accesos rápidos','Tu trabajo en un clic','<div class="hd-shortcuts"><button onclick="go(\'captura\')"><span>◷</span>Capturar tiempo</button><button onclick="go(\'assess\')"><span>▤</span>Evaluar centro</button><button onclick="go(\'analitica\')"><span>▥</span>Analítica</button><button onclick="go(\'configuracion\')"><span>⚙</span>Configuración</button></div>'),
  activity:hdPanel('activity','Actividad registrada','Volumen de información disponible',bars)
 };
 app().innerHTML='<div class="hd-hero"><div><div class="hd-eyebrow">HOPTA / COMMAND CENTER</div><h2>Tu operación, de un vistazo.</h2><p>Prioriza lo importante, cambia de centro y accede a tus herramientas.</p></div><button class="hd-hero-button" onclick="go(\'centros\')">Explorar centros ↗</button></div>'+
 '<div class="hd-kpis">'+metric('Establecimientos',sites.length,clusters.length+' clústers')+metric('Ventas del último período',hasSales?hcMoney(totalSales):'—',latest||'Sin mediciones mensuales')+metric('Tareas abiertas',openTasks.length,'Acciones registradas')+metric('Hallazgos abiertos',activeFindings.length,'Pendientes de resolución')+'</div>'+
 '<div class="hd-section-intro"><div><h3>Tu espacio de trabajo</h3><p>Ordena los paneles con las flechas y contrae lo que no necesites.</p></div><button class="secondary" onclick="localStorage.removeItem(\'hopta-dashboard-order\');hdDefault.forEach(x=>localStorage.removeItem(\'hopta-dashboard-collapse-\'+x));hdHome()">Restablecer vista</button></div>'+
 '<div class="hd-grid" id="hd-grid">'+hdDefault.map(k=>panels[k]).join('')+'</div><div class="hd-local-note">Los datos se guardan en este navegador. Sin sincronización ni copia automática en la nube.</div>';
 hdReorder();
 if(typeof hwDecorate==='function')await hwDecorate();
}
home=hdHome;
