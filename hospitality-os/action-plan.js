
/* hopta — center action plan. Existing local IndexedDB projects/tasks/findings. */
async function hcActionPlan(id){
 const s=await get('sites',id);if(!s)return;
 const [projects,tasks,findings]=await Promise.all([all('projects'),all('tasks'),exAll('findings')]);
 const ps=projects.filter(p=>p.siteId===id),ts=tasks.filter(t=>ps.some(p=>p.id===t.projectId)),fs=findings.filter(f=>f.siteId===id);
 const completed=ts.filter(t=>t.done).length,overdue=ts.filter(t=>!t.done&&t.dueDate&&t.dueDate<new Date().toISOString().slice(0,10)).length;
 const item=t=>{const finding=fs.find(f=>f.id===t.findingId);return '<div class="hc-plan-task"><label class="hc-plan-check"><input type="checkbox" '+(t.done?'checked':'')+' onchange="hcPlanToggle(&quot;'+esc(id)+'&quot;,&quot;'+esc(t.id)+'&quot;,this.checked)"><span>'+esc(t.name)+'</span></label><div class="hc-plan-meta">'+(finding?'<span>Hallazgo: '+esc(finding.title)+'</span>':'')+'<span>'+esc(t.owner||'Sin responsable')+'</span><span>'+esc(t.dueDate||'Sin fecha límite')+'</span>'+(t.estimatedImpact!=null&&t.estimatedImpact!==''?'<span>Impacto estimado: '+hcMoney(t.estimatedImpact)+'/mes</span>':'')+(t.verifiedImpact!=null&&t.verifiedImpact!==''?'<span>Impacto validado: '+hcMoney(t.verifiedImpact)+'/mes</span>':'')+'</div><button class="secondary" onclick="hcPlanEdit(&quot;'+esc(id)+'&quot;,&quot;'+esc(t.id)+'&quot;)">Editar acción</button></div>'};
 app().innerHTML='<button class="hc-back" onclick="hoptaCenter(&quot;'+esc(id)+'&quot;)">← Volver al centro</button><div class="hc-eyebrow">HOPTA / MEJORA CONTINUA</div><h2>Plan de mejora · '+esc(s.name)+'</h2><p>Responsables, fechas y resultados de cada acción. Los impactos estimados no se consideran ahorros reales.</p>'+
 '<div class="hc-summary"><div><small>Acciones</small><strong>'+ts.length+'</strong></div><div><small>Completadas</small><strong>'+completed+'</strong></div><div><small>Vencidas</small><strong>'+overdue+'</strong></div><div><small>Hallazgos</small><strong>'+fs.length+'</strong></div></div>'+
 '<div class="card"><div class="hc-section-title"><h3>Acciones del centro</h3><button onclick="hcPlanEdit(&quot;'+esc(id)+'&quot;)">+ Nueva acción</button></div>'+(ts.length?ts.slice().sort((a,b)=>Number(a.done)-Number(b.done)).map(item).join(''):'<p class="muted">Todavía no hay acciones asignadas a este centro.</p>')+'</div>';
}
async function hcPlanEdit(id,taskId){
 const s=await get('sites',id);if(!s)return;
 const task=taskId?await get('tasks',taskId):null;
 const ps=(await all('projects')).filter(p=>p.siteId===id);
 const project=task?ps.find(p=>p.id===task.projectId):ps.find(p=>p.hoptaPlan)||ps[0];
 const valOf=k=>esc(task?.[k]??'');
 app().innerHTML='<button class="hc-back" onclick="hcActionPlan(&quot;'+esc(id)+'&quot;)">← Plan de mejora</button><div class="hc-eyebrow">HOPTA / ACCIÓN</div><h2>'+(task?'Editar acción':'Nueva acción')+'</h2><p>'+esc(s.name)+'</p><div class="card hc-form">'+
 '<label for="hcp-name">Acción *</label><input id="hcp-name" maxlength="200" value="'+valOf('name')+'" placeholder="Ej. Revisar dimensionamiento de turnos">'+
 '<label for="hcp-owner">Responsable</label><input id="hcp-owner" maxlength="120" value="'+valOf('owner')+'" placeholder="Nombre o equipo">'+
 '<label for="hcp-due">Fecha límite</label><input id="hcp-due" type="date" value="'+valOf('dueDate')+'">'+
 '<label for="hcp-est">Impacto mensual estimado (€)</label><input id="hcp-est" type="number" min="0" step="any" value="'+valOf('estimatedImpact')+'" placeholder="Opcional">'+
 '<label for="hcp-verified">Impacto mensual validado (€)</label><input id="hcp-verified" type="number" min="0" step="any" value="'+valOf('verifiedImpact')+'" placeholder="Solo cuando esté medido">'+
 '<label for="hcp-notes">Evidencia y seguimiento</label><textarea id="hcp-notes" rows="3" placeholder="Qué se hizo, cómo se midió y fuente de los resultados">'+esc(task?.notes||'')+'</textarea>'+
 '<p class="hc-data-note">El impacto validado es una declaración registrada por el usuario; hopta no lo calcula ni lo certifica automáticamente.</p><button onclick="hcPlanSave(&quot;'+esc(id)+'&quot;,'+(taskId?'&quot;'+esc(taskId)+'&quot;':'null')+')">Guardar acción</button></div>';
}
async function hcPlanSave(id,taskId){
 const value=k=>document.getElementById('hcp-'+k).value.trim(),name=value('name');if(!name)return toast('Introduce el nombre de la acción');
 const est=value('est'),verified=value('verified');
 if([est,verified].some(x=>x!==''&&(!Number.isFinite(Number(x))||Number(x)<0)))return toast('Revisa los importes');
 let t=taskId?await get('tasks',taskId):null;
 if(taskId&&!t)return toast('No se encontró la tarea');
 if(!t){let p=(await all('projects')).find(p=>p.siteId===id&&p.hoptaPlan);if(!p){p={id:uid(),siteId:id,hoptaPlan:true,name:'Plan de mejora · '+(await get('sites',id)).name,at:now()};await put('projects',p)}t={id:uid(),projectId:p.id,done:false,at:now()}}
 t.name=name;t.owner=value('owner');t.dueDate=value('due');t.estimatedImpact=est===''?null:Number(est);t.verifiedImpact=verified===''?null:Number(verified);t.notes=value('notes');
 await put('tasks',t);toast('Acción guardada');await hcActionPlan(id);
}
async function hcPlanToggle(id,taskId,done){const t=await get('tasks',taskId);if(!t)return;t.done=done;t.completedAt=done?now():null;await put('tasks',t);await hcActionPlan(id)}
