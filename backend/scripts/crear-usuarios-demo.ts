/**
 * Crea (o actualiza) un usuario de demostración por rol:
 *   turista@misanandres.test, tecnico@misanandres.test y admin@misanandres.test
 *
 * Uso (desde backend/), con la contraseña SOLO en el entorno de esa ejecución:
 *   PowerShell:  $env:DEMO_PASSWORD="<contraseña>"; npm run usuarios:demo; Remove-Item Env:DEMO_PASSWORD
 *   bash:        DEMO_PASSWORD='<contraseña>' npm run usuarios:demo
 *
 * - La contraseña nunca se escribe en el repositorio: se lee de DEMO_PASSWORD al ejecutar.
 * - Necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en backend/.env). La service role
 *   key solo la usa este script, en tu PC: el servidor de la API no la necesita.
 * - Requiere la migración 20261016120000_roles_y_tickets aplicada (columna usuario.rol).
 * - Es re-ejecutable: si el usuario ya existe, le actualiza la contraseña y el rol.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database, RolUsuario } from '../src/models/database.types';

export const USUARIOS_DEMO: { correo: string; nombre: string; rol: RolUsuario }[] = [
  { correo: 'turista@misanandres.test', nombre: 'Turista de prueba', rol: 'turista' },
  { correo: 'tecnico@misanandres.test', nombre: 'Técnico de prueba', rol: 'tecnico' },
  { correo: 'admin@misanandres.test', nombre: 'Administrador de prueba', rol: 'administrador' },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const contrasena = process.env.DEMO_PASSWORD;
  if (!url || !claveServicio) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env.');
  if (!contrasena || contrasena.length < 8) {
    throw new Error('Define DEMO_PASSWORD (mínimo 8 caracteres) solo para esta ejecución; ver el comentario del script.');
  }

  const admin = createClient<Database>(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: lista, error: errorLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (errorLista) throw new Error(`No se pudieron listar los usuarios: ${errorLista.message}`);

  for (const demo of USUARIOS_DEMO) {
    const existente = lista.users.find((u) => u.email?.toLowerCase() === demo.correo);
    let id: string;
    if (existente) {
      const { error } = await admin.auth.admin.updateUserById(existente.id, { password: contrasena, email_confirm: true });
      if (error) throw new Error(`${demo.correo}: ${error.message}`);
      id = existente.id;
    } else {
      // email_confirm: entra sin confirmar el correo (los dominios .test no reciben correos).
      const { data, error } = await admin.auth.admin.createUser({
        email: demo.correo,
        password: contrasena,
        email_confirm: true,
        user_metadata: { nombre: demo.nombre },
      });
      if (error || !data.user) throw new Error(`${demo.correo}: ${error?.message ?? 'sin usuario'}`);
      id = data.user.id;
    }

    // El perfil lo crea el trigger de registro como 'turista'; aquí se fija el rol.
    const { error: errorRol } = await admin.from('usuario').update({ rol: demo.rol, nombre: demo.nombre }).eq('id_usuario', id);
    if (errorRol) throw new Error(`${demo.correo}: no se pudo asignar el rol (${errorRol.message}). ¿Aplicaste la migración de roles?`);
    console.log(`✔ ${demo.correo} → ${demo.rol}${existente ? ' (ya existía: contraseña y rol actualizados)' : ''}`);
  }
  console.log('\nListo. Inicia sesión en la app con cada correo y la contraseña de DEMO_PASSWORD.');
}

if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`✘ ${(e as Error).message}`);
    process.exit(1);
  });
}
