-- Tipos controlados, tablas, restricciones e índices del MVP.

-- ------------------------------------------------------------
-- Tipos controlados
-- ------------------------------------------------------------
create type public.categoria_destino as enum (
  'playa', 'cayo', 'naturaleza', 'buceo_snorkel', 'cultura', 'gastronomia'
);

create type public.estado_destino as enum ('abierto', 'cerrado_temporal', 'inactivo');

create type public.nivel_ocupacion as enum ('Bajo', 'Medio', 'Alto');

create type public.tipo_preferencia as enum ('categoria', 'experiencia', 'grupo');

create type public.tipo_interaccion as enum ('vista', 'favorito', 'visita', 'compartir');

-- Valida que un texto sea un valor de categoria_destino (usado en preferencia).
create function public.es_categoria_destino(valor text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select valor = any (enum_range(null::public.categoria_destino)::text[]);
$$;

-- ------------------------------------------------------------
-- usuario: perfil de la app, 1 a 1 con auth.users
-- ------------------------------------------------------------
create table public.usuario (
  id_usuario uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  nivel_ocupacion_preferido public.nivel_ocupacion,
  fecha_registro timestamptz not null default now()
);

-- ------------------------------------------------------------
-- destino
-- ------------------------------------------------------------
create table public.destino (
  id_destino integer generated always as identity primary key,
  nombre text not null unique,
  descripcion text,
  categoria public.categoria_destino not null,
  latitud numeric(9, 6) not null check (latitud between -90 and 90),
  longitud numeric(9, 6) not null check (longitud between -180 and 180),
  ubicacion_texto text,
  capacidad integer not null check (capacidad > 0),
  estado public.estado_destino not null default 'abierto',
  imagen_url text
);

create index destino_categoria_idx on public.destino (categoria);

-- ------------------------------------------------------------
-- preferencia: catálogo único (categoría, experiencia, grupo)
-- ------------------------------------------------------------
create table public.preferencia (
  id_preferencia smallint generated always as identity primary key,
  tipo public.tipo_preferencia not null,
  codigo text not null,
  nombre text not null,
  descripcion text,
  unique (tipo, codigo),
  constraint preferencia_categoria_valida
    check (tipo <> 'categoria' or public.es_categoria_destino(codigo))
);

-- ------------------------------------------------------------
-- destino_preferencia: etiquetas de experiencia/grupo por destino
-- ------------------------------------------------------------
create table public.destino_preferencia (
  id_destino integer not null references public.destino (id_destino) on delete cascade,
  id_preferencia smallint not null references public.preferencia (id_preferencia) on delete cascade,
  primary key (id_destino, id_preferencia)
);

create index destino_preferencia_id_preferencia_idx on public.destino_preferencia (id_preferencia);

-- ------------------------------------------------------------
-- usuario_preferencia
-- ------------------------------------------------------------
create table public.usuario_preferencia (
  id_usuario uuid not null references public.usuario (id_usuario) on delete cascade,
  id_preferencia smallint not null references public.preferencia (id_preferencia) on delete cascade,
  primary key (id_usuario, id_preferencia)
);

create index usuario_preferencia_id_preferencia_idx on public.usuario_preferencia (id_preferencia);

-- ------------------------------------------------------------
-- interaccion: histórico usuario-destino (datos para el modelo)
-- ------------------------------------------------------------
create table public.interaccion (
  id_interaccion bigint generated always as identity primary key,
  id_usuario uuid not null references public.usuario (id_usuario) on delete cascade,
  id_destino integer not null references public.destino (id_destino) on delete cascade,
  tipo_interaccion public.tipo_interaccion not null,
  fecha_hora timestamptz not null default now()
);

create index interaccion_id_usuario_idx on public.interaccion (id_usuario);
create index interaccion_id_destino_idx on public.interaccion (id_destino);
create index interaccion_fecha_hora_idx on public.interaccion (fecha_hora);

-- ------------------------------------------------------------
-- ocupacion: registros históricos por destino y hora
-- ------------------------------------------------------------
create table public.ocupacion (
  id_ocupacion bigint generated always as identity primary key,
  id_destino integer not null references public.destino (id_destino) on delete cascade,
  fecha_hora timestamptz not null,
  cantidad_personas integer not null check (cantidad_personas >= 0),
  porcentaje_ocupacion numeric(5, 2) not null check (porcentaje_ocupacion between 0 and 100),
  unique (id_destino, fecha_hora)
);

create index ocupacion_fecha_hora_idx on public.ocupacion (fecha_hora);
