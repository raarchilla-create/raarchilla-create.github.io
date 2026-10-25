
/* hopta portfolio comparison — period-aligned evidence, no fabricated data */
async function hcCompareCenters(){
 const [sites,observations,settings,projects,tasks,findings]=await Promise.all([all('sites'),all('observations'),all('settings'),all('projects'),all('tasks'),exAll('findings')]);
 const months=[...new Set(observations.filter(x=>x.period&&/^\d{4}-\d{2}$/.test(x.period)).map(x=>x.period))].sort().reverse();
 const selected=hcComparePeriod&&months.includes(hcComparePeriod)?hcComparePeriod:(months[0]||'');
 hcComparePeriod=selected;
 const metric=(rows,name)=>hcSafe(hcMetric(rows,name));
 const rows=sites.map(s=>{
  const allSite=observations.filter(o=>o.siteId===s.id),obs=allSite.filter(o=>o.period===selected);
  const sales=metric(obs,'Ventas netas'),labor=metric(obs,'Coste laboral'),food=metric(obs,'Coste ingredientes'),service=metric(obs,'Satisfacción');
  const laborPct=sales>0&&labor!=null?labor/sales*100:null,foodPct=sales>0&&food!=null?food/sales*100:null;
  const goals=settings.find(x=>x.id==='hopta-targets-'+s.id)||{};
  const tests=[{v:laborPct,t:hcSafe(goals.laborTarget),bad:(a,b)=>a>b},{v:foodPct,t:hcSafe(goals.foodTarget),bad:(a,b)=>a>b},{v:service,t:hcSafe(goals.serviceTarget),bad:(a,b)=>a<b}];
  const deviations=tests.filter(x=>x.v!=null&&x.t!=null&&x.bad(x.v,x.t)).length;
  const assessed=tests.filter(x=>x.v!=null&&x.t!=null).length;
  const ps=projects.filter(p=>p.siteId===s.id),ts=tasks.filter(t=>ps.some(p=>p.id===t.projectId));
  const open=ts.filter(t=>!t.done).length,overdue=ts.filter(t=>!t.done&&t.dueDate&&t.dueDate<new Date().toISOString().slice(0,10)).length;
  const openFindings=findings.filter(f=>f.siteId===s.id&&!['Validado','Descartado','Cerrado','Resuelto','Completado'].includes(f.status)).length;
  return {s,sales,laborPct,foodPct,service,deviations,assessed,open,overdue,openFindings,hasData:obs.length>0};
 });
 const complete=rows.filter(x=>x.hasData).length,flagged=rows.filter(x=>x.deviations>0).length;
 const number=(v,suffix='')=>v==null?'—':hcNum(v)+suffix;
 const cells=x=>'<tr><td><button class="hc-table-link" onclick="hoptaCenter(&quot;'+esc(x.s.id)+'&quot;)">'+esc(x.s.name)+'</button><small>'+esc(x.s.type||'')+'</small></td><td>'+hcMoney(x.sales)+'</td><td>'+number(x.laborPct,' %')+'</td><td>'+number(x.foodPct,' %')+'</td><td>'+number(x.service,'/10')+'</td><td><span class="hc-comparison-flag '+(x.deviations?'hc-flagged':'')+'">'+(x.assessed?x.deviations+' / '+x.assessed:'Sin evaluar')+'</span></td><td>'+x.open+' · '+x.overdue+' vencidas</td><td>'+x.openFindings+'</td></tr>';
 app().innerHTML='<button class="hc-back" onclick="hoptaCenters()">← Todos los centros</button><div class="hc-eyebrow">HOPTA / PORTFOLIO</div><h2>Comparativa de centros</h2><p>Compara indicadores del mismo mes, detecta desviaciones frente a objetivos propios y prioriza el seguimiento operativo.</p>'+
 '<div class="card hc-compare-controls"><label for="hcc-period">Período comparable</label><select id="hcc-period" onchange="hcComparePeriod=this.value;hcCompareCenters()">'+(months.length?months.map(m=>'<option value="'+m+'" '+(m===selected?'selected':'')+'>'+m+'</option>').join(''):'<option value="">Sin mediciones mensuales</option>')+'</select></div>'+
 '<div class="hc-summary"><div><small>Centros</small><strong>'+sites.length+'</strong></div><div><small>Con datos del período</small><strong>'+complete+'</strong></div><div><small>Con desviaciones</small><strong>'+flagged+'</strong></div><div><small>Acciones vencidas</small><strong>'+rows.reduce((n,x)=>n+x.overdue,0)+'</strong></div></div>'+
 '<div class="card hc-comparison-card"><div class="hc-section-title"><h3>Rendimiento operativo</h3><span>'+esc(selected||'Sin período')+'</span></div><div class="hc-table-wrap"><table class="hc-comparison-table"><thead><tr><th>Centro</th><th>Ventas</th><th>Labor</th><th>Food</th><th>Satisfacción</th><th>Desviaciones</th><th>Acciones pendientes</th><th>Hallazgos</th></tr></thead><tbody>'+rows.map(cells).join('')+'</tbody></table></div></div>'+
 '<p class="hc-data-note">Solo se muestran métricas registradas para el período seleccionado. Las desviaciones se evalúan únicamente cuando hay objetivo y dato comparable. Los centros sin datos no se consideran conformes. Las cifras no están normalizadas por tamaño, volumen ni mix de negocio; no constituyen un ranking de rendimiento.</p>';
}
let hcComparePeriod='';
const hcPortfolioBase=hoptaCenters;
hoptaCenters=async function(){
 await hcPortfolioBase();
 const heading=app().querySelector('.hc-heading');
 if(heading){const button=document.createElement('button');button.className='secondary';button.textContent='Comparar centros';button.onclick=hcCompareCenters;heading.append(button)}
};

