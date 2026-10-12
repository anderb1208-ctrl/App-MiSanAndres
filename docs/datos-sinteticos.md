# Datos sintéticos

La tabla `ocupacion` de la base de desarrollo **no tiene datos reales**: no existen sensores ni conteos de personas en los destinos. La genera `supabase/seed.sql` para que la predicción, el gráfico de ocupación típica y el futuro modelo de ML tengan con qué trabajar. Cualquier conclusión sobre afluencia real hecha con estos datos es inválida.

Lo que **sí es real** es el clima (`clima_hora`): sale de Open-Meteo (CC BY 4.0) con `backend/scripts/generarClimaHistorico.ts`.

## Cómo se genera la ocupación

Para cada destino y cada hora de las últimas 4 semanas (hora de Colombia):

```
porcentaje = curva de la categoría[hora]
           × factor del día de la semana
           × popularidad del destino
           × efecto del clima real de esa hora
           × ruido aleatorio (0,90 a 1,10)
```

limitado a 100 %. Fuera del horario del destino la ocupación es 0. `cantidad_personas` = porcentaje × capacidad.

### Supuestos

| Elemento | Supuesto |
| --- | --- |
| Curva por categoría | Playas: pico al mediodía. Cayos: solo de 9 a 16 (horario de las lanchas). Restaurantes: picos al almuerzo (12–14) y a la cena (19–21). Actividades: mañana y comienzo de la tarde. Naturaleza: todo el día, suave. Cultura: mañana y media tarde. |
| Día de la semana | Viernes ×1,10; sábado ×1,30; domingo ×1,25; lunes a jueves ×1,00. |
| Popularidad | Factor por destino entre 0,50 (Primera Iglesia Bautista) y 1,10 (Johnny Cay, La Regatta), según la fama del lugar. No se midió. |
| Pausa | La Regatta cierra de 15:00 a 18:30: ocupación 0 en esas horas. |
| Clima | Si a esa hora hubo **tormenta** (código WMO 95, 96 o 99) o **lluvia** (probabilidad ≥ 60 % o ≥ 0,5 mm), se multiplica por: |

| Categoría | Lluvia | Tormenta |
| --- | --- | --- |
| Playa | 0,65 | 0,40 |
| Cayo | 0,55 | 0,25 |
| Actividad | 0,65 | 0,40 |
| Naturaleza | 0,80 | 0,60 |
| Restaurante | 1,15 | 1,10 |
| Cultura | 1,15 | 1,10 |

Sin dato de clima para esa hora (por ejemplo, si `clima_hora` está vacía) no se aplica efecto.

### Lo que no se modela

- **Festivos, puentes y temporadas**: la ocupación sintética no los incluye; los agrega la predicción como factores (`backend/src/config/factoresPrediccion.ts`). El 12 de octubre de 2026 (festivo) aparece en los datos como un lunes normal.
- **Cierres** como el de La Regatta los domingos o los días en que las lanchas no salen.
- **Tendencias** (crecimiento del turismo, eventos, cruceros).

Los factores de la **predicción** (`config/factoresPrediccion.ts`) son más suaves que los del seed porque se aplican sobre un promedio histórico que ya incluye horas lluviosas.

## Orden de carga en una base nueva

1. Migraciones (`supabase/migrations/`).
2. `supabase/seed.sql`: catálogos, destinos y ocupación (sin efecto de clima si `clima_hora` está vacía).
3. `supabase/clima_hora.sql`: clima real (regenerarlo antes con `npm run clima:historico` en `backend/` para que cubra las últimas 4 semanas).
4. Volver a correr `supabase/seed.sql` para que la ocupación responda al clima. El seed respalda `clima_hora` antes de vaciar las tablas y lo restaura después (por nombre de destino), así que el clima no se pierde.

> ⚠️ El seed vacía también las preferencias e interacciones de todos los usuarios. Para regenerar solo la ocupación, ejecutar únicamente su último bloque precedido de `delete from public.ocupacion;`.

## Para el modelo de ML

Las variables de entrada están definidas en `backend/src/services/featuresPrediccion.ts` (`FeaturesPrediccion`): hora, día de la semana, fin de semana, festivo, puente, temporada y clima. Con datos sintéticos el modelo solo aprenderá los supuestos de esta página; para resultados útiles hace falta reemplazar `ocupacion` por datos reales.
