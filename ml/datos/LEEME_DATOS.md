# Cómo entregar los datos de ocupación

Esta guía es para la persona o entidad que va a enviar los datos reales de cuántas personas hay en cada lugar turístico de San Andrés. No hace falta saber programar.

## Qué necesitamos

Una tabla (por ejemplo en Excel o Google Sheets) guardada como **CSV** (en Excel: *Archivo → Guardar como → CSV UTF-8*), con **una fila por lugar y por hora**. Usa como modelo el archivo `plantilla_ocupacion_real.csv`, que ya trae los encabezados correctos.

> ⚠ La plantilla trae **2 filas de ejemplo** que empiezan con la palabra `EJEMPLO`. **Bórralas** antes de entregar el archivo: si se dejan, el sistema rechaza el archivo.

### Columnas obligatorias

| Columna | Qué es | Cómo se escribe | Ejemplo |
| --- | --- | --- | --- |
| `fecha_hora` | Fecha y hora de la medición, en **hora local de Colombia** | `AAAA-MM-DD HH:MM` (24 horas) | `2026-03-14 15:00` |
| `id_destino` | Número del lugar | Número entero (ver la lista de lugares abajo) | `5` |
| `cantidad_personas` | Personas que había en el lugar en esa hora | Número **entero**, 0 o más | `320` |

### Columnas opcionales (se pueden dejar vacías)

El sistema las calcula solo si están vacías. Si se llenan, deben ser correctas.

| Columna | Qué es | Cómo se escribe |
| --- | --- | --- |
| `porcentaje_ocupacion` | Qué tan lleno estaba el lugar | De **0 a 100** (sin el signo %). Si se deja vacía se calcula con la capacidad del lugar. |
| `hora`, `dia_semana`, `es_fin_de_semana`, `es_festivo`, `es_puente`, `temporada` | Datos del calendario | Mejor dejarlas vacías: se calculan con la fecha. |
| `temperatura` | Temperatura en °C | Número con punto decimal: `29.5` |
| `precipitacion` | Lluvia en milímetros en esa hora | `0` si no llovió |
| `viento` | Velocidad del viento en km/h | `18` |

## Cada cuánto medir y cuántos datos

- **Idealmente, una medición por hora** mientras el lugar está abierto (por ejemplo, de 9:00 a 16:00 en los cayos). Si no es posible, cada dos o tres horas también sirve.
- Las horas en que el lugar está cerrado **no** se incluyen.
- Mínimo recomendado: **4 semanas seguidas por lugar**; mejor **varios meses**. Es importante que incluyan **fines de semana**, **festivos** y al menos una **temporada alta** (diciembre–enero, Semana Santa o junio–julio). Con menos de 4 semanas por lugar el sistema avisa que el modelo todavía no es confiable.
- Si un lugar no tiene datos, no pasa nada: el resto se puede usar igual.

## Ejemplo de cómo lo entregaría una entidad

Una cooperativa de lanchas que cuenta los pasajeros que desembarcan en Johnny Cay (lugar `5`) cada hora:

```
fecha_hora,id_destino,hora,dia_semana,es_fin_de_semana,es_festivo,es_puente,temporada,temperatura,precipitacion,viento,cantidad_personas,porcentaje_ocupacion
2026-03-14 09:00,5,,,,,,,,,,180,
2026-03-14 10:00,5,,,,,,,,,,410,
2026-03-14 11:00,5,,,,,,,,,,560,
```

Solo llenó la fecha y hora, el lugar y las personas; el resto lo calcula el sistema.

## Dónde poner el archivo

Copia el CSV en la carpeta **`ml/datos/real/`** del proyecto (por ejemplo `ml/datos/real/ocupacion_2026.csv`). Esa carpeta no se sube a GitHub. Luego quien administra el sistema corre:

```
python cargar_datos_reales.py
python entrenar_modelo.py --dataset real
```

## Lugares (id_destino)

| id | Lugar | Capacidad | id | Lugar | Capacidad |
| --- | --- | --- | --- | --- | --- |
| 1 | Playa de Spratt Bight | 1500 | 16 | Cocoplum Bay | 500 |
| 2 | Playa de San Luis | 600 | 17 | Playa Los Charquitos | 200 |
| 3 | Rocky Cay | 400 | 18 | Bahía Sardina | 600 |
| 4 | Playa de Sound Bay | 300 | 19 | Cayo Bolívar | 150 |
| 5 | Johnny Cay | 800 | 20 | Fishermen's Place | 120 |
| 6 | El Acuario (Rose Cay) | 500 | 21 | Gourmet Shop Assho | 80 |
| 7 | Haynes Cay | 300 | 22 | Capitán Mandy | 100 |
| 8 | La Regatta | 120 | 23 | Paseo en semisubmarino | 60 |
| 9 | Miss Celia | 100 | 24 | Aquanautas (caminata submarina) | 30 |
| 10 | Donde Francesca | 150 | 25 | Buceo con Karibik Diver | 40 |
| 11 | West View | 250 | 26 | Vuelta a la isla | 200 |
| 12 | La Piscinita | 200 | 27 | Laguna Big Pond | 100 |
| 13 | Kayak en el Manglar de Old Point | 60 | 28 | Jardín Botánico de San Andrés | 100 |
| 14 | Hoyo Soplador | 300 | 29 | Cueva de Morgan | 300 |
| 15 | Primera Iglesia Bautista | 150 | 30 | Casa Museo Isleña | 80 |

La capacidad es una estimación de cuántas personas caben a la vez; si la entidad conoce la capacidad real, conviene informarla para corregirla.
