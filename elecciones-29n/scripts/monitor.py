"""Daily primary-source monitoring. Does not invent news or infer political reversals.
Standard library + pdftotext. Atomic JSON output; network failures keep last success.
"""
from __future__ import annotations
import concurrent.futures, datetime as dt, hashlib, html, json, os, re, subprocess, tempfile, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
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
    try:
        u=urllib.parse.urlsplit(url)
        return u.scheme=='https' and bool(u.hostname) and not u.username and not u.password and u.port in (None,443) and any(u.hostname==h or u.hostname.endswith('.'+h) for h in hosts)
    except (ValueError,TypeError):return False
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
RELEVANT=re.compile(r'program|propuest|propos|electoral|29[ -]?n|medida|comprom[íi]s|plante|aut[oó]nom|pensi[oó]n|viv[iie]enda|habitatge|lloguer|salari|impuest|fiscal|jornada|sanidad|sanitat|educaci[oó]|cuidados|energia|energ[ií]a|renovabl|nuclear|transport|beca|cotiz|regulari|derech|drets|vivienda|traball|laborai|ferrocarr|rodali|finan[çcz]|eleccions|hauteskunde|eskubide|etxebiz|pentsio|soldata|proposamen|lanaldi|osasun|hezkuntza|garraio|fiskal',re.I)
MONTHS={k:i for i,words in enumerate(['enero xaneiro gener january','febrero febreiro febrer february','marzo marzo març march','abril abril april','mayo maio maig may','junio xuño juny june','julio xullo juliol july','agosto agosto agost august','septiembre setembro setembre september','octubre outubro october','noviembre novembro novembre november','diciembre decembro desembre december'],1) for k in words.split()}
def publication_date(value):
    """Return a validated calendar date, never substitute observation for publication."""
    if not value:return None
    value=html.unescape(str(value)).strip()
    iso=re.search(r'(?<!\d)(20\d{2})[-/](\d{1,2})[-/](\d{1,2})(?!\d)',value)
    try:
        if iso:return dt.date(*map(int,iso.groups())).isoformat()
        rfc=parsedate_to_datetime(value)
        return rfc.date().isoformat()
    except (ValueError,TypeError,OverflowError):pass
    numeric=re.search(r'(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|\d{2})(?!\d)',value)
    if numeric:
        d,m,y=map(int,numeric.groups());y=2000+y if y<100 else y
        try:return dt.date(y,m,d).isoformat()
        except ValueError:return None
    text=value.lower().replace('.', '').replace('/', ' ').replace(',', '')
    words=re.search(r"(\d{1,2})\s*(?:de |d[’']|d[e’'] )?([a-zà-ü]+)\s*(?:de )?(20\d{2}|\d{2})",text)
    if words:
        d,mon,y=words.groups();y=int(y);y=2000+y if y<100 else y
        month=MONTHS.get(mon) or next((n for name,n in MONTHS.items() if name.startswith(mon) and len(mon)>=3),None)
        try:return dt.date(y,month,int(d)).isoformat() if month else None
        except ValueError:return None
    return None

def news_entry(url,title,party,now,published=None):
    pub=publication_date(published)
    # A malformed or future timestamp is never allowed to masquerade as publication.
    if pub and pub>now[:10]:pub=None
    context='Titular emitido por la formación. No es una verificación independiente ni acredita un cambio de programa. '
    context+=('Fecha de publicación indicada por la fuente.' if pub else 'La fuente no ofrece una fecha de publicación verificable. Fecha mostrada: primera observación en el observatorio, no publicación.')
    return dict(id='news-'+hashlib.sha256(url.encode()).hexdigest()[:20],party=party,type='official-news',date=pub or now[:10],dateType='published' if pub else 'observed',sourcePublished=pub,observedAt=now,title=title,url=url,context=context)

