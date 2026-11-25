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
if __name__=='__main__':unittest.main()
