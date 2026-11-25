"""Extract first candidates to Congress from an official BOE HTML snapshot.
Usage: python import_candidates.py /tmp/boe.raw
Reproducible parser; corrections of 7/21 November are explicitly reconciled.
"""
import sys, re, json, html, hashlib
from pathlib import Path
from html.parser import HTMLParser
class Paragraphs(HTMLParser):
    def __init__(self):super().__init__();self.rows=[];self.current=None;self.parts=[]
    def handle_starttag(self, tag, attrs):
        if tag=='p':self.current=dict(attrs).get('class','');self.parts=[]
    def handle_data(self, data):
        if self.current is not None:self.parts.append(data)
    def handle_endtag(self, tag):
        if tag=='p' and self.current is not None:
            self.rows.append((self.current,re.sub(r'\s+',' ',''.join(self.parts)).strip()));self.current=None

def extract(raw):
    p=Paragraphs();p.feed(raw);province=None;chamber=False;party=None;heads=[]
    for cls,t in p.rows:
        if t.startswith('JUNTA ELECTORAL DE '):province=t.removeprefix('JUNTA ELECTORAL DE ').title();chamber=False;party=None
        if t=='CONGRESO DE LOS DIPUTADOS':chamber=True;party=None;continue
        if t in ['SENADO','SENADORES']:chamber=False;party=None
        if chamber and 'centro' in cls and re.match(r'^\d+\.\s',t):
            party=re.sub(r'^\d+\.\s*','',t);continue
        if chamber and province and party and re.match(r'^1\.\s',t):
            name=re.sub(r'^1\.\s*','',t).rstrip('.')
            if not name or name=='Suplentes:':continue
            heads.append(dict(province=province,party=party,name=name,order=1,source='https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23103',correction=None));party=None
    for x in heads:
        if x['province']=='La Rioja' and '(PCTE)' in x['party']:x['name']='Francisco Castro Portolés';x['correction']='BOE-A-2026-23383'
        if x['province']=='Navarra' and 'EUSKAL HERRIA BILDU' in x['party']:x['party']='EUSKAL HERRIA BILDU (EH BILDU)';x['correction']='BOE-A-2026-23383'
        if x['province']=='Tarragona' and x['name'].startswith('Ester Roca Domodel'):x['name']='Ester Roca Domedel';x['correction']='BOE-A-2026-23383'
        if x['province']=='Teruel' and 'Herminio Rufino Sancho' in x['name']:x['name']='Herminio Rufino Sancho Íñiguez';x['correction']='BOE-A-2026-23383'
    assert len({x['province'] for x in heads})==52, len({x['province'] for x in heads})
    assert len(heads)>400, len(heads)
    assert len({(x['province'],x['party']) for x in heads})==len(heads)
    return heads
if __name__=='__main__':
    raw=Path(sys.argv[1]).read_text();heads=extract(raw)
    out=Path(__file__).resolve().parents[1]/'data/candidates.json'
    out.write_text(json.dumps(dict(asOf='2026-11-25',scope='Cabezas de lista al Congreso de las 52 circunscripciones. No incluye Senado ni suplentes.',sourceSHA256=hashlib.sha256(raw.encode()).hexdigest(),corrections=['https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23383','https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24503'],candidates=heads),ensure_ascii=False,indent=2)+'\n')
    print(len(heads),'heads,',len({x['province'] for x in heads}),'constituencies')
