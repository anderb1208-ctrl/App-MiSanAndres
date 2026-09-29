| IV | Unidad 2: Diseño |
| --- | --- |

| Plantilla Entregable 2 | V |
| --- | --- |

UNIDAD 2: DISEÑO: “_______________________”

**Nombres y apellidos completos ****(Autor 1)**

**Nombres y apellidos completos ****(Autor 2)**

Universidad Católica Luis Amigó

Facultad de Ingenierías y Arquitectura

Medellín, Colombia

2026

**TABLA DE CONTENIDO**

**Contenido**

1.	Diseño de la arquitectura	III

		1.1	Arquitectura general	III

		1.2	Diagrama de arquitectura	III

		1.3	Stack tecnológico	III

2.	Diseño de base de datos	IV

		2.1	Modelo Entidad-Relación (ER)	IV

		2.2	Diccionario de datos	IV

3.	Diseño de APIs o lógica de negocio (Backend)	VI

		3.1	Estructura de la API	VI

		3.2	Endpoints principales	VI

		3.3	Reglas de validación	VII

		3.4	Diagrama de secuencia de operaciones principales	VII

4.	Diseño de interfaces (Frontend)	VIII

		4.1	Estructura de navegación	VIII

		4.2	Wireframes/Mockups	VIII

		4.3	Guía de estilos	IX

5.	Diseño de componentes y módulos	IX

		5.1	Estructura Backend:	IX

		5.2	Estructura Frontend	X

		5.3	Módulos principales y sus responsabilidades	X

		5.4	Diagrama de clases (Backend)	XI

		5.5	Diagrama de componentes (Frontend)	XI

Referencias	XI

**CAPÍTULO ****2****: ****DISEÑO**

Diseño de la arquitectura

Arquitectura general

La app utiliza una arquitectura Cliente-Servidor de tres capas, adaptada al funcionamiento de la aplicación móvil MiSanAndrés. Esta arquitectura permite separar la aplicación utilizada por los turistas de la lógica de negocio y del almacenamiento de información.

- La capa de presentación corresponde a la aplicación móvil, desarrollada con React Native, donde los usuarios pueden consultar destinos turísticos, registrar sus preferencias, visualizar su ubicación, consultar información de los lugares y recibir recomendaciones personalizadas.

- La capa de lógica de negocio estará conformada por un backend desarrollado con Node.js y Express, que procesa las solicitudes de la aplicación, usuarios, destinos, preferencias, interacciones y recomendaciones. Además, se conecta con el componente de Machine Learning que predice el nivel de ocupación de los destinos.

- La capa de datos estará implementada mediante PostgreSQL utilizando Supabase, donde se guardan los datos de usuarios, destinos, preferencias, interacciones y registros de ocupación.

La comunicación entre la aplicación móvil y el backend se realiza mediante una API REST, e integra servicios externos para mapas y geolocalización.

Diagrama de arquitectura

Stack tecnológico

| **Capa** | **Tecnología** | **Justificación** |
| --- | --- | --- |
| Backend | Node.js + Express.js | Permite desarrollar una API REST encargada de gestionar la comunicación entre la aplicación móvil, la base de datos y los componentes del sistema. |
| Frontend | React Native | Permite desarrollar la aplicación móvil de MiSanAndrés para dispositivos Android y posteriormente iOS utilizando una misma base de código. |
| Base de datos | PostgreSQL + Supabase | PostgreSQL permite almacenar de forma estructurada la información de usuarios, destinos, preferencias, interacciones y ocupación. Supabase facilita la administración de la base de datos en la nube. |
| Machine Learning | Python + Scikit-learn | Se utilizará para desarrollar y entrenar el modelo encargado de realizar la predicción de ocupación de los destinos turísticos. |
| Modelo ML | Random Forest Regressor | Se propone como modelo inicial para estimar el nivel de ocupación futura a partir de variables históricas y contextuales. |
| APIs | REST | Permite establecer la comunicación entre la aplicación móvil y el backend mediante solicitudes HTTP. |
| Autenticación | Supabase Auth | Permite gestionar el registro e inicio de sesión de los usuarios de la aplicación. |
| Mapas y geolocalización | Google Maps Platform | Permite mostrar los destinos turísticos, la ubicación del usuario y facilitar la consulta de lugares cercanos. |
| Infraestructura | Servidor: Render | Permite que el backend esté disponible para los usuarios de la aplicación sin depender de un servidor físico local. |
|  | Sistema Operativo: Windows 10/11 | Será utilizado como entorno de desarrollo local para construir y probar los diferentes componentes del proyecto. |
|  | Herramientas de desarrollo: Visual Studio Code | Permite desarrollar el frontend móvil, backend y componente de Machine Learning desde un mismo entorno. |
|  | Control de versiones: Git + GitHub | Permite controlar las versiones del código fuente y facilitar el trabajo colaborativo del equipo. |

