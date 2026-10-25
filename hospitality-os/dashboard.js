/* hopta center command dashboard — v1, local-only metrics and explicit targets. */
const hcSafe=n=>Number.isFinite(Number(n))&&n!==''&&n!=null?Number(n):null;
const hcPct=(v)=>v==null?'—':hcNum(v)+' %';
const hcMetric=(records,name)=>records.filter(x=>x.metric===name&&hcSafe(x.value)!==null).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')))[0]?.value;
const hcSignal=(label,value,target,lowIsGood)=>{if(target==null)return '<div class="hc-signal neutral"><span>'+label+'</span><b>Sin objetivo</b></div>';if(value==null)return '<div class="hc-signal neutral"><span>'+label+'</span><b>Objetivo: '+hcNum(target)+(label==='Satisfacción'?'/10':' %')+' · Sin datos</b></div>';let good=lowIsGood?value<=target:value>=target;return '<div class="hc-signal '+(good?'good':'bad')+'"><span>'+label+'</span><b>'+(good?'Dentro de objetivo':'Revisar desviación')+'</b></div>'};
function hcTrend(records,name,unit=''){
 const points=records.filter(x=>x.metric===name&&hcSafe(x.value)!==null).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||''))).slice(-12);
 if(points.length<2)return '<p class="muted">Necesitas al menos dos mediciones de '+esc(name.toLowerCase())+' para mostrar una evolución.</p>';
 const values=points.map(x=>Number(x.value)),lo=Math.min(...values),hi=Math.max(...values),span=hi-lo||1;
 const coords=values.map((v,i)=>(12+i* (476/Math.max(1,values.length-1))).toFixed(1)+','+(122-(v-lo)/span*98).toFixed(1)).join(' ');
 return '<div class="hc-chart"><svg viewBox="0 0 500 145" role="img" aria-label="Evolución de '+esc(name)+'"><path d="M12 122 H488" stroke="#e7e9e8" stroke-width="1"/><polyline points="'+coords+'" fill="none" stroke="#0b2948" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg><div class="hc-chart-axis"><span>'+hcNum(values[0])+esc(unit)+'</span><span>'+hcNum(values.at(-1))+esc(unit)+'</span></div></div>';
}
async function hcDashboard(id){
 const s=await get('sites',id);if(!s)return;
 const [obs,ass,projects,tasks,settings]=await Promise.all(['observations','assessments','projects','tasks','settings'].map(all));
 const sf=(await exAll('findings')).filter(x=>x.siteId===id);
 const records=obs.filter(x=>x.siteId===id),sp=projects.filter(x=>x.siteId===id);
 const sales=hcSafe(hcMetric(records,'Ventas netas'))??hcSafe(s.monthlySales);
 const labor=hcSafe(hcMetric(records,'Coste laboral')),food=hcSafe(hcMetric(records,'Coste ingredientes'));
 const lastPeriod=records.filter(x=>x.period&&x.metric==='Ventas netas').sort((a,b)=>String(b.period).localeCompare(String(a.period)))[0]?.period;const paired=lastPeriod?records.filter(x=>x.period===lastPeriod):[];const ps=hcSafe(hcMetric(paired,'Ventas netas')),pl=hcSafe(hcMetric(paired,'Coste laboral')),pf=hcSafe(hcMetric(paired,'Coste ingredientes'));const laborPct=lastPeriod?(ps>0&&pl!=null?pl/ps*100:null):(sales>0&&labor!=null?labor/sales*100:hcSafe(s.laborPct));
 const foodPct=lastPeriod?(ps>0&&pf!=null?pf/ps*100:null):(sales>0&&food!=null?food/sales*100:hcSafe(s.foodPct));
 const service=hcSafe(hcMetric(records,'Satisfacción'))??hcSafe(s.serviceScore);
 const targets=settings.find(x=>x.id==='hopta-targets-'+id)||{};
 const active=sf.filter(x=>!['Cerrado','Resuelto','Completado'].includes(x.status));
 const relevantTasks=tasks.filter(t=>sp.some(p=>p.id===t.projectId));
 const overdue=relevantTasks.filter(t=>!t.done&&t.dueDate&&new Date(t.dueDate)<new Date());
 const el=document.createElement('section');el.className='hc-command';
 el.innerHTML='<div class="hc-section-title"><h3>Centro de mando</h3><button class="secondary" onclick="hcEditTargets(\''+esc(id)+'\')">Configurar objetivos</button><button onclick="hcQuickMeasure(&quot;'+esc(id)+'&quot;)">+ Registrar indicadores</button></div>'+
 '<div class="hc-command-intro">Indicadores registrados y objetivos propios del centro. Las desviaciones son señales de revisión, no diagnósticos automáticos.</div>'+
 '<div class="hc-signals">'+hcSignal('Coste laboral',laborPct,hcSafe(targets.laborTarget),true)+hcSignal('Food cost',foodPct,hcSafe(targets.foodTarget),true)+hcSignal('Satisfacción',service,hcSafe(targets.serviceTarget),false)+'</div>'+
 '<div class="hc-two"><div class="card"><div class="hc-section-title"><h3>Evolución de ventas</h3><span>Últimas 12 mediciones</span></div>'+hcTrend(records,'Ventas netas',' €')+'</div>'+
 '<div class="card"><div class="hc-section-title"><h3>Plan de acción</h3><span>'+relevantTasks.filter(t=>!t.done).length+' pendientes</span></div>'+
 (active.length?active.slice(0,4).map(x=>'<div class="hc-action"><b>'+esc(x.title||x.name||'Hallazgo')+'</b><span>'+esc(x.priority||'')+' · '+esc(x.status||'Sin estado')+'</span></div>').join(''):'<p class="muted">Sin hallazgos abiertos registrados.</p>')+
 (overdue.length?'<p class="hc-warning">'+overdue.length+' tareas con fecha vencida.</p>':'')+
 '<button class="secondary" onclick="cases()">Gestionar hallazgos</button></div></div>'+
 '<div class="hc-two"><div class="card"><div class="hc-section-title"><h3>Coste laboral</h3><span>'+hcPct(laborPct)+' actual</span></div>'+hcTrend(records,'Coste laboral',' €')+'</div>'+
 '<div class="card"><div class="hc-section-title"><h3>Food cost</h3><span>'+hcPct(foodPct)+' actual</span></div>'+hcTrend(records,'Coste ingredientes',' €')+'</div></div>'+
 '<p class="hc-data-note">Los gráficos muestran importes registrados, no porcentajes históricos. Las cifras de ejemplo, si existen, son ficticias. No se generan datos ni tendencias cuando faltan mediciones.</p>';
 const config=document.querySelector('.hc-section-title');if(config)config.before(el);else app().append(el);
}
async function hcEditTargets(id){
 const settings=await all('settings'),x=settings.find(v=>v.id==='hopta-targets-'+id)||{},s=await get('sites',id);if(!s)return;
 const f=(key,label,desc)=>'<div><label for="hct-'+key+'">'+label+'</label><input type="number" step="any" min="0" id="hct-'+key+'" value="'+esc(x[key]??'')+'" placeholder="Sin objetivo"><small>'+desc+'</small></div>';
 app().innerHTML='<button class="hc-back" onclick="hoptaCenter(\''+esc(id)+'\')">← Volver al centro</button><div class="hc-eyebrow">HOPTA / OBJETIVOS</div><h2>'+esc(s.name)+'</h2><div class="card hc-form"><h3>Objetivos operativos</h3><p>Introduce objetivos propios. Deja un campo vacío si todavía no quieres evaluarlo.</p>'+
 f('laborTarget','Coste laboral máximo (%)','Se considera dentro de objetivo cuando el valor es igual o inferior.')+
 f('foodTarget','Food cost máximo (%)','Se considera dentro de objetivo cuando el valor es igual o inferior.')+
 f('serviceTarget','Satisfacción mínima (/10)','Se considera dentro de objetivo cuando el valor es igual o superior.')+
 '<div class="actions"><button onclick="hcSaveTargets(\''+esc(id)+'\')">Guardar objetivos</button><button class="secondary" onclick="hoptaCenter(\''+esc(id)+'\')">Cancelar</button></div></div>';
}
async function hcSaveTargets(id){
 const x={id:'hopta-targets-'+id,kind:'centerTargets',siteId:id,at:now()};
 for(const k of ['laborTarget','foodTarget','serviceTarget']){const raw=document.getElementById('hct-'+k).value.trim();if(raw){const n=Number(raw);if(!Number.isFinite(n)||n<0||(k==='serviceTarget'&&n>10)||(k!=='serviceTarget'&&n>100))return toast('Objetivo no válido: '+k);x[k]=n}}
 await put('settings',x);toast('Objetivos actualizados');await hoptaCenter(id);
}
const hcCenterOriginal=hoptaCenter;
hoptaCenter=async function(id){await hcCenterOriginal(id);await hcDashboard(id)};

