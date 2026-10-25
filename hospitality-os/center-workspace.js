/* A center stays explicit while navigating its operational tools. */
let hcToolContext=null;
const hcTools={
 diagnosticos:{label:'Diagnósticos',render:()=>assessments()},
 equipo:{label:'Personal y turnos',render:()=>opsTeam()},
 elaboraciones:{label:'Elaboraciones',render:()=>opsMenu()},
 zonas:{label:'Zonas',render:()=>zonesHub()},
 procesos:{label:'Procesos',render:()=>processHub()}
};
function hcToolSite(tool){return hcToolContext?.tool===tool?hcToolContext.siteId:''}
function hcCenterTabs(id,active='resumen'){
 const nav=document.createElement('nav');nav.className='hc-center-tabs';
 nav.setAttribute('aria-label','Herramientas del centro');
 for(const [key,label] of [['resumen','Resumen'],...Object.entries(hcTools).map(([key,x])=>[key,x.label])]){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.className=key===active?'active':'';
  if(key===active)button.setAttribute('aria-current','page');
  button.onclick=()=>key==='resumen'?hoptaCenter(id):hcOpenTool(key,id);
  nav.append(button);
 }
 return nav;
}
async function hcOpenTool(tool,id){
 if(!hcTools[tool])return;
 const site=await get('sites',id);
 if(!site){toast('No se encontró el centro');return go('centros')}
 hcToolContext={tool,siteId:id};hoptaSelectedCenter=id;hwActiveCenter=id;opsCurrentSite=id;
 tab='centros';renderNav();await hcTools[tool].render();window.scrollTo(0,0);
}
async function hcToolHeader(){
 if(!hcToolContext)return;
 const {tool,siteId}=hcToolContext,site=await get('sites',siteId);if(!site)return;
 hwActiveCenter=siteId;hoptaSelectedCenter=siteId;
 app().querySelector('.hc-tool-context')?.remove();
 const header=document.createElement('section');header.className='hc-tool-context';
 const back=document.createElement('button');back.className='hc-back';back.textContent='← Ficha del centro';back.onclick=()=>hoptaCenter(siteId);
 const name=document.createElement('div');name.className='hc-tool-center';name.textContent=site.name;
 const detail=document.createElement('p');detail.textContent='Trabajando en este centro · '+hcTools[tool].label;
 header.append(back,name,detail,hcCenterTabs(siteId,tool));app().prepend(header);
 // The former Operations hub is now represented by the center tabs.
 const oldBack=app().querySelector(':scope > button[onclick="opsHub()"]');if(oldBack)oldBack.remove();
 await hwDecorate();
}
function hcAssessmentsBack(){
 const id=hcToolSite('diagnosticos');return id?hcOpenTool('diagnosticos',id):go('assess');
}
const hcWorkspaceGo=go;
go=async function(t){hcToolContext=null;hwActiveCenter='all';await hcWorkspaceGo(t)};
const hcWorkspaceCenter=hoptaCenter;
hoptaCenter=async function(id){
 hcToolContext=null;tab='centros';renderNav();await hcWorkspaceCenter(id);
 if(app().querySelector('.hc-kpis')){
  const anchor=app().querySelector('.hw-center-nav')||app().querySelector('.hc-heading');
  anchor?.after(hcCenterTabs(id));window.scrollTo(0,0);
 }
};
const hcWorkspaceQuickSwitch=hwQuickSwitch;
hwQuickSwitch=async function(id){
 if(id!=='all'&&hcToolContext)return hcOpenTool(hcToolContext.tool,id);
 hcToolContext=null;await hcWorkspaceQuickSwitch(id);
};
const hcScopedAssessments=assessments;
assessments=async function(){const id=hcToolSite('diagnosticos');await hcScopedAssessments(id);if(id)await hcToolHeader()};
const hcScopedAssessmentEdit=editAssessment;
editAssessment=async function(id){
 if(!hcToolContext&&tab==='centros'){
  const assessment=await get('assessments',id);
  if(assessment)hcToolContext={tool:'diagnosticos',siteId:assessment.siteId};
 }
 await hcScopedAssessmentEdit(id);if(hcToolSite('diagnosticos'))await hcToolHeader();
};
const hcScopedZones=zonesHub;
zonesHub=async function(){const id=hcToolSite('zonas');await hcScopedZones(id);if(id)await hcToolHeader()};
const hcScopedProcesses=processHub;
processHub=async function(){const id=hcToolSite('procesos');await hcScopedProcesses(id);if(id)await hcToolHeader()};
const hcScopedProcessStart=stageStartView;
stageStartView=async function(id){await hcScopedProcessStart(id);if(hcToolSite('procesos'))await hcToolHeader()};
const hcScopedProcessStats=processStats;
processStats=async function(id){await hcScopedProcessStats(id);if(hcToolSite('procesos'))await hcToolHeader()};
const hcScopedTeam=opsTeam;
opsTeam=async function(){
 if(hcToolSite('equipo'))hcToolContext.siteId=opsCurrentSite;
 await hcScopedTeam();if(hcToolSite('equipo'))await hcToolHeader();
};
const hcScopedMenu=opsMenu;
opsMenu=async function(){
 if(hcToolSite('elaboraciones'))hcToolContext.siteId=opsCurrentSite;
 await hcScopedMenu();if(hcToolSite('elaboraciones'))await hcToolHeader();
};
