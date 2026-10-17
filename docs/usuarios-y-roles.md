# Usuarios, roles y usuarios de demostración

## Roles

| Rol | Qué ve en la app | Qué puede hacer (lo verifica el backend y RLS) |
| --- | --- | --- |
| `turista` (por defecto) | Inicio, Explorar, Mapa, Perfil (con "Reportar un problema" y "Mis reportes") | Usar la app, crear tickets, ver y comentar **sus** tickets |
| `tecnico` | Tickets y Perfil | Ver **todos** los tickets, cambiar estado, prioridad y asignación, comentar |
| `administrador` | Panel, Tickets, Destinos, Usuarios y Perfil | Todo lo del técnico, más: usuarios y roles, crear/editar/ocultar destinos, estado operativo, métricas |

- Al registrarse, todos quedan como **turista**: el rol nunca se elige en el registro (el trigger solo guarda id y nombre).
- **Nadie puede cambiar su propio rol desde el cliente**: el cliente solo puede actualizar `nombre` y `nivel_ocupacion_preferido`, y un trigger rechaza cualquier cambio de rol que no venga de la función `cambiar_rol_usuario()`.
- `cambiar_rol_usuario()` solo la ejecuta un administrador, no permite quitarse el propio rol de administrador y nunca deja el sistema sin administradores.
- Ocultar pantallas en la app es solo comodidad; la seguridad real está en el backend (`requiereRol`, que lee el rol de la base y no del cuerpo de la petición) y en RLS.

## Opción A: script (recomendado)

Crea `turista@misanandres.test`, `tecnico@misanandres.test` y `admin@misanandres.test` con su rol. Requiere la migración `20261016120000_roles_y_tickets` aplicada y, en `backend/.env`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API keys → secret / service_role). La service role key solo la usa este script en tu PC; el servidor no la necesita.

La contraseña **no se guarda en ningún archivo**: se pasa solo para esa ejecución.

```powershell
cd backend
$env:DEMO_PASSWORD = "<elige una contraseña de 8+ caracteres>"
npm run usuarios:demo
Remove-Item Env:DEMO_PASSWORD
```

Es re-ejecutable: si los usuarios ya existen, les actualiza la contraseña y el rol.

## Opción B: a mano desde el panel de Supabase

1. **Authentication → Users → Add user → Create new user**: correo (por ejemplo `tecnico@misanandres.test`), contraseña y marca **Auto Confirm User**. El trigger crea su perfil en `public.usuario` como turista.
2. Para darle otro rol, abre **SQL Editor** y ejecuta (como `postgres`, que sí puede cambiar roles):

```sql
update public.usuario
set rol = 'tecnico'            -- 'turista' | 'tecnico' | 'administrador'
where id_usuario = (select id from auth.users where email = 'tecnico@misanandres.test');
```

3. Comprueba:

```sql
select a.email, u.rol from public.usuario u join auth.users a on a.id = u.id_usuario order by u.rol;
```

Para el **primer administrador** siempre hace falta este paso por SQL (o el script): desde la app solo un administrador puede promover a otros. Después, el administrador puede cambiar roles desde la pestaña **Usuarios**.