async function hcQuickMeasure(id){
 const s=await get('sites',id);if(!s)return;
 const input=(key,label,unit)=>'<div><label for="hcm-'+key+'">'+label+'</label><input id="hcm-'+key+'" type="number" min="0" step="any" placeholder="Sin registrar"><small>'+unit+'</small></div>';
 app().innerHTML='<button class="hc-back" onclick="hoptaCenter(&quot;'+esc(id)+'&quot;)">← Volver al centro</button><div class="hc-eyebrow">HOPTA / MEDICIONES</div><h2>Registrar indicadores</h2><p>'+esc(s.name)+' · Registra ventas y costes correspondientes al mismo mes.</p><div class="card hc-form"><label for="hcm-period">Período</label><input type="month" id="hcm-period" value="'+new Date().toISOString().slice(0,7)+'"><div class="hc-form-grid">'+input('sales','Ventas netas','€')+input('labor','Coste laboral','€')+input('food','Coste ingredientes','€')+input('service','Satisfacción','0–10')+'</div><label for="hcm-note">Fuente / comentario</label><input id="hcm-note" placeholder="Ej. Cierre de TPV"><p class="hc-data-note">Solo se guardan los campos completados. No se borran registros previos.</p><button onclick="hcSaveMeasure(&quot;'+esc(id)+'&quot;)">Guardar mediciones</button></div>';
}
async function hcSaveMeasure(id){
 const defs=[['sales','Ventas netas','€','Personal y productividad'],['labor','Coste laboral','€','Personal y productividad'],['food','Coste ingredientes','€','Producto y costes'],['service','Satisfacción','/10','Experiencia y servicio']];
 const period=document.getElementById('hcm-period').value;if(!/^\d{4}-\d{2}$/.test(period))return toast('Selecciona un mes');
 const comment=document.getElementById('hcm-note').value.trim(),rows=[];
 for(const [key,metric,unit,module] of defs){const raw=document.getElementById('hcm-'+key).value.trim();if(!raw)continue;const value=Number(raw);if(!Number.isFinite(value)||value<0||(key==='service'&&value>10))return toast('Revisa '+metric);rows.push({id:uid(),siteId:id,metric,unit,module,value,period,comment,source:'Registro rápido',at:now()})}
 if(!rows.length)return toast('Introduce al menos un indicador');
 const existing=(await all('observations')).filter(x=>x.siteId===id&&x.period===period);
 if(rows.some(x=>existing.some(y=>y.metric===x.metric))&&!confirm('Ya hay mediciones de este mes. ¿Añadir nuevos registros sin borrar los anteriores?'))return;
 for(const row of rows)await put('observations',row);
 toast(rows.length+' mediciones guardadas');await hoptaCenter(id);
}
