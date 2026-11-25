const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const E=require('../app.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/catalogue.json')));
const candidates=JSON.parse(fs.readFileSync(path.join(root,'data/candidates.json')));
test('40 preguntas únicas, fuentes resolubles y ninguna pregunta vacía',()=>{
 assert.equal(data.questions.length,40);
 assert.equal(new Set(data.questions.map(q=>q.id)).size,40);
 assert.equal(new Set(data.measures.map(m=>m.id)).size,data.measures.length);
 for(const q of data.questions)assert.ok(data.measures.some(m=>m.question===q.id),q.title);
 for(const m of data.measures){assert.ok(data.documents.some(d=>d.id===m.document&&d.party===m.party));assert.ok(m.locator.length>4);assert.ok([1,-1].includes(m.position));assert.ok(data.questions.some(q=>q.id===m.question));}
 for(const d of data.documents)assert.notEqual(E.safeURL(d.url),'#');
});
test('silencios, depende y saltos no puntúan; el sentido sí cambia el resultado',()=>{
 const sample={questions:[{id:1},{id:2},{id:3},{id:4}],measures:[{party:'A',question:1,position:1},{party:'A',question:2,position:-1},{party:'A',question:3,position:1}]};
 assert.deepEqual(E.score(sample,'A',{1:1,2:1,3:0,4:-1}),{party:'A',matches:1,disagreements:1,total:2,percent:50});
 assert.equal(E.score(sample,'A',{1:-1}).percent,0);
 assert.equal(E.score(sample,'A',{1:null,2:0}).percent,null);
});
test('duplicados no inflan afinidad y contradicciones excluyen la pregunta',()=>{
 const sample={questions:[{id:1}],measures:[{party:'A',question:1,position:1},{party:'A',question:1,position:1}]};
 assert.equal(E.score(sample,'A',{1:1}).total,1);
 sample.measures.push({party:'A',question:1,position:-1});assert.equal(E.score(sample,'A',{1:1}).total,0);
});
test('comparación común usa exactamente las mismas preguntas para todos',()=>{
 const r=E.commonScore(data,['PSOE','Vox'],Object.fromEntries(data.questions.map(q=>[q.id,1])));
 assert.ok(r.ids.length>0);assert.equal(r.scores[0].total,r.scores[1].total);assert.equal(r.ids.length,r.scores[0].total);
});
test('no inferir posiciones ajenas: compra extranjera no es compra especulativa; PP no se codifica contra regularización',()=>{
 assert.equal(E.position(data,'CC-Primero Canarias',3),null);assert.equal(E.position(data,'PP',31),null);
 assert.equal(E.position(data,'Se Acabó la Fiesta',22),null);
});
test('buscador normaliza acentos, errores pequeños y sinónimos sin inventar entradas',()=>{
 assert.ok(E.search(data,'cuota de autonomos').some(m=>m.question===9));
 assert.ok(E.search(data,'jubilacio').some(m=>m.topic==='Pensiones')); // deletion typo
 assert.ok(E.search(data,'alquile').some(m=>m.topic==='Vivienda'));
 assert.ok(E.search(data,'sueldo').some(m=>m.topic==='Trabajo'));
 assert.equal(E.search(data,'zzzzzzzzzzzzzzzzzzzzzz').length,0);
 assert.ok(E.search(data,'','Pensiones','Podemos').every(m=>m.party==='Podemos'&&m.topic==='Pensiones'));
});
test('enlaces y texto externo no permiten HTML ni protocolos ejecutables',()=>{
 assert.equal(E.safeURL('javascript:alert(1)'),'#');assert.equal(E.safeURL('https://user:secret@example.com'),'#');assert.equal(E.escape('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
});
test('investidura cubre umbrales, empate y entradas inválidas',()=>{
 assert.equal(E.majority(176,174).absolute,true);assert.equal(E.majority(175,174).absolute,false);assert.equal(E.majority(175,174).simple,true);assert.equal(E.majority(175,175).simple,false);
 for(const a of [[176,175],[-1,1],[0.5,1],[NaN,0],[Infinity,0]])assert.equal(E.majority(...a),null);
});
test('534 fichas, 52 provincias, correcciones de cabezas de lista y duplicados',()=>{
 assert.equal(candidates.candidates.length,534);assert.equal(new Set(candidates.candidates.map(c=>c.province)).size,52);
 assert.equal(new Set(candidates.candidates.map(c=>c.province+'|'+c.party)).size,534);
 assert.ok(candidates.candidates.some(c=>c.province==='La Rioja'&&c.name==='Francisco Castro Portolés'));
 assert.ok(candidates.candidates.some(c=>c.name==='Ester Roca Domedel'));
 assert.ok(candidates.candidates.some(c=>c.name==='Herminio Rufino Sancho Íñiguez'));
 assert.ok(!candidates.candidates.some(c=>c.name.includes('Domodel')));
});
