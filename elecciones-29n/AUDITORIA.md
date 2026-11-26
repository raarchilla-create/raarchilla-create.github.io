# Auditoría del observatorio · edición 26/11/2026

Repositorio: `raarchilla-create/raarchilla-create.github.io`, directorio `elecciones-29n`.

## Alcance real

| Elemento | Cobertura incorporada |
|---|---|
| Documentos primarios enlazados | 49, de 40 formaciones o referencias políticas |
| Medidas resumidas y localizadas | 331; se indican condiciones y comparabilidad |
| Texto de documentos íntegros | Índice léxico por páginas de 47 documentos descargados: 1.640 páginas PDF/web; 2 descargas bloqueadas |
| Test | 40 preguntas; comparación documental, desglose temático y base común para 2–3 formaciones |
| Análisis | 40 análisis económicos y jurídicos específicos, 12 escenarios con supuestos explícitos |
| Denominaciones oficiales | 121, incluidas variantes territoriales y coaliciones: no son 121 partidos distintos |
| Personas proclamadas | 7.597 registros: 5.197 Congreso y 2.400 Senado, incluyendo suplentes |
| Titulares y suplentes | Congreso: 3.820 titulares y 1.377 suplentes; Senado: 802 titulares y 1.598 suplentes |
| Circunscripciones | 52 al Congreso y 60 al Senado, con las islas separadas |
| Fichas de referencia | 40; 22 incluyen trayectoria biográfica primaria verificada, las restantes acreditan proclamación y criterio de selección |
| Seguimiento técnico | 77 fuentes; última ejecución local: 73 accesibles y 4 incidencias |

Las cifras corresponden a esta edición y no son una valoración de las formaciones. La disponibilidad de fuentes puede variar: la web publica el último estado efectivo y no fija artificialmente el éxito.

## Convocatoria y corrección de información anterior

La fecha se contrastó en BOE-A-2026-20742, Real Decreto 806/2026, artículo 2, y en la ficha electoral de la Junta Electoral Central. Enlaces:

- https://www.boe.es/eli/es/rd/2026/10/05/806
- https://www.juntaelectoralcentral.es/cs/Satellite?c=JECEleccion_C&childpagename=JEC/JEC_Layout&cid=1408442446868&packedargs=apartado%3Dinfogeneral&pagename=jec/wrapper/JEC_Wrapper

Se inventariaron y retiraron del corpus activo las 52 afirmaciones programáticas anteriores, conservadas con su procedencia en `data/legacy-audit.json`. Retirada no significa falsedad demostrada: se evitó trasladarlas sin releer una fuente primaria. Se eliminaron los recuentos no auditados de 37 entradas, seis sin publicar, once cambios, 67 partidos y 9.132 medidas, además de biografías y series históricas sin trazabilidad individual.

## Registro oficial completo

La extracción procede de BOE-A-2026-23103 y se reconcilia con BOE-A-2026-23383 y BOE-A-2026-24503. El importador contempla listas, suplentes del Congreso, suplencias vinculadas a titulares del Senado, circunscripciones insulares y listas expresamente no proclamadas (32 exclusiones).

Se aplican, entre otras, las correcciones de nombres y listas de Ávila, Girona, Huesca, La Rioja, Navarra, Tarragona, Teruel y Valencia. La rectificación del 21 de noviembre afecta al presidente de la junta de Burgos, no a la relación de candidatos. En Valladolid se identifican titulares que el BOE imprime sin ordinal: el orden de lectura se distingue de un número impreso. En Ceuta se admite «Suplente:» singular y se conserva la vinculación a cada titular.

`data/candidacies.json` contiene el índice y `data/candidacies/*.json` los archivos por provincia. La interfaz descarga las provincias solicitadas y pagina en grupos de 60; la búsqueda global consulta los 52 archivos. Los 534 cabezas de lista al Congreso se mantienen también en un archivo separado reproducible.

## Programas, buscador y neutralidad

Cada ficha de medida incluye fuente primaria, localizador, fecha de lectura y dirección codificada. Programas completos, compromisos parciales, presentaciones, programas permanentes y publicaciones políticas generales se identifican por separado. Una coincidencia temática o un documento general no se convierte automáticamente en posición electoral comparable. Las denominaciones territoriales y coaliciones conservan su nombre oficial; no se les atribuye automáticamente el programa de un socio. La falta de un documento localizable no demuestra que no exista.

El buscador de fichas reconoce acentos, errores pequeños y sinónimos. En consultas delimitadas distingue dirección solicitada y mera relación temática. Oponerse a una subida del SMI no se presenta como proponer bajar sueldos. La lectura del original y sus condiciones sigue siendo necesaria.

La búsqueda ampliada consulta índices léxicos de los documentos íntegros descargables. Publica términos únicos ordenados alfabéticamente y páginas: no frases, secuencias ni posiciones de palabras del texto original. Recupera referencias de temas ajenos al test, como agricultura. No interpreta una mención como compromiso ni afecta al cálculo de afinidad. El HTML puede incluir navegación visible; las páginas PDF son números físicos, que pueden diferir de su numeración impresa. Las fuentes que impiden una descarga completa no se presentan como indexadas.

El test excluye «Depende», saltos, silencios, duplicados y evidencias contradictorias. Las posiciones de alcance distinto no puntúan. Cada pregunta cuenta una vez. El desglose temático conserva los mismos resultados. Las comparaciones entre 2–3 formaciones usan exactamente las mismas preguntas respondidas y documentadas en todas ellas. No se declara un ganador general sobre coberturas diferentes ni se presenta como recomendación de voto o test psicométrico validado.

