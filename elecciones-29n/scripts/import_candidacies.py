"""Reconcile Congress, Senate and substitutes from BOE HTML (3/11/2026).
Usage: python3 import_candidacies.py /path/to/BOE-A-2026-23103.html
Corrections are explicit, scoped and fail closed when a target is missing.
"""
import hashlib,json,re,sys
from pathlib import Path
from import_candidates import Paragraphs
SOURCE='https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23103'
CORRECTION='BOE-A-2026-23383'

def extract(raw):
 p=Paragraphs();p.feed(raw);rows=[];excluded=[]
 province=district=chamber=party=None;kind='principal';parent=None;sub_count=0
 for row_index,(cls,text) in enumerate(p.rows):
  if text.startswith('JUNTA ELECTORAL DE '):
   province=text.removeprefix('JUNTA ELECTORAL DE ').title();district=province;chamber=party=None;continue
  if text in ('CONGRESO DE LOS DIPUTADOS','SENADO','SENADORES'):
   chamber='Congreso' if text.startswith('CONGRESO') else 'Senado';party=None;district=province;continue
  if text.startswith('Circunscripción electoral:'):
   district=text.split(':',1)[1].strip();party=None;continue
  if chamber and 'centro' in cls and re.match(r'^\d+\.\s',text):
   party=re.sub(r'^\d+\.\s*','',text);kind='principal';parent=None;sub_count=0;continue
  if not (province and chamber and party and cls.startswith('parrafo')):continue
  if text in ('Suplentes:','Suplente:'):
   kind='suplente';sub_count=0;continue
  if text in ('Titular:','Titulares:'):kind='principal';continue
  if text.lower().startswith('no proclamada'):
   excluded.append(dict(province=province,district=district,chamber=chamber,party=party,status=text));continue
  sub=re.match(r'^Suplente\s+(\d+):\s*(.+)',text)
  numbered=re.match(r'^(\d+)\.\s*(.+)',text)
  inferred=False
  if chamber=='Senado' and not sub and not numbered and row_index+1<len(p.rows) and re.match(r'^Suplente\s+1:',p.rows[row_index+1][1]):
   numbered=re.match(r'^(\d+)\.\s*(.+)',f'{(parent or 0)+1}. {text}');inferred=True;kind='principal'
  if not sub and not numbered:continue
  order,name=(sub or numbered).groups();entry_kind='suplente' if sub else kind
  if chamber=='Senado' and numbered and kind=='principal':parent=int(order)
  rows.append(dict(province=province,district=district,chamber=chamber,party=party,name=name.rstrip('.'),order=int(order),kind=entry_kind,substituteFor=parent if chamber=='Senado' and entry_kind=='suplente' else None))
  if inferred:rows[-1]['orderPrinted']=False
  if chamber=='Senado' and numbered and kind=='suplente':
   sub_count+=1
   if sub_count==2:kind='principal'
 reconcile(rows)
 for i,row in enumerate(rows):row['id']='c'+hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16]
 assert len({r['id'] for r in rows})==len(rows),'Duplicate candidacy identities'
 return rows,excluded

