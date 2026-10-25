
/* Synthetic analytics sample: deterministic, repeatable and isolated by demo IDs. */
async function haLoadDemo(){
 const existing=await all('sites');
 let demo=existing.filter(s=>s.demoTag===DEMO_TAG);
 if(!demo.length){
  const brandId='demo-hos-brand-mesa-viva';
  await put('settings',{id:brandId,kind:'brand',name:'Mesa Viva',demoTag:DEMO_TAG});
  for(const s of DEMO_SITES)await put('sites',{...s,brandId,brand:'Mesa Viva',demoTag:DEMO_TAG,at:now()});
  demo=DEMO_SITES;
 }
 const nowDate=new Date(),year=nowDate.getFullYear(),month=nowDate.getMonth();
 const series=[];
 for(let offset=11;offset>=0;offset--){
  const d=new Date(year,month-offset,1);
  series.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
 }
 const previous=await all('observations');
 const keys=new Set(previous.filter(o=>o.period).map(o=>o.siteId+'|'+o.period+'|'+o.metric));
 let added=0;
 const defs=[['Ventas netas','€','Personal y productividad'],['Coste laboral','€','Personal y productividad'],['Coste ingredientes','€','Producto y costes'],['Satisfacción','/10','Experiencia y servicio']];
 for(let j=0;j<demo.length;j++){
  const s=demo[j];
  for(let m=0;m<series.length;m++){
   const season=[.87,.9,.98,1.02,1.08,1.11,1.05,.96,1.04,1.12,1.17,1.24][m];
   const sales=Math.round(s.monthlySales*season*(1+.007*m)*(1+j*.006*Math.sin(m)));
   const laborRate=Math.max(23,s.laborPct+(j===0?-0.13:0.09)*m+Math.sin(m*1.1)*.65);
   const foodRate=Math.max(23,s.foodPct+(j===0?-0.08:.11)*m+Math.cos(m*.8)*.48);
   const score=Math.max(0,Math.min(10,s.serviceScore+(j===0?.025:-.045)*m+Math.sin(m*.9)*.12));
   const values=[sales,Math.round(sales*laborRate/100),Math.round(sales*foodRate/100),Number(score.toFixed(1))];
   for(let k=0;k<defs.length;k++){
    const [metric,unit,module]=defs[k],key=s.id+'|'+series[m]+'|'+metric;
    if(keys.has(key))continue;
    await put('observations',{id:'hopta-demo-analytics-'+j+'-'+series[m]+'-'+k,siteId:s.id,metric,unit,module,value:values[k],period:series[m],source:'DEMO sintético',demoTag:DEMO_TAG,at:now()});
    keys.add(key);added++;
   }
  }
 }
 toast(added?'Datos demo añadidos: '+added+' mediciones':'Los datos demo ya están disponibles');
 haSite='all';haMetric='sales';haMonths=12;await hoptaAnalytics();
}
const haDemoBase=hoptaAnalytics;
hoptaAnalytics=async function(){
 await haDemoBase();
 const header=app().querySelector('.ha-header');
 if(header){
  const button=document.createElement('button');button.className='secondary ha-demo-button';button.textContent='Cargar datos demo';button.onclick=haLoadDemo;
  header.append(button);
 }
 const sites=await all('sites');
 if(sites.some(s=>s.demoTag===DEMO_TAG)){
  const label=document.createElement('div');label.className='ha-demo-label';label.textContent='DEMO · Mesa Viva: los datos de ejemplo son ficticios y se guardan únicamente en este navegador.';
  const header=app().querySelector('.ha-header');if(header)header.after(label);
 }
};
