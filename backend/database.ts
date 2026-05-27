import fs from 'fs';
import path from 'path';
import { DatabaseSchema, Usuario, Categoria, Producto, Cliente, Proveedor, Caja } from './types';

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');

// Helper to hash password very simply (for simulation without heavy deps)
function hashPassword(pwd: string): string {
  // Simple fake secure hash mapping for simulation
  return `sha256_${pwd}_mock`;
}

const INITIAL_CATEGORIES: Categoria[] = [
  { id: 1, nombre: 'Tecnología', descripcion: 'Equipos electrónicos, computadoras y accesorios' },
  { id: 2, nombre: 'Línea Blanca', descripcion: 'Electrodomésticos grandes para el hogar' },
  { id: 3, nombre: 'Herramientas', descripcion: 'Herramientas manuales y eléctricas de ferretería' },
  { id: 4, nombre: 'Alimentos y Bebidas', descripcion: 'Insumos de consumo inmediato o despensa' },
  { id: 5, nombre: 'Papelería y Oficina', descripcion: 'Materiales escolares, cuadernos y papelería' }
];

const INITIAL_PRODUCTS: Producto[] = [
  {
    id: 1,
    codigo: 'TEC-001',
    nombre: 'Laptop Pro 15"',
    descripcion: 'Laptop ultradelgada con procesador de última generación, 16GB RAM, 512GB SSD',
    precioIndex: 1,
    precio_compra: 850.00,
    precio_venta: 1200.00,
    stock: 12,
    stock_minimo: 5,
    categoria_id: 1,
    estado: 'ACTIVO'
  },
  {
    id: 2,
    codigo: 'TEC-002',
    nombre: 'Mouse Inalámbrico Smart',
    descripcion: 'Mouse ergonómico silencioso recargable con DPI ajustable',
    precioIndex: 2,
    precio_compra: 15.00,
    precio_venta: 29.99,
    stock: 45,
    stock_minimo: 15,
    categoria_id: 1,
    estado: 'ACTIVO'
  },
  {
    id: 3,
    codigo: 'LBA-201',
    nombre: 'Refrigerador Inverter 400L',
    descripcion: 'Refrigerador de alta eficiencia con panel digital y tecnología no-frost',
    precioIndex: 3,
    precio_compra: 420.00,
    precio_venta: 650.00,
    stock: 4,
    stock_minimo: 3,
    categoria_id: 2,
    estado: 'ACTIVO'
  },
  {
    id: 4,
    codigo: 'HER-301',
    nombre: 'Taladro Percutor 750W',
    descripcion: 'Taladro profesional con velocidad variable y mandril de 13mm',
    precioIndex: 4,
    precio_compra: 45.00,
    precio_venta: 79.90,
    stock: 2, // Alerta: Bajo stock
    stock_minimo: 10,
    categoria_id: 3,
    estado: 'ACTIVO'
  },
  {
    id: 5,
    codigo: 'HER-302',
    nombre: 'Juego de Destornilladores (24 pcs)',
    descripcion: 'Destornilladores de precisión cromo-vanadio, mango antideslizante',
    precioIndex: 5,
    precio_compra: 12.50,
    precio_venta: 24.50,
    stock: 0, // Alerta: Agotado
    stock_minimo: 5,
    categoria_id: 3,
    estado: 'ACTIVO'
  },
  {
    id: 6,
    codigo: 'ALB-401',
    nombre: 'Café Orgánico Express 250g',
    descripcion: 'Café de grano tostado artesanal premium, aroma intenso',
    precioIndex: 6,
    precio_compra: 3.50,
    precio_venta: 7.50,
    stock: 120,
    stock_minimo: 20,
    categoria_id: 4,
    estado: 'ACTIVO'
  },
  {
    id: 7,
    codigo: 'PAP-501',
    nombre: 'Resma Papel Carta Ultra (500 hojas)',
    descripcion: 'Papel multiuso de excelente nitidez 75g/m²',
    precioIndex: 7,
    precio_compra: 3.20,
    precio_venta: 5.90,
    stock: 80,
    stock_minimo: 30,
    categoria_id: 5,
    estado: 'ACTIVO'
  }
];

const INITIAL_CLIENTS: Cliente[] = [
  { id: 1, nombre: 'Consumidor Final', documento: '99999999', telefono: '000000000', email: 'cf@stockflow.com', direccion: 'Ciudad' },
  { id: 2, nombre: 'Inversiones Omega S.A.', documento: '20601234567', telefono: '987654321', email: 'compras@omega.com', direccion: 'Av. Las Gardenias 452, San Isidro' },
  { id: 3, nombre: 'Ana María Rodríguez', documento: '45892150', telefono: '912345678', email: 'anamaria@gmail.com', direccion: 'Calle Las Orquídeas 120, San Borja' },
  { id: 4, nombre: 'Sofía Valenzuela Beltrán', documento: '71025530', telefono: '954211025', email: 'sofia.val@outlook.com', direccion: 'Jr. Miguel Grau 890, Miraflores' }
];

