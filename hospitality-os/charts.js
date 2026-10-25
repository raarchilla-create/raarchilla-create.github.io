
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
