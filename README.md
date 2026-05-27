# 📦 StockFlow — v2 (COP)

Plataforma de Punto de Venta (POS), Control de Caja Chica e Inventarios en tiempo real optimizada para pesos colombianos ($ COP).

## ✨ Novedades v2

### Frontend
- **Moneda Local ($ COP)** — Interfaces, reportes, arqueos y comprobantes de venta adaptados al formato numérico colombiano ideal para transacciones en pesos, eliminando decimales innecesarios para lecturas limpias.
- **Editar, borrar e introducir datos** — Módulos interactivos completos y seguros (inventario, categorías, clientes y proveedores) con diálogos de verificación y retroalimentación interactiva.
- **Acceso Pulido** — Sistema de inicio de sesión optimizado que remueve espacios accidentales (trim) de usuario y contraseña en cliente y servidor, previniendo fallos al ingresar como administrador (`admin` / `admin123`).
- **Punto de Venta (POS) Integrado** — Selector rápido de productos con buscador inteligente (por código dactilar, nombre o marca), asignación de clientes, control de pago (efectivo, débito/crédito, transferencia) y cálculo exacto de cambio.
- **Arqueo y Cajas por Turno** — Panel operativo para apertura, egreso de gastos, depósitos de sencillo, arqueo físico final con cálculo de discrepancias (faltantes o sobrantes) y cierre con registro contable.
- **Toast Notifications** — Feedback visual elegante con animaciones de éxito y error integradas en el flujo de operaciones cotidianas del personal de tienda.

### Backend (APIs principales)
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/auth/login` | POST | Comprobación de credenciales con desinfección de contraseñas |
| `/api/auth/me` | GET | Identificación y validación del usuario activo |
| `/api/dashboard` | GET | Resumen de ventas, ganancias, alertas de stock mínimo y actividad |
| `/api/productos` | GET/POST/PUT/DELETE | Gestión de catálogo de productos (SKUs, costos, precios, stock) |
| `/api/categorias` | GET/POST/PUT/DELETE | Categorización de mercancía para estadísticas y filtros del POS |
| `/api/clientes` | GET/POST/PUT/DELETE | Historial de clientes, contacto y cálculo agregado de consumo |
| `/api/proveedores` | GET/POST/PUT/DELETE | Proveedores y distribuidores para órdenes de reabastecimiento |
| `/api/ventas` | GET/POST | Registro directo de facturas en POS y reporte histórico |
| `/api/compras` | GET/POST | Ingreso manual de mercadería comprada al por mayor con cálculo de costo |
| `/api/caja/activa` | GET | Estado, saldo inicial, flujos de efectivo y turnos operativos actuales |
| `/api/caja/apertura` | POST | Apertura del turno diario de ventas con fondo inicial de caja |
| `/api/caja/cierre` | POST | Rendición del turno por arqueo físico e identificación de desviaciones |
| `/api/caja/operacion` | POST | Registro de depósitos o egresos manuales de efectivo en caja chica |

### Roles y permisos
| Acción | Vendedor | Cajero | Bodeguero | Administrador (Admin) |
|---|:---:|:---:|:---:|:---:|
| Ver catálogo de ventas | ✅ | ✅ | ✅ | ✅ |
| Registrar ventas (POS) | ✅ | ✅ | ❌ | ✅ |
| Consultar / Crear clientes | ✅ | ✅ | ❌ | ✅ |
| Aperturar / Cerrar caja | ❌ | ✅ | ❌ | ✅ |
| Operar ingresos/egresos caja | ❌ | ✅ | ❌ | ✅ |
| Gestionar inventario (CRUD) | ❌ | ❌ | ✅ | ✅ |
| Registrar compras / Restock | ❌ | ❌ | ✅ | ✅ |
| Ver reportes y ganancias | ❌ | ❌ | ❌ | ✅ |
| Administrar usuarios | ❌ | ❌ | ❌ | ✅ |

## 📁 Arquitectura y Caja de Herramientas (GitHub-ready)

El proyecto está óptimamente organizado en dos módulos independientes de producción siguiendo patrones profesionales de desarrollo full-stack:

* **`/backend`** (Módulo de Servidor):
  * `server.ts` — Inicializador del servidor y montaje inteligente del middleware de desarrollo de Vite.
  * `controllers.ts` — Rutas de endpoints de API para autorizaciones, transacciones POS, Arqueos y reportes.
  * `database.ts` — Motor de persistencia síncrono que actualiza y lee la base de datos simulada `db.json` en disco.
  * `types.ts` — Definición estricta de interfaces de TypeScript para todo el modelo de negocio.
* **`/front`** (Módulo de Cliente):
  * `src/` — Código fuente de la interfaz gráfica React 19 (Componentes modulares, paneles operacionales, contextos y visualizaciones).
  * `index.html` — Punto de entrada del cliente para Vite.
  * `vite.config.ts` — Configuración optimizada de empaquetado para compilar el cliente React hacia la raíz `dist/`.
  * `tsconfig.json` — Preajustes de TypeScript para desarrollo ágil y sin dependencias cruzadas.

## 🚀 Ejecución

### Desarrollar en Local (Vite + Express Backend integrado)
```bash
npm install
npm run dev
```

El servidor unificado iniciará en el puerto `3000` (`http://localhost:3000`).

### Compilar y levantar en Producción
```bash
npm run build
npm run start
```

La base de datos simula almacenamiento persistente en vivo mediante el archivo `db.json` ubicado en la raíz del proyecto.

## 👥 Usuarios Demo (Contraseña Segura)
Utilice los siguientes perfiles para validar las flujos de permisos:

- **Usuario:** `admin` | **Contraseña:** `admin123` *(ADMIN - Acceso de Control Total)*
- **Usuario:** `cajero` | **Contraseña:** `cajero123` *(CAJERO - Operación de ventas y control de caja)*
- **Usuario:** `bodeguero` | **Contraseña:** `bodeguero123` *(BODEGUERO - Abastecimiento, stock y proveedores)*
- **Usuario:** `vendedor` | **Contraseña:** `vendedor123` *(VENDEDOR - Pos de mostrador y consulta)*
