# ZariniProfit

Aplicación moderna para controlar tu negocio: inventario, ventas, gastos, ganancias y reportes. Diseñada para funcionar perfecto en teléfono y computador.

Construida con **Next.js 15 (App Router) + TypeScript + TailwindCSS + Supabase (Auth + Postgres)** y lista para desplegar en **Vercel**.

## Funcionalidades

- **Login / Registro** con email y contraseña (verificación de email opcional) y recuperación de contraseña.
- **Dashboard** con ganancias del día/mes, gráfica de los últimos 7 días, productos más vendidos y alertas de stock bajo.
- **Inventario (Productos)** con CRUD completo, búsqueda, filtro por categoría, valor de inventario y ganancia potencial.
- **Ventas** con registro rápido (producto, cantidad, precio, método de pago) y descuento automático de stock.
- **Gastos** con categorías.
- **Reportes** por rango de fechas, gráficas por método de pago y categoría, y **exportación a CSV**.
- **Ajustes** de perfil (nombre, negocio, moneda).
- Totalmente **responsive** (sidebar en escritorio, barra inferior en móvil).

## Requisitos

- Cuenta de [Supabase](https://supabase.com) (gratis).
- Cuenta de [Vercel](https://vercel.com) (gratis).
- Node.js 18.18+ (recomendado 20+).

## 1. Configurar Supabase

1. Crea un nuevo proyecto en Supabase.
2. Ve a **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](./supabase/schema.sql) y ejecútalo.
   - Crea las tablas `profiles`, `productos`, `ventas`, `gastos`, sus políticas de seguridad (RLS) y un trigger que crea el perfil automáticamente al registrarse.
3. En **Authentication → Providers → Email**, deja habilitado el email. (Para una prueba rápida puedes desactivar "Confirm email"; si lo dejas activo, el usuario deberá confirmar su correo.)
4. Copia la **Project URL** y la **anon public key** desde **Project Settings → API**.

## 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

(Puedes copiar `.env.local.example` como base).

## 3. Instalar y ejecutar localmente

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 4. Desplegar en Vercel

1. Sube este repositorio a GitHub (o GitLab/Bitbucket).
2. En Vercel, **Add New → Project** e importa el repositorio.
3. Vercel detectará automáticamente Next.js. No hace falta configuración extra.
4. Agrega las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en **Settings → Environment Variables**.
5. Deploy.

> **Importante:** si activas la verificación de email, en Supabase **Authentication → URL Configuration** agrega tu dominio de Vercel (`https://tu-app.vercel.app`) como *Site URL*.

## Estructura del proyecto

```
app/
  (auth)/          # login, registro, recuperar contraseña
  (app)/           # dashboard, productos, ventas, gastos, reportes, ajustes
components/        # UI, shell, contexto
hooks/             # use-profile
lib/
  supabase/        # clientes y middleware de sesión
  utils.ts         # formato de moneda, fechas, CSV
supabase/schema.sql
middleware.ts      # protección de rutas
```

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — compilar para producción.
- `npm start` — iniciar en producción.