const INITIAL_SUPPLIERS: Proveedor[] = [
  { id: 1, nombre: 'Distribuidora Global del Pacífico', nif: '20509876543', telefono: '014445566', email: 'ventas@distglobal.com', direccion: 'Av. Industrial 1250, Cercado' },
  { id: 2, nombre: 'Alimentos y Bebidas del Norte', nif: '20102548963', telefono: '018889977', email: 'contacto@alimentosnorte.com', direccion: 'Calle Los Arrozales 330, Chiclayo' },
  { id: 3, nombre: 'Ferretería & Soluciones Industriales', nif: '20205566778', telefono: '017772211', email: 'soporte@ferresoluciones.com', direccion: 'Av. Argentina 840, Callao' }
];

const INITIAL_USERS: Usuario[] = [
  {
    id: 1,
    username: 'admin',
    passwordHash: hashPassword('admin123'),
    nombre: 'Admin General',
    email: 'admin@stockflow.com',
    rol: 'ADMIN',
    activo: true
  },
  {
    id: 2,
    username: 'cajero',
    passwordHash: hashPassword('cajero123'),
    nombre: 'Carlos Martínez',
    email: 'carlos@stockflow.com',
    rol: 'CAJERO',
    activo: true
  },
  {
    id: 3,
    username: 'bodeguero',
    passwordHash: hashPassword('bodeguero123'),
    nombre: 'Bernardo Gómez',
    email: 'bernardo@stockflow.com',
    rol: 'BODEGUERO',
    activo: true
  },
  {
    id: 4,
    username: 'vendedor',
    passwordHash: hashPassword('vendedor123'),
    nombre: 'Vanessa Díaz',
    email: 'vanessa@stockflow.com',
    rol: 'VENDEDOR',
    activo: true
  }
];

// Prepopulate some cash drawer sessions (Closed ones, and one Open for Cashier)
const INITIAL_CAJAS: Caja[] = [
  {
    id: 1,
    fecha_apertura: '2026-05-25T08:00:00.000Z',
    fecha_cierre: '2026-05-25T18:00:00.000Z',
    monto_apertura: 100.00,
    monto_ventas: 520.00,
    monto_ingresos: 0.00,
    monto_egresos: 20.00, // egreso por compra de bolsas u otros
    monto_cierre: 600.00,
    total_calculado: 600.00,
    estado: 'CERRADA',
    usuario_apertura_id: 2,
    usuario_cierre_id: 2,
    observaciones: 'Cierre del día anterior conforme y cuadrado.'
  },
  {
    id: 2,
    fecha_apertura: '2026-05-26T08:30:00.000Z',
    fecha_cierre: null,
    monto_apertura: 150.00,
    monto_ventas: 236.40,
    monto_ingresos: 50.00, // Cambio ingresado sencillo
    monto_egresos: 10.00, // Cafecito bodega
    monto_cierre: null,
    total_calculado: 426.40,
    estado: 'ABIERTA',
    usuario_apertura_id: 2,
    usuario_cierre_id: null,
    observaciones: 'Caja del día iniciada con sencillo suficiente.'
  }
];

