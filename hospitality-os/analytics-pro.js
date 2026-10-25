
/* Professional analytics gallery: grouped by business question, based on observed monthly records. */
function hpSvgBars(data,title,unit){
 const values=data.filter(x=>x.value!=null);
 if(!values.length)return '<div class="ha-no-data">Sin datos suficientes para este gráfico.</div>';
 const w=620,h=235,l=46,r=14,t=20,b=46,max=Math.max(1,...values.map(x=>x.value))*1.12,step=(w-l-r)/values.length,bar=Math.min(38,step*.56);
 const grid=[0,.25,.5,.75,1].map(f=>{let y=t+(h-t-b)*f;return '<line x1="'+l+'" x2="'+(w-r)+'" y1="'+y+'" y2="'+y+'" stroke="#e7e9e8"/><text x="'+(l-7)+'" y="'+(y+4)+'" text-anchor="end" fill="#82909a" font-size="10">'+hcNum(max*(1-f))+'</text>'}).join('');
 const bars=values.map((v,i)=>{let bh=v.value/max*(h-t-b),x=l+step*(i+.5)-bar/2,y=h-b-bh;return '<rect x="'+x+'" y="'+y+'" width="'+bar+'" height="'+bh+'" rx="5" fill="'+(i===values.length-1?'#c9b89a':'#0b2948')+'"><title>'+esc(v.label)+': '+hcNum(v.value)+' '+unit+'</title></rect><text x="'+(x+bar/2)+'" y="'+(h-24)+'" text-anchor="middle" fill="#82909a" font-size="10">'+esc(v.label)+'</text>'}).join('');
 return '<svg viewBox="0 0 '+w+' '+h+'" class="hp-svg" role="img" aria-label="'+esc(title)+'">'+grid+bars+'</svg>';
}
function hpDonut(parts,title){
 const valid=parts.filter(p=>p.value>0),sum=valid.reduce((a,b)=>a+b.value,0);
 if(!sum)return '<div class="ha-no-data">Sin datos suficientes para este gráfico.</div>';
 const palette=['#0b2948','#c9b89a','#5d8492','#9bb0b6','#d5dfe1'],r=62,c=2*Math.PI*r;
 let progress=0;
 const rings=valid.map((p,i)=>{const frac=p.value/sum,segment='<circle cx="94" cy="94" r="'+r+'" fill="none" stroke="'+palette[i%palette.length]+'" stroke-width="24" stroke-dasharray="'+(frac*c)+' '+c+'" stroke-dashoffset="'+(-progress*c)+'" transform="rotate(-90 94 94)"><title>'+esc(p.label)+': '+hcNum(frac*100)+'%</title></circle>';progress+=frac;return segment}).join('');
 return '<div class="hp-donut-wrap"><svg viewBox="0 0 188 188" class="hp-donut" role="img" aria-label="'+esc(title)+'">'+rings+'<text x="94" y="88" text-anchor="middle" font-size="14" font-weight="700" fill="#0b2948">'+hcNum(sum)+'</text><text x="94" y="107" text-anchor="middle" font-size="11" fill="#7c8b96">total</text></svg><div class="hp-legend">'+valid.map((p,i)=>'<div><i style="background:'+palette[i%palette.length]+'"></i><span>'+esc(p.label)+'</span><b>'+hcNum(p.value/sum*100)+' %</b></div>').join('')+'</div></div>';
}
function hpHeatmap(months,sites,obs){
 if(!months.length||!sites.length)return '<div class="ha-no-data">Carga datos mensuales para ver el mapa de calor.</div>';
 const rows=sites.map(s=>{const cells=months.map(month=>{const records=obs.filter(o=>o.siteId===s.id&&o.period===month),sales=haValue(records,'sales');return {month,sales}});const vals=cells.map(x=>x.sales).filter(v=>v!=null),min=Math.min(...vals),max=Math.max(...vals);
 return '<div class="hp-heat-row"><strong title="'+esc(s.name)+'">'+esc(s.name)+'</strong>'+cells.map(x=>{let intensity=x.sales==null?0:(max===min?.55:.15+.85*(x.sales-min)/(max-min));return '<span style="background:'+(x.sales==null?'#edf0ef':'rgba(11,41,72,'+intensity.toFixed(2)+')')+'" title="'+esc(s.name)+' · '+esc(x.month)+' · '+(x.sales==null?'Sin datos':hcMoney(x.sales))+'"></span>'}).join('')+'</div>'}).join('');
 return '<div class="hp-heat">'+rows+'<div class="hp-heat-row hp-heat-axis"><strong></strong>'+months.map(m=>'<small>'+esc(m.slice(5))+'</small>').join('')+'</div></div><p class="hp-footnote">Intensidad relativa de ventas dentro de cada centro. Los huecos indican meses sin datos.</p>';
}
function hpScatter(sites,obs,period){
 const points=sites.map(s=>{const records=obs.filter(o=>o.siteId===s.id&&o.period===period);return {name:s.name,labor:haValue(records,'labor'),food:haValue(records,'food')}}).filter(p=>p.labor!=null&&p.food!=null);
 if(!points.length)return '<div class="ha-no-data">Se necesitan ventas y costes por centro para dibujar la dispersión.</div>';
 const w=620,h=250,l=53,r=25,t=22,b=44,xMax=Math.max(40,...points.map(p=>p.labor))*1.1,yMax=Math.max(40,...points.map(p=>p.food))*1.1;
 const dots=points.map((p,i)=>{let x=l+p.labor/xMax*(w-l-r),y=h-b-p.food/yMax*(h-t-b);return '<circle cx="'+x+'" cy="'+y+'" r="9" fill="'+(i%2?'#c9b89a':'#0b2948')+'" stroke="white" stroke-width="2"><title>'+esc(p.name)+' · Labor '+hcNum(p.labor)+'% · Food '+hcNum(p.food)+'%</title></circle><text x="'+(x+11)+'" y="'+(y-11)+'" font-size="11" fill="#43576b">'+esc(p.name)+'</text>'}).join('');
 return '<svg class="hp-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Relación entre labor y food cost"><line x1="'+l+'" x2="'+(w-r)+'" y1="'+(h-b)+'" y2="'+(h-b)+'" stroke="#b8c6c9"/><line x1="'+l+'" x2="'+l+'" y1="'+t+'" y2="'+(h-b)+'" stroke="#b8c6c9"/><text x="'+(w/2)+'" y="'+(h-8)+'" text-anchor="middle" fill="#70818b" font-size="12">Coste laboral (%)</text><text x="16" y="'+(h/2)+'" transform="rotate(-90 16 '+(h/2)+')" text-anchor="middle" fill="#70818b" font-size="12">Food cost (%)</text>'+dots+'</svg>';
}
const hpAnalyticsBase=hoptaAnalytics;
hoptaAnalytics=async function(){
 await hpAnalyticsBase();
 const [sites,obs]=await Promise.all([all('sites'),all('observations')]);
 const chosen=haSite==='all'?sites:sites.filter(s=>s.id===haSite);
 const months=[...new Set(obs.map(o=>o.period).filter(p=>/^\d{4}-\d{2}$/.test(p||'')))].sort().slice(-haMonths),latest=months.at(-1);
 const perMonth=months.map(month=>{const vals=chosen.map(s=>haValue(obs.filter(o=>o.siteId===s.id&&o.period===month),'sales')).filter(v=>v!=null);return {label:month.slice(5),value:vals.length?vals.reduce((a,b)=>a+b,0):null}});
 const last=chosen.map(s=>{const records=obs.filter(o=>o.siteId===s.id&&o.period===latest);return {name:s.name,sales:haValue(records,'sales'),labor:haValue(records,'labor'),food:haValue(records,'food')}});
 const totals=last.filter(x=>x.sales!=null&&x.labor!=null&&x.food!=null).reduce((a,x)=>{a.labor+=x.sales*x.labor/100;a.food+=x.sales*x.food/100;a.rest+=x.sales*(1-(x.labor+x.food)/100);return a},{labor:0,food:0,rest:0});
 const container=document.createElement('div');container.className='hp-gallery';
 container.innerHTML='<div class="hp-section-heading"><span>01 / EVOLUCIÓN</span><h2>Tendencias y crecimiento</h2><p>Ventas mensuales agregadas y patrones de demanda.</p></div><div class="hp-two"><section class="card"><h3>Ventas acumuladas por mes</h3><p class="hp-sub">Suma de centros con mediciones · euros</p>'+hpSvgBars(perMonth,'Ventas por mes','€')+'</section><section class="card"><h3>Mapa de calor de actividad</h3><p class="hp-sub">Intensidad de ventas por centro y mes</p>'+hpHeatmap(months,chosen,obs)+'</section></div>'+
 '<div class="hp-section-heading"><span>02 / RENTABILIDAD</span><h2>Costes y eficiencia</h2><p>Composición de costes directos y relación entre indicadores.</p></div><div class="hp-two"><section class="card"><h3>Distribución de ventas</h3><p class="hp-sub">Coste laboral, ingredientes y resto · '+esc(latest||'sin período')+'</p>'+hpDonut([{label:'Labor',value:totals.labor},{label:'Ingredientes',value:totals.food},{label:'Resto de ventas',value:Math.max(0,totals.rest)}],'Distribución de ventas')+'</section><section class="card"><h3>Labor vs. food cost</h3><p class="hp-sub">Cada punto representa un establecimiento</p>'+hpScatter(chosen,obs,latest)+'</section></div>'+
 '<div class="hp-section-heading"><span>03 / INTERPRETACIÓN</span><h2>Contexto para decidir</h2></div><section class="card hp-note"><p>Los gráficos usan exclusivamente registros mensuales existentes. El gráfico de distribución muestra el importe de ventas restante después de costes laborales e ingredientes: <strong>no representa beneficio</strong> ni contempla alquileres, energía u otros gastos. La intensidad del mapa de calor se normaliza por establecimiento.</p></section>';
 const insight=app().querySelector('.ha-insight');if(insight)insight.before(container);else app().append(container);
};
