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

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — compilar para producción.
- `npm start` — iniciar en producción.
