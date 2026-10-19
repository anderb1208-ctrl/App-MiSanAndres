# Fuentes y supuestos del dataset simulado

> ⚠ El dataset `dataset_ocupacion_san_andres.csv` es **SIMULADO** (`origen_dato = simulado_calibrado`). Se calibra con los datos **reales** de esta tabla (clima, calendario, llegadas de turistas, cierres oficiales), pero **la ocupación de cada lugar no es una medición**: nadie publica cuántas personas hay por hora en cada sitio de San Andrés. Lo que no se encontró se simula con supuestos explícitos y coherentes, marcados como tales.

Tipos: **real** = dato oficial o medido, usado tal cual · **estimado** = calculado a partir de datos reales (derivado o repartido para cuadrar con un total oficial) · **inventado coherente** = supuesto razonable sin fuente, elegido para ser congruente con lo real.

Fecha de consulta de todas las fuentes: **19 de octubre de 2026**.

## Parámetros

| Parámetro | Valor usado | Tipo | Fuente |
| --- | --- | --- | --- |
| Clima por hora (temperatura, precipitación, viento a 10 m), oct 2024 – oct 2026 | `clima_historico_san_andres.csv` (17.952 horas, celda 12,62 N, 81,69 O) | real | [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) (reanálisis ERA5 y modelos de Open-Meteo). Licencia CC BY 4.0, "Weather data by Open-Meteo.com". Descargado una vez con `descargar_clima_historico.py` |
| Clima fuera del rango descargado | Un día real del mismo mes, al azar (remuestreo con semilla) | estimado | Mismo archivo |
| Festivos de Colombia (Ley Emiliani) y puentes | `calendario.py` = `calendarioService` del backend | real | [Ley 51 de 1983](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4954) |
| Temporadas altas: 15 dic – 15 ene, 15 jun – 15 jul, Semana Santa | Igual en backend y ML | real (vacaciones escolares y de fin de año) | Calendario escolar nacional (Decreto 1075 de 2015, art. 2.4.3.4.1) |
| Receso escolar de octubre | Del sábado 9 días antes del festivo del 12 de octubre hasta ese lunes | estimado | Semana de receso del calendario A (Decreto 1075 de 2015); la fecha exacta la fija cada secretaría de educación |
| Llegadas de turistas 2024 y 2025 (totales) | 1.057.935 y 1.127.806 | real | [Blu Radio, Gobernación, 9 ene 2026](https://www.bluradio.com/regiones/caribe/en-2025-san-andres-marco-un-nuevo-record-en-numero-de-turistas-gobernacion-rg10); [Radio Nacional, 25 dic 2025](https://www.radionacional.co/cultura/turismo/turismo-en-san-andres-2025) |
| Llegadas ene–jun 2025 (533.276) y ene–jul 2025 (629.563) | Totales semestrales | real | [Teleislas, 7 jul 2025](https://teleislas.gov.co/teleislas-news-tuirsmo-cultura-estrategias-gobierno-fortalecimiento-archipielago-desarrollo-sanandres-2025/); [Sec. de Turismo vía sanandresyprovidencia.com, 14 ago 2025](https://www.sanandresyprovidencia.com/post/san-andr%C3%A9s-sigue-conquistando-al-mundo-con-r%C3%A9cords-tur%C3%ADsticos-en-2025) |
| Llegadas julio 2025 | 96.287 | real | Misma fuente (Secretaría de Turismo) |
| Llegadas octubre 2025 | "más de 90.000" (se usa 90.500), +10 % anual | real (cota inferior) | [Teleislas](https://teleislas.gov.co/teleislas-news-turismo-economia-desarrollo-incremento-estrategias-nacional-internacional-sanandres-2025/) |
| Llegadas diciembre 2025 | 115.886, +18,1 % frente a dic 2024 | real | [Blu Radio, Gobernación](https://www.bluradio.com/regiones/caribe/en-2025-san-andres-marco-un-nuevo-record-en-numero-de-turistas-gobernacion-rg10) |
| Llegadas ene–jun 2026 (645.294) y junio 2026 (102.523, +23,4 %) | Totales | real | [Vas a Mar San Andrés (Sec. de Turismo), 7 jul 2026](https://blog.sanandresisla.travel/primer-semestre-turistico-2026-san-andres-645-mil-visitantes/) |
| Llegadas oct, dic 2024 y jun 2025 | Cifra oficial ÷ variación anual publicada | estimado (derivado) | Las anteriores |
| Llegadas de los demás meses | Repartidas para cuadrar con los totales oficiales; enero es el mes más alto | estimado | Totales anteriores; [OCCRE: enero es el mes de mayor ocupación](https://occre.gov.co/enero-el-mes-de-mayor-ocupacion-turistica-en-san-andres/) |
| Llegadas jul–oct 2026 | Mismo mes de 2025 × 1,12 (entre +7 % de 2025 y +21 % del 1.er semestre de 2026) | estimado | Las anteriores |
| Ocupación hotelera de referencia (no entra al modelo; sirve para revisar la escala) | 64,5 % ene–mar 2025; ~70 % en diciembre 2025 | real | [Cotelco vía El Isleño](https://www.xn--elisleo-9za.com/index.php?option=com_content&view=article&id=31470:2025-05-26-13-43-27&catid=51:turismo&Itemid=80); Radio Nacional |
| Capacidad de Johnny Cay | 800 personas simultáneas (el estudio de capacidad de carga da 854; fallo judicial: tope de 800 simultáneas y 1.500 al día) | real | [Plan de manejo del PNR Johnny Cay (CORALINA)](https://www.coralina.gov.co/publicaciones/129/plan-manejo-ambiental-johnny-cay/) |
| Capacidad de los demás destinos | Las de `destino.capacidad` (seed del proyecto) | inventado coherente | Ver `docs/datos-por-verificar.md` |
| Cierre de El Acuario (Rose Cay) | Cerrado del 23 ago 2025 al 22 feb 2026 (seis meses), ocupación 0, `evento = cierre_judicial` | real | [Tribunal Contencioso Administrativo, vía The Archipiélago Press (8 ago 2025)](https://www.thearchipielagopress.co/urgente-tribunal-ordeno-el-cierre-de-cayo-acuario-por-seis-meses-y-trimestrales-en-haynes-cay-por-tres-dias/) y [Portafolio](https://www.portafolio.co/economia/el-acuario-de-san-andres-sin-puente-y-con-casetas-demolidas-la-otra-cara-del-paraiso-del-que-dependen-familias-504445) |
| Desvío de visitantes del Acuario a Haynes Cay durante el cierre | +15 % en Haynes Cay | inventado coherente | Están a ~100 m y se visitan en el mismo tour |
| Cierres trimestrales de 3 días en Haynes Cay | Martes a jueves de la 2.ª semana de feb, may, ago y nov, desde sept 2025 | real (la orden) / estimado (las fechas) | Mismo fallo del Tribunal; las fechas no se publicaron |
| Horarios de atención | Los de `destino.horario_*`; cayos 9:00–16:00 por las salidas de lanchas (salida desde 8:30, regreso hacia las 15:00) | estimado | [Operadores de tours (sanandres.travel)](https://sanandres.travel/tour/acuario-y-haynes) |
| Perfil horario por categoría | Playas con pico de 12 a 14 y segundo aire al atardecer; cayos atados a las lanchas (10 a 15); restaurantes almuerzo y cena; actividades mañana y tarde; miradores al atardecer (listo, sin miradores en el catálogo) | inventado coherente | — |
| Efecto del día de la semana | Playas +15 % sábado y +22 % domingo (isleños), restaurantes +12–18 % viernes y sábado, cultura −10 % domingo | inventado coherente | — |
| Festivo, puente y temporada alta | +15 %, +10 % y +15 %, **normalizados dentro del mes** para que el volumen mensual lo fije la curva oficial de llegadas | inventado coherente | — |
| Efecto de la lluvia | `exp(−s × mm)` (mm de la hora + la mitad de la anterior): s = 0,60 playas, 0,55 cayos, 0,40 actividades, 0,30 naturaleza, 0,04 cultura, 0,03 restaurantes (bajo techo) | inventado coherente | — |
| Viento / mar picado | Cayos y actividades en el mar: −2,5 % por km/h sobre 30 km/h (mínimo 40 %) | inventado coherente | — |
| Cierre por mal tiempo (Capitanía de Puerto suspende zarpes) | Viento medio de 8 a 16 h ≥ 39 km/h o lluvia ≥ 16 mm en el día (percentil ≈ 98 del clima real): cayos y actividades en el mar en 0, `evento = cierre_mal_tiempo` | estimado (umbral del clima real) / inventado coherente (la regla) | — |
| Popularidad relativa de cada destino | 0,45–1,10 (Johnny Cay y La Regatta los más altos) | inventado coherente | Igual que `supabase/seed.sql` |
| Nivel de la hora pico en un día promedio | 52–84 % según la categoría × popularidad | inventado coherente | — |
| Ruido | AR(1) por día (ρ = 0,6, σ = 0,07) y por hora (ρ = 0,5, σ = 0,05), multiplicativo | inventado coherente | — |
| Saturación | Suave hacia 100 %: `x / (1 + (x/100)^4)^(1/4)`; nunca se supera la capacidad | inventado coherente | — |

## Reproducir

```powershell
python descargar_clima_historico.py   # solo si se quiere actualizar el clima (necesita internet)
python generar_dataset_simulado.py    # semilla 42, ~5 s, sin internet
python calidad_dataset.py             # chequeos y reportes/calidad_dataset.md
```