Diseño de base de datos

Modelo Entidad-Relación (ER)

Diccionario de datos

**Tabla: ****Usuario**

| **Campo** | **Tipo** | **Descripción** | **Restricciones** | **Relación** |
| --- | --- | --- | --- | --- |
| id_usuario | INT / PK | Identificador único del usuario | PRIMARY KEY, AUTO_INCREMENT | - |
| correo | VARCHAR(150) | Correo electrónico del usuario | NOT NULL, UNIQUE | - |
| nombre | VARCHAR(100) | Nombre completo del usuario | NOT NULL | - |

**Tabla: ****Destino**

| **Campo** | **Tipo** | **Descripción** | **Restricciones** | **Relación** |
| --- | --- | --- | --- | --- |
| id_destino | INT / PK | Identificador único del destino turístico | PRIMARY KEY, AUTO_INCREMENT | - |
| nombre | VARCHAR (150) | Nombre del destino turístico | NOT NULL | - |
| categoria | VARCHAR (50) | Categoría del destino | NOT NULL, Valor controlado | - |
| ubicacion | VARCHAR (255) | Descripción textual de la ubicación | NOT NULL | - |
| capacidad | INT | Capacidad máxima permitida de personas | NOT NULL, Entero > 0 | - |
| latitud | DECIMAL (10,8) | Coordenada geográfica de latitud | NOT NULL, Coordenada válida | - |
| longitud | DECIMAL (11,8) | Coordenada geográfica de longitud | NOT NULL, Coordenada válida | - |
| estado | VARCHAR (20) | Estado del destino (ej: Activo, Inactivo) | NOT NULL, Valor controlado | - |

**Tabla: ****Relaciones principales**

| **Relación** | **Tabla origen** | **Tabla destino** | **Tipo de relación** |
| --- | --- | --- | --- |
| Usuario_A_Preferencia | Usuario | Usuario_Preferencia | 1:N |
| Preferencia_A_Usuario | Preferencia | Usuario_Preferencia | 1:N |
| Destino_A_Ocupacion | Destino | Ocupacion | 1:N |
| Usuario_A_Interaccion | Usuario | Interaccion | 1:N |
| Destino_A_Interaccion | Destino | Interaccion | 1:N |

**Restricciones y reglas de integridad**

- Llaves primarias (PK): Cada entidad cuenta con un identificador único; por ejemplo id_usuario, id_destino, id_preferencia, id_ocupacion e id_interaccion.

- Llaves foráneas (FK): Las relaciones exigen referencias validas. Por ejemplo, id_usuario en Usuario_Preferencia debe existir en la tabla usuario, e id_destino en Ocupacion debe corresponder a un destino registrado.

- Integridad referencial: Se bloquea el registro de datos vinculados a usuarios, destinos o referencias, y se restringen las eliminaciones para evitar registros huérfanos.

- Campos obligatorios: Los atributos clave (nombre del destino, categoría, ubicación y capacidad) son obligatorios y no aceptan valores nulos.

- Validación de capacidad: La capacidad del destino debe ser un número entero mayor a cero.

- Validación de ocupación: El aforo registrado no puede ser negativo y el porcentaje de ocupación debe mantenerse entre 0% y 100%.

- Validación geográfica: Las coordenadas de los destinos deben contener valores válidos de latitud y longitud.

- Integridad de usuarios: El correo electrónico de cada usuario debe ser único para evitar registros duplicados.

- Integridad de preferencias: Se prohíbe asociar más de una vez la misma preferencia a un mismo usuario.

- Integridad de interacciones: Cada interacción debe vincularse a un usuario y destino existentes.

