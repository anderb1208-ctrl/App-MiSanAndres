# Cambios al diseño (Entregable 2)

Diferencias entre el documento de diseño (`Entregable2_MiSanAndres.docx`) y la base de datos implementada en `supabase/migrations/`. Sirve como lista de pendientes para actualizar el entregable.

## 1. Tabla Usuario

| Campo | Entregable | Implementado | Motivo |
| --- | --- | --- | --- |
| id_usuario | INT, PK, AUTO_INCREMENT | UUID, PK, FK → `auth.users(id)` ON DELETE CASCADE | La autenticación la maneja Supabase Auth, que identifica a los usuarios con UUID. |
| correo | VARCHAR(150), NOT NULL, UNIQUE | **Eliminado** de la tabla | Ya se guarda (y es único) en `auth.users`. Duplicarlo generaría inconsistencias. |
| nombre | VARCHAR(100), NOT NULL | TEXT, opcional | Se toma de los metadatos del registro (`nombre`); puede llegar vacío. |
| nivel_ocupacion_preferido | — | **Nuevo**: Bajo / Medio / Alto, opcional | El body de `POST/PUT /preferencias` incluye `nivelOcupacion` y no había dónde guardarlo. |
| fecha_registro | — | **Nuevo**: TIMESTAMPTZ, default `now()` | Auditoría básica. |

- La fila de `usuario` se crea automáticamente con un **trigger** sobre `auth.users` al registrarse; la app no la inserta.
- La regla "El correo electrónico de cada usuario debe ser único" pasa a cumplirse en `auth.users`.

## 2. Tabla Destino

| Campo | Entregable | Implementado | Motivo |
| --- | --- | --- | --- |
| nombre | VARCHAR(150), NOT NULL | TEXT, NOT NULL, **UNIQUE** | Evitar destinos duplicados. |
| categoria | VARCHAR(50), valor controlado | Enum `categoria_destino`: playa, cayo, naturaleza, buceo_snorkel, cultura, gastronomia | El valor controlado queda garantizado por la base de datos. |
| ubicacion | VARCHAR(255), NOT NULL | `ubicacion_texto` TEXT, NOT NULL | Renombrado para distinguirlo de las coordenadas. |
| latitud | DECIMAL(10,8) | NUMERIC(9,6), CHECK entre -90 y 90 | 6 decimales ≈ 0,1 m de precisión, suficiente para destinos turísticos. |
| longitud | DECIMAL(11,8) | NUMERIC(9,6), CHECK entre -180 y 180 | Ídem. |
| estado | VARCHAR(20) (ej: Activo, Inactivo) | Enum `estado_destino`: abierto, cerrado_temporal, inactivo | Se agrega el cierre temporal (mantenimiento, clima, veda). |
| descripcion | — | **Nuevo**: TEXT | Lo muestra la pantalla de Detalle del destino. |
| imagen_url | — | **Nuevo**: TEXT | Imagen de la tarjeta y del detalle. |

## 3. Tablas que el diccionario de datos no detalla

El entregable menciona Preferencia, Usuario_Preferencia, Interaccion y Ocupacion en las relaciones y reglas, pero no incluye su diccionario. Hay que agregarlo con esta definición:

**Preferencia** (catálogo único para categorías, tipos de experiencia y tipos de grupo)
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_preferencia | SMALLINT | PK, identity |
| tipo | Enum: categoria, experiencia, grupo | NOT NULL |
| codigo | TEXT | NOT NULL, UNIQUE (tipo, codigo); si tipo = categoria debe ser una categoría de destino válida |
| nombre | TEXT | NOT NULL (etiqueta visible) |
| descripcion | TEXT | Opcional |

**Usuario_Preferencia**
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_usuario | UUID | PK compuesta, FK → Usuario (ON DELETE CASCADE) |
| id_preferencia | SMALLINT | PK compuesta, FK → Preferencia |

**Interaccion**
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_interaccion | BIGINT | PK, identity |
| id_usuario | UUID | NOT NULL, FK → Usuario |
| id_destino | INT | NOT NULL, FK → Destino |
| tipo_interaccion | Enum: vista, favorito, visita, compartir | NOT NULL |
| fecha_hora | TIMESTAMPTZ | NOT NULL, default `now()` |

**Ocupacion**
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_ocupacion | BIGINT | PK, identity |
| id_destino | INT | NOT NULL, FK → Destino |
| fecha_hora | TIMESTAMPTZ | NOT NULL, UNIQUE (id_destino, fecha_hora) |
| cantidad_personas | INT | NOT NULL, CHECK >= 0 |
| porcentaje_ocupacion | NUMERIC(5,2) | NOT NULL, CHECK entre 0 y 100 |

## 4. Tabla nueva: Destino_Preferencia

No existe en el entregable. Etiqueta cada destino con los tipos de experiencia y de grupo a los que se ajusta (PK compuesta `id_destino`, `id_preferencia`). Sin ella, el recomendador solo podría cruzar la categoría: las preferencias de experiencia y grupo del usuario no tendrían con qué compararse.

