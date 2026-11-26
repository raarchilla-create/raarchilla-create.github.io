'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),E=require('../app.js');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),heads=read('data/candidates.json').candidates,entries=read('data/programme-directory.json').entries,parties=[...new Set(read('data/catalogue.json').documents.map(d=>d.party))].sort(E.alphabetical);
test('mi papeleta usa todas las listas proclamadas de la provincia y excluye las ajenas',()=>{
 const m=E.ballotScope(heads,entries,parties,'Madrid');assert.equal(m.lists.length,heads.filter(c=>c.province==='Madrid').length);assert.ok(m.parties.includes('PP'));assert.ok(m.parties.includes('PSOE'));assert.ok(!m.parties.includes('BNG'));assert.ok(!m.parties.includes('Junts'));assert.equal(E.ballotScope(heads,entries,parties,'').parties.length,parties.length);
 for(const c of m.lists)assert.ok(heads.some(h=>h.province==='Madrid'&&h.party===c.name));
});
test('coaliciones sin asociación acreditada conservan su identidad sin adoptar programas de miembros',()=>{
 const fixture=[{province:'X',party:'COALICIÓN (A-B)',name:'Persona',source:'https://www.boe.es/'},{province:'X',party:'OTRA',name:'Otra persona',source:'https://www.boe.es/'}];
 const dir=[{name:'COALICIÓN (A-B)',canonical:'Partido A',documentIds:['a'],status:'Referencia de sus integrantes'}];const s=E.ballotScope(fixture,dir,['Partido A'],'X');assert.deepEqual(s.parties,['COALICIÓN (A-B)','OTRA']);assert.equal(s.unmapped.length,2);assert.ok(!s.parties.includes('Partido A'));
});
test('un ámbito sin posturas no inventa resultados y una provincia inexistente queda vacía',()=>{
 assert.equal(E.ballotScope(heads,entries,parties,'Provincia inexistente').lists.length,0);const data=read('data/catalogue.json');const s=E.score(data,'Candidatura sin programa',{1:1,2:-1});assert.equal(s.total,0);assert.equal(s.percent,null);
});
test('al cambiar provincia se conservan elecciones válidas sin duplicados ni tercera forzada',()=>{
 assert.deepEqual(E.selections(['A','B','C'],['fuera','A','C']),['B','A','C']);assert.deepEqual(E.selections(['A'],['B','C','D']),['A','','']);assert.deepEqual(E.selections(['A','B','C'],['A','B','']),['A','B','']);assert.deepEqual(E.selections([],['A','B','C']),['','','']);
});
test('un cambio programático requiere textos distintos y dos referencias HTTPS válidas',()=>{
 const e={type:'verified-change',before:'Plazo de 12 meses',after:'Plazo de 18 meses',beforeUrl:'https://example.org/anterior',afterUrl:'https://example.org/posterior',context:'Dos originales de prueba comparados por el evaluador.'};assert.equal(E.confirmedChange(e),true);assert.equal(E.confirmedChange({...e,after:e.before}),false);assert.equal(E.confirmedChange({...e,beforeUrl:undefined}),false);assert.equal(E.confirmedChange({...e,afterUrl:'javascript:alert(1)'}),false);assert.equal(E.confirmedChange({...e,type:'document-change'}),false);assert.equal(E.confirmedChange({...e,afterUrl:e.beforeUrl+'#page=2'}),false);assert.equal(E.confirmedChange({...e,context:''}),false);
});
test('resaltado antes y después conserva texto y escapa HTML externo',()=>{
 const diff=E.diffText('Plazo de 12 meses','Plazo de 18 meses');assert.equal(diff.before,'Plazo de <del>12</del> meses');assert.equal(diff.after,'Plazo de <ins>18</ins> meses');assert.deepEqual(E.diffText('Igual','Igual'),{before:'Igual',after:'Igual'});assert.ok(!E.diffText('<img src=x onerror=1>','<script>x</script>').after.includes('<script>'));assert.equal(E.diffText('', 'Nuevo').after,'<ins>Nuevo</ins>');
});
test('cronología ordena por fechas verificables y combina formación, tipo y rango sin mutar datos',()=>{
 const source=[{id:'1',party:'B',type:'official-news',date:'2026-11-25'},{id:'2',party:'A',type:'document-change',date:'2026-11-26'},{id:'3',party:'B',type:'verified-change',date:'2026-11-26'},{id:'4',party:'A',type:'audit',date:'2026-02-30'}],copy=JSON.stringify(source);
 assert.deepEqual(E.timelineEntries(source).map(x=>x.id),['2','3','1','4']);assert.equal(E.timelineEntries(source,{type:'verified-change'}).length,0);assert.deepEqual(E.timelineEntries(source,{party:'A',from:'2026-11-26',until:'2026-11-26'}).map(x=>x.id),['2']);assert.equal(E.eventDate(source[3]),null);assert.equal(JSON.stringify(source),copy);
});
