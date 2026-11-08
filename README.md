# Mikuy · Plataforma de delivery para Perú

> «Mikuy» significa «comer» en quechua. Marca, logotipo y diseño propios.

Plataforma web de delivery de comida, bebidas, supermercado y farmacia: tienda para clientes (móvil primero), panel administrativo independiente, seguimiento en tiempo real, cupones, pagos con efectivo, Yape, Plin y tarjeta (Mercado Pago), todo sobre Supabase con seguridad a nivel de base de datos.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, Realtime) · GSAP · Framer Motion · Mapbox GL · Recharts · Zod · Vercel.

---

## 1. Puesta en marcha (paso a paso)

### 1.1 Crear el proyecto en Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) (región recomendada: `sa-east-1`, São Paulo).
2. **SQL Editor** → ejecuta, en este orden, el contenido de:
   1. `supabase/migrations/20261107000001_schema.sql`
   2. `supabase/migrations/20261107000002_rls.sql`
   3. `supabase/migrations/20261107000003_functions.sql`
   4. `supabase/migrations/20261107000004_storage_realtime.sql`
   5. `supabase/migrations/20261108000005_harden_function_grants.sql`
   6. *(Opcional, datos de demostración)* `supabase/seed/demo_data.sql`

   Con la CLI: `supabase link --project-ref <ref>` y `supabase db push` (aplica las migraciones); el seed se ejecuta aparte.
3. **Authentication → URL Configuration**:
   - *Site URL*: `https://tu-dominio.com` (en local `http://localhost:3000`).
   - *Redirect URLs*: `https://tu-dominio.com/auth/confirm` y `http://localhost:3000/auth/confirm`.
4. **Authentication → Providers → Email**: deja activo «Confirm email» en producción. Configura un SMTP propio (Authentication → SMTP) para no depender del límite del correo de prueba de Supabase.
5. **Crear el primer administrador** (el registro público siempre crea clientes):
   1. Regístrate en la web con tu correo.
   2. En el SQL Editor ejecuta:
      ```sql
      select public.promote_to_admin('tu-correo@dominio.com');
      ```
   Esta función no puede llamarse desde la API (solo SQL Editor / service role).

### 1.2 Variables de entorno
Copia `.env.example` a `.env.local` y complétalo. En Vercel: *Project → Settings → Environment Variables* (y vuelve a desplegar).

| Variable | Obligatoria | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon/publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Para pagos con tarjeta y repartidores | Solo servidor. Nunca la expongas con `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | Sí en producción | URL pública; se usa en webhooks, correos y enlaces |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Opcional | Mapa de seguimiento y búsqueda de direcciones. Sin token se muestra un panel alternativo y el envío usa la ubicación del dispositivo |
| `MERCADOPAGO_ACCESS_TOKEN` | Para tarjetas | Credencial privada de Mercado Pago Perú |
| `MERCADOPAGO_WEBHOOK_SECRET` | Para tarjetas | Clave secreta de Webhooks para validar firmas |

### 1.3 Ejecutar en local
```bash
npm install
```
```bash
npm run dev
```

### 1.4 Desplegar en Vercel
1. Importa el repositorio en Vercel (framework: Next.js, sin configuración extra).
2. Carga las variables de entorno y despliega.
3. Actualiza en Supabase la *Site URL* y *Redirect URLs* con tu dominio.

---

## 2. Pagos (integración real, sin simulaciones)

Ningún pedido se muestra como pagado sin confirmación del proveedor. Todo pago nace en estado **pendiente**.

| Método | Cómo se confirma |
|---|---|
| **Efectivo** | El administrador marca «Confirmar recibido» cuando el repartidor entrega el dinero. |
| **Yape / Plin** | Configura en *Admin → Configuración* el número y titular. El cliente paga y envía su N.° de operación → queda **Por verificar** → el admin lo confirma o rechaza tras revisarlo en su app. *(Yape/Plin no ofrecen una API pública de confirmación para comercios pequeños; para automatizarlo puedes usar una pasarela que los soporte, p. ej. Mercado Pago, Izipay o Culqi, y reemplazar este flujo.)* |
| **Tarjeta** | Mercado Pago Checkout Pro. El webhook `POST /api/payments/mercadopago/webhook` verifica la firma `x-signature` (HMAC‑SHA256), **consulta el pago en la API de Mercado Pago** y lo aplica con `apply_card_payment`, que exige que el importe coincida con el total del pedido. Un admin no puede aprobar tarjetas manualmente, y un pedido con tarjeta no puede aceptarse hasta que el pago esté aprobado. |

**Configurar Mercado Pago:**
1. [mercadopago.com.pe/developers](https://www.mercadopago.com.pe/developers) → *Tus integraciones* → crea una aplicación (Checkout Pro).
2. Copia el *Access Token* (usa el de prueba `TEST-…` mientras validas).
3. *Webhooks* → URL `https://tu-dominio.com/api/payments/mercadopago/webhook`, evento **Pagos**. Copia la *clave secreta*.
4. Activa «Tarjeta» en *Admin → Configuración*.

---

## 3. Arquitectura

