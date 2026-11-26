"""Rebuild the denomination directory from official candidacy shards and reviewed mappings.
Mappings identify references, not automatic adoption of a partner's programme.
"""
import json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
RULES=[('unidad del pueblo canario','Unidad del Pueblo Canario'),('acord de progres|menorca al senat|eivissa al senat|formentera al senat|sa unio de formentera',None),('senado de progreso|aurRera doan senatua',None),('bildu.*erc|erc.*bildu',None),('upn-pp','UPN-PP'),('agenda valenciana','Agenda Valenciana'),('escanos en blanco|escanos en branco','Escaños en Blanco'),('alhora','Alhora'),('alantre','Proyecto Alantre'),('eguzkilore','Eguzkilore'),('arames','Ara Més-Front Ampli'),('comuns-front ampli','Comuns-Front Ampli'),('coalicion canaria|primero canarias','CC-Primero Canarias'),('frente amplio|frente ampliu','Frente Amplio'),('frente obrero','Frente Obrero'),('socialist|psib-psOE|psdeg-psOE','PSOE'),('partido popular|partit popular','PP'),('vox','Vox'),('podemos','Podemos'),('eaj-pnv','EAJ-PNV'),('bloque nacionalista galego','BNG'),('esquerra republicana','ERC'),('bildu','EH Bildu'),('compromis:','Compromís-Front Valencià'),('junts per','Junts'),('se acabo la fiesta','Se Acabó la Fiesta'),('animalista','PACMA'),('adelante andalucia','Adelante Andalucía'),('partido humanista','Partido Humanista'),('pctc|pctg|pcte|partido comunista dos traballadores','PCTE'),('iustitia','Iustitia Europa'),('falange','Falange Española de las JONS'),('democracia para el siglo 21','Democracia para el Siglo 21'),('mundo mas justo|mundo mais xusto','Por un Mundo Más Justo'),('partido autonomos','Partido Autónomos'),('nuevo extremenismo','Nuevo Extremeñismo'),('geroa bai','Geroa Bai'),('teruel existe','Teruel Existe'),('soria','Soria ¡Ya!'),('feministas al congreso','Feministas al Congreso'),('drago canarias','Drago Canarias'),('convergents','Convergents'),('unidad del pueblo canario','Unidad del Pueblo Canario'),('tercera edad','Tercera Edad en Acción')]
def canonical(name):
 for pattern,value in RULES:
  if re.search(pattern,norm(name),re.I):return value
 return None

def main():
 cat=json.loads((ROOT/'data/catalogue.json').read_text());index=json.loads((ROOT/'data/candidacies.json').read_text());rows=[r for f in index['files'] for r in json.loads((ROOT/f['path']).read_text())];entries=[]
 for name in sorted({r['party'] for r in rows},key=norm):
  group=canonical(name);docs=[d for d in cat['documents'] if d['party']==group];subset=[r for r in rows if r['party']==name];territories=sorted({r['province'] for r in subset});chambers=sorted({r['chamber'] for r in subset})
  status='No localizado en esta revisión';note='No se ha verificado un programa propio de esta denominación en las consultas realizadas. No equivale a que no exista: no se atribuyen propuestas por ideología, silencio o por pertenecer a una coalición.'
  if docs:
   general=all(any(t in d['kind'].lower() for t in ['general','permanente','politico']) for d in docs)
   status='Publicación política general' if general else 'Documentación oficial localizada'
   note='Referencias oficiales de '+group+'. '+('Publicación general o permanente: se distingue del programa específico de esta convocatoria.' if general else 'Consulta el tipo y alcance de cada documento; presentación, compromiso y programa completo son categorías diferentes.')+' La denominación territorial se conserva. Los documentos de ámbito común no sustituyen posibles compromisos territoriales.'
   if 'SENADO' in name.upper() or ('COMUNS' in name.upper() and 'democr' in name.lower()):status='Referencia de sus integrantes';note='Se enlaza documentación de un integrante. No se acredita su adopción íntegra por esta lista al Senado ni se traslada automáticamente al test.'
  sources=[dict(title='BOE: proclamación y denominación de la candidatura',url=index['source'])]+[dict(title=d['title']+' · '+d['kind'],url=d['url']) for d in docs]
  entries.append(dict(name=name,canonical=group or name,status=status,statusLabel=status,note=note,sources=sources,checked='2026-11-26',territories=territories,chambers=chambers,documentIds=[d['id'] for d in docs],searchQuery='"'+name+'" programa elecciones generales 29N 2026'))
 out=dict(schemaVersion=1,asOf='2026-11-26',scope='Todas las denominaciones de las personas proclamadas en el BOE, incluyendo variantes y coaliciones senatoriales. No son un recuento de partidos únicos.',method='Cruce exacto de candidaturas corregidas con referencias primarias identificadas; búsqueda web por nombre y convocatoria. No localizado expresa un límite de esta revisión, no prueba de ausencia.',entries=entries)
 (ROOT/'data/programme-directory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(len(entries),'denominaciones')
if __name__=='__main__':main()
