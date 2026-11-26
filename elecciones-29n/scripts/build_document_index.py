"""Build a non-expressive lexical page index of official documents.
Only alphabetically sorted term -> page mappings are published, never full text,
sentences or token positions. Programme positions remain manually evidenced.
"""
import concurrent.futures,datetime as dt,hashlib,json,re,subprocess,tempfile,unicodedata
from pathlib import Path
from monitor import fetch,extract_document,ROOT
STOP=set('para como este esta estos estas desde sobre entre hasta donde cuando porque aunque tambien todo toda todos todas cada mismo misma otros otras otras nuestro nuestra nosotros nuestras nuestros puede pueden debe deben sera seran fueron tiene tienen solo ellos ellas esto ello sino pero unos unas ante bajo tras cuyo cuya cual cuales cualquier mientras mediante tanto tanta tanto una uno que del las los con por una sin sus son mas hay muy nos les eso han ser'.split())
def words(text):
 text=''.join(c for c in unicodedata.normalize('NFD',text.lower()) if unicodedata.category(c)!='Mn')
 return {re.sub(r'(es|s)$','',w) for w in re.findall(r'[a-z]{3,35}',text) if w not in STOP and (len(w)>3 or w in {'iva','smi','ipc','irpf','otan','pau','pos','ue'})}
def build(doc,source):
 meta=dict(id=doc['id'],party=doc['party'],url=doc['url'],checked=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat())
 try:
  body,ctype,resolved=fetch(doc['url'],source['hosts']);text,mode=extract_document(body,ctype)
  if mode=='pdf-text':
   with tempfile.TemporaryDirectory() as tmp:
    file=Path(tmp)/'source.pdf';file.write_bytes(body);result=subprocess.run(['pdftotext','-layout',str(file),'-'],check=True,capture_output=True,timeout=45)
   pages=result.stdout.decode('utf-8','replace').split('\f')
   if not pages[-1].strip():pages.pop()
  else:pages=[text]
  terms={}
  for page,content in enumerate(pages,1):
   for word in sorted(words(content)):terms.setdefault(word,[]).append(page)
  meta.update(status='ok',sha256=hashlib.sha256(body).hexdigest(),extraction=mode,pageCount=len(pages),termCount=len(terms),path='data/document-index/'+doc['id']+'.json')
  (ROOT/meta['path']).write_text(json.dumps(dict(id=doc['id'],terms=terms),ensure_ascii=False,separators=(',',':'))+'\n')
 except Exception as e:meta.update(status='error',error=str(e)[:220])
 return meta
if __name__=='__main__':
 catalogue=json.loads((ROOT/'data/catalogue.json').read_text());sources={s['id']:s for s in json.loads((ROOT/'data/monitor-sources.json').read_text())};(ROOT/'data/document-index').mkdir(exist_ok=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:docs=list(pool.map(lambda d:build(d,sources[d['id']]),catalogue['documents']))
 index=dict(schemaVersion=1,asOf=dt.date.today().isoformat(),method='Índice léxico de términos únicos por página, sin frases, secuencias ni posiciones de palabras. Coincidencia textual no equivale a apoyo a una propuesta. HTML incluye navegación visible. PDF conserva número físico de página.',documents=docs)
 (ROOT/'data/document-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');print(sum(d['status']=='ok' for d in docs),'/',len(docs),'documentos indexados')