/* Comparison evolution: percentage-point changes only when both months have comparable data. */
const hcCompareBase=hcCompareCenters;
hcCompareCenters=async function(){
 await hcCompareBase();
 const sites=await all('sites'),obs=await all('observations');
 const months=[...new Set(obs.map(o=>o.period).filter(p=>typeof p==='string'&&/^\d{4}-\d{2}$/.test(p)))].sort().reverse();
 const current=hcComparePeriod,previous=months.filter(p=>p<current)[0];
 const section=document.createElement('div');section.className='card hc-evolution';
 const monthly=(id,period,name)=>hcSafe(hcMetric(obs.filter(o=>o.siteId===id&&o.period===period),name));
 const pct=(id,period,cost)=>{const sales=monthly(id,period,'Ventas netas'),v=monthly(id,period,cost);return sales>0&&v!=null?v/sales*100:null};
 const delta=(a,b,unit)=>a==null||b==null?'—':(a-b>0?'+':'')+hcNum(a-b)+unit;
 const row=s=>{
 const sales=monthly(s.id,current,'Ventas netas'),prior=monthly(s.id,previous,'Ventas netas');
 const labor=pct(s.id,current,'Coste laboral'),priorLabor=pct(s.id,previous,'Coste laboral');
 const food=pct(s.id,current,'Coste ingredientes'),priorFood=pct(s.id,previous,'Coste ingredientes');
 return '<tr><td><button class="hc-table-link" onclick="hoptaCenter(&quot;'+esc(s.id)+'&quot;)">'+esc(s.name)+'</button></td><td>'+delta(sales,prior,' €')+'</td><td>'+delta(labor,priorLabor,' pp')+'</td><td>'+delta(food,priorFood,' pp')+'</td></tr>';
 };
 section.innerHTML='<div class="hc-section-title"><h3>Evolución entre períodos</h3><span>'+(previous?esc(previous)+' → '+esc(current):'Sin período anterior')+'</span></div>'+
 (previous?'<div class="hc-table-wrap"><table class="hc-comparison-table"><thead><tr><th>Centro</th><th>Variación ventas</th><th>Variación labor</th><th>Variación food cost</th></tr></thead><tbody>'+sites.map(row).join('')+'</tbody></table></div>':'<p class="muted">Registra indicadores de al menos dos meses para comparar la evolución.</p>')+
 '<p class="hc-data-note">Las variaciones de costes son puntos porcentuales (pp), no euros. Un aumento del coste no implica necesariamente peor productividad: interpreta las cifras junto al contexto operativo.</p>';
 const card=app().querySelector('.hc-comparison-card');if(card)card.after(section);else app().append(section);
};