def rss_entries(body,party,hosts,now):
    root=ET.fromstring(body);out=[]
    # A successful HTML homepage is not a successful feed.
    if root.tag.split('}')[-1] not in ('rss','feed','RDF'):raise ValueError('La respuesta no es un canal RSS/Atom válido')
    for item in list(root.findall('.//item'))+list(root.findall('.//{http://www.w3.org/2005/Atom}entry')):
        def txt(key):return (item.findtext(key) or item.findtext('{http://www.w3.org/2005/Atom}'+key) or '').strip()
        title=clean_title(txt('title'));url=txt('link')
        if not url:
            el=item.find('{http://www.w3.org/2005/Atom}link');url=el.get('href','') if el is not None else ''
        if not title or not allowed(url,hosts) or not RELEVANT.search(title):continue
        pub=txt('pubDate') or txt('published') or txt('updated')
        out.append(news_entry(url,title,party,now,pub))
    return out[:5]

class NewsNode:
    def __init__(self,tag='',attrs=None,parent=None):self.tag=tag;self.attrs=attrs or {};self.parent=parent;self.children=[];self.parts=[]
    def text(self):return ' '.join(' '.join(self.parts).split())
    def descend(self):
        yield self
        for child in self.children:yield from child.descend()
class NewsHTML(HTMLParser):
    """A bounded read-only tree: retain headings, links and local date metadata."""
    VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
    def __init__(self):super().__init__();self.root=NewsNode();self.current=self.root;self.skip=0;self.nodes=0
    def handle_starttag(self,tag,attrs):
        self.nodes+=1
        if self.nodes>40000:raise ValueError('Página HTML excesivamente compleja')
        node=NewsNode(tag,dict(attrs),self.current);self.current.children.append(node)
        if tag not in self.VOID:self.current=node
    def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.handle_endtag(tag)
    def handle_endtag(self,tag):
        node=self.current
        while node is not self.root:
            if node.tag==tag:self.current=node.parent;return
            node=node.parent
    def handle_data(self,text):
        node=self.current
        if node.tag in ('script','style','noscript'):return
        while node is not None:node.parts.append(text);node=node.parent

def html_entries(body,party,hosts,now,base_url,link_pattern=None):
    parser=NewsHTML();parser.feed(body.decode('utf-8','replace'));out={}
    for anchor in parser.root.descend():
        if anchor.tag!='a':continue
        href=anchor.attrs.get('href','');url=urllib.parse.urljoin(base_url,href)
        if not href or href.startswith('#') or '{' in href or not allowed(url,hosts):continue
        # Only actual article paths, never image/document downloads, menus or pagination.
        u=urllib.parse.urlsplit(url);url=urllib.parse.urlunsplit((u.scheme,u.netloc,u.path,u.query,''))
        if link_pattern and not re.search(link_pattern,u.path):continue
        if re.search(r'\.(?:pdf|jpg|png|zip|svg)$',u.path,re.I) or re.search(r'/(?:tag|tags|category|categorias|page|autor)/',u.path):continue
        if u.path.rstrip('/')==urllib.parse.urlsplit(base_url).path.rstrip('/'):continue
        heading=next((n for n in anchor.descend() if n.tag in ('h1','h2','h3','h4','h5')),None)
        ancestor=anchor.parent
        while ancestor and ancestor is not parser.root and ancestor.tag not in ('h1','h2','h3','h4','h5','article','nav','header','footer'):ancestor=ancestor.parent
        if not heading and (not ancestor or ancestor.tag not in ('h1','h2','h3','h4','h5')):continue
        if ancestor and ancestor.tag in ('nav','header','footer'):continue
        title=clean_title((heading or anchor).text())
        if len(title)<25 or not RELEVANT.search(title):continue
        # The nearest small content block may contain a date for this one headline.
        node=heading or anchor;published=None
        for _ in range(5):
            if not node or node is parser.root:break
            text=node.text()
            headlines=[n for n in node.descend() if n.tag in ('h1','h2','h3','h4','h5') and len(n.text())>20]
            if len(headlines)>1 or len(text)>3000:break
            for n in node.descend():
                if n.tag=='time':published=publication_date(n.attrs.get('datetime') or n.text())
                elif n.tag=='meta' and n.attrs.get('itemprop')=='datePublished':published=publication_date(n.attrs.get('content'))
                if published:break
            if not published:published=publication_date(text)
            if published:break
            node=node.parent
        # Date encoded in a canonical article slug is accepted only in unambiguous YYYYMMDD form.
        if not published:
            slugdate=re.search(r'(20\d{2})([01]\d)([0-3]\d)(?:[0-2]\d[0-5]\d[0-5]\d)?(?:\D|$)',u.path)
            if slugdate:published=publication_date('-'.join(slugdate.groups()))
        out.setdefault(url,news_entry(url,title,party,now,published))
    return list(out.values())[:5]