No se envían respuestas, no hay cuentas, rastreadores ni almacenamiento de opiniones políticas. Exportar crea un JSON en el dispositivo con respuestas, preguntas, documentos y medidas; borrar y repetir elimina el estado en memoria.

## Economía, derecho y perfiles

Los 40 análisis distinguen mecanismos, instrumentos, administraciones competentes e incertidumbres concretas, con fuentes normativas y localizadores. Los 12 escenarios son ejercicios condicionados a supuestos visibles, no presupuestos de las formaciones ni previsiones macroeconómicas. Se separa coste por hora de coste total, inversión de gasto recurrente, prestación bruta de coste neto y propuesta de norma vigente. No se declara constitucionalidad o inconstitucionalidad sin dictamen.

Las fichas biográficas solo usan hechos atribuidos a fuentes primarias. Se distingue una trayectoria histórica de un cargo futuro. Los accesos limitados a algunas fichas institucionales se indican. Las referencias sin biografía contrastada contienen datos reales de proclamación y explican cómo se escogió esa referencia; no se inventan profesiones ni liderazgo nacional. El registro completo de personas no se confunde con el conjunto de biografías disponibles.

## Seguimiento diario

GitHub Actions ejecuta ventanas a las 06:00 y 07:00 UTC y selecciona las 08:00 Europe/Madrid. El horario puede retrasarse por disponibilidad de GitHub. Se comprueban documentos, canales RSS y páginas reales de actualidad. No se mantienen como fuentes de noticias los RSS inexistentes supuestos por una convención `/feed/`.

El monitor valida dominios y redirecciones, tipo y contenido de la respuesta, bloqueos, falsos PDF y límites de tamaño. Conserva huellas y últimas lecturas correctas. Un cambio de URL de un canal inicia una línea de base nueva, no un giro político. Un HTML accesible sin titulares extraíbles lo señala expresamente.

Se distinguen fecha de publicación y fecha de observación. Las noticias sin fecha verificable no se fechan como si se hubieran publicado ese día. Las noticias procedentes de un emisor oficial se atribuyen a ese emisor; no constituyen confirmación independiente de sus afirmaciones. Los cambios de archivo o texto no se etiquetan como cambios de promesas. Para `verified-change` se exigen dos originales y una comparación editorial revisada.

La revisión editorial diaria existente se actualizó para leer los nuevos esquemas y preservar trazabilidad. La automatización técnica conserva `editorialChecked` y `editorialNote` y no modifica posiciones del test. El índice léxico se regenera con el mismo workflow. Las actualizaciones se publican atómicamente y se solicita reconstrucción de GitHub Pages después del commit automático.

## Pruebas observadas

31 casos automatizados pasan: 17 de Node y 14 de Python. Cubren integridad de las 40 preguntas y fuentes, direcciones, silencios, denominadores comunes, duplicados, contradicciones, consulta y sinónimos, intención de búsqueda, protocolos, investidura, candidaturas, suplencias, listas corregidas, directorio, perfiles, análisis, índices de páginas, dominios permitidos, errores, cambios de endpoint y fechas de noticias. Comandos:

```bash
node --check elecciones-29n/app.js
node --test elecciones-29n/tests/*.test.cjs
python3 -m unittest discover -s elecciones-29n/tests -p 'test_*.py' -v
```

En Chrome se comprobaron panorama; comparador de tres por pensiones; búsqueda de cuotas (31 fichas, 12 en la dirección identificada); agricultura en los documentos completos (27 documentos con coincidencias); cuestionario de 40 respuestas mixtas, 40 desgloses temáticos y descarga JSON (40 respuestas, 49 documentos, 331 medidas); filtros y carga global de 7.597 registros; Ceuta y Valladolid; separación de la coalición Menorca al Senat; perfiles; escenarios económicos; estado de 77 fuentes; auditoría y rechazo de una investidura de 351 votos.

Se observó ancho de 340 píxeles CSS, contenido de 337 y comparador apilado en una columna de 305, sin desbordamiento de la página. El modo oscuro funciona. Tab y Enter activan el enlace para saltar navegación y enfocan `main`. La inspección de DOM no encontró identificadores duplicados ni controles input/select sin etiquetas. Los errores de consola observados pertenecían a la extensión del navegador; no se observaron errores propios de la aplicación. Esto no equivale a una certificación WCAG, prueba con lector de pantalla ni comprobación en Safari o teléfono físico.

## Despliegue y límites pendientes de evidencia externa

La URL de publicación es https://raarchilla-create.github.io/elecciones-29n/ . El workflow y sus registros públicos permiten verificar el resultado de cada ejecución: https://github.com/raarchilla-create/raarchilla-create.github.io/actions/workflows/electoral-monitor.yml . La publicación anterior del 25/11/2026 se verificó con HTTP 200 y GitHub Pages correcto; la edición actual se comprueba públicamente después de su actualización.

Permanecen límites reales: el índice resumido no codifica cada frase de cada programa; dos documentos no se pueden descargar completos; algunas coaliciones o formaciones no tienen programa propio verificado en esta revisión; las coberturas del test son desiguales; no hay biografías profesionales verificadas de todos los candidatos; faltan memorias económicas independientes y un archivo retrospectivo íntegro de versiones. No se han rellenado esos huecos con posiciones o datos inventados. El corpus no cuenta con validación experta independiente de cada codificación.
