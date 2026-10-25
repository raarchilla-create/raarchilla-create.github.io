
/* Smart Analysis v1 — transparent rule-based intelligence; no external AI calls. */
let hsSeverity='all';
const hsPercent=(n)=>n==null?'—':hcNum(n)+' %';
const hsDelta=(n,unit)=>n==null?'—':(n>0?'+':'')+hcNum(n)+unit;
function hsAnalyze(sites,observations,months){
 const results=[],last=months.at(-1),prev=months.at(-2);
 if(!last)return results;
 const get=(id,month,kind)=>haValue(observations.filter(o=>o.siteId===id&&o.period===month),kind);
 const add=(severity,title,site,evidence,interpretation,action,metric,score)=>{
  results.push({severity,title,site,evidence,interpretation,action,metric,score});
 };
 for(const s of sites){
  const a={sales:get(s.id,last,'sales'),labor:get(s.id,last,'labor'),food:get(s.id,last,'food'),service:get(s.id,last,'service')};
  const b=prev?{sales:get(s.id,prev,'sales'),labor:get(s.id,prev,'labor'),food:get(s.id,prev,'food'),service:get(s.id,prev,'service')}:null;
  if(b&&a.sales!=null&&b.sales>0){
   const growth=(a.sales-b.sales)/b.sales*100;
   if(growth<=-8)add('high','Descenso relevante de ventas',s.name,'Ventas '+hsDelta(growth,' %')+' frente a '+prev+'.','Caída intermensual confirmada; con estos datos no se puede atribuir a menor demanda, ticket o cierres.','Contrastar número de tickets, ticket medio, calendario comercial y días operativos.','Ventas',Math.abs(growth));
   else if(growth>=8)add('positive','Crecimiento de ventas',s.name,'Ventas '+hsDelta(growth,' %')+' frente a '+prev+'.','El crecimiento es intermensual; no demuestra por sí solo mejora de rentabilidad.','Revisar si el incremento de ingresos mantiene labor y food cost bajo control.','Ventas',growth);
  }
  if(b&&a.labor!=null&&b.labor!=null){
   const diff=a.labor-b.labor;
   if(diff>=2)add('high','Empeora el porcentaje laboral',s.name,'Labor '+hsPercent(b.labor)+' → '+hsPercent(a.labor)+' ('+hsDelta(diff,' pp')+').','El peso laboral sobre ventas ha aumentado. Puede influir el volumen de ventas o el gasto de personal; hay que separar ambos efectos.','Comparar horas trabajadas, coste laboral absoluto, ventas por hora y planificación de turnos.','Coste laboral',diff*4);
   else if(diff<=-2)add('positive','Mejora del porcentaje laboral',s.name,'Labor '+hsPercent(b.labor)+' → '+hsPercent(a.labor)+' ('+hsDelta(diff,' pp')+').','El porcentaje de coste laboral sobre ventas ha descendido.','Validar que la mejora no ha afectado tiempos de servicio o satisfacción.','Coste laboral',Math.abs(diff)*4);
  }
  if(b&&a.food!=null&&b.food!=null){
   const diff=a.food-b.food;
   if(diff>=1.5)add('high','Food cost en deterioro',s.name,'Food cost '+hsPercent(b.food)+' → '+hsPercent(a.food)+' ('+hsDelta(diff,' pp')+').','Ha aumentado el coste de ingredientes en relación con las ventas; no se conoce aún la causa.','Revisar precios de compra, escandallos, mermas, mix de ventas y controles de inventario.','Food cost',diff*5);
   else if(diff<=-1.5)add('positive','Food cost mejora',s.name,'Food cost '+hsPercent(b.food)+' → '+hsPercent(a.food)+' ('+hsDelta(diff,' pp')+').','Se reduce el peso del coste de ingredientes sobre ventas.','Contrastar con cambios en mix, recetas y precios de compra.','Food cost',Math.abs(diff)*5);
  }
  if(b&&a.service!=null&&b.service!=null&&a.service-b.service<=-.5)add('high','Satisfacción a la baja',s.name,'Valoración '+hcNum(b.service)+'/10 → '+hcNum(a.service)+'/10.','La valoración media cae, pero no se dispone de volumen ni distribución de respuestas.','Revisar comentarios, incidencias y tamaño de muestra antes de concluir la causa.','Satisfacción',(b.service-a.service)*12);
  if(a.sales!=null&&a.labor!=null&&a.food!=null&&a.labor+a.food>=70)add('medium','Presión combinada de costes',s.name,'Labor + food cost = '+hsPercent(a.labor+a.food)+' de ventas.','Queda '+hsPercent(100-a.labor-a.food)+' de las ventas antes de otros gastos; no equivale a margen neto.','Analizar costes fijos, mix y productividad para priorizar palancas de mejora.','Rentabilidad',(a.labor+a.food-60));
 }
 if(sites.length>=2){
  const peers=sites.map(s=>({name:s.name,labor:get(s.id,last,'labor'),food:get(s.id,last,'food')}));
  for(const kind of ['labor','food']){
   const valid=peers.filter(p=>p[kind]!=null);
   if(valid.length<2)continue;
   const low=Math.min(...valid.map(p=>p[kind]));
   valid.filter(p=>p[kind]-low>=5).forEach(p=>add('medium','Desviación frente a otros centros',p.name,(kind==='labor'?'Labor':'Food cost')+' '+hsPercent(p[kind])+' frente al mínimo de '+hsPercent(low)+' ('+hsDelta(p[kind]-low,' pp')+').','Diferencia entre establecimientos, no necesariamente ineficiencia: sus modelos operativos pueden variar.','Comparar tipología, mix, volumen y condiciones operativas antes de fijar objetivos comunes.',kind==='labor'?'Coste laboral':'Food cost',p[kind]-low));
  }
 }
 return results.sort((a,b)=>({high:0,medium:1,positive:2}[a.severity]-{high:0,medium:1,positive:2}[b.severity])||b.score-a.score);
}
function hsRender(items,period){
 const counts={high:items.filter(x=>x.severity==='high').length,medium:items.filter(x=>x.severity==='medium').length,positive:items.filter(x=>x.severity==='positive').length};
 const shown=hsSeverity==='all'?items:items.filter(x=>x.severity===hsSeverity);
 return '<section class="hs-section" id="smart-analysis"><div class="hp-section-heading"><span>04 / SMART ANALYSIS</span><h2>Inteligencia operativa</h2><p>Señales detectadas automáticamente · '+esc(period||'Sin datos')+'</p></div>'+
 '<div class="hs-summary"><div><b>'+counts.high+'</b><span>Alertas</span></div><div><b>'+counts.medium+'</b><span>A revisar</span></div><div><b>'+counts.positive+'</b><span>Mejoras</span></div></div>'+
 '<div class="hs-filter">'+[['all','Todos'],['high','Alertas'],['medium','A revisar'],['positive','Mejoras']].map(([key,label])=>'<button class="'+(hsSeverity===key?'active':'')+'" onclick="hsSeverity=&quot;'+key+'&quot;;hoptaAnalytics()">'+label+'</button>').join('')+'</div>'+
 '<div class="hs-grid">'+(shown.length?shown.map(x=>'<article class="card hs-finding hs-'+x.severity+'"><div class="hs-top"><span class="hs-status">'+(x.severity==='high'?'Atención':x.severity==='medium'?'Revisar':'Mejora')+'</span><span>'+esc(x.metric)+'</span></div><h3>'+esc(x.title)+'</h3><p class="hs-site">'+esc(x.site)+'</p><p class="hs-evidence">'+esc(x.evidence)+'</p><p>'+esc(x.interpretation)+'</p><div class="hs-action"><b>Siguiente comprobación</b><p>'+esc(x.action)+'</p></div></article>').join(''):'<div class="card hs-empty">No hay hallazgos de esta categoría con los datos y umbrales actuales. No significa que no existan problemas operativos.</div>')+'</div>'+
 '<p class="hp-footnote">Análisis automático basado en reglas y umbrales orientativos, no en un modelo de IA generativa. No establece causalidad ni realiza predicciones. Compara meses consecutivos disponibles y únicamente indicadores registrados.</p></section>';
}
const hsBase=hoptaAnalytics;
hoptaAnalytics=async function(){
 await hsBase();
 const [sites,obs]=await Promise.all([all('sites'),all('observations')]);
 const selected=haSite==='all'?sites:sites.filter(s=>s.id===haSite);
 const months=[...new Set(obs.map(o=>o.period).filter(p=>/^\d{4}-\d{2}$/.test(p||'')))].sort();
 const block=document.createElement('div');block.innerHTML=hsRender(hsAnalyze(selected,obs,months),months.at(-1));
 const insight=app().querySelector('.ha-insight');if(insight)insight.before(block);else app().append(block);
};
