# Antes de votar — observatorio electoral

Sitio estático para GitHub Pages. No necesita compilación, claves de API ni servicios externos en el navegador.

- `index.html`, `styles.css`, `app.js`: interfaz, accesibilidad y lógica.
- `data/catalogue.json`: documentos primarios, 40 preguntas y posiciones editoriales.
- `data/candidates.json`: cabezas de lista al Congreso, BOE y correcciones.
- `data/legacy-audit.json`: inventario de afirmaciones retiradas de la versión anterior.
- `data/monitor-sources.json`: fuentes permitidas para el seguimiento.
- `noticias.json`: comprobaciones, últimas lecturas correctas, noticias y diferencias documentales.
- `scripts/monitor.py`: monitor estándar Python y Poppler.
- `scripts/import_candidates.py`: importador reproducible del BOE.
- `tests/`: regresiones del cálculo y del seguimiento.
- `AUDITORIA.md`: alcance, resultados y limitaciones.

## Validación

```bash
node --check elecciones-29n/app.js
node --test elecciones-29n/tests/core.test.cjs
python3 -m unittest discover -s elecciones-29n/tests -p 'test_*.py' -v
python3 elecciones-29n/scripts/monitor.py
```

## Política editorial

Una nueva medida necesita fuente primaria, localizador y fecha. No trasladar propuestas de otras elecciones. No asignar rechazo por silencio. Las diferencias de archivo y texto no acreditan por sí mismas un cambio político: para publicar `verified-change` hacen falta dos originales, sus referencias y una comparación editorial revisada. Los programas políticos no institucionales y las posiciones con alcance distinto se distinguen y no puntúan.

El monitor no modifica automáticamente el catálogo o el test. La comparación común usa solo las preguntas respondidas con postura inequívoca en todas las formaciones elegidas. No se declara un ganador global sobre bases desiguales.
