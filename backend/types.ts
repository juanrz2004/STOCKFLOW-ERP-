export interface Usuario {
  id: number;
  username: string;
  passwordHash: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'CAJERO' | 'BODEGUERO' | 'VENDEDOR';
  activo: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioIndex: number; // For rendering or sorting
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  categoria_id: number;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Cliente {
  id: number;
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  nif: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface Venta {
  id: number;
  fecha: string;
  cliente_id: number;
  total: number;
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  usuario_id: number;
  correlativo: string;
  caja_id: number | null;
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  fecha: string;
  proveedor_id: number;
  total: number;
  usuario_id: number;
  correlativo: string;
}

export interface DetalleCompra {
  id: number;
  compra_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: string;
  fecha: string;
  usuario_id: number;
  referencia: string;
}

export interface Caja {
  id: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_apertura: number;
  monto_ventas: number;
  monto_ingresos: number;
  monto_egresos: number;
  monto_cierre: number | null;
  total_calculado: number; // monto_apertura + monto_ventas + monto_ingresos - monto_egresos
  estado: 'ABIERTA' | 'CERRADA';
  usuario_apertura_id: number;
  usuario_cierre_id: number | null;
  observaciones: string;
}

export interface DatabaseSchema {
  usuarios: Usuario[];
  categorias: Categoria[];
  productos: Producto[];
  clientes: Cliente[];
  proveedores: Proveedor[];
  ventas: Venta[];
  detalle_ventas: DetalleVenta[];
  compras: Compra[];
  detalle_compras: DetalleCompra[];
  movimientos_inventario: MovimientoInventario[];
  cajas: Caja[];
}