Agregar a la tabla de **Relaciones principales**:
| Relación | Tabla origen | Tabla destino | Tipo |
| --- | --- | --- | --- |
| Destino_A_Etiqueta | Destino | Destino_Preferencia | 1:N |
| Preferencia_A_Destino | Preferencia | Destino_Preferencia | 1:N |

Y actualizar el diagrama ER.

## 5. Reglas de integridad

- **Eliminaciones**: el entregable dice que "se restringen las eliminaciones para evitar registros huérfanos". Se implementó **ON DELETE CASCADE**: al borrar un usuario (desde Supabase Auth) se borran su perfil, preferencias e interacciones; al borrar un destino, su ocupación, etiquetas e interacciones. Tampoco quedan huérfanos, pero el mecanismo es distinto. Para dar de baja un destino sin perder su historial se usa `estado = 'inactivo'`.
- **Fechas**: "datetime" pasa a ser **TIMESTAMPTZ** (con zona horaria). Los datos se guardan en UTC y se interpretan en hora de Colombia (`America/Bogota`).
- **Tipo de grupo**: se mencionaba como valor controlado sin indicar dónde vive; ahora es parte del catálogo `preferencia` (tipo = grupo).
- **Nivel de ocupación**: no se guarda; el backend lo calcula del porcentaje. Cortes propuestos: **Bajo < 40 %**, **Medio 40–70 %**, **Alto > 70 %**. Agregarlos al documento.

## 6. Seguridad (no aparece en el entregable)

Agregar una sección sobre **Row Level Security** (activado en todas las tablas):

| Tabla | Visitante (anon) | Usuario autenticado |
| --- | --- | --- |
| destino, destino_preferencia, preferencia, ocupacion | Leer | Leer |
| usuario | — | Ver y editar solo su perfil |
| usuario_preferencia | — | Ver, agregar y quitar solo las propias |
| interaccion | — | Ver, registrar y borrar solo las propias (no se editan: son histórico para el modelo) |

La escritura de destinos y ocupación la hace únicamente el backend con la service role key.

## 7. Impacto en la API (sección 3 del entregable)

- **usuarioId**: el entregable lo define como "número entero positivo" y lo recibe en la URL/body. Ahora es UUID y **no se envía**: el backend lo obtiene del JWT de Supabase Auth. Las rutas `/preferencias/{usuarioId}` pasan a `/preferencias`, y `GET /recomendaciones` deja de recibir `usuarioId`.
- **Recomendaciones**: no se guardan en una tabla, se calculan al momento. `GET /recomendaciones/{id}` ("detalle de una recomendación") no tiene sentido y se elimina; el detalle es `GET /destinos/{id}`.
- **Body de preferencias**: `{categorias, tipoExperiencia, nivelOcupacion}` puede incluir también `tiposGrupo`, ya que el catálogo lo soporta.
- **Errata**: la tabla de destinos lista el detalle como `GET / destinos` con parámetro `id`; debe ser `GET /destinos/{id}`.

## 8. Endpoints agregados en el MVP

No están en la sección 3 del entregable; agregarlos a las tablas de endpoints:

| Método | Endpoint | Descripción | Auth |
| --- | --- | --- | --- |
| GET | /health | Estado del servicio | No |
| GET | /ocupacion/{destinoId}/prediccion/dia?fecha= | Ocupación típica de cada hora para el día de la semana de la fecha (gráfico del detalle) | No |
| GET | /preferencias/catalogo | Catálogo de categorías, experiencias y grupos | No |
| GET, PUT | /perfil | Ver y cambiar el nombre del usuario del token | Sí |
| POST, GET | /interacciones | Registrar una interacción y ver el historial propio | Sí |

- `POST /preferencias` se reemplaza por `PUT /preferencias` (crea o reemplaza; idempotente).
- `POST /recomendaciones` no se implementó: las recomendaciones se calculan con `GET /recomendaciones` a partir de las preferencias guardadas.
- Todos los errores usan el formato `{ "error": { "codigo", "mensaje", "detalles?" } }` con 400, 401, 404 o 500.

## 9. Predicción de ocupación (MVP, antes del modelo de ML)

- Mientras no exista el servicio de ML, la predicción es el **promedio histórico del porcentaje de ocupación a la misma hora y en el mismo tipo de día** (entre semana / fin de semana), en hora de Colombia. Se separa por tipo de día porque los patrones difieren mucho (al mediodía ≈ 67 % entre semana frente a ≈ 84 % el fin de semana en los datos de prueba).
- El gráfico del detalle muestra la **ocupación típica** de cada hora para ese día de la semana (p. ej. "Ocupación típica de un martes"), con los registros reales de hoy superpuestos. Si aún no hay historial de ese día, se usa el del tipo de día.
- Ambos cálculos usan la función SQL `ocupacion_promedio_hora` (migraciones `20260929200000` y `20261001120000`), que es `security invoker` (respeta RLS) y solo pueden ejecutar los roles `anon` y `authenticated`.
- El backend encapsula el cálculo en `prediccionService`; al llegar el modelo Random Forest solo cambia ese servicio.
