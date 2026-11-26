import importlib.util,unittest,json,tempfile
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('monitor',Path(__file__).resolve().parents[1]/'scripts/monitor.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class MonitorTests(unittest.TestCase):
 def test_allowlist(self):
  self.assertTrue(m.allowed('https://www.pp.es/feed/',['pp.es']))
  for url in ['http://pp.es','https://pp.es.evil.test','https://localhost','https://127.0.0.1','https://user:pass@pp.es','https://pp.es:8080/feed']:
   self.assertFalse(m.allowed(url,['pp.es']))
 def test_blockpage_not_success(self):
  for body,typ in [(b'<html>Access denied</html>','text/html'),(b'<html>not pdf</html>','application/pdf'),(b'<script src="/_Incapsula_Resource"></script>','text/html')]:
   with self.assertRaises(ValueError):m.extract_document(body,typ)
 def test_failed_fetch_keeps_last_good_hash(self):
  old={'textSHA256':'abc','lastSuccess':'2026-11-24'};fetch=m.fetch
  try:
   m.fetch=lambda *args:(_ for _ in ()).throw(ValueError('HTTP 403'))
   status,events=m.check({'id':'pp','party':'PP','url':'https://pp.es','hosts':['pp.es'],'kind':'document'},old,'2026-11-25')
   self.assertEqual(status['status'],'error');self.assertEqual(status['textSHA256'],'abc');self.assertEqual(status['lastSuccess'],'2026-11-24');self.assertEqual(events,[])
  finally:m.fetch=fetch
 def test_change_is_not_political_reversal(self):
  fetch=m.fetch
  try:
   m.fetch=lambda *args:(('<html><article>'+('Una propuesta oficial con texto suficiente. '*15)+'</article></html>').encode(),'text/html','https://pp.es')
   status,events=m.check({'id':'pp','party':'PP','url':'https://pp.es','hosts':['pp.es'],'kind':'document'},{'textSHA256':'previous'},'2026-11-25')
   self.assertEqual(status['status'],'ok');self.assertEqual(events[0]['type'],'document-change');self.assertIn('no se etiqueta como giro político',events[0]['context'])
  finally:m.fetch=fetch
 def test_first_fetch_not_a_change(self):
  fetch=m.fetch
  try:
   m.fetch=lambda *args:(('<html><p>'+('Programa oficial. '*20)+'</p></html>').encode(),'text/html','https://pp.es')
   state,events=m.check({'id':'pp','party':'PP','url':'https://pp.es','hosts':['pp.es'],'kind':'document'},{},'2026-11-25');self.assertEqual(events,[])
  finally:m.fetch=fetch
 def test_feed_filters_external_links(self):
  xml=b'<rss><channel><item><title>Programa 29N</title><link>https://pp.es/programa</link></item><item><title>Programa</title><link>https://evil.test/a</link></item></channel></rss>'
  self.assertEqual(len(m.rss_entries(xml,'PP',['pp.es'],'2026-11-25')),1)
 def test_monitor_keeps_editorial_review(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'data').mkdir()
   (root/'data/monitor-sources.json').write_text(json.dumps([{'id':'official'}]))
   (root/'noticias.json').write_text(json.dumps({'editorialChecked':'2026-11-25','editorialNote':'Dos originales contrastados','entries':[],'health':[]}))
   with patch.object(m,'ROOT',root),patch.object(m,'check',return_value=({'id':'official','status':'ok'},[])),patch.dict(m.os.environ,{'GITHUB_EVENT_NAME':'workflow_dispatch'}):m.main()
   result=json.loads((root/'noticias.json').read_text())
   self.assertEqual(result['editorialChecked'],'2026-11-25');self.assertEqual(result['editorialNote'],'Dos originales contrastados');self.assertEqual(len(result['health']),1)
 def test_publication_dates_are_not_observation_dates(self):
  for raw in ['Wed, 25 Nov 2026 10:00:00 +0000','25 NOV, 2026','25 de novembre de 2026','25/nov./26','2026-11-25T10:00:00Z']:
   self.assertEqual(m.publication_date(raw),'2026-11-25',raw)
  self.assertIsNone(m.publication_date('32 de noviembre de 2026'))
  e=m.news_entry('https://pp.es/articulo','Una propuesta','PP','2026-11-25T10:00:00Z')
  self.assertEqual(e['dateType'],'observed');self.assertIsNone(e['sourcePublished']);self.assertIn('no publicación',e['context'])
 def test_feed_keeps_actual_publication_date(self):
  xml=b'<rss><channel><item><title>Programa electoral</title><link>https://pp.es/programa</link><pubDate>Mon, 09 Nov 2026 10:00:00 +0000</pubDate></item></channel></rss>'
  e=m.rss_entries(xml,'PP',['pp.es'],'2026-11-25T10:00:00Z')[0]
  self.assertEqual(e['date'],'2026-11-09');self.assertEqual(e['dateType'],'published');self.assertEqual(e['observedAt'],'2026-11-25T10:00:00Z')
  with self.assertRaises(ValueError):m.rss_entries(b'<html><body>not a feed</body></html>','PP',['pp.es'],'2026-11-25')
 def test_html_news_dates_and_official_hosts(self):
  body=b'<main><article><time datetime="2026-11-20">20 noviembre</time><h3><a href="/actualidad/propuesta">Nueva propuesta electoral sobre vivienda</a></h3></article><article><h3><a href="https://evil.test/a">Programa electoral falso en otro dominio</a></h3></article><article><h3><a href="/actualidad/salario">Nueva propuesta de subida del salario minimo</a></h3></article></main>'
  entries=m.html_entries(body,'PP',['pp.es'],'2026-11-25T10:00:00Z','https://pp.es/actualidad/')
  self.assertEqual(len(entries),2);self.assertEqual(entries[0]['date'],'2026-11-20');self.assertEqual(entries[1]['dateType'],'observed')
 def test_html_does_not_borrow_date_from_another_article(self):
  body=b'<main><section><article><time datetime="2026-11-20"></time><h3><a href="/uno">Una propuesta electoral con fecha correcta</a></h3></article><article><h3><a href="/dos">Otra propuesta electoral sin fecha acreditada</a></h3></article></section></main>'
  entries=m.html_entries(body,'PP',['pp.es'],'2026-11-25T10:00:00Z','https://pp.es/')
  self.assertEqual(entries[0]['sourcePublished'],'2026-11-20');self.assertIsNone(entries[1]['sourcePublished'])
 def test_malformed_url_is_rejected(self):
  for url in ['https://pp.es:bad','https://[invalid','https:///missing']:
   self.assertFalse(m.allowed(url,['pp.es']))
 def test_changed_endpoint_starts_new_baseline(self):
  body=('<html><p>'+('Programa oficial. '*20)+'</p></html>').encode()
  source={'id':'moved','party':'PP','url':'https://pp.es/new','hosts':['pp.es'],'kind':'document'}
  previous={'url':'https://pp.es/old','textSHA256':'old-hash','sha256':'old-binary','lastSuccess':'2026-11-24'}
  with patch.object(m,'fetch',return_value=(body,'text/html',source['url'])):state,entries=m.check(source,previous,'2026-11-25')
  self.assertEqual(entries,[]);self.assertEqual(state['previousEndpoint']['textSHA256'],'old-hash');self.assertEqual(state['url'],'https://pp.es/new');self.assertEqual(state['lastSuccess'],'2026-11-25')
 def test_news_updates_keep_first_observation(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'data').mkdir();(root/'data/monitor-sources.json').write_text(json.dumps([{'id':'official'}]))
   old=m.news_entry('https://pp.es/propuesta','Una propuesta','PP','2026-11-24T10:00:00Z')
   (root/'noticias.json').write_text(json.dumps({'entries':[old],'health':[]}))
   current=m.news_entry('https://pp.es/propuesta','Una propuesta','PP','2026-11-25T10:00:00Z','2026-11-20')
   with patch.object(m,'ROOT',root),patch.object(m,'check',return_value=({'id':'official','status':'ok'},[current])),patch.dict(m.os.environ,{'GITHUB_EVENT_NAME':'workflow_dispatch'}):m.main()
   e=json.loads((root/'noticias.json').read_text())['entries'][0]
   self.assertEqual(e['observedAt'],'2026-11-24T10:00:00Z');self.assertEqual(e['date'],'2026-11-20');self.assertEqual(e['dateType'],'published')
if __name__=='__main__':unittest.main()
