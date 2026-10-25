
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