/* hopta: visual portfolio analytics. No chart libraries, no invented values. */
let hcChartMetric='sales';
const hcChartsBase=hcCompareCenters;
hcCompareCenters=async function(){
 await hcChartsBase();
 const sites=await all('sites'),obs=await all('observations');
 const period=hcComparePeriod;
 const defs={sales:{title:'Ventas netas',name:'Ventas netas',unit:'€',cost:false},labor:{title:'Coste laboral',name:'Coste laboral',unit:'%',cost:true},food:{title:'Food cost',name:'Coste ingredientes',unit:'%',cost:true},service:{title:'Satisfacción',name:'Satisfacción',unit:'/10',cost:false}};
 const metric=defs[hcChartMetric]||defs.sales;
 const value=(id,month)=>{
  const records=obs.filter(o=>o.siteId===id&&o.period===month);
  const getValue=name=>hcSafe(hcMetric(records,name));
  const v=getValue(metric.name);
  if(metric.cost){const sales=getValue('Ventas netas');return sales>0&&v!=null?v/sales*100:null}
  return v;
 };
 const entries=sites.map(s=>({site:s,value:value(s.id,period)})).filter(x=>x.value!=null).sort((a,b)=>b.value-a.value);
 const maximum=Math.max(...entries.map(x=>x.value),1);
 const bars=entries.length?entries.map(x=>'<div class="hc-visual-row"><span title="'+esc(x.site.name)+'">'+esc(x.site.name)+'</span><div class="hc-visual-track"><div style="width:'+Math.max(1,x.value/maximum*100).toFixed(2)+'%"></div></div><strong>'+hcNum(x.value)+' '+metric.unit+'</strong></div>').join(''):'<p class="muted">No hay mediciones comparables para este indicador y período.</p>';
 const months=[...new Set(obs.map(o=>o.period).filter(p=>typeof p==='string'&&/^\d{4}-\d{2}$/.test(p)))].sort().slice(-8);
 const history=months.map(month=>{
  const vals=sites.map(s=>value(s.id,month)).filter(v=>v!=null);
  return {month,mean:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,count:vals.length};
 }).filter(x=>x.mean!=null);
 const w=560,h=170,left=44,right=14,top=15,bottom=28;
 const vals=history.map(x=>x.mean),min=vals.length?Math.min(0,...vals):0,max=vals.length?Math.max(...vals):1,span=max-min||1;
 const x=i=>left+(w-left-right)*(history.length===1?.5:i/(history.length-1));
 const y=v=>top+(h-top-bottom)*(1-(v-min)/span);
 const line=history.map((p,i)=>x(i).toFixed(1)+','+y(p.mean).toFixed(1)).join(' ');
 const svg=history.length>1?'<svg class="hc-line-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Evolución media de '+esc(metric.title)+'"><path d="M'+left+' '+(h-bottom)+' H'+(w-right)+'" stroke="#e4e8e7"/><polyline points="'+line+'" fill="none" stroke="#0b2948" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+history.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+y(p.mean)+'" r="4" fill="#c9b89a" stroke="#0b2948" stroke-width="1.5"><title>'+esc(p.month)+': '+hcNum(p.mean)+' '+metric.unit+' ('+p.count+' centros)</title></circle>').join('')+'</svg><div class="hc-line-labels"><span>'+esc(history[0].month)+'</span><span>'+esc(history[history.length-1].month)+'</span></div>':'<p class="muted">Se necesitan datos de al menos dos meses para mostrar la evolución.</p>';
 const block=document.createElement('section');block.className='hc-visuals';
 block.innerHTML='<div class="hc-section-title"><h3>Gráficas del portfolio</h3><span>'+esc(period||'Sin período')+'</span></div><div class="hc-visual-tabs">'+Object.entries(defs).map(([key,d])=>'<button class="'+(key===hcChartMetric?'active':'')+'" onclick="hcChartMetric=&quot;'+key+'&quot;;hcCompareCenters()">'+esc(d.title)+'</button>').join('')+'</div>'+
 '<div class="hc-visual-grid"><div class="card"><h3>'+esc(metric.title)+' · por centro</h3><p class="hc-chart-subtitle">Comparación del mes seleccionado</p>'+bars+'</div><div class="card"><h3>Evolución mensual</h3><p class="hc-chart-subtitle">Media de centros con datos en cada mes</p>'+svg+'</div></div>'+
 '<p class="hc-data-note">La evolución representa la media simple de los centros con datos disponibles en cada mes. Si cambia el número de centros con mediciones, la media puede cambiar por ese motivo. No es una media ponderada por ventas.</p>';
 const summary=app().querySelector('.hc-summary');if(summary)summary.after(block);else app().append(block);
};
