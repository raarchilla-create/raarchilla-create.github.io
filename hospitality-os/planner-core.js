/* Minute-based planning math. Forecasts remain separate from actual observations. */
(function(root){
 'use strict';
 const DAY=1440;
 function time(value){
  const match=/^(\d{2}):(\d{2})$/.exec(String(value||''));
  if(!match||+match[1]>23||+match[2]>59)return null;
  return +match[1]*60+(+match[2]);
 }
 function clock(minute){const n=((minute%DAY)+DAY)%DAY;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
 function day(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const stamp=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===value?stamp/86400000:null;
 }
 function addDay(value,amount){const n=day(value);return n===null?null:new Date((n+amount)*86400000).toISOString().slice(0,10)}
 function localDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
 function range(shift,anchor){
  const date=day(shift.date),base=day(anchor),start=time(shift.start),finish=time(shift.end);
  if(date===null||base===null||start===null||finish===null)return null;
  const offset=(date-base)*DAY;
  const next=shift.endNextDay===true||(shift.endNextDay==null&&finish<=start);
  const end=finish+(next?DAY:0);
  if(end<=start||end-start>DAY)return null;
  return {start:offset+start,end:offset+end};
 }
 function pause(shift,anchor){
  const r=range(shift,anchor),duration=Number(shift.breakMinutes||0);
  if(!r||!duration)return null;
  const t=time(shift.breakStart),date=day(shift.date),base=day(anchor);
  if(t===null||!Number.isInteger(duration)||duration<0)return {invalid:true};
  let start=(date-base)*DAY+t;
  if(start<r.start)start+=DAY;
  const end=start+duration;
  return start<r.start||end>r.end?{invalid:true}:{start,end};
 }
 function rate(shift,person){
  if(Object.prototype.hasOwnProperty.call(shift,'hourlyCost'))return shift.hourlyCost!==''&&shift.hourlyCost!=null&&Number.isFinite(Number(shift.hourlyCost))&&Number(shift.hourlyCost)>=0?Number(shift.hourlyCost):null;
  if(shift.cost!==''&&shift.cost!=null&&Number.isFinite(Number(shift.cost))&&Number(shift.cost)>=0&&Number(shift.hours)>0)return Number(shift.cost)/Number(shift.hours);
  return person?.hourlyCost!==''&&person?.hourlyCost!=null&&Number.isFinite(Number(person.hourlyCost))&&Number(person.hourlyCost)>=0?Number(person.hourlyCost):null;
 }
 function validateShift(shift,others=[]){
  const r=range(shift,shift.date);
  if(!r)return 'Revisa fecha y horas. Si cruza medianoche, marca «Día siguiente».';
  if(!shift.personId)return 'Selecciona una persona.';
  const duration=Number(shift.breakMinutes||0);
  if(!Number.isInteger(duration)||duration<0||duration>=r.end-r.start)return 'La pausa debe durar menos que el turno y usar minutos enteros.';
  const p=pause(shift,shift.date);if(p?.invalid)return 'La pausa debe quedar dentro del turno.';
  for(const other of others){
   if(other.kind!=='shift'||other.id===shift.id||other.personId!==shift.personId)continue;
   const o=range(other,shift.date);
   if(o&&r.start<o.end&&o.start<r.end)return 'Esta persona ya tiene un turno que se solapa con ese horario.';
  }
  return '';
 }
 function totals(shift){
  const r=range(shift,shift.date);if(!r)return null;
  const breakMinutes=Number(shift.breakMinutes||0);
  return {workMinutes:r.end-r.start-breakMinutes,paidMinutes:r.end-r.start-(shift.breakPaid?0:breakMinutes)};
 }
 function resolveMinute(value,start){const t=time(value);return t===null?null:t+(t<start?DAY:0)}
 function setForecast(forecast,start,end,cents){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>2*DAY||end<=start||!Number.isSafeInteger(cents)||cents<0)throw Error('Revisa la franja y las ventas.');
  const next={...forecast},count=end-start,base=Math.floor(cents/count),remainder=cents%count;
  for(let i=0;i<count;i++)next[start+i]=base+(i<remainder?1:0);
  return next;
 }
 function amount(raw){
  const value=String(raw??'').trim();
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(value))return null;
  const cents=Math.round(Number(value.replace(',','.'))*100);
  return Number.isSafeInteger(cents)?cents:null;
 }
 function parsePaste(text,start,end){
  const rows=String(text||'').trim().split(/\r?\n/).filter(x=>x.trim()),result={},seen=new Set();
  if(!rows.length)throw Error('Pega al menos una línea.');
  rows.forEach((line,index)=>{
   const cells=line.split(/[;\t]/).map(x=>x.trim());
   if(index===0&&/^(hora|time)$/i.test(cells[0]))return;
   const minute=resolveMinute(cells[0],start),cents=amount(cells[1]);
   if(cells.length!==2||minute===null||minute<start||minute>=end||cents===null)throw Error('Revisa la línea '+(index+1)+': usa HH:MM;ventas, dentro del horario y sin separador de miles.');
   if(seen.has(minute))throw Error('Hora duplicada en la línea '+(index+1)+'.');
   seen.add(minute);result[minute]=cents;
  });
  if(!seen.size)throw Error('No hay minutos para importar.');
  return result;
 }
 function shiftAt(shift,anchor,delta,handle='move'){
  const r=range(shift,anchor);if(!r||!Number.isInteger(delta))return null;
  let start=r.start,end=r.end;
  if(handle==='start')start+=delta;else if(handle==='end')end+=delta;else{start+=delta;end+=delta}
  if(end<=start||end-start>DAY)return null;
  const date=addDay(anchor,Math.floor(start/DAY));if(!date)return null;
  const next={...shift,date,start:clock(start),end:clock(end),endNextDay:Math.floor(end/DAY)>Math.floor(start/DAY)};
  if(handle==='move'&&Number(shift.breakMinutes)>0){const p=pause(shift,anchor);if(p&&!p.invalid)next.breakStart=clock(p.start+delta)}
  return next;
 }
 function analyze({date,start,end,forecast={},shifts=[],staff=[],target=null,minimum=0}){
  const people=new Map(staff.map(p=>[p.id,p]));
  const prepared=shifts.filter(s=>s.kind==='shift').map(s=>({shift:s,r:range(s,date),p:pause(s,date),rate:rate(s,people.get(s.personId))})).filter(s=>s.r&&!s.p?.invalid&&s.r.start<end&&s.r.end>start);
  const minutes=[],conflicts=new Set();
  let sales=0,known=0,workMinutes=0,paidMinutes=0,cost=0,unknownCostMinutes=0,shortage=0,excess=0;
  const hasTarget=Number.isFinite(target)&&target>0;
  for(let minute=start;minute<end;minute++){
   const active=new Set(),paid=new Map(),present=new Set();
   for(const item of prepared){
    const {shift:s,r,p}=item;if(minute<r.start||minute>=r.end)continue;
    const key=s.personId||s.id;
    if(present.has(key))conflicts.add(key);present.add(key);
    const onBreak=p&&!p.invalid&&minute>=p.start&&minute<p.end;
    if(!onBreak)active.add(key);
    if(!onBreak||s.breakPaid){
     if(!paid.has(key))paid.set(key,item.rate);
     else paid.set(key,paid.get(key)===null||item.rate===null?null:Math.max(paid.get(key),item.rate));
    }
   }
   const raw=forecast[minute],revenue=Number.isSafeInteger(raw)&&raw>=0?raw/100:null;
   if(revenue!==null){known++;sales+=revenue}
   const required=revenue!==null&&hasTarget?Math.max(minimum,Math.ceil((revenue*60)/target-1e-9)):null;
   const delta=required===null?null:active.size-required;
   let minuteCost=0,missingRate=false;
   for(const value of paid.values()){if(value===null)missingRate=true;else minuteCost+=value/60}
   if(missingRate)unknownCostMinutes++;cost+=minuteCost;
   workMinutes+=active.size;paidMinutes+=paid.size;
   if(delta!==null){if(delta<0)shortage-=delta;else excess+=delta}
   minutes.push({minute,revenue,coverage:active.size,required,delta,cost:missingRate?null:minuteCost,paid:paid.size});
  }
  const runs=[];
  for(const row of minutes){
   const status=row.delta===null?'unknown':row.delta<0?'shortage':row.delta>0?'excess':'balanced';
   const last=runs.at(-1);
   if(last&&last.status===status&&last.delta===row.delta)last.end=row.minute+1;
   else runs.push({start:row.minute,end:row.minute+1,status,delta:row.delta});
  }
  const complete=known===end-start;
  return {minutes,runs,sales,known,complete,workHours:workMinutes/60,paidHours:paidMinutes/60,cost:unknownCostMinutes?null:cost,knownCost:cost,unknownCostMinutes,
   laborPct:complete&&sales>0&&!unknownCostMinutes?100*cost/sales:null,
   productivity:complete&&workMinutes>0?sales/(workMinutes/60):null,shortageMinutes:shortage,excessMinutes:excess,conflicts:[...conflicts],invalidShifts:shifts.filter(s=>{const r=range(s,date);return s.kind==='shift'&&(s.date===date||(r&&r.start<end&&r.end>start))&&(!r||pause(s,date)?.invalid)}).map(s=>s.id)};
 }
 const api={DAY,time,clock,day,addDay,localDate,range,pause,rate,validateShift,totals,resolveMinute,setForecast,amount,parsePaste,shiftAt,analyze};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.HoptaPlanner=Object.freeze(api);
})(globalThis);
