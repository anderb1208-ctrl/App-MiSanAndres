-- Crea automáticamente el perfil en public.usuario cuando alguien se registra
-- con Supabase Auth. La función vive en el esquema private (no expuesto por la API).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuario (id_usuario, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;

revoke execute on function private.crear_perfil_usuario() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.crear_perfil_usuario();