def load(path,default):
    try:return json.loads(path.read_text())
    except (FileNotFoundError,json.JSONDecodeError):return default

def check(source,previous,now):
    state=dict(previous)
    if previous.get('url') and previous['url']!=source['url']:
        state=dict(previousEndpoint={k:previous[k] for k in ('url','lastSuccess','textSHA256','sha256','status') if k in previous},endpointChangedAt=now)
    state.update(id=source['id'],party=source['party'],url=source['url'],kind=source['kind'],lastAttempt=now)
    events=[];hosts=source['hosts']
    try:
        body,ctype,url=fetch(source['url'],hosts)
        if source['kind'] in ('feed','news-html'):
            if source['kind']=='feed':entries=rss_entries(body,source['party'],hosts,now)
            else:
                extract_document(body,ctype)
                entries=html_entries(body,source['party'],hosts,now,url,source.get('linkPattern'))
            for entry in entries:
                if source.get('scope'):
                    entry['scope']=source['scope'];entry['context']+=' '+source.get('note','')
            state.update(status='ok',error=None,lastSuccess=now,entryCount=len(entries),resolvedUrl=url,extraction=source['kind'],bytes=len(body),note=((source.get('note','')+' Descarga válida; ningún titular pertinente extraído. No acredita ausencia de novedades.').strip() if not entries else 'Titulares de la formación, sin verificación independiente.'));return state,entries
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
    # Correct legacy dates: an observation date is never a publication date.
    for e in events.values():
        if e.get('type')=='official-news' and 'dateType' not in e:
            pub=publication_date(e.get('sourcePublished'))
            e.update(dateType='published' if pub else 'observed',observedAt=e.get('date'),sourcePublished=pub)
            if pub:e['date']=pub
            e['context']=news_entry(e.get('url',''),e.get('title',''),e.get('party',''),now,pub)['context']
    for _,es in results:
        for e in es:
            if e['id'] not in events:events[e['id']]=e
            elif e.get('type')=='official-news':
                before=events[e['id']];first=before.get('observedAt') or before.get('date')
                if e['dateType']=='observed':
                    if before.get('dateType')=='published' and before.get('sourcePublished'):
                        e.update(date=before['date'],sourcePublished=before['sourcePublished'],dateType='published',context=before['context'])
                    else:e['date']=first[:10]
                e['observedAt']=first;events[e['id']]=e
    entries=sorted(events.values(),key=lambda e:(e['date'],e['id']),reverse=True)[:500]
    ok=sum(s['status']=='ok' for s in states)
    result=dict(schemaVersion=1,lastChecked=now,note=f'{ok}/{len(states)} fuentes descargadas correctamente. Un fallo no significa ausencia de cambios. Primera descarga válida: línea de base; cambios posteriores: versiones, no conclusiones políticas.',entries=entries,health=states)
    for field in ('editorialChecked','editorialNote'):
        if field in old:result[field]=old[field]
    target=ROOT/'noticias.json';tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');tmp.replace(target)
    print(f'{ok}/{len(states)} fuentes accesibles; {len(entries)} entradas conservadas')
    if not ok:raise SystemExit('Ninguna fuente accesible; se ha publicado el fallo sin alterar las últimas huellas correctas.')
if __name__=='__main__':main()