```
src/
├─ app/
│  ├─ (store)/            Tienda del cliente: inicio, búsqueda, categorías, restaurante,
│  │                      carrito, checkout, seguimiento /pedidos/[id], /cuenta/*, afiliados
│  ├─ (auth)/             login, registro, recuperar, actualizar-clave
│  ├─ admin/              Panel administrativo independiente (layout con requireAdmin)
│  ├─ repartidor/[token]  App web del repartidor (enlace personal revocable)
│  ├─ api/                Webhook de Mercado Pago y API del repartidor
│  └─ auth/confirm        Confirmación de correos y recuperación de contraseña
├─ components/            UI reutilizable (ui/, layout/, home/, restaurant/, cart/, checkout/,
│                         tracking/, account/, admin/, courier/, motion/)
├─ hooks/                 use-cart, use-quote, use-selected-address
├─ lib/
│  ├─ supabase/           Clientes browser / server / service-role y refresco de sesión (proxy)
│  ├─ actions/            Server Actions (auth, cuenta, pedidos, admin)
│  ├─ services/           Consultas del catálogo y cuenta
│  ├─ validation/         Esquemas Zod de todos los formularios
│  ├─ payments/           Mercado Pago (preferencias, consulta, verificación de firma)
│  └─ auth.ts             getSession / requireUser / requireAdmin
├─ proxy.ts               (antes "middleware") refresco de sesión y redirecciones
supabase/
├─ migrations/            Esquema, RLS, funciones de negocio, storage y realtime
├─ seed/demo_data.sql     Datos de demostración (marcados is_demo)
└─ tests/                 Pruebas SQL de reglas de negocio y RLS
```

### Base de datos
Tablas: `profiles`, `restaurants`, `restaurant_categories`, `categories`, `products`, `orders`, `order_items`, `order_status_history`, `addresses`, `payments`, `coupons`, `coupon_usages`, `reviews`, `favorites`, `delivery_locations`, `notifications`, `couriers`, `platform_settings`, `admin_audit_logs`.

Lógica crítica en la base de datos (funciones `SECURITY DEFINER`):
- `quote_order` / `place_order`: precios **siempre desde la BD**, validación de opciones, stock (con bloqueo de filas), horario, zona de reparto (Haversine), envío por distancia, envío gratis, cupones (vigencia, límites globales y por cliente) y comisión. `place_order` es **atómico e idempotente** (`unique(user_id, idempotency_key)` + lock por usuario): un doble clic nunca duplica el pedido.
- `admin_update_order_status`, `admin_assign_courier`: transiciones válidas del flujo de 7 estados; cancelar repone stock y libera el cupón.
- `cancel_my_order`, `report_wallet_payment`, `submit_review` (solo pedidos entregados, uno por pedido), `admin_review_payment`, `apply_card_payment` (solo service role), `courier_*` (solo service role), `admin_dashboard_stats`, `admin_purge_demo_data`.
- Triggers: alta de perfil como `customer`, historial y notificaciones por cambio de estado, recálculo de calificación, auditoría de cambios administrativos.

### Seguridad
- **RLS activado en todas las tablas.** Un cliente solo lee sus pedidos, ítems, pagos, direcciones, notificaciones y cupones usados; la ubicación del repartidor solo es visible mientras su pedido está en ruta.
- **Roles `admin` / `customer`.** El registro ignora cualquier rol enviado; un trigger impide cambiar `role`/`status` desde la API (además de privilegios por columna). Solo `promote_to_admin` (SQL Editor) asigna administradores.
- **Panel admin protegido en 3 capas:** redirección en `proxy.ts`, `requireAdmin()` en el layout y en cada Server Action (rol leído de la BD), y RLS/funciones que vuelven a exigir `is_admin()`.
- Contraseñas gestionadas por Supabase Auth (nunca se guardan en tablas propias). Validación Zod en todos los formularios. Redirecciones `next` solo internas. Cabeceras de seguridad. Webhooks con firma HMAC y verificación contra la API del proveedor. Tokens de repartidor almacenados como hash SHA‑256.
- Auditoría en `admin_audit_logs` (visible en *Admin → Auditoría*).

### Tiempo real
Supabase Realtime (respetando RLS) para: estado del pedido, historial, ubicación del repartidor, pagos y notificaciones del cliente; y nuevos pedidos en el panel admin. El seguimiento tiene además un refresco de respaldo cada 30 s.

### Repartidores
El admin registra repartidores y genera un **enlace personal** (se muestra una vez y puede revocarse). Desde `/repartidor/<token>` el repartidor ve sus pedidos, marca «recogido / en camino / entregado» y, **solo si lo autoriza**, comparte su ubicación GPS (puede revocarla en cualquier momento).

### Datos de demostración
`supabase/seed/demo_data.sql` carga 10 negocios, 37 productos y 3 cupones con `is_demo = true` (fotografías de Unsplash). *Admin → Configuración → Eliminar datos demo* los quita sin tocar pedidos reales.

---

## 4. Pruebas y calidad

```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
npm test
```
```bash
DB_SUPERUSER=postgres npm run test:db
```

- `npm test` (Vitest): firma de webhooks de Mercado Pago (válida, manipulada, replay), validaciones de registro/checkout/admin, utilidades.
- `npm run test:db`: aplica migraciones + seed en un PostgreSQL local con una simulación mínima de Supabase y ejecuta más de 35 aserciones: registro siempre como cliente, imposibilidad de auto‑promoverse, aislamiento entre clientes (pedidos, pagos, direcciones, notificaciones), cálculo de precios y opciones, cupones y topes, idempotencia, stock, productos agotados, zona de reparto, transiciones de estado, bloqueo de tarjetas no pagadas, webhook con importe incorrecto, reseñas, auditoría y funciones internas no invocables.

## 5. Pendientes antes de operar comercialmente
- Revisar con un abogado los **términos, privacidad (Ley 29733)** y habilitar el **Libro de Reclamaciones** virtual (obligatorio en Perú).
- Emisión de **comprobantes electrónicos (SUNAT)** mediante un OSE/PSE: no incluido.
- Configurar SMTP propio y dominio de correo.
- Si deseas que los dueños de restaurantes gestionen su menú, se puede agregar un rol `restaurant_owner` (la columna `restaurants.owner_id` ya existe).
