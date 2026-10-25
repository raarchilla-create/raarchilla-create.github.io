# Planificación por minuto

Acceso desde «Planificar por minuto» en Inicio o «Planificación · 1 min» dentro de cada centro.

- La unidad de cálculo y edición es un minuto. El zoom cambia píxeles por minuto, sin agregar ni redondear las horas del turno.
- Forecast manual: editar un minuto, repartir un total en una franja o pegar dos columnas `Hora;Ventas` / tabuladores. El reparto conserva el total de céntimos. Vacío significa desconocido; cero es una previsión explícita.
- Turnos: entrada, salida, fecha, cruce de medianoche, tarifa y una pausa con horario exacto. Una pausa pagada mantiene coste pero no cobertura.
- Arrastrar el cuerpo mueve el turno y su pausa. Los extremos cambian solo entrada o salida. Flechas ajustan un minuto; Mayús + flechas ajustan 15. Intro o doble clic abre el formulario.
- Los solapamientos de una misma persona se rechazan al guardar. Los solapamientos previos se señalan y no duplican personas ni coste en un minuto.
- «Quitar turno» archiva el registro. Se puede restaurar desde «Turnos retirados»; la restauración también valida solapamientos.
- El objetivo de ventas por hora-persona es una hipótesis indicada por el usuario. La dotación se redondea al alza por minuto y respeta un mínimo configurado. No es un dimensionamiento automático por roles ni una predicción de calidad de servicio.
- Ratios diarios de productividad y coste/ventas solo se muestran con forecast completo en el horario visible. Los minutos sin forecast quedan fuera de las recomendaciones.
- Las horas se modelan como minutos de horario local de un día operativo de hasta 24 horas; no son un registro de fichaje ni un cálculo de nómina para cambios de huso/DST.

## Almacenamiento

No se cambian nombres ni versiones de IndexedDB:

- `settings`: `kind: minutePlan`, un registro por centro y día con forecast en céntimos por minuto; `minutePlanningDefaults` conserva horario y criterio para nuevos días.
- `caseActions`: se reutilizan los registros `kind: shift`. Se añaden campos opcionales `hourlyCost`, `endNextDay`, `breakStart`, `breakMinutes`, `breakPaid`, `workMinutes` y `paidMinutes`. Los retirados usan `shiftArchived`.
- Los turnos previos siguen disponibles. Su tarifa histórica se obtiene de `cost / hours` cuando existe, antes de recurrir a la ficha actual de personal.
- Forecast y criterios no se escriben en `observations`, para mantener separadas previsión y mediciones reales.
- Las copias JSON existentes ya incluyen ambos almacenes y, por tanto, estos registros.

## Verificación

Ejecutar desde la raíz del repositorio:

```sh
node --test hospitality-os/tests/planner-core.test.cjs
```

Las pruebas cubren céntimos, límites exclusivos, minutos desconocidos, pausas, medianoche, fechas consecutivas, solapamientos, desplazamiento y redimensionado de un minuto, tarifas históricas, turnos archivados e importación de forecast.