- Fechas y horas: Los registros de ocupación e interacción guardan marca de tiempo válida (datetime) para almacenar el historial y entrenar el modelo de Machine Learning.

- Índices: Se indexan los campos de mayor consulta (id_destino, id_usuario, fecha y hora) para agilizar las búsquedas.

- Valores controlados: Atributos como categorías, tipo de grupo, estado y tipo de interacción usan listas predefinidas para estandarizar la información.

- Registros de ocupación: Cada medición se enlaza a un destino específico con su respectiva estampa temporal.

Diseño de APIs o lógica de negocio (Backend)

Estructura de la API

Base URL: https://misanandres.com/v1/

Endpoints principales

**Destinos turísticos **

| **Método** | **Endpoint** | **Descripción** | **Parámetros** | **Body** | **Respuesta** |
| --- | --- | --- | --- | --- | --- |
| GET | /destinos | Consultar los destinos turísticos disponibles | categoria, nivelOcupacion | - | 200**:** Lista de destinos |
| GET | / destinos | Consultar la información de un destino específico | id | - | 200: Informacion destino, 404: destino no encontrado |

**Recomendaciones**

| **Método** | **Endpoint** | **Descripción** | **Parámetros** | **Body** | **Respuesta** |
| --- | --- | --- | --- | --- | --- |
| GET | /recomendaciones | Consultar las recomendaciones disponibles para el usuario | usuarioId | - | 200**:** Lista de recomendaciones |
| POST | /recomendaciones | Generar recomendaciones personalizadas según las preferencias del usuario | - | {usuarioId, preferencias} | 200**:** Lista de recomendaciones generadas |
| GET | /recomendaciones/{id} | Consultar el detalle de una recomendación | id | - | 200**:** Información de la recomendación, 404**:** Recomendación no encontrada |

**Ocupación y predicción**

| **Método** | **Endpoint** | **Descripción** | **Parámetros** | **Body** | **Respuesta** |
| --- | --- | --- | --- | --- | --- |
| GET | /ocupacion/{destinoId} | Consultar el nivel de ocupación actual o registrado de un destino | destinoId, fecha | - | 200**:** Nivel de ocupación, 404**:** Información no encontrada |
| GET | /ocupacion/{destinoId}/prediccion | Consultar la predicción de ocupación de un destino | destinoId, fecha, hora | - | 200**:** Predicción de ocupación, 404**:** Predicción no disponible |

**Preferencias del usuario**

| **Método** | **Endpoint** | **Descripción** | **Parámetros** | **Body** | **Respuesta** |
| --- | --- | --- | --- | --- | --- |
| POST | /preferencias/{usuarioId} | Registrar las preferencias iniciales del usuario | usuarioId | {categorias, tipoExperiencia, nivelOcupacion} | 201: Preferencias registradas |
| GET | /preferencias/{usuarioId} | Consultar las preferencias registradas del usuario | usuarioId | - | 200: Preferencias del usuario, 404: Usuario no encontrado |
| PUT | /preferencias/{usuarioId} | Actualizar las preferencias del usuario | usuarioId | {categorias, tipoExperiencia, nivelOcupacion} | 200: Preferencias actualizadas |
| DELETE | /preferencias/{usuarioId} | Restablecer las preferencias del usuario | usuarioId | - | 204: Preferencias eliminadas |

Reglas de validación

| **Campo** | **Regla de validación** |
| --- | --- |
| usuarioId | Requerido, debe ser un número entero positivo y corresponder a un usuario registrado. |
| id | Requerido en consultas específicas, debe ser un identificador válido y corresponder al registro existente. |
| categoria | Opcional en la consulta de destinos; si se proporciona, debe pertenecer a una categoría turística registrada. |
| nivelOcupacion | Opcional; si se proporciona, debe corresponder a uno de los niveles definidos por el sistema: Bajo, Medio o Alto. |
| preferencias | Requerido para generar recomendaciones; debe contener al menos una preferencia turística válida. |
| categoriasPreferidas | Requerido al registrar o actualizar preferencias; debe contener categorías turísticas válidas. |
| tipoExperiencia | Requerido al registrar o actualizar preferencias; debe corresponder a un tipo de experiencia permitido por el sistema. |
| destinoId | Requerido para consultar la ocupación y predicción; debe ser un número entero positivo y corresponder a un destino registrado. |
| fecha | Requerida para consultar ocupación y predicciones; debe tener el formato YYYY-MM-DD y corresponder a una fecha válida. |
| hora | Requerida para consultar la predicción de ocupación; debe tener el formato HH:MM y corresponder a una hora válida. |

