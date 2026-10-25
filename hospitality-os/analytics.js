
/* hopta Analytics — dedicated portfolio intelligence workspace */
let haMetric='sales',haSite='all',haMonths=6;
const haDefs={
 sales:{label:'Ventas',name:'Ventas netas',unit:'€'},
 labor:{label:'Coste laboral',name:'Coste laboral',unit:'%'},
 food:{label:'Food cost',name:'Coste ingredientes',unit:'%'},
 service:{label:'Satisfacción',name:'Satisfacción',unit:'/10'}
};
function haValue(records,kind){
 const metric=name=>hcSafe(hcMetric(records,name));
 if(kind==='labor'||kind==='food'){const sales=metric('Ventas netas'),cost=metric(haDefs[kind].name);return sales>0&&cost!=null?100*cost/sales:null}
 return metric(haDefs[kind].name);
}
function haFormat(n,kind){if(n==null)return '—';return (kind==='sales'?hcMoney(n):hcNum(n)+(kind==='service'?'/10':' %'))}
function haLine(series,kind){
 if(series.filter(p=>p.value!=null).length<2)return '<div class="ha-no-data">Registra este indicador en al menos dos meses para ver la tendencia.</div>';
 const w=700,h=270,pad={l:52,r:20,t:22,b:42},valid=series.filter(p=>p.value!=null),values=valid.map(p=>p.value);
 let lo=Math.min(...values),hi=Math.max(...values);if(lo===hi){lo=Math.max(0,lo-1);hi+=1}else{const space=(hi-lo)*.14;lo=Math.max(0,lo-space);hi+=space}
 const X=i=>pad.l+(w-pad.l-pad.r)*(series.length===1?.5:i/(series.length-1)),Y=v=>pad.t+(h-pad.t-pad.b)*(1-(v-lo)/(hi-lo));
 const grid=[0,.25,.5,.75,1].map(f=>{const y=pad.t+(h-pad.t-pad.b)*f,v=hi-(hi-lo)*f;return '<line x1="'+pad.l+'" x2="'+(w-pad.r)+'" y1="'+y+'" y2="'+y+'" stroke="#e5e9e8" stroke-dasharray="3 5"/><text x="'+(pad.l-8)+'" y="'+(y+4)+'" text-anchor="end" fill="#84919c" font-size="11">'+hcNum(v)+'</text>'}).join('');
 let paths='',segment=[];
 const flush=()=>{if(segment.length>1)paths+='<polyline fill="none" stroke="#0b2948" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="'+segment.join(' ')+'"/>';segment=[]};
 series.forEach((p,i)=>{if(p.value==null){flush();return}segment.push(X(i).toFixed(1)+','+Y(p.value).toFixed(1))});flush();
 const dots=series.map((p,i)=>p.value==null?'':'<circle cx="'+X(i)+'" cy="'+Y(p.value)+'" r="5" fill="#c9b89a" stroke="#0b2948" stroke-width="2"><title>'+esc(p.month)+': '+haFormat(p.value,kind)+' ('+p.count+' centros)</title></circle>').join('');
 const labels=series.map((p,i)=>'<text x="'+X(i)+'" y="'+(h-13)+'" text-anchor="middle" fill="#778693" font-size="11">'+esc(p.month.slice(5))+'/'+esc(p.month.slice(2,4))+'</text>').join('');
 return '<svg class="ha-trend" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Tendencia de '+haDefs[kind].label+'">'+grid+paths+dots+labels+'</svg>';
}
function haBars(rows,kind){
 const valid=rows.filter(x=>x.value!=null).sort((a,b)=>b.value-a.value),max=Math.max(1,...valid.map(x=>x.value));
 return valid.length?valid.map(x=>'<div class="ha-bar-row"><div class="ha-bar-label">'+esc(x.name)+'</div><div class="ha-bar-track"><div style="width:'+Math.max(1,x.value/max*100).toFixed(2)+'%"></div></div><b>'+haFormat(x.value,kind)+'</b></div>').join(''):'<div class="ha-no-data">No hay centros con datos comparables en este período.</div>';
}
async function hoptaAnalytics(){
 const [sites,obs]=await Promise.all([all('sites'),all('observations')]);
 const allMonths=[...new Set(obs.map(o=>o.period).filter(p=>typeof p==='string'&&/^\d{4}-\d{2}$/.test(p)))].sort();
 const months=allMonths.slice(-haMonths);
 if(haSite!=='all'&&!sites.some(s=>s.id===haSite))haSite='all';
 const chosen=haSite==='all'?sites:sites.filter(s=>s.id===haSite);
 const series=months.map(month=>{
  const values=chosen.map(s=>haValue(obs.filter(o=>o.siteId===s.id&&o.period===month),haMetric)).filter(v=>v!=null);
  return {month,value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,count:values.length};
 });
 const current=months.at(-1),previous=months.at(-2);
 const bySite=chosen.map(s=>({name:s.name,value:haValue(obs.filter(o=>o.siteId===s.id&&o.period===current),haMetric)}));
 const last=series.at(-1)?.value??null,prior=series.at(-2)?.value??null;
 const change=last!=null&&prior!=null?(last-prior):null;
 const total=chosen.length,measured=bySite.filter(x=>x.value!=null).length;
 const fmtDelta=change==null?'Sin comparativa':(change>0?'+':'')+(haMetric==='sales'?hcMoney(change):hcNum(change)+(haMetric==='service'?' puntos':' pp'));
 app().innerHTML='<div class="ha-header"><div><div class="hc-eyebrow">HOPTA / INTELLIGENCE</div><h2>Analítica</h2><p>Una visión visual de tendencias, rendimiento y evolución de tus establecimientos.</p></div><button class="secondary" onclick="go(\'centros\')">Ver centros</button></div>'+
 '<div class="ha-controls"><div><label for="ha-site">Ámbito</label><select id="ha-site" onchange="haSite=this.value;hoptaAnalytics()"><option value="all">Toda la cadena</option>'+sites.map(s=>'<option value="'+esc(s.id)+'" '+(haSite===s.id?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></div><div><label for="ha-range">Horizonte</label><select id="ha-range" onchange="haMonths=Number(this.value);hoptaAnalytics()">'+[3,6,12,24].map(n=>'<option value="'+n+'" '+(haMonths===n?'selected':'')+'>'+n+' meses</option>').join('')+'</select></div></div>'+
 '<div class="ha-metric-tabs">'+Object.entries(haDefs).map(([key,d])=>'<button class="'+(haMetric===key?'active':'')+'" onclick="haMetric=&quot;'+key+'&quot;;hoptaAnalytics()">'+esc(d.label)+'</button>').join('')+'</div>'+
 '<div class="ha-kpis"><div class="ha-kpi"><span>Indicador actual</span><strong>'+haFormat(last,haMetric)+'</strong><small>'+esc(current||'Sin período')+'</small></div><div class="ha-kpi"><span>Variación mensual</span><strong>'+fmtDelta+'</strong><small>'+(previous?esc(previous)+' → '+esc(current):'Sin mes anterior')+'</small></div><div class="ha-kpi"><span>Centros con datos</span><strong>'+measured+' <em>/ '+total+'</em></strong><small>En el período seleccionado</small></div></div>'+
 '<div class="ha-panels"><section class="card ha-main-chart"><div class="ha-panel-head"><div><h3>Tendencia de '+esc(haDefs[haMetric].label)+'</h3><p>Serie mensual · '+(haSite==='all'?'media simple de centros':'centro seleccionado')+'</p></div><span class="ha-chip">'+haMonths+' meses</span></div>'+haLine(series,haMetric)+'</section>'+
 '<section class="card ha-side-chart"><div class="ha-panel-head"><div><h3>Comparativa por centro</h3><p>'+esc(current||'Sin período disponible')+'</p></div></div>'+haBars(bySite,haMetric)+'</section></div>'+
 '<div class="card ha-insight"><h3>Lectura de los datos</h3><p>'+(!months.length?'Aún no hay mediciones mensuales. Entra en un centro y utiliza «Registrar indicadores» para alimentar los gráficos.':measured===0?'No hay registros comparables para este indicador en el último mes disponible.':measured<total?'Hay '+(total-measured)+' centros sin datos para este indicador. No se consideran centros con buen rendimiento.':'Todos los centros seleccionados tienen datos para este indicador en el período.')+'</p><p class="hc-data-note">Las tendencias de toda la cadena muestran una media simple de centros con datos, no una media ponderada por facturación. Los cambios de coste se expresan en puntos porcentuales. No se infieren valores ausentes.</p><button class="secondary" onclick="hcCompareCenters()">Abrir tabla comparativa</button></div>';
}
const haRenderNavBase=renderNav;
renderNav=function(){
 haRenderNavBase();
 const nav=document.getElementById('nav');
 const button=document.createElement('button');button.className=tab==='analitica'?'active':'';button.innerHTML='<span>◫</span>Analítica';button.onclick=()=>go('analitica');
 const more=Array.from(nav.children).find(b=>b.textContent.includes('Más'));if(more)nav.insertBefore(button,more);else nav.append(button);
};
const haGoBase=go;
go=async function(t){if(t==='analitica'){tab=t;renderNav();await hoptaAnalytics();window.scrollTo(0,0);return}await haGoBase(t)};
