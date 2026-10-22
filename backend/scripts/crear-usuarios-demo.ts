/**
 * Crea (o actualiza) un usuario de demostración por rol:
 *   turista@misanandres.test, tecnico@misanandres.test y admin@misanandres.test
 *
 * Uso (desde backend/), con la contraseña SOLO en el entorno de esa ejecución:
 *   PowerShell:  $env:DEMO_PASSWORD="<contraseña>"; npm run usuarios:demo; Remove-Item Env:DEMO_PASSWORD
 *   bash:        DEMO_PASSWORD='<contraseña>' npm run usuarios:demo
 *
 * - Contraseña distinta por rol (opcional): DEMO_PASSWORD_TURISTA, DEMO_PASSWORD_TECNICO y
 *   DEMO_PASSWORD_ADMINISTRADOR; la que falte usa DEMO_PASSWORD.
 * - Las contraseñas nunca se escriben en el repositorio: se leen del entorno al ejecutar.
 * - Necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en backend/.env). La service role
 *   key solo la usa este script, en tu PC: el servidor de la API no la necesita.
 * - Requiere la migración 20261016120000_roles_y_tickets aplicada (columna usuario.rol).
 * - Es re-ejecutable: si el usuario ya existe, le actualiza la contraseña y el rol.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database, RolUsuario } from '../src/models/database.types';
import { MIN_CONTRASENA, validarContrasena } from '../src/utils/contrasena';

export const USUARIOS_DEMO: { correo: string; nombre: string; rol: RolUsuario }[] = [
  { correo: 'turista@misanandres.test', nombre: 'Turista de prueba', rol: 'turista' },
  { correo: 'tecnico@misanandres.test', nombre: 'Técnico de prueba', rol: 'tecnico' },
  { correo: 'admin@misanandres.test', nombre: 'Administrador de prueba', rol: 'administrador' },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !claveServicio) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env.');
  const contrasenaDe = (rol: RolUsuario) => process.env[`DEMO_PASSWORD_${rol.toUpperCase()}`] || process.env.DEMO_PASSWORD;
  for (const demo of USUARIOS_DEMO) {
    const c = contrasenaDe(demo.rol);
    const invalida = validarContrasena(c ?? '');
    if (invalida) {
      throw new Error(
        `DEMO_PASSWORD_${demo.rol.toUpperCase()} o DEMO_PASSWORD: ${invalida} (mínimo ${MIN_CONTRASENA} caracteres y al menos un número; defínela solo para esta ejecución).`,
      );
    }
  }

  const admin = createClient<Database>(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: lista, error: errorLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (errorLista) throw new Error(`No se pudieron listar los usuarios: ${errorLista.message}`);

  for (const demo of USUARIOS_DEMO) {
    const contrasena = contrasenaDe(demo.rol)!;
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
  console.log('\nListo. Inicia sesión en la app con cada correo y su contraseña.');
}

if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`✘ ${(e as Error).message}`);
    process.exit(1);
  });
}
