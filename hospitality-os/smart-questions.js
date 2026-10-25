
/* Smart Analysis: guided natural-language questions answered with local, traceable calculations. */
let hqQuestion='overview';
const hqQuestions=[
 ['overview','¿Qué centros necesitan atención?'],
 ['sales','¿Dónde han caído las ventas?'],
 ['cost','¿Dónde están los mayores costes?'],
 ['trend','¿Qué ha mejorado este mes?']
];
function hqAnswer(question,sites,obs,months){
 const latest=months.at(-1),previous=months.at(-2);
 if(!latest)return {heading:'Aún no hay datos mensuales',body:'Carga los datos demo o registra indicadores mensuales en tus centros para obtener respuestas.',rows:[]};
 const value=(s,month,kind)=>haValue(obs.filter(o=>o.siteId===s.id&&o.period===month),kind);
 const data=sites.map(s=>({name:s.name,sales:value(s,latest,'sales'),prior:previous?value(s,previous,'sales'):null,labor:value(s,latest,'labor'),food:value(s,latest,'food'),service:value(s,latest,'service')}));
 if(question==='sales'){
  const rows=data.filter(x=>x.sales!=null&&x.prior>0).map(x=>({...x,delta:(x.sales-x.prior)/x.prior*100})).sort((a,b)=>a.delta-b.delta);
  return {heading:'Evolución de ventas · '+latest,body:'Variación respecto al mes anterior disponible ('+(previous||'sin datos')+'). No se ajusta por días de apertura ni estacionalidad.',rows:rows.map(x=>({label:x.name,number:hsDelta(x.delta,' %'),detail:hcMoney(x.prior)+' → '+hcMoney(x.sales)}))};
 }
 if(question==='cost'){
  const rows=data.filter(x=>x.labor!=null&&x.food!=null).map(x=>({...x,total:x.labor+x.food})).sort((a,b)=>b.total-a.total);
  return {heading:'Peso combinado de costes · '+latest,body:'Porcentaje de ventas consumido por mano de obra e ingredientes. No es margen neto ni incluye otros costes.',rows:rows.map(x=>({label:x.name,number:hsPercent(x.total),detail:'Labor '+hsPercent(x.labor)+' · Food '+hsPercent(x.food)}))};
 }
 if(question==='trend'){
  const improvements=hsAnalyze(sites,obs,months).filter(x=>x.severity==='positive');
  return {heading:'Mejoras detectadas · '+latest,body:improvements.length?'Mejoras identificadas por reglas sobre el cambio mensual.':'No se detectan mejoras que superen los umbrales configurados. Esto no significa que no haya avances.',rows:improvements.map(x=>({label:x.site,number:x.title,detail:x.evidence}))};
 }
 const findings=hsAnalyze(sites,obs,months).filter(x=>x.severity!=='positive');
 return {heading:'Prioridades operativas · '+latest,body:findings.length?'Ordenadas por gravedad y desviación; son señales para investigar, no diagnósticos causales.':'No hay alertas por encima de los umbrales actuales. Revisa la cobertura de datos.',rows:findings.slice(0,6).map(x=>({label:x.site,number:x.severity==='high'?'Alerta':'Revisar',detail:x.title+' · '+x.evidence}))};
}
const hqBase=hoptaAnalytics;
hoptaAnalytics=async function(){
 await hqBase();
 const [sites,obs]=await Promise.all([all('sites'),all('observations')]);
 const chosen=haSite==='all'?sites:sites.filter(s=>s.id===haSite);
 const months=[...new Set(obs.map(o=>o.period).filter(p=>/^\d{4}-\d{2}$/.test(p||'')))].sort();
 const answer=hqAnswer(hqQuestion,chosen,obs,months);
 const section=document.createElement('section');section.className='hq-section card';
 section.innerHTML='<div class="hq-head"><div><span>SMART ANALYSIS / PREGUNTA A TUS DATOS</span><h3>Explora tus indicadores</h3><p>Consultas guiadas con respuestas calculadas sobre tus registros.</p></div></div><div class="hq-questions">'+hqQuestions.map(([key,label])=>'<button class="'+(hqQuestion===key?'active':'')+'" onclick="hqQuestion=&quot;'+key+'&quot;;hoptaAnalytics()">'+esc(label)+'</button>').join('')+'</div><div class="hq-answer"><h3>'+esc(answer.heading)+'</h3><p>'+esc(answer.body)+'</p>'+(answer.rows.length?'<div class="hq-rows">'+answer.rows.map(row=>'<div class="hq-row"><div><b>'+esc(row.label)+'</b><small>'+esc(row.detail)+'</small></div><strong>'+esc(row.number)+'</strong></div>').join('')+'</div>':'<div class="ha-no-data">No hay resultados verificables para esta pregunta y el período disponible.</div>')+'</div><p class="hp-footnote">Respuestas deterministas: no se envían datos a ningún servicio externo y no se generan explicaciones causales sin evidencia.</p>';
 const smart=app().querySelector('#smart-analysis');if(smart)smart.before(section);else app().append(section);
};
