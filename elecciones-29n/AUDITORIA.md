# Auditoría del observatorio electoral

Fecha de la edición: 25 de noviembre de 2026. Repositorio: raarchilla-create/raarchilla-create.github.io. Directorio: elecciones-29n.

## Convocatoria y revisión editorial

La convocatoria del 29/11/2026 está confirmada por el artículo 2 del [Real Decreto 806/2026](https://www.boe.es/eli/es/rd/2026/10/05/806) y por la JEC. Se verificaron los artículos 4 y 5 para campaña y constitución de las Cámaras.

Se inventariaron las 52 afirmaciones programáticas de la versión anterior en `data/legacy-audit.json`. Se retiró ese corpus de las herramientas activas y se reconstruyeron las atribuciones con documentos primarios. Se retiraron también recuentos ajenos sin auditoría, biografías sin trazabilidad individual, comparaciones históricas no necesarias y supuestos resultados del test basados solo en palabras clave.

El catálogo contiene 185 medidas de 22 formaciones y 29 fuentes oficiales: PDF, programas web, documentos sectoriales y presentaciones. Cada posición incluye documento, localizador, fecha de consulta, sentido y condiciones de comparabilidad. Los originales completos están enlazados. El programa político del PCTE se diferencia de un compromiso electoral institucional y no puntúa. Tampoco puntúan posiciones con alcance distinto de la pregunta.

Las 534 fichas de cabezas de lista al Congreso cubren 52 circunscripciones. El parser es reproducible. Se aplicaron las correcciones pertinentes del BOE de 7 de noviembre: La Rioja/PCTE, Navarra/EH Bildu, Tarragona/Comuns y Teruel/PSOE. La corrección de 21 de noviembre afecta al presidente de la junta de Burgos, no a las cabezas de lista. No se presenta a cada cabeza de lista como candidato a presidente.

## Funcionamiento y pruebas

- Buscador local con acentos, sinónimos, tolerancia a pequeñas erratas y filtros. Solo recupera registros existentes. La consulta «bajar salarios» no se transforma en apoyo de quienes proponen subirlos.
- Comparador de hasta tres formaciones, deduplicación de selecciones, filtros temáticos y estado explícito de falta de evidencia.
- Test de 40 preguntas con avance, retroceso, salto, revisión, borrado, exportación e impresión. «Depende» y saltos no puntúan. Cada pregunta cuenta una vez; evidencias contradictorias se excluyen. Las comparaciones comunes usan idéntico denominador. No se proclama un ganador general con coberturas desiguales.
- Análisis editorial económico y jurídico por medida, con fuentes normativas y calculadoras de orden de magnitud; no presenta cálculos ilustrativos como presupuestos de partidos.
- Filtros y paginación de candidatos, referencias documentales, noticias, estado de fuentes y simulador de investidura.
- HTML semántico, etiquetas de formularios, enlace para saltar navegación, foco visible, navegación por teclado, reducción de movimiento, tema oscuro, impresión y comparador apilado en móvil.
- No se envían respuestas, no hay almacenamiento de opiniones políticas, analítica, cookies ni dependencias de ejecución externas.

Pruebas automatizadas: `node --test elecciones-29n/tests/core.test.cjs` y `python3 -m unittest discover -s elecciones-29n/tests -p 'test_*.py' -v`. Dieciséis casos pasan: integridad del catálogo, direcciones, silencio, preguntas comunes, duplicados, contradicciones, buscador, protocolos, investidura, candidaturas, dominios permitidos, errores HTTP, falsos PDF, primeras versiones y noticias de fuentes externas.

## Seguimiento diario

`electoral-monitor.yml` programa ventanas a las 06:00 y 07:00 UTC y selecciona las 08:00 Europe/Madrid. GitHub puede retrasar ejecuciones. `monitor.py` comprueba documentos y canales de todas las formaciones incorporadas, valida descargas, extrae texto PDF, conserva huellas SHA-256, registra diferencias y publica errores por fuente. Las actualizaciones se guardan de forma atómica en `noticias.json`.

La primera lectura crea una línea de base. Un cambio binario o de texto no se convierte en un giro político confirmado. No se inventan versiones anteriores. Un error mantiene la última lectura correcta y no se registra como «sin cambios». El workflow solicita reconstrucción de GitHub Pages después de guardar los datos, porque los commits realizados con GITHUB_TOKEN no disparan por sí solos todas las automatizaciones.

## Límites que siguen abiertos

1. No se ha incorporado de forma exhaustiva todo el contenido de todos los programas y candidaturas. El índice editorial es una selección verificable; la cobertura de cada formación se publica, sin utilizarla como valoración política.
2. Algunas preguntas solo tienen una o pocas posiciones codificadas. La afinidad es parcial y no constituye recomendación ni test psicométrico validado.
3. Fichas de cabezas de lista: sin Senado, suplentes, listas completas ni biografías profesionales verificadas.
4. Sin memoria económica independiente ni estudio jurisprudencial exhaustivo de cada medida. Las cifras de los emisores no se certifican.
5. Fuentes con protección antibot o RSS inexistente: no se puede prometer acceso diario completo. El monitor no equivale a una búsqueda exhaustiva en toda la prensa.
6. Sin archivo íntegro retrospectivo de versiones: no se puede establecer qué promesa cambió antes de crear la línea de base sin recuperar ambos originales.
7. Corpus preparado con asistencia de IA, sin validación académica o revisión experta independiente de cada codificación.

La comprobación del despliegue y del navegador se documenta a continuación.

## Comprobación de interfaz realizada

En navegador Chrome se verificaron: carga del panorama (22/185/40/52), búsqueda «menos cuota de autónomos» con 16 resultados relacionados y condiciones, filtrado del comparador por pensiones, recorrido completo de 40 respuestas mixtas y resultados documentales, denominador común de PSOE/Vox, filtro de programa humanista, corrección Ester Roca Domedel, cálculo del 1% de 2.000.000 millones (20.000 millones), prestación ilustrativa (2.400 millones/año), noticias sin cambios políticos inventados y rechazo de una investidura con 351 votos. La captura de escritorio muestra composición y navegación legibles.

## Publicación comprobada el 25 de noviembre de 2026

La URL pública `https://raarchilla-create.github.io/elecciones-29n/` devuelve HTTP 200 y carga el nuevo catálogo. GitHub Actions completó correctamente el workflow de revisión y pruebas (ejecución 45698402842) y GitHub Pages terminó el despliegue (ejecución 45698477878). El monitor publicó su actualización en el commit 6941aa2e25fed96360f842665e2a2852d7641037. Se comprobó en Chrome la web pública, navegación a auditoría y cambio de tema. No se observaron errores propios de la aplicación en la consola consultada; los errores recogidos pertenecían a la extensión del navegador.

Los estilos incluyen adaptaciones a 800 y 560 píxeles. Se comprobó la redistribución en Chrome ampliado al 400%: ancho de 340 píxeles CSS, contenido de 337 píxeles y comparador de una sola columna (305 píxeles). El filtro de pensiones siguió funcionando y los controles cabían en pantalla. La emulación de dispositivos de DevTools está deshabilitada por la organización; no se verificó un teléfono físico, Safari móvil, lector de pantalla ni una certificación WCAG.

La revisión editorial diaria existente se actualizó para trabajar con el nuevo esquema, conservar trazabilidad y exigir evidencias anteriores y posteriores antes de etiquetar un cambio político. El monitor técnico conserva sus metadatos editoriales sin modificar la codificación de posiciones.

La última iteración incluye desplazamiento al contenido al cambiar de sección y documentos completos de referencia en la exportación JSON del test.
