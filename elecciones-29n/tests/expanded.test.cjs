'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),E=require('../app.js');
const index=read('data/candidacies.json'),rows=index.files.flatMap(f=>read(f.path));
test('registro completo: Congreso, Senado, provincias y suplentes enlazados a titular',()=>{
 assert.equal(rows.length,7597);assert.equal(index.files.length,52);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 assert.equal(new Set(rows.filter(r=>r.chamber==='Congreso').map(r=>r.district)).size,52);
 assert.equal(new Set(rows.filter(r=>r.chamber==='Senado').map(r=>r.district)).size,60);
 for(const f of index.files){assert.match(f.path,/^data\/candidacies\/\d{2}\.json$/);assert.equal(read(f.path).length,f.records);}
 for(const r of rows.filter(r=>r.chamber==='Senado'&&r.kind==='suplente'))assert.ok(rows.some(p=>p.province===r.province&&p.district===r.district&&p.party===r.party&&p.chamber==='Senado'&&p.kind==='principal'&&p.order===r.substituteFor),r.name);
 assert.equal(E.candidateFilter(rows,{heads:true}).length,534);
});
test('Ceuta singular, Valladolid sin ordinal y rectificaciones de listas completas',()=>{
 const ceuta=rows.filter(r=>r.province==='Ceuta'&&r.chamber==='Senado'&&r.party==='PARTIDO POPULAR (PP)');assert.equal(ceuta.filter(r=>r.kind==='principal').length,2);assert.equal(ceuta.filter(r=>r.kind==='suplente').length,4);
 assert.ok(rows.some(r=>r.name==='Jesús Julio Carnero García'&&r.kind==='principal'&&r.orderPrinted===false));
 assert.ok(rows.some(r=>r.name==='Milagros Roca López'&&r.correction));assert.ok(rows.some(r=>r.name==='Valeriano Tella Arroyos'&&r.correction));
 assert.ok(rows.some(r=>r.name==='Jose Francisco Domenech Gomis'&&r.correction));
 assert.equal(rows.filter(r=>r.province==='La Rioja'&&r.chamber==='Congreso'&&r.party.includes('(PCTE)')).length,5);
 assert.ok(!rows.some(r=>r.name.includes('Ester Roca Domodel')));
});
test('los filtros separan cámara, suplencia, territorio y nombre sin acentos',()=>{
 assert.ok(E.candidateFilter(rows,{province:'Valladolid',chamber:'Senado',query:'carnero'}).some(r=>r.name==='Jesús Julio Carnero García'));
 const ordinary=E.candidateFilter(rows,{province:'Madrid',chamber:'Congreso'});assert.ok(ordinary.length>30);assert.ok(ordinary.every(r=>r.kind==='principal'));
 const substitutes=E.candidateFilter(rows,{province:'Ceuta',chamber:'Senado',includeSubstitutes:true});assert.ok(substitutes.some(r=>r.kind==='suplente'));
 assert.equal(E.candidateFilter(rows,{province:'Ceuta',chamber:'Congreso',query:'zzzzzz'}).length,0);
});
test('cada pregunta tiene análisis específico con fuente normativa y condición de coste',()=>{
 const analysis=read('data/analysis.json');assert.equal(analysis.questions.length,40);assert.equal(new Set(analysis.questions.map(q=>q.question)).size,40);
 for(const q of analysis.questions){assert.ok(q.economic.length>60);assert.ok(q.legal.length>60);assert.ok(q.sources.length);assert.ok(q.uncertainties.length);assert.ok(q.cost.explanation);for(const s of q.sources)assert.notEqual(E.safeURL(s.url),'#');}
 assert.equal(new Set(analysis.questions.map(q=>q.legal)).size,40);
});
test('directorio cubre todas las denominaciones BOE; perfiles respaldados y sin homónimos supuestos',()=>{
 const directory=read('data/programme-directory.json'),entries=directory.entries;
 const names=new Set(entries.map(e=>e.name));for(const r of rows)assert.ok(names.has(r.party),'Falta '+r.party);
 assert.equal(names.size,entries.length);assert.equal(entries.find(e=>e.name.startsWith('MENORCA AL SENAT')).documentIds.length,0);assert.equal(entries.find(e=>e.name.startsWith('UNIDAD DEL PUEBLO CANARIO')).canonical,'Unidad del Pueblo Canario');for(const e of entries)assert.ok(e.status&&e.note);
 const profiles=read('data/profiles.json').profiles;assert.ok(profiles.length>=22);for(const p of profiles){assert.ok(p.sources.length);assert.ok(rows.some(r=>E.normalize(r.name).replace(/\s*\([^)]*\)/g,'').trim()===E.normalize(p.matchName||p.name).replace(/\s*\([^)]*\)/g,'').trim()),p.name);}
});
test('desglose temático conserva suma y excluye silencios y depende',()=>{
 const data=read('data/catalogue.json'),answers=Object.fromEntries(data.questions.map(q=>[q.id,q.id%3?1:0]));for(const party of new Set(data.documents.map(d=>d.party))){const parts=E.topicScores(data,party,answers),score=E.score(data,party,answers);assert.equal(parts.reduce((s,p)=>s+p.total,0),score.total);assert.equal(parts.reduce((s,p)=>s+p.matches,0),score.matches);}
});
test('buscador distingue dirección solicitada y no equipara frenar subida con bajar salarios',()=>{
 const data=read('data/catalogue.json');const results=E.search(data,'quiero pagar menos cuota de autonomos');assert.ok(results.some(m=>m.intentMatch===true));assert.ok(results.filter(m=>m.intentMatch===true).every(m=>m.question===9&&m.position===1&&m.comparable!==false));
 assert.equal(E.interpret('quiero que me bajen el sueldo'),null);assert.equal(E.interpret('bajar impuestos'),null);
 assert.equal(E.interpret('menos gasto militar').position,-1);assert.equal(E.interpret('mas gasto militar').position,1);
 assert.equal(E.interpret('prolongar las nucleares').position,-1);assert.equal(E.interpret('cerrar las nucleares').position,1);
 assert.equal(E.interpret('no quiero reducir la jornada').position,-1);
});
test('índice completo enlaza documentos y páginas válidas sin publicar frases originales',()=>{
 const catalogue=read('data/catalogue.json'),manifest=read('data/document-index.json');assert.equal(manifest.documents.length,catalogue.documents.length);
 assert.ok(manifest.documents.filter(d=>d.status==='ok').length>=40);
 for(const d of manifest.documents){assert.ok(catalogue.documents.some(c=>c.id===d.id&&c.url===d.url));if(d.status==='error'){assert.ok(d.error);continue;}const index=read(d.path);assert.ok(!('text' in index));for(const [term,pages] of Object.entries(index.terms)){assert.ok(!term.includes(' '));assert.ok(pages.length);assert.ok(pages.every(p=>Number.isInteger(p)&&p>=1&&p<=d.pageCount));}}
 assert.deepEqual(E.searchPages({vivienda:[2,4],alquiler:[4],ferrocarril:[9]},'vivienda').map(p=>p.page),[2,4]);assert.deepEqual(E.searchPages({vivienda:[2]},'palabraquenoexiste'),[]);
});
