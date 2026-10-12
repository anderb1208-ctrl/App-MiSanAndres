-- Clima por hora y destino: variable de entrada para entrenar el modelo de ocupación.
-- Se llena con datos reales de Open-Meteo (CC BY 4.0) desde supabase/clima_hora.sql,
-- generado por backend/scripts/generarClimaHistorico.ts.
--
-- Aditiva: tabla nueva; el backend desplegado no la usa.

create table public.clima_hora (
  id_clima_hora bigint generated always as identity primary key,
  id_destino integer not null references public.destino (id_destino) on delete cascade,
  fecha_hora timestamptz not null,
  temperatura numeric(4, 1),
  prob_lluvia smallint check (prob_lluvia between 0 and 100),
  precipitacion numeric(5, 1) check (precipitacion >= 0),
  codigo_clima smallint check (codigo_clima between 0 and 99),
  viento numeric(5, 1) check (viento >= 0),
  unique (id_destino, fecha_hora)
);

create index clima_hora_fecha_hora_idx on public.clima_hora (fecha_hora);

comment on table public.clima_hora is 'Clima por hora de cada destino (Open-Meteo, CC BY 4.0). Datos para entrenar el modelo de ocupación.';
comment on column public.clima_hora.temperatura is 'Temperatura a 2 m, °C.';
comment on column public.clima_hora.prob_lluvia is 'Probabilidad de precipitación, %.';
comment on column public.clima_hora.precipitacion is 'Precipitación de la hora, mm.';
comment on column public.clima_hora.codigo_clima is 'Código WMO del estado del tiempo.';
comment on column public.clima_hora.viento is 'Velocidad del viento a 10 m, km/h.';

-- Lectura pública; sin políticas de escritura (solo service role o el editor SQL).
alter table public.clima_hora enable row level security;

create policy "clima_hora: lectura publica"
  on public.clima_hora
  for select
  to anon, authenticated
  using (true);
