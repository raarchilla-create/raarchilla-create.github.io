const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../planner-core.js');
const date='2026-10-26';
const shift=(extra={})=>({id:'s1',kind:'shift',siteId:'north',personId:'p1',date,start:'10:00',end:'11:00',hourlyCost:30,...extra});
const model=(extra={})=>P.analyze({date,start:600,end:660,forecast:{},shifts:[],staff:[],target:null,minimum:0,...extra});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('time and date validation respects minute boundaries and calendar dates',()=>{
 assert.equal(P.time('10:07'),607);assert.equal(P.time('24:00'),null);assert.equal(P.time('09:60'),null);
 assert.equal(P.day('2026-02-30'),null);assert.equal(P.addDay('2026-01-31',1),'2026-02-01');
 assert.equal(P.clock(1441),'00:01');
});
test('forecast distribution conserves exact cents and preserves other minutes',()=>{
 const source={599:250,700:0},next=P.setForecast(source,600,603,101);
 assert.deepEqual([next[600],next[601],next[602]],[34,34,33]);
 assert.equal(next[599],250);assert.equal(next[700],0);assert.equal(source[600],undefined);
 assert.throws(()=>P.setForecast(source,600,600,10));
});
test('an unentered minute is unknown, while explicit zero is a forecast',()=>{
 const result=model({start:600,end:603,forecast:{600:0,601:100},target:60});
 assert.equal(result.known,2);assert.equal(result.complete,false);
 assert.deepEqual(result.minutes.map(r=>r.required),[0,1,null]);assert.equal(result.minutes[2].revenue,null);
 assert.equal(result.laborPct,null);assert.equal(result.shortageMinutes,1);
});
test('shift ends are exclusive and cost is calculated by exact minutes',()=>{
 const result=model({start:599,end:603,shifts:[shift({end:'10:02',hourlyCost:60})]});
 assert.deepEqual(result.minutes.map(r=>r.coverage),[0,1,1,0]);close(result.cost,2);close(result.workHours,2/60);
});
test('unpaid and paid breaks both remove coverage, but differ in paid cost',()=>{
 const s=shift({breakStart:'10:15',breakMinutes:30,breakPaid:false});
 const unpaid=model({shifts:[s]}),paid=model({shifts:[{...s,breakPaid:true}]});
 close(unpaid.workHours,.5);close(paid.workHours,.5);close(unpaid.cost,15);close(paid.cost,30);
 assert.equal(unpaid.minutes[14].coverage,1);assert.equal(unpaid.minutes[15].coverage,0);assert.equal(unpaid.minutes[45].coverage,1);
});
test('legacy overnight shifts and previous-day spillover remain visible',()=>{
 const s=shift({start:'23:58',end:'00:02'});
 assert.deepEqual(P.range(s,date),{start:1438,end:1442});
 const previous=shift({date:'2026-10-25',start:'23:59',end:'00:03'});
 const result=model({start:0,end:5,shifts:[previous]});
 assert.deepEqual(result.minutes.map(r=>r.coverage),[1,1,1,0,0]);close(result.cost,1.5);
});
test('overlap detection includes adjacent calendar days and permits touching shifts',()=>{
 const previous=shift({id:'before',date:'2026-10-25',start:'23:00',end:'01:00'});
 assert.match(P.validateShift(shift({start:'00:59',end:'02:00'}),[previous]),/solapa/);
 assert.equal(P.validateShift(shift({start:'01:00',end:'02:00'}),[previous]),'');
 assert.equal(P.validateShift(shift({personId:'p2',start:'00:59',end:'02:00'}),[previous]),'');
});
test('breaks outside a shift and invalid ranges cannot be saved',()=>{
 assert.match(P.validateShift(shift({breakStart:'09:59',breakMinutes:10})),/pausa/);
 assert.match(P.validateShift(shift({breakStart:'10:59',breakMinutes:2})),/pausa/);
 assert.match(P.validateShift(shift({breakMinutes:-1})),/pausa/);
 assert.match(P.validateShift(shift({start:'11:00',end:'10:00',endNextDay:false})),/medianoche/);
});
test('moving a shift by one minute retains duration and moves its break',()=>{
 const original=shift({start:'23:30',end:'01:00',breakStart:'00:10',breakMinutes:10});
 const next=P.shiftAt(original,date,1);
 assert.equal(next.start,'23:31');assert.equal(next.end,'01:01');assert.equal(next.breakStart,'00:11');
 assert.equal(next.endNextDay,true);assert.equal(P.validateShift(next), '');
 const crossing=P.shiftAt(shift({start:'23:59',end:'00:10'}),date,1);
 assert.equal(crossing.date,'2026-10-27');assert.equal(crossing.start,'00:00');assert.equal(crossing.end,'00:11');assert.equal(crossing.endNextDay,false);
});
test('resizing one handle preserves the other endpoint and checks the pause',()=>{
 const original=shift({breakStart:'10:10',breakMinutes:10});
 const next=P.shiftAt(original,date,1,'end');assert.equal(next.start,'10:00');assert.equal(next.end,'11:01');
 const invalid=P.shiftAt(original,date,11,'start');assert.match(P.validateShift(invalid),/pausa/);
});
test('legacy cost snapshots take precedence over changed staff tariffs',()=>{
 const legacy=shift();delete legacy.hourlyCost;legacy.cost=18;legacy.hours=1;
 assert.equal(P.rate(legacy,{hourlyCost:30}),18);
 assert.equal(P.rate({...legacy,hourlyCost:null},{hourlyCost:30}),null);
 const result=model({shifts:[shift({hourlyCost:null})]});assert.equal(result.cost,null);assert.equal(result.unknownCostMinutes,60);
});
test('existing overlapping shifts do not duplicate a person in coverage or cost',()=>{
 const result=model({shifts:[shift(),shift({id:'duplicate',hourlyCost:42})]});
 assert.equal(result.conflicts.length,1);close(result.workHours,1);close(result.cost,42);
});
test('archived shifts do not affect coverage or cost',()=>{
 const result=model({shifts:[shift({kind:'shiftArchived'})]});assert.equal(result.cost,0);assert.equal(result.workHours,0);
});
test('invalid imported pauses are flagged and excluded from the calculation',()=>{
 const result=model({shifts:[shift({breakStart:'09:00',breakMinutes:15})]});
 assert.equal(result.invalidShifts.length,1);assert.equal(result.workHours,0);assert.equal(result.cost,0);
});
test('coverage recommendations require an explicit productivity assumption',()=>{
 const forecast=P.setForecast({},600,660,6000);
 const unknown=model({forecast,shifts:[shift()]});assert.equal(unknown.minutes[0].required,null);
 const planned=model({forecast,target:120,minimum:1,shifts:[shift(),shift({id:'s2',personId:'p2'})]});
 assert.equal(planned.minutes[0].required,1);assert.equal(planned.excessMinutes,60);close(planned.laborPct,100);
});
test('minute import supports tab-separated decimals and overnight business windows',()=>{
 assert.deepEqual(P.parsePaste('Hora\tVentas\n23:59\t15,50\n00:00\t0',1320,1620),{1439:1550,1440:0});
 assert.throws(()=>P.parsePaste('10:00;12\n10:00;13',600,660),/duplicada/);
 assert.throws(()=>P.parsePaste('10:00;12\n11:00;13',600,660),/línea 2/);
 assert.throws(()=>P.parsePaste('10:00;1.000,00',600,660),/línea 1/);
});
