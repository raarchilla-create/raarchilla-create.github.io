/* Consulting workspace: explicit forecasts, minute coverage, and editable shifts. */
const HP=HoptaPlanner;
let hpState={siteId:null,date:HP.localDate(),zoom:2,minute:null,draft:null,editId:null,undo:null};
let hpSaving=false,hpLoadVersion=0;
const hpMoney=n=>n==null?'—':Number(n).toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2});
const hpNumber=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:2});
const hpTime=n=>HP.clock(n)+(n>=1440?' +1d':n<0?' −1d':'');
const hpPlanId=(site,date)=>'hopta-minute-plan:'+site+':'+date;
const hpDefaultId=site=>'hopta-minute-defaults:'+site;
const hpValue=id=>document.getElementById(id)?.value??'';
function hpInput(id,label,type,value,extra=''){return '<label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value??'')+'" '+extra+'>'}
async function hpEntry(){
 const sites=await all('sites');
 if(sites.length===1)return hcOpenTool('planificacion',sites[0].id);
 tab='centros';hcToolContext=null;hwActiveCenter='all';renderNav();
 app().innerHTML='<div class="hp-intro"><div class="hc-eyebrow">HOPTA / OPTIMIZACIÓN OPERATIVA</div><h2>Planificación por minuto</h2><p>Cruza previsión de ventas, turnos y coste laboral para revisar la cobertura de cada minuto.</p></div><section class="card hp-card">'+(sites.length?select('hp-entry-site','Centro a planificar',sites)+'<button id="hp-entry-open">Abrir planificación</button>':'<p>Crea un centro y añade su personal para empezar a planificar.</p><button onclick="hoptaCenterNew()">Crear centro</button>')+'</section>';
 document.getElementById('hp-entry-open')?.addEventListener('click',()=>hcOpenTool('planificacion',hpValue('hp-entry-site')));
 await hwDecorate();window.scrollTo(0,0);
}
function hpReadDraft(){
 if(!document.getElementById('hp-person'))return hpState.draft;
 return {personId:hpValue('hp-person'),date:hpValue('hp-shift-date'),start:hpValue('hp-shift-start'),end:hpValue('hp-shift-end'),endNextDay:document.getElementById('hp-next-day').checked,
  breakStart:hpValue('hp-break-start'),breakMinutes:hpValue('hp-break-minutes'),breakPaid:document.getElementById('hp-break-paid').checked,hourlyCost:hpValue('hp-rate')};
}
async function hpPlanner(options={}){
 const siteId=hcToolSite('planificacion');if(!siteId)return hpEntry();
 const version=++hpLoadVersion;
 const same=hpState.siteId===siteId;
 if(same&&!options.resetDraft)hpState.draft=hpReadDraft();
 const date=hpState.date||HP.localDate(),scroll=document.getElementById('hp-scroll')?.scrollLeft||0;
 const [settings,staff,actions]=await Promise.all([all('settings'),exAll('contacts'),exAll('caseActions')]);
 if(version!==hpLoadVersion||hcToolSite('planificacion')!==siteId)return;
 const defaults=settings.find(x=>x.id===hpDefaultId(siteId))||{};
 const saved=settings.find(x=>x.id===hpPlanId(siteId,date));
 const plan=saved?{...saved,forecast:{...saved.forecast}}:{id:hpPlanId(siteId,date),kind:'minutePlan',siteId,date,start:defaults.start??480,end:defaults.end??1380,target:defaults.target??null,minimum:defaults.minimum??0,forecast:{}};
 hpState={...hpState,siteId,date,plan,staff:staff.filter(p=>p.siteId===siteId),shifts:actions.filter(s=>s.siteId===siteId&&s.kind==='shift'),archived:actions.filter(s=>s.siteId===siteId&&s.kind==='shiftArchived'),
  draft:same&&!options.resetDraft?hpState.draft:null,editId:same&&!options.resetDraft?hpState.editId:null,undo:same?hpState.undo:null,minute:same&&Number.isInteger(hpState.minute)&&hpState.minute>=plan.start&&hpState.minute<plan.end?hpState.minute:plan.start};
 hpState.analysis=HP.analyze({...plan,shifts:hpState.shifts,staff:hpState.staff});
 hpRender();await hcToolHeader();
 const scroller=document.getElementById('hp-scroll');if(scroller)scroller.scrollLeft=same?scroll:0;
}
function hpMetric(label,value,note){return '<div class="hp-kpi"><small>'+label+'</small><strong>'+value+'</strong><span>'+note+'</span></div>'}
function hpRender(){
 const {plan:p,analysis:a}=hpState,minutes=p.end-p.start;
 const known=hpNumber(a.known/minutes*100),warnings=[];
 if(a.conflicts.length)warnings.push('Hay '+a.conflicts.length+' personas con turnos solapados. La cobertura y el coste no duplican a una misma persona por minuto. Revisa esos turnos.');
 if(a.invalidShifts.length)warnings.push('Hay '+a.invalidShifts.length+' turnos con horarios o pausas que necesitan revisión. Quedan fuera del cálculo hasta corregirlos.');
 if(a.unknownCostMinutes)warnings.push('Falta la tarifa de alguna persona en '+a.unknownCostMinutes+' minutos. Completa su coste por hora para calcular el total.');
 app().innerHTML='<div class="hp-title"><div><div class="hc-eyebrow">HOPTA / PLANIFICACIÓN OPERATIVA</div><h2>Ventas y turnos, minuto a minuto</h2><p>Previsión y planificación para tomar decisiones de cobertura. Las horas se expresan en horario local.</p></div><button class="secondary" id="hp-export">Exportar minutos CSV</button></div>'+
 '<section class="card hp-card hp-controls"><div class="hp-date"><button class="secondary" id="hp-prev" aria-label="Día anterior">←</button>'+hpInput('hp-date','Día de operación','date',p.date)+'<button class="secondary" id="hp-next" aria-label="Día siguiente">→</button></div><div class="hp-fields">'+hpInput('hp-window-start','Desde','time',HP.clock(p.start),'step="60"')+hpInput('hp-window-end','Hasta','time',HP.clock(p.end),'step="60"')+'</div><button id="hp-apply-window">Aplicar horario</button><small>Un fin anterior o igual al inicio corresponde al día siguiente. Hasta 24 horas.</small></section>'+
 '<div class="hp-kpis">'+hpMetric('Forecast de ventas',a.known?hpMoney(a.sales):'—',known+' % de minutos con previsión')+hpMetric('Horas de cobertura',hpNumber(a.workHours)+' h',hpNumber(a.paidHours)+' h pagadas · pausas descontadas de cobertura')+hpMetric('Coste planificado',hpMoney(a.cost),a.unknownCostMinutes?'Completa las tarifas':'Coste de los minutos pagados dentro de esta vista')+hpMetric('Coste / forecast',a.laborPct==null?'—':hpNumber(a.laborPct)+' %',!a.complete?'Completa la previsión para evaluar el ratio':'Ratio previsto; no son resultados reales')+'</div>'+
 (warnings.length?'<div class="hp-warning" role="status">'+warnings.map(esc).join('<br>')+'</div>':'')+
 '<section class="card hp-card"><div class="hp-section-head"><div><h3>Gráfica y tiradores por minuto</h3><p>Haz clic en la gráfica para editar un minuto. Arrastra el turno o sus extremos; las flechas del teclado ajustan un minuto.</p></div><div><label for="hp-zoom">Zoom temporal</label><select id="hp-zoom">'+[1,2,4,8].map(z=>'<option value="'+z+'" '+(z===hpState.zoom?'selected':'')+'>'+z+' px por minuto</option>').join('')+'</select></div></div><div class="hp-legend"><span><i class="hp-sales-key"></i>Ventas previstas €/min</span><span><i class="hp-cover-key"></i>Personas disponibles</span><span><i class="hp-need-key"></i>Dotación orientativa</span><span>Sin forecast = sin evaluación</span></div>'+hpTimeline()+'<div id="hp-drag-status" class="hp-drag-status" role="status">Precisión: 1 minuto. Doble clic o Intro sobre un turno para editarlo.</div>'+hpMinuteInspector()+'</section>'+
 '<div class="hp-editor-grid"><section class="card hp-card"><h3>Forecast de ventas</h3><p>Introduce un minuto exacto desde la gráfica o reparte un importe entre los minutos de una franja.</p><div class="hp-fields">'+hpInput('hp-forecast-from','Inicio de franja','time',HP.clock(p.start),'step="60"')+hpInput('hp-forecast-to','Fin de franja','time',HP.clock(Math.min(p.start+60,p.end)),'step="60"')+'</div>'+hpInput('hp-forecast-amount','Ventas de toda la franja (€)','text','','inputmode="decimal" placeholder="Ej. 250,00"')+'<p class="hp-help">El reparto es uniforme, con ajuste de céntimos para conservar el total. Sustituye solo los minutos de esa franja.</p><button id="hp-spread">Repartir forecast en la franja</button>'+(hpState.undo?'<button class="secondary" id="hp-undo-forecast">Deshacer último cambio</button>':'')+'<details class="hp-paste"><summary>Pegar forecast por minuto desde una tabla</summary><p>Dos columnas, Hora y Ventas, separadas por tabulador o punto y coma. Una fila por minuto; sin separador de miles.</p><label for="hp-paste">Hora;Ventas</label><textarea id="hp-paste" rows="5" placeholder="Hora;Ventas&#10;12:00;15,50&#10;12:01;18,20"></textarea><button class="secondary" id="hp-import">Validar y guardar minutos</button></details></section>'+
 '<section class="card hp-card" id="hp-shift-editor">'+hpShiftForm()+'</section></div>'+
 '<section class="card hp-card"><h3>Criterio de cobertura</h3><p>Define tu hipótesis de productividad para comparar la dotación con las ventas de cada minuto.</p><div class="hp-fields">'+hpInput('hp-target','Objetivo de ventas por hora-persona (€)','number',p.target,'min="0.01" step="any" placeholder="Sin objetivo"')+hpInput('hp-minimum','Mínimo de personas disponibles','number',p.minimum,'min="0" step="1"')+'</div><button id="hp-save-target">Guardar criterio</button><p class="hp-help">Dotación orientativa = redondeo al alza de (ventas del minuto × 60 ÷ objetivo), respetando el mínimo. Es una hipótesis operativa; revisa puestos, capacidad y nivel de servicio antes de cambiar turnos.</p>'+hpInsights()+'</section>'+
 '<section class="card hp-card"><h3>Detalle de turnos</h3>'+hpShiftList()+'</section>';
 hpBind();
}
function hpGraph(kind,width){
 const {plan:p,analysis:a,zoom}=hpState,rows=a.minutes,height=kind==='sales'?130:100;
 const maximum=Math.max(1,...rows.map(r=>kind==='sales'?(r.revenue??0):Math.max(r.coverage,r.required??0)));
 const Y=value=>height-14-(value/maximum)*(height-30);
 let grid='';for(let m=p.start;m<p.end;m++){if(m%60===0){const x=(m-p.start)*zoom;grid+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+height+'" class="hp-gridline"/><text x="'+(x+4)+'" y="12">'+esc(hpTime(m))+'</text>'}}
 function lines(key,cls){let result='',points=[];const flush=()=>{if(points.length){result+='<polyline points="'+points.join(' ')+'" class="'+cls+'"/>';points=[]}};rows.forEach((r,i)=>{const value=r[key];if(value==null){flush();return}const x=i*zoom,y=Y(value);points.push(x+','+y,(x+zoom)+','+y)});flush();return result}
 const bands=kind==='coverage'?a.runs.filter(r=>r.status==='shortage'||r.status==='excess').map(r=>'<rect x="'+((r.start-p.start)*zoom)+'" y="17" width="'+((r.end-r.start)*zoom)+'" height="'+(height-30)+'" class="hp-band-'+r.status+'"/>').join(''):'';
 const cursor=(hpState.minute-p.start)*zoom;
 return '<svg class="hp-chart" data-hp-chart="'+kind+'" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+(kind==='sales'?'Forecast de ventas por minuto':'Cobertura y dotación orientativa por minuto')+'">'+grid+bands+(kind==='sales'?lines('revenue','hp-sales-line'):lines('coverage','hp-coverage-line')+lines('required','hp-required-line'))+'<line data-hp-cursor x1="'+cursor+'" x2="'+cursor+'" y1="15" y2="'+height+'" class="hp-cursor"/></svg>';
}
function hpVisibleShifts(){const {plan:p}=hpState;return hpState.shifts.filter(s=>{const r=HP.range(s,p.date);return s.date===p.date||(r&&r.start<p.end&&r.end>p.start)})}
function hpTimeline(){
 const {plan:p,zoom}=hpState,width=(p.end-p.start)*zoom,shifts=hpVisibleShifts();
 const salesMax=Math.max(0,...hpState.analysis.minutes.map(r=>r.revenue??0)),coverageMax=Math.max(0,...hpState.analysis.minutes.map(r=>Math.max(r.coverage,r.required??0)));
 const people=new Map(hpState.staff.map(s=>[s.id,s]));
 for(const shift of shifts)if(!people.has(shift.personId))people.set(shift.personId,{id:shift.personId,name:shift.personName||'Persona sin ficha',department:'Sin ficha de personal'});
 const lanes=[...people.values()].map(person=>{
  const bars=shifts.filter(s=>s.personId===person.id).map(s=>{
   const r=HP.range(s,p.date);if(!r||r.start>=p.end||r.end<=p.start)return '';
   const pause=HP.pause(s,p.date),pauseHtml=pause&&!pause.invalid?'<span class="hp-break" style="left:'+((pause.start-r.start)*zoom)+'px;width:'+((pause.end-pause.start)*zoom)+'px" title="Pausa '+hpTime(pause.start)+'–'+hpTime(pause.end)+'"></span>':'';
   return '<div class="hp-shift '+((r.end-r.start)*zoom<28?'hp-short-shift':'')+'" tabindex="0" role="button" data-shift="'+esc(s.id)+'" data-handle="move" aria-label="Mover turno de '+esc(person.name)+' '+esc(hpTime(r.start))+' a '+esc(hpTime(r.end))+'. Flechas: un minuto. Intro: editar." style="left:'+((r.start-p.start)*zoom)+'px;width:'+((r.end-r.start)*zoom)+'px"><button type="button" class="hp-handle hp-handle-start" data-shift="'+esc(s.id)+'" data-handle="start" aria-label="Ajustar entrada de '+esc(person.name)+' un minuto con las flechas">❮</button>'+pauseHtml+'<span class="hp-shift-label">'+esc(hpTime(r.start))+'–'+esc(hpTime(r.end))+'</span><button type="button" class="hp-handle hp-handle-end" data-shift="'+esc(s.id)+'" data-handle="end" aria-label="Ajustar salida de '+esc(person.name)+' un minuto con las flechas">❯</button></div>';
  }).join('');
  return '<div class="hp-lane"><div class="hp-person"><b>'+esc(person.name)+'</b><small>'+esc(person.department||person.role||'Personal')+'</small></div><div class="hp-track" style="width:'+width+'px;background-size:'+(60*zoom)+'px 100%">'+bars+'</div></div>';
 }).join('');
 return '<div class="hp-scroll" id="hp-scroll"><div class="hp-canvas" style="width:'+(width+170)+'px"><div class="hp-chart-row"><div class="hp-chart-caption"><b>Ventas previstas</b><small>0–'+hpNumber(Math.max(1,salesMax))+' €/min</small></div>'+hpGraph('sales',width)+'</div><div class="hp-chart-row"><div class="hp-chart-caption"><b>Cobertura</b><small>0–'+hpNumber(Math.max(1,coverageMax))+' personas · sin pausas</small></div>'+hpGraph('coverage',width)+'</div>'+lanes+'</div></div>'+(!people.size?'<div class="hp-empty">Añade personal al centro para crear sus turnos. <button class="secondary" id="hp-add-staff">Abrir Personal y turnos</button></div>':'');
}
function hpMinuteInspector(){
 const row=hpState.analysis.minutes.find(r=>r.minute===hpState.minute);
 return '<div class="hp-inspector" id="hp-inspector"><button class="secondary" id="hp-minute-prev" aria-label="Minuto anterior">←</button><div><strong id="hp-minute-time">'+esc(hpTime(row.minute))+'</strong><span id="hp-minute-info">'+hpMinuteInfo(row)+'</span></div>'+hpInput('hp-minute-value','Forecast de este minuto (€)','text',row.revenue==null?'':row.revenue.toFixed(2),'inputmode="decimal" placeholder="Sin previsión"')+'<button id="hp-save-minute">Guardar minuto</button><button class="secondary" id="hp-minute-next" aria-label="Minuto siguiente">→</button></div>';
}
function hpMinuteInfo(row){return 'Disponibles: '+row.coverage+' · '+(row.required==null?'sin dotación calculada':'Dotación orientativa: '+row.required)+' · '+(row.cost==null?'sin coste completo':hpMoney(row.cost)+' de coste')}
function hpShiftForm(){
 const defaultEnd=Math.min(hpState.plan.start+480,hpState.plan.end);
 const draft=hpState.draft||{date:hpState.date,start:HP.clock(hpState.plan.start),end:HP.clock(defaultEnd),endNextDay:defaultEnd>=1440,breakMinutes:0};
 const options=hpState.staff.map(s=>({id:s.id,name:s.name}));
 if(draft.personId&&!options.some(x=>x.id===draft.personId)){const old=hpState.shifts.find(s=>s.id===hpState.editId);options.push({id:draft.personId,name:old?.personName||'Persona sin ficha'})}
 const person=hpState.staff.find(s=>s.id===(draft.personId||options[0]?.id));
 return '<h3>'+(hpState.editId?'Editar turno':'Añadir turno')+'</h3><p>Horas y tiradores con precisión de un minuto. Una pausa reduce la cobertura; solo reduce el coste si no es pagada.</p>'+select('hp-person','Persona',options.length?options:[{id:'',name:'Añade personal a este centro'}])+hpInput('hp-shift-date','Fecha de entrada','date',draft.date)+'<div class="hp-fields">'+hpInput('hp-shift-start','Entrada','time',draft.start,'step="60"')+hpInput('hp-shift-end','Salida','time',draft.end,'step="60"')+'</div><label class="hp-check"><input id="hp-next-day" type="checkbox" '+(draft.endNextDay?'checked':'')+'> Salida al día siguiente</label><div class="hp-fields">'+hpInput('hp-break-start','Inicio de pausa','time',draft.breakStart||'','step="60"')+hpInput('hp-break-minutes','Duración de pausa (min)','number',draft.breakMinutes||0,'min="0" step="1"')+'</div><label class="hp-check"><input id="hp-break-paid" type="checkbox" '+(draft.breakPaid?'checked':'')+'> Pausa pagada</label>'+hpInput('hp-rate','Coste laboral por hora (€)','number',draft.hourlyCost??person?.hourlyCost??'','min="0" step="any" placeholder="Sin tarifa"')+'<div class="actions"><button id="hp-save-shift" '+(!options.length?'disabled':'')+'>Guardar turno</button><button class="secondary" id="hp-clear-shift">Nuevo / cancelar edición</button></div>';
}
function hpInsights(){
 const {analysis:a,plan:p}=hpState;
 if(!p.target)return '<div class="hp-empty">Introduce un objetivo para identificar minutos de exceso o falta de cobertura. La gráfica ya muestra los turnos y el forecast registrado.</div>';
 if(!a.known)return '<div class="hp-empty">Todavía no hay minutos con forecast en este horario. Registra la previsión para evaluar exceso o falta de cobertura.</div>';
 const attention=a.runs.filter(r=>r.status==='shortage'||r.status==='excess');
 const summary='<div class="hp-analysis-summary"><span><b>'+hpNumber(a.shortageMinutes/60)+' h-persona</b> de falta orientativa</span><span><b>'+hpNumber(a.excessMinutes/60)+' h-persona</b> de exceso orientativo</span><span><b>'+(a.productivity==null?'—':hpNumber(a.productivity))+' €/h-persona</b> '+(a.productivity==null?'(pendiente de datos completos)':'previstos')+'</span></div>';
 const rows=attention.map(r=>'<div class="hp-insight '+(r.status==='shortage'?'hp-shortage':'hp-excess')+'"><b>'+esc(hpTime(r.start))+'–'+esc(hpTime(r.end))+'</b><span>'+(r.status==='shortage'?'Falta de ':'Exceso de ')+Math.abs(r.delta)+(Math.abs(r.delta)===1?' persona':' personas')+' según el criterio · '+(r.end-r.start)+' min</span><button class="secondary" data-focus-minute="'+r.start+'">Ver minuto</button></div>');
 return summary+(!a.complete?'<p class="hp-help">Falta forecast en '+(a.minutes.length-a.known)+' minutos. Esos minutos quedan fuera de la evaluación.</p>':'')+(rows.length?rows.slice(0,8).join('')+(rows.length>8?'<details><summary>Ver otras '+(rows.length-8)+' franjas</summary>'+rows.slice(8).join('')+'</details>':''):'<p class="hp-help">No se detectan diferencias en los minutos evaluados con el criterio actual.</p>');
}
function hpShiftList(){
 const shifts=hpVisibleShifts().sort((a,b)=>(HP.range(a,hpState.date)?.start??0)-(HP.range(b,hpState.date)?.start??0));
 const rows=shifts.map(s=>{const r=HP.range(s,hpState.date),person=hpState.staff.find(p=>p.id===s.personId),totals=HP.totals(s),rate=HP.rate(s,person);return '<div class="hp-shift-detail"><div><b>'+esc(s.personName||person?.name||'Persona sin ficha')+'</b><small>'+esc(s.date)+' · '+(r?esc(hpTime(r.start))+'–'+esc(hpTime(r.end)):'Horario inválido')+(Number(s.breakMinutes)>0?' · pausa '+s.breakMinutes+' min '+(s.breakPaid?'pagada':'no pagada'):'')+' · '+(totals&&rate!=null?hpMoney(rate*totals.paidMinutes/60):'Sin tarifa')+'</small></div><button class="secondary" data-edit-shift="'+esc(s.id)+'">Editar</button><button class="secondary" data-remove-shift="'+esc(s.id)+'">Quitar turno</button></div>'}).join('');
 const archived=hpState.archived.filter(s=>s.date===hpState.date);
 return (rows||'<p class="hp-help">No hay turnos en este día ni dentro del horario visible.</p>')+(archived.length?'<details><summary>Turnos retirados de este día ('+archived.length+')</summary>'+archived.map(s=>'<div class="hp-shift-detail"><span>'+esc(s.personName)+' · '+esc(s.start)+'–'+esc(s.end)+'</span><button class="secondary" data-restore-shift="'+esc(s.id)+'">Restaurar turno</button></div>').join('')+'</details>':'');
}
function hpWrite(store,record,extension=false){
 return new Promise((resolve,reject)=>{
  const database=extension?extraDB:db,transaction=database.transaction(store,'readwrite');
  transaction.objectStore(store).put(record);
  transaction.oncomplete=()=>resolve(record);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('No se pudo guardar.'));
 });
}
async function hpWriteShift(record){
 await extraReady;
 return new Promise((resolve,reject)=>{
  const transaction=extraDB.transaction('caseActions','readwrite'),store=transaction.objectStore('caseActions');let failure;
  const request=store.getAll();
  request.onsuccess=()=>{
   if(record.kind==='shift'){
    const message=HP.validateShift(record,request.result.filter(s=>s.siteId===record.siteId));
    if(message){failure=Error(message);transaction.abort();return}
   }
   store.put(record);
  };
  transaction.oncomplete=()=>resolve(record);transaction.onerror=()=>reject(failure||transaction.error);transaction.onabort=()=>reject(failure||transaction.error||Error('No se pudo guardar el turno.'));
 });
}
async function hpAction(action,{resetDraft=false}={}){
 if(hpSaving)return;hpSaving=true;
 const context={siteId:hpState.siteId,date:hpState.date};
 try{await action();if(hcToolSite('planificacion')===context.siteId&&hpState.date===context.date)await hpPlanner({resetDraft})}
 catch(error){toast(error.message||'No se pudo guardar.');if(hcToolSite('planificacion')===context.siteId&&hpState.date===context.date)await hpPlanner()}
 finally{hpSaving=false}
}
async function hpSavePlan(next,remember=false){
 const saved={...next,forecast:{...next.forecast},updatedAt:now()};
 if(remember)hpState.undo={...hpState.plan.forecast};
 await hpWrite('settings',saved);
}
async function hpChangeDay(date){
 if(HP.day(date)===null)return toast('Selecciona una fecha válida.');
 hpState.date=date;hpState.undo=null;hpState.minute=null;await hpPlanner({resetDraft:true});
}
function hpSetMinute(minute,scroll=false){
 const {plan:p,analysis:a}=hpState;hpState.minute=Math.max(p.start,Math.min(p.end-1,minute));
 const row=a.minutes.find(r=>r.minute===hpState.minute);if(!row)return;
 document.getElementById('hp-minute-time').textContent=hpTime(row.minute);
 document.getElementById('hp-minute-info').textContent=hpMinuteInfo(row);
 document.getElementById('hp-minute-value').value=row.revenue==null?'':row.revenue.toFixed(2);
 document.querySelectorAll('[data-hp-cursor]').forEach(line=>{const x=(row.minute-p.start)*hpState.zoom;line.setAttribute('x1',x);line.setAttribute('x2',x)});
 if(scroll){const scroller=document.getElementById('hp-scroll');scroller.scrollLeft=Math.max(0,(minute-p.start)*hpState.zoom-scroller.clientWidth/2+170);scroller.scrollIntoView({behavior:'smooth',block:'center'})}
}
function hpBindShift(){
 const person=document.getElementById('hp-person');
 if(hpState.draft?.personId)person.value=hpState.draft.personId;
 person.onchange=()=>{const p=hpState.staff.find(s=>s.id===person.value);document.getElementById('hp-rate').value=p?.hourlyCost??''};
 document.getElementById('hp-clear-shift').onclick=()=>{hpState.editId=null;hpState.draft=null;document.getElementById('hp-shift-editor').innerHTML=hpShiftForm();hpBindShift()};
 document.getElementById('hp-save-shift').onclick=()=>hpAction(async()=>{
  const draft=hpReadDraft(),existing=hpState.shifts.find(s=>s.id===hpState.editId),person=hpState.staff.find(s=>s.id===draft.personId);
  if(!person&&!(existing&&existing.personId===draft.personId))throw Error('Añade o selecciona una persona de este centro.');
  const rate=draft.hourlyCost.trim()===''?null:Number(draft.hourlyCost);
  if(rate!==null&&(!Number.isFinite(rate)||rate<0))throw Error('Revisa el coste por hora.');
  const record={...existing,...draft,id:existing?.id||uid(),kind:'shift',siteId:hpState.siteId,personName:person?.name||existing.personName,department:person?.department||existing?.department||'',breakMinutes:Number(draft.breakMinutes),hourlyCost:rate,at:existing?.at||now(),updatedAt:now()};
  const error=HP.validateShift(record,hpState.shifts);if(error)throw Error(error);
  await hpWriteShift(hpFinalizeShift(record));hpState.editId=null;hpState.draft=null;toast('Turno guardado con precisión de un minuto.');
 },{resetDraft:true});
}
function hpFinalizeShift(record){
 const totals=HP.totals(record),rate=HP.rate(record,hpState.staff.find(p=>p.id===record.personId));
 return {...record,...totals,hours:totals.paidMinutes/60,cost:rate===null?null:Math.round(rate*totals.paidMinutes/60*100)/100,updatedAt:now()};
}
function hpEditShift(id){
 const shift=hpState.shifts.find(s=>s.id===id);if(!shift)return;
 hpState.editId=id;hpState.draft={...shift,hourlyCost:HP.rate(shift,hpState.staff.find(s=>s.id===shift.personId))??''};
 document.getElementById('hp-shift-editor').innerHTML=hpShiftForm();hpBindShift();document.getElementById('hp-shift-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function hpAdjustShift(id,handle,delta){
 if(!delta)return;
 await hpAction(async()=>{
  const shift=hpState.shifts.find(s=>s.id===id);if(!shift)throw Error('No se encontró el turno.');
  const next=HP.shiftAt(shift,hpState.date,delta,handle);if(!next)throw Error('El turno debe durar entre 1 y 1440 minutos.');
  const error=HP.validateShift(next,hpState.shifts);if(error)throw Error(error);
  await hpWriteShift(hpFinalizeShift(next));toast('Turno ajustado '+(delta>0?'+':'')+delta+' min.');
 });
 [...app().querySelectorAll('[data-shift]')].find(el=>el.dataset.shift===id&&el.dataset.handle===handle)?.focus({preventScroll:true});
}
function hpBind(){
 document.getElementById('hp-prev').onclick=()=>hpChangeDay(HP.addDay(hpState.date,-1));
 document.getElementById('hp-next').onclick=()=>hpChangeDay(HP.addDay(hpState.date,1));
 document.getElementById('hp-date').onchange=e=>hpChangeDay(e.target.value);
 document.getElementById('hp-apply-window').onclick=()=>hpAction(async()=>{
  const start=HP.time(hpValue('hp-window-start'));let end=HP.time(hpValue('hp-window-end'));
  if(start===null||end===null)throw Error('Completa el horario de operación.');if(end<=start)end+=1440;
  const next={...hpState.plan,start,end};await hpSavePlan(next);
  await hpWrite('settings',{id:hpDefaultId(hpState.siteId),kind:'minutePlanningDefaults',siteId:hpState.siteId,start,end,target:next.target,minimum:next.minimum});
 });
 document.getElementById('hp-save-target').onclick=()=>hpAction(async()=>{
  const raw=hpValue('hp-target').trim(),target=raw===''?null:Number(raw),minimum=Number(hpValue('hp-minimum'));
  if(target!==null&&(!Number.isFinite(target)||target<=0))throw Error('El objetivo debe ser mayor que cero, o estar vacío.');
  if(!Number.isInteger(minimum)||minimum<0)throw Error('El mínimo debe ser un número entero igual o superior a cero.');
  const next={...hpState.plan,target,minimum};await hpSavePlan(next);
  await hpWrite('settings',{id:hpDefaultId(hpState.siteId),kind:'minutePlanningDefaults',siteId:hpState.siteId,start:next.start,end:next.end,target,minimum});
 });
 document.getElementById('hp-spread').onclick=()=>hpAction(async()=>{
  const p=hpState.plan,start=HP.resolveMinute(hpValue('hp-forecast-from'),p.start);let end=HP.resolveMinute(hpValue('hp-forecast-to'),p.start);
  if(start===null||end===null)throw Error('Completa el inicio y el fin de la franja.');if(end<=start)end+=1440;
  const cents=HP.amount(hpValue('hp-forecast-amount'));
  if(start<p.start||end>p.end||cents===null)throw Error('La franja debe estar dentro del horario visible y el importe debe ser válido, con hasta dos decimales.');
  const forecast=HP.setForecast(p.forecast,start,end,cents);await hpSavePlan({...p,forecast},true);toast('Forecast guardado en '+(end-start)+' minutos.');
 });
 document.getElementById('hp-save-minute').onclick=()=>hpAction(async()=>{
  const raw=hpValue('hp-minute-value').trim(),cents=raw===''?null:HP.amount(raw);
  if(raw!==''&&cents===null)throw Error('Introduce un importe con hasta dos decimales. Vacío significa sin previsión.');
  const forecast={...hpState.plan.forecast};if(cents===null)delete forecast[hpState.minute];else forecast[hpState.minute]=cents;
  await hpSavePlan({...hpState.plan,forecast},true);toast('Forecast del minuto guardado.');
 });
 document.getElementById('hp-import').onclick=()=>hpAction(async()=>{
  const p=hpState.plan,patch=HP.parsePaste(hpValue('hp-paste'),p.start,p.end);
  await hpSavePlan({...p,forecast:{...p.forecast,...patch}},true);toast(Object.keys(patch).length+' minutos importados.');
 });
 document.getElementById('hp-undo-forecast')?.addEventListener('click',()=>hpAction(async()=>{const forecast=hpState.undo;if(!forecast)return;await hpSavePlan({...hpState.plan,forecast});hpState.undo=null;toast('Último cambio de forecast deshecho.')}));
 document.getElementById('hp-minute-prev').onclick=()=>hpSetMinute(hpState.minute-1);
 document.getElementById('hp-minute-next').onclick=()=>hpSetMinute(hpState.minute+1);
 document.getElementById('hp-zoom').onchange=async e=>{
  const first=document.getElementById('hp-scroll').scrollLeft/hpState.zoom;hpState.zoom=Number(e.target.value);await hpPlanner();document.getElementById('hp-scroll').scrollLeft=first*hpState.zoom;
 };
 document.getElementById('hp-export').onclick=()=>csvDownload(hpState.analysis.minutes.map(r=>({fecha:HP.addDay(hpState.date,Math.floor(r.minute/1440)),hora:HP.clock(r.minute),forecast_eur:r.revenue??'',personas_disponibles:r.coverage,dotacion_orientativa:r.required??'',diferencia:r.delta??'',coste_eur:r.cost==null?'':Number(r.cost.toFixed(6))})),'hopta-plan-minutos-'+hpState.date+'.csv');
 document.getElementById('hp-add-staff')?.addEventListener('click',()=>hcOpenTool('equipo',hpState.siteId));
 app().querySelectorAll('[data-edit-shift]').forEach(b=>b.onclick=()=>hpEditShift(b.dataset.editShift));
 app().querySelectorAll('[data-remove-shift]').forEach(b=>b.onclick=()=>hpAction(async()=>{
  const shift=hpState.shifts.find(s=>s.id===b.dataset.removeShift);if(!shift)return;
  await hpWriteShift({...shift,kind:'shiftArchived',archivedAt:now()});toast('Turno retirado. Puedes restaurarlo en «Turnos retirados».');
 }));
 app().querySelectorAll('[data-restore-shift]').forEach(b=>b.onclick=()=>hpAction(async()=>{
  const shift=hpState.archived.find(s=>s.id===b.dataset.restoreShift);if(!shift)return;
  await hpWriteShift({...shift,kind:'shift',archivedAt:null});toast('Turno restaurado.');
 }));
 app().querySelectorAll('[data-focus-minute]').forEach(b=>b.onclick=()=>hpSetMinute(Number(b.dataset.focusMinute),true));
 const scroller=document.getElementById('hp-scroll');
 scroller.onclick=e=>{const svg=e.target.closest('[data-hp-chart]');if(svg){const x=e.clientX-svg.getBoundingClientRect().left;hpSetMinute(hpState.plan.start+Math.floor(x/hpState.zoom))}};
 scroller.ondblclick=e=>{const bar=e.target.closest('.hp-shift');if(bar)hpEditShift(bar.dataset.shift)};
 scroller.onkeydown=e=>{
  const target=e.target.closest('[data-shift]');if(!target)return;
  if(e.key==='Enter'&&target.dataset.handle==='move'){e.preventDefault();hpEditShift(target.dataset.shift)}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();hpAdjustShift(target.dataset.shift,target.dataset.handle,(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?15:1))}
 };
 scroller.onpointerdown=hpPointerDown;hpBindShift();
}
function hpPointerDown(event){
 const control=event.target.closest('[data-shift]');if(!control||event.button!==0||hpSaving)return;
 const id=control.dataset.shift,handle=control.dataset.handle,shift=hpState.shifts.find(s=>s.id===id),bar=control.closest('.hp-shift'),range=HP.range(shift,hpState.date);
 if(!range)return;
 if(range.start<hpState.plan.start||range.end>hpState.plan.end){document.getElementById('hp-drag-status').textContent='Amplía el horario visible o edita las horas del turno para ajustar sus extremos.';return}
 event.preventDefault();control.focus({preventScroll:true});control.setPointerCapture(event.pointerId);
 const scroller=document.getElementById('hp-scroll'),startX=event.clientX,initialScroll=scroller.scrollLeft,controller=new AbortController();
 let delta=0,active=true,frame=null,candidate=null;
 const restore=()=>{bar.style.left=(range.start-hpState.plan.start)*hpState.zoom+'px';bar.style.width=(range.end-range.start)*hpState.zoom+'px';bar.querySelector('.hp-shift-label').textContent=hpTime(range.start)+'–'+hpTime(range.end);const pause=HP.pause(shift,hpState.date),stripe=bar.querySelector('.hp-break');if(stripe&&pause&&!pause.invalid)stripe.style.left=(pause.start-range.start)*hpState.zoom+'px'};
 const preview=()=>{
  frame=null;if(!active||!candidate)return;
  const nextRange=HP.range(candidate,hpState.date);bar.style.left=(nextRange.start-hpState.plan.start)*hpState.zoom+'px';bar.style.width=(nextRange.end-nextRange.start)*hpState.zoom+'px';bar.querySelector('.hp-shift-label').textContent=hpTime(nextRange.start)+'–'+hpTime(nextRange.end);
  const pause=HP.pause(candidate,hpState.date),stripe=bar.querySelector('.hp-break');if(stripe&&pause&&!pause.invalid)stripe.style.left=(pause.start-nextRange.start)*hpState.zoom+'px';
  const error=HP.validateShift(candidate,hpState.shifts),status=document.getElementById('hp-drag-status');status.textContent=hpTime(nextRange.start)+'–'+hpTime(nextRange.end)+' · '+(delta>0?'+':'')+delta+' min'+(error?' · '+error:' · Suelta para guardar');bar.classList.toggle('hp-invalid-drag',Boolean(error));
  const original=hpState.analysis;hpState.analysis=HP.analyze({...hpState.plan,staff:hpState.staff,shifts:hpState.shifts.map(s=>s.id===id?candidate:s)});
  const svg=document.querySelector('[data-hp-chart="coverage"]');if(svg)svg.outerHTML=hpGraph('coverage',(hpState.plan.end-hpState.plan.start)*hpState.zoom);hpState.analysis=original;
 };
 window.addEventListener('pointermove',e=>{
  if(e.pointerId!==event.pointerId)return;
  const rect=scroller.getBoundingClientRect();if(e.clientX>rect.right-35)scroller.scrollLeft+=15;else if(e.clientX<rect.left+200)scroller.scrollLeft-=15;
  delta=Math.round((e.clientX-startX+scroller.scrollLeft-initialScroll)/hpState.zoom);
  if(handle==='move')delta=Math.max(hpState.plan.start-range.start,Math.min(hpState.plan.end-range.end,delta));
  else if(handle==='start')delta=Math.max(hpState.plan.start-range.start,Math.min(range.end-range.start-1,delta));
  else delta=Math.max(range.start-range.end+1,Math.min(hpState.plan.end-range.end,delta));
  candidate=HP.shiftAt(shift,hpState.date,delta,handle);if(frame===null)frame=requestAnimationFrame(preview);
 },{signal:controller.signal});
 const finish=async e=>{
  if(e.pointerId!==event.pointerId)return;active=false;controller.abort();if(frame!==null)cancelAnimationFrame(frame);bar.classList.remove('hp-invalid-drag');
  if(e.type==='pointercancel'||!delta){restore();const svg=document.querySelector('[data-hp-chart="coverage"]');if(svg)svg.outerHTML=hpGraph('coverage',(hpState.plan.end-hpState.plan.start)*hpState.zoom);document.getElementById('hp-drag-status').textContent='Precisión: 1 minuto. Doble clic o Intro sobre un turno para editarlo.';return}
  await hpAdjustShift(id,handle,delta);
 };
 window.addEventListener('pointerup',finish,{signal:controller.signal});window.addEventListener('pointercancel',finish,{signal:controller.signal});
}