def reconcile(rows):
 def scoped(province,chamber,party):return [r for r in rows if r['province']==province and r['chamber']==chamber and party in r['party']]
 def rename(province,chamber,party,old,new):
  found=[r for r in scoped(province,chamber,party) if r['name']==old]
  assert len(found)==1,(province,chamber,old,len(found))
  found[0]['name']=new;found[0]['correction']=CORRECTION
 rename('Ávila','Senado','POPULAR','Vidal García Jaramillo','Vidal Galicia Jaramillo')
 rename('Huesca','Congreso','FIESTA','Milagros Roca Pérez','Milagros Roca López')
 rename('Huesca','Senado','POPULAR','Valeriano Terra Arroyos','Valeriano Tella Arroyos')
 rename('Navarra','Congreso','FIESTA','Noelia Gonzaléz Salmerón','Noelia González Salmerón')
 rename('Teruel','Congreso','SOCIALISTA','Herminio Rufino Sancho Íniguez','Herminio Rufino Sancho Íñiguez')
 rename('Valencia','Congreso','(PCTE)','Francisco José Domenech Gomis','Jose Francisco Domenech Gomis')
 for chamber in ('Congreso','Senado'):
  old=scoped('La Rioja',chamber,'(PCTE)');assert old
  template={k:old[0][k] for k in ('province','district','chamber','party')}
  rows[:]=[r for r in rows if r not in old]
  new=([('Francisco Castro Portolés',1,'principal',None),('María Eugenia Oleaga Muguerza',2,'principal',None),('Gonzalo Alonso Alonso',3,'principal',None),('Lucía Sáenz Burgos',4,'principal',None),('José Ángel Sáenz Díaz',1,'suplente',None)] if chamber=='Congreso' else [('Alejandro García Cáncer',1,'principal',None),('Lucía Antoñanzas Gil',1,'suplente',1),('Sergio Ballesteros Muñoz',2,'suplente',1)])
  rows.extend(dict(**template,name=name,order=order,kind=kind,substituteFor=parent,correction=CORRECTION) for name,order,kind,parent in new)
 for r in scoped('Navarra','Congreso','EUSKAL HERRIA BILDU'):
  r['party']='EUSKAL HERRIA BILDU (EH BILDU)';r['correction']=CORRECTION
 for r in scoped('Navarra','Congreso','Frente Amplio-Fronte Zabala'):
  r['party']='FRENTE AMPLIO-FRONTE ZABALA (FRENTE AMPLIO-FRONTE ZABALA)';r['correction']=CORRECTION
 for r in rows:
  corrected_suffix=(r['province']=='Tarragona' and r['chamber']=='Congreso' and 'COMUNS-FRONT AMPLI' in r['party']) or (r['province'] in ('Girona','Navarra','Tarragona') and r['chamber']=='Senado' and ('ERC' in r['party'] or 'BILDU' in r['party']))
  if corrected_suffix:
   r['name']=re.sub(r'\s+\([^)]*\)$','',r['name']);r['correction']=CORRECTION
  if r['province']=='Tarragona' and r['chamber']=='Congreso' and r['name']=='Ester Roca Domodel':r['name']='Ester Roca Domedel';r['correction']=CORRECTION
  if r['province']=='Tarragona' and r['chamber']=='Senado' and r['party']=='VOX (VOX)':r['party']='VOX';r['correction']=CORRECTION

def build(raw):
 rows,excluded=extract(raw)
 return dict(schemaVersion=1,asOf='2026-11-25',source=SOURCE,sourceSHA256=hashlib.sha256(raw.encode()).hexdigest(),corrections=[CORRECTION,'BOE-A-2026-24503'],scope='Personas proclamadas: Congreso, Senado y suplencias. Las suplencias senatoriales se vinculan a su titular. Se excluyen listas expresamente no proclamadas.',records=rows,excluded=excluded,counts={chamber:sum(r['chamber']==chamber for r in rows) for chamber in ('Congreso','Senado')})
if __name__=='__main__':
 out=build(Path(sys.argv[1]).read_text());root=Path(__file__).resolve().parents[1]/'data';folder=root/'candidacies';folder.mkdir(exist_ok=True);records=out.pop('records');out['files']=[]
 for i,province in enumerate(sorted({r['province'] for r in records})):
  subset=[r for r in records if r['province']==province];name=f'{i+1:02d}.json';(folder/name).write_text(json.dumps(subset,ensure_ascii=False,separators=(',',':'))+'\n');out['files'].append(dict(province=province,path='data/candidacies/'+name,records=len(subset)))
 (root/'candidacies.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(len(records),out['counts'],len(out['excluded']),'listas no proclamadas excluidas')
