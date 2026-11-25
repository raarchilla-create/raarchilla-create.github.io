"""Daily primary-source monitoring. Does not invent news or infer political reversals.
Standard library + pdftotext. Atomic JSON output; network failures keep last success.
"""
from __future__ import annotations
import concurrent.futures, datetime as dt, hashlib, html, json, os, re, subprocess, tempfile, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
MAX_BYTES=80_000_000
USER_AGENT='ElectoralObservatory/1.0 (+https://raarchilla-create.github.io/elecciones-29n/)'
class VisibleText(HTMLParser):
    def __init__(self):super().__init__();self.skip=0;self.parts=[];self.feeds=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ('script','style','noscript'):self.skip+=1
        if tag=='link' and 'alternate' in a.get('rel','') and any(t in a.get('type','') for t in ['rss','atom']):self.feeds.append(a.get('href',''))
    def handle_endtag(self,tag):
        if tag in ('script','style','noscript'):self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip and data.strip():self.parts.append(data.strip())
def normalized_html(body):
    p=VisibleText();p.feed(body.decode('utf-8','replace'));return re.sub(r'\s+',' ',' '.join(p.parts)).strip(),p.feeds

def allowed(url,hosts):
    u=urllib.parse.urlsplit(url)
    return u.scheme=='https' and not u.username and not u.password and u.port in (None,443) and any(u.hostname==h or u.hostname.endswith('.'+h) for h in hosts)
class Redirects(urllib.request.HTTPRedirectHandler):
    def __init__(self,hosts):self.hosts=hosts
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not allowed(newurl,self.hosts):raise ValueError('Redirección fuera del dominio oficial permitido')
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def fetch(url,hosts):
    if not allowed(url,hosts):raise ValueError('URL fuera del dominio oficial permitido')
    req=urllib.request.Request(url,headers={'User-Agent':USER_AGENT,'Accept':'application/pdf,text/html,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.5'})
    with urllib.request.build_opener(Redirects(hosts)).open(req,timeout=18) as r:
        body=r.read(MAX_BYTES+1)
        if len(body)>MAX_BYTES:raise ValueError('Documento superior a 80 MB')
        return body, r.headers.get('Content-Type',''),r.geturl()
def extract_document(body,ctype):
    if body.startswith(b'%PDF'):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'document.pdf';p.write_bytes(body)
            r=subprocess.run(['pdftotext',str(p),'-'],capture_output=True,timeout=35,check=True)
            text=re.sub(r'\s+',' ',r.stdout.decode('utf-8','replace')).strip()
        if len(text)<100:raise ValueError('PDF sin texto suficiente; necesita OCR o revisión')
        return text,'pdf-text'
    if 'pdf' in ctype.lower():raise ValueError('La respuesta declara PDF pero no contiene un PDF')
    text,_=normalized_html(body)
    if len(text)<150 or any(x in text[:2000].lower() for x in ['access denied','enable javascript and cookies','verify you are human','just a moment','incapsula','captcha']):raise ValueError('Respuesta bloqueada o sin contenido verificable')
    return text,'html-text'
def clean_title(s):
    # A feed title is quoted metadata, not independently confirmed news.
    return ' '.join(html.unescape(re.sub('<[^>]+>',' ',s)).split())[:220]
def rss_entries(body,party,hosts,now):
    root=ET.fromstring(body);out=[]
    for item in list(root.findall('.//item'))+list(root.findall('.//{http://www.w3.org/2005/Atom}entry')):
        def txt(key):return (item.findtext(key) or item.findtext('{http://www.w3.org/2005/Atom}'+key) or '').strip()
        title=clean_title(txt('title'));url=txt('link')
        if not url:
            el=item.find('{http://www.w3.org/2005/Atom}link');url=el.get('href','') if el is not None else ''
        if not title or not allowed(url,hosts):continue
        if not re.search(r'program|propuest|electoral|29.?n|medida|compromis',title,re.I):continue
        pub=txt('pubDate') or txt('published') or txt('updated')
        out.append(dict(id='news-'+hashlib.sha256(url.encode()).hexdigest()[:20],party=party,type='official-news',date=now[:10],sourcePublished=pub or None,title=title,url=url,context='Titular emitido por la formación. No es una verificación independiente ni acredita un cambio de programa. Fecha mostrada: incorporación al observatorio.'))
    return out[:3]
def load(path,default):
    try:return json.loads(path.read_text())
    except (FileNotFoundError,json.JSONDecodeError):return default

def check(source,previous,now):
    state=dict(previous);state.update(id=source['id'],party=source['party'],url=source['url'],lastAttempt=now)
    events=[];hosts=source['hosts']
    try:
        body,ctype,url=fetch(source['url'],hosts)
        if source['kind']=='feed':
            entries=rss_entries(body,source['party'],hosts,now)
            state.update(status='ok',error=None,lastSuccess=now,entryCount=len(entries));return state,entries
        text,mode=extract_document(body,ctype);digest=hashlib.sha256(text.encode()).hexdigest();binary=hashlib.sha256(body).hexdigest()
        old=state.get('textSHA256');oldbinary=state.get('sha256')
        if old and old!=digest:
            events.append(dict(id='version-'+source['id']+'-'+digest[:16],party=source['party'],type='document-change',date=now[:10],title='Nueva versión detectada en una fuente oficial',url=source['url'],context='Cambió el texto extraído. Puede deberse a edición, navegación o contenido; no se etiqueta como giro político. Huella anterior: '+old+'. Nueva: '+digest+'. Requiere comparación editorial antes de alterar posiciones.'))
        elif oldbinary and oldbinary!=binary and old==digest:
            events.append(dict(id='format-'+source['id']+'-'+binary[:16],party=source['party'],type='document-change',date=now[:10],title='Cambió el archivo; texto extraído estable',url=source['url'],context='Diferencia binaria sin cambio en texto normalizado. No demuestra una modificación programática.'))
        state.update(status='ok',error=None,lastSuccess=now,textSHA256=digest,sha256=binary,extraction=mode,bytes=len(body),resolvedUrl=url)
    except Exception as e:
        state.update(status='error',error=str(e)[:220])
    return state,events

def main():
    if os.environ.get('GITHUB_EVENT_NAME')=='schedule' and dt.datetime.now(ZoneInfo('Europe/Madrid')).hour!=8:
        print('Ventana alternativa omitida; no son las 08:00 en Madrid.');return
    sources=load(ROOT/'data/monitor-sources.json',[])
    old=load(ROOT/'noticias.json',{'entries':[],'health':[]});previous={s['id']:s for s in old.get('health',[])}
    now=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(lambda s:check(s,previous.get(s['id'],{}),now),sources))
    states=[r[0] for r in results];events={e['id']:e for e in old.get('entries',[])}
    for _,es in results:
        for e in es:events.setdefault(e['id'],e)
    entries=sorted(events.values(),key=lambda e:(e['date'],e['id']),reverse=True)[:500]
    ok=sum(s['status']=='ok' for s in states)
    result=dict(schemaVersion=1,lastChecked=now,note=f'{ok}/{len(states)} fuentes descargadas correctamente. Un fallo no significa ausencia de cambios. Primera descarga válida: línea de base; cambios posteriores: versiones, no conclusiones políticas.',entries=entries,health=states)
    target=ROOT/'noticias.json';tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');tmp.replace(target)
    print(f'{ok}/{len(states)} fuentes accesibles; {len(entries)} entradas conservadas')
    if not ok:raise SystemExit('Ninguna fuente accesible; se ha publicado el fallo sin alterar las últimas huellas correctas.')
if __name__=='__main__':main()