export function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const dataStr = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(dataStr);
    }
  } catch (error) {
    console.error('Error reading DB file, reverting to default mock data', error);
  }

  // Create default db
  const defaultDb: DatabaseSchema = {
    usuarios: INITIAL_USERS,
    categorias: INITIAL_CATEGORIES,
    productos: INITIAL_PRODUCTS,
    clientes: INITIAL_CLIENTS,
    proveedores: INITIAL_SUPPLIERS,
    ventas: [
      {
        id: 1,
        fecha: '2026-05-25T10:15:00.000Z',
        cliente_id: 3,
        total: 59.98,
        metodo_pago: 'EFECTIVO',
        usuario_id: 2,
        correlativo: 'V001-000001',
        caja_id: 1
      },
      {
        id: 2,
        fecha: '2026-05-25T14:30:00.000Z',
        cliente_id: 2,
        total: 440.01,
        metodo_pago: 'TRANSFERENCIA',
        usuario_id: 2,
        correlativo: 'V001-000002',
        caja_id: 1
      },
      {
        id: 3,
        fecha: '2026-05-26T09:45:00.000Z',
        cliente_id: 1,
        total: 236.40,
        metodo_pago: 'TARJETA',
        usuario_id: 2,
        correlativo: 'V001-000003',
        caja_id: 2
      }
    ],
    detalle_ventas: [
      { id: 1, venta_id: 1, producto_id: 2, cantidad: 2, precio_unitario: 29.99, subtotal: 59.98 },
      { id: 2, venta_id: 2, producto_id: 6, cantidad: 4, precio_unitario: 7.50, subtotal: 30.00 },
      { id: 3, venta_id: 2, producto_id: 7, cantidad: 10, precio_unitario: 5.90, subtotal: 59.00 },
      { id: 4, venta_id: 2, producto_id: 4, cantidad: 2, precio_unitario: 79.90, subtotal: 159.80 },
      { id: 5, venta_id: 2, producto_id: 2, cantidad: 3, precio_unitario: 29.99, subtotal: 89.97 },
      { id: 6, venta_id: 2, producto_id: 6, cantidad: 12, precio_unitario: 7.50, subtotal: 90.00 },
      { id: 7, venta_id: 3, producto_id: 1, cantidad: 1, precio_unitario: 1200.00, subtotal: 1200.00 }
    ],
    compras: [
      {
        id: 1,
        fecha: '2026-05-25T11:00:00.000Z',
        proveedor_id: 1,
        total: 150.00,
        usuario_id: 3,
        correlativo: 'C001-000001'
      }
    ],
    detalle_compras: [
      { id: 1, compra_id: 1, producto_id: 2, cantidad: 10, precio_unitario: 15.00, subtotal: 150.00 }
    ],
    movimientos_inventario: [
      { id: 1, producto_id: 1, tipo: 'ENTRADA', cantidad: 12, motivo: 'Stock inicial', fecha: '2026-05-24T09:00:00.000Z', usuario_id: 1, referencia: 'INICIAL' },
      { id: 2, producto_id: 2, tipo: 'ENTRADA', cantidad: 40, motivo: 'Stock inicial', fecha: '2026-05-24T09:00:00.000Z', usuario_id: 1, referencia: 'INICIAL' },
      { id: 3, producto_id: 3, tipo: 'ENTRADA', cantidad: 4, motivo: 'Stock inicial', fecha: '2026-05-24T09:00:00.000Z', usuario_id: 1, referencia: 'INICIAL' },
      { id: 4, producto_id: 4, tipo: 'ENTRADA', cantidad: 4, motivo: 'Stock inicial', fecha: '2026-05-24T09:00:00.000Z', usuario_id: 1, referencia: 'INICIAL' },
      { id: 5, producto_id: 6, tipo: 'ENTRADA', cantidad: 136, motivo: 'Stock inicial', fecha: '2026-05-24T09:00:00.000Z', usuario_id: 1, referencia: 'INICIAL' },
      { id: 6, producto_id: 7, tipo: 'ENTRADA', cantidad: 90, motivo: 'Stock inicial', fecha: '2026-05-24T09:00:00.000Z', usuario_id: 1, referencia: 'INICIAL' },
      { id: 7, producto_id: 2, tipo: 'SALIDA', cantidad: 2, motivo: 'Venta #V001-000001', fecha: '2026-05-25T10:15:00.000Z', usuario_id: 2, referencia: 'VENTA #1' },
      { id: 8, producto_id: 6, tipo: 'SALIDA', cantidad: 4, motivo: 'Venta #V001-000002', fecha: '2026-05-25T14:30:00.000Z', usuario_id: 2, referencia: 'VENTA #2' },
      { id: 9, producto_id: 7, tipo: 'SALIDA', cantidad: 10, motivo: 'Venta #V001-000002', fecha: '2026-05-25T14:30:00.000Z', usuario_id: 2, referencia: 'VENTA #2' },
      { id: 10, producto_id: 4, tipo: 'SALIDA', cantidad: 2, motivo: 'Venta #V001-000002', fecha: '2026-05-25T14:30:00.000Z', usuario_id: 2, referencia: 'VENTA #2' },
      { id: 11, producto_id: 2, tipo: 'SALIDA', cantidad: 3, motivo: 'Venta #V001-000002', fecha: '2026-05-25T14:30:00.000Z', usuario_id: 2, referencia: 'VENTA #2' },
      { id: 12, producto_id: 6, tipo: 'SALIDA', cantidad: 12, motivo: 'Venta #V001-000002', fecha: '2026-05-25T14:30:00.000Z', usuario_id: 2, referencia: 'VENTA #2' },
      { id: 13, producto_id: 2, tipo: 'ENTRADA', cantidad: 10, motivo: 'Compra #C001-000001', fecha: '2026-05-25T11:00:00.000Z', usuario_id: 3, referencia: 'COMPRA #1' }
    ],
    cajas: INITIAL_CAJAS
  };

  // Adjust detailed subtotal matching for sales details
  defaultDb.detalle_ventas[5].subtotal = 90.00;
  // Let's rewrite/save defaultDb
  saveDatabase(defaultDb);
  return defaultDb;
}

export function saveDatabase(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing DB file', error);
  }
}

export function generateSimpleToken(user: Usuario): string {
  // Simple JWT-like payload simulation encoded as base64 or secure-looking string
  const payload = {
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  return 'sf-jwt.' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifySimpleToken(token: string): any {
  if (!token || !token.startsWith('sf-jwt.')) return null;
  try {
    const b64 = token.split('.')[1];
    const payloadStr = Buffer.from(b64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadStr);
    if (payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}
