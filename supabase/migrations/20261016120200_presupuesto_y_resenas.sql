-- Presupuesto (precios por persona y presupuesto del usuario) y reseñas.
--
-- ADITIVA: columnas opcionales o con valor por defecto, una tabla nueva y funciones. Solo
-- rellena valores nuevos (precio_min_cop / precio_max_cop); no cambia datos existentes.
--
-- "Tipos de grupo para los que es apto": ya existen como etiquetas de grupo en
-- destino_preferencia (preferencia.tipo = 'grupo': solo, pareja, familia_ninos, amigos,
-- adulto_mayor). Se reutilizan en vez de duplicarlas en otra columna.

-- ------------------------------------------------------------
-- Precio por persona por visita (COP)
-- ------------------------------------------------------------
alter table public.destino
  add column precio_min_cop integer check (precio_min_cop is null or precio_min_cop >= 0),
  add column precio_max_cop integer check (precio_max_cop is null or precio_max_cop >= 0),
  add column precio_es_estimado boolean not null default true,
  add constraint destino_precio_rango check (
    (precio_min_cop is null) = (precio_max_cop is null)
    and (precio_min_cop is null or precio_min_cop <= precio_max_cop)
  );

comment on column public.destino.precio_min_cop is 'Costo mínimo por persona por visita, COP (entrada, tour o consumo típico).';
comment on column public.destino.precio_es_estimado is 'true mientras el precio sea una estimación (ver docs/datos-por-verificar.md).';

-- Valores aproximados (octubre de 2026). Fuentes y supuestos en docs/datos-por-verificar.md.
update public.destino as d
set precio_min_cop = v.minimo, precio_max_cop = v.maximo, precio_es_estimado = true
from (values
  ('Playa de Spratt Bight', 0, 30000),
  ('Playa de San Luis', 0, 20000),
  ('Rocky Cay', 0, 20000),
  ('Playa de Sound Bay', 0, 10000),
  ('Cocoplum Bay', 0, 30000),
  ('Playa Los Charquitos', 0, 0),
  ('Bahía Sardina', 0, 30000),
  ('Johnny Cay', 85000, 125000),
  ('El Acuario (Rose Cay)', 70000, 110000),
  ('Haynes Cay', 70000, 110000),
  ('Cayo Bolívar', 250000, 400000),
  ('La Regatta', 120000, 250000),
  ('Miss Celia', 50000, 100000),
  ('Donde Francesca', 60000, 120000),
  ('Fishermen''s Place', 40000, 90000),
  ('Gourmet Shop Assho', 70000, 150000),
  ('Capitán Mandy', 60000, 150000),
  ('West View', 10000, 30000),
  ('La Piscinita', 5000, 15000),
  ('Kayak en el Manglar de Old Point', 60000, 120000),
  ('Paseo en semisubmarino', 110000, 180000),
  ('Aquanautas (caminata submarina)', 200000, 300000),
  ('Buceo con Karibik Diver', 250000, 400000),
  ('Vuelta a la isla', 30000, 80000),
  ('Hoyo Soplador', 0, 5000),
  ('Laguna Big Pond', 5000, 15000),
  ('Jardín Botánico de San Andrés', 10000, 20000),
  ('Primera Iglesia Bautista', 0, 10000),
  ('Cueva de Morgan', 15000, 25000),
  ('Casa Museo Isleña', 15000, 25000)
) as v (nombre, minimo, maximo)
where d.nombre = v.nombre and d.precio_min_cop is null;

-- ------------------------------------------------------------
-- Presupuesto del usuario (por persona por visita, COP)
-- ------------------------------------------------------------
alter table public.usuario
  add column presupuesto_min_cop integer check (presupuesto_min_cop is null or presupuesto_min_cop >= 0),
  add column presupuesto_max_cop integer check (presupuesto_max_cop is null or presupuesto_max_cop >= 0),
  add constraint usuario_presupuesto_rango check (
    (presupuesto_min_cop is null) = (presupuesto_max_cop is null)
    and (presupuesto_min_cop is null or presupuesto_min_cop <= presupuesto_max_cop)
  );

-- El usuario puede editar su presupuesto (sigue sin poder tocar su rol).
grant update (presupuesto_min_cop, presupuesto_max_cop) on public.usuario to authenticated;

-- ------------------------------------------------------------
-- Reseñas: una por usuario y destino; el administrador puede ocultarlas
-- ------------------------------------------------------------
create table public.resena (
  id_resena bigint generated always as identity primary key,
  id_usuario uuid not null references public.usuario (id_usuario) on delete cascade,
  id_destino integer not null references public.destino (id_destino) on delete cascade,
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) between 1 and 1000),
  oculta boolean not null default false,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  unique (id_usuario, id_destino)
);

create index resena_id_destino_idx on public.resena (id_destino);

alter table public.resena enable row level security;
revoke update, delete, truncate on public.resena from anon, authenticated;
revoke insert on public.resena from anon;
-- El autor solo edita estrellas y comentario (no puede des-ocultar su reseña).
grant update (estrellas, comentario, fecha_actualizacion) on public.resena to authenticated;
grant delete on public.resena to authenticated;

-- anon no puede ejecutar es_administrador(), por eso tiene su propia política.
create policy "resena: anon ve las visibles" on public.resena
  for select to anon
  using (not oculta);
create policy "resena: ver las visibles, las propias y todas si es admin" on public.resena
  for select to authenticated
  using (not oculta or id_usuario = (select auth.uid()) or public.es_administrador());
create policy "resena: escribir la propia" on public.resena
  for insert to authenticated
  with check (id_usuario = (select auth.uid()) and not oculta);
create policy "resena: editar la propia" on public.resena
  for update to authenticated
  using (id_usuario = (select auth.uid()))
  with check (id_usuario = (select auth.uid()));
create policy "resena: borrar la propia" on public.resena
  for delete to authenticated
  using (id_usuario = (select auth.uid()));

-- Ocultar o volver a mostrar una reseña (solo administrador).
create function public.ocultar_resena(p_id_resena bigint, p_oculta boolean)
returns public.resena
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila public.resena;
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede ocultar reseñas.' using errcode = '42501';
  end if;
  update public.resena set oculta = p_oculta where id_resena = p_id_resena returning * into v_fila;
  if not found then
    raise exception 'No existe la reseña.' using errcode = 'P0002';
  end if;
  return v_fila;
end;
$$;

revoke execute on function public.ocultar_resena(bigint, boolean) from public, anon;
grant execute on function public.ocultar_resena(bigint, boolean) to authenticated;