Diagrama de secuencia de operaciones principales

Diseño de interfaces (Frontend)

Estructura de navegación

Wireframes/Mockups

**Pantalla 1: [Nombre de la pantalla]**

**[Incluir wireframe/mockup]**

**Descripción:**

**[Qué contiene la pantalla]**

**[Componentes principales]**

**[Acciones posibles]**

**Pantalla 2: [Nombre de la pantalla]**

**[Incluir wireframe/mockup]**

**Descripción:**

**[Qué contiene la pantalla]**

**[Componentes principales]**

**[Acciones posibles]**

**Pantalla ****3****: [Nombre de la pantalla]**

**.**

**.**

**.**

**Pantalla ****4****: [Nombre de la pantalla]**

**.**

**.**

**.**

Guía de estilos

| **Elemento** | **Especificación** |
| --- | --- |
| Paleta de colores | [Códigos de color] |
| Tipografía | [Fuentes, tamaños] |
| Espaciado | [Márgenes, padding] |
| Componentes base | [Botones, inputs, cards, etc.] |

Diseño de componentes y módulos

**Organización del código**

Estructura Backend:

backend/

│

├── src/

│   ├── config/          # Configuraciones del sistema y conexión con Supabase

│   ├── controllers/     # Gestión de las solicitudes y respuestas de la API

│   ├── models/          # Modelos y entidades de la aplicación

│   ├── routes/          # Definición de rutas y endpoints REST

│   ├── services/        # Lógica de negocio y comunicación con servicios 

│   ├── middleware/      # Autenticación, validaciones y manejo de errores

│   ├── utils/           # Funciones y herramientas auxiliares

│   └── tests/           # Pruebas del backend

│

├── app.js               # Configuración e inicio del servidor Express

├── .env                 # Variables de entorno

└── package.json         # Dependencias y configuración de Node.js

Estructura Frontend

mobile/

│

├── src/

│   ├── assets/          # Imágenes, iconos y recursos de la aplicación

│   ├── components/      # Componentes reutilizables de la interfaz

│   ├── screens/         # Pantallas principales de la aplicación móvil

│   ├── navigation/      # Navegación entre las diferentes pantallas

│   ├── services/        # Consumo de la API y servicios externos

│   ├── store/           # Gestión del estado global de la aplicación

│   ├── hooks/           # Funciones reutilizables de React Native

│   ├── utils/            # Funciones auxiliares y validaciones

│   └── theme/           # Estilos, colores y tipografías

│

├── App.js               # Punto de entrada de la aplicación

└── package.json         # Dependencias y configuración de React Native

Módulos principales y sus responsabilidades

| **Módulo/Componente** | **Responsabilidad** | **Dependencias** |
| --- | --- | --- |
| Autenticación y usuarios | Gestionar el registro, inicio de sesión, perfiles y preferencias de los turistas. | Supabase, PostgreSQL |
| Destinos turísticos | Gestionar la información de los lugares turísticos, características, ubicación y estado de ocupación. | Supabase, Google Maps |
| Sistema de recomendaciones | Analizar las preferencias, ubicación y condiciones de los destinos para generar recomendaciones personalizadas. | Backend, base de datos, módulo de Machine Learning |
| Predicción de ocupación | Procesar los datos disponibles para estimar el nivel de ocupación de los destinos turísticos. | Python, Scikit-learn, datos históricos |
| Mapas y servicios externos | Mostrar la ubicación de los destinos, rutas, información geográfica y condiciones climáticas. | Google Maps, API de clima |
| Análisis de datos | Registrar y analizar las interacciones de los usuarios y los datos de visitas para apoyar la gestión de la carga turística. | Supabase, PostgreSQL, Machine Learning |

Diagrama de clases (Backend)

Diagrama de componentes (Frontend)

Referencias** (IEEE) Usar Mendeley**