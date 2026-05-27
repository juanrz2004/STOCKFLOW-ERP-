export interface UserPayload {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'CAJERO' | 'BODEGUERO' | 'VENDEDOR';
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

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export interface Venta {
  id: number;
  fecha: string;
  cliente_id: number;
  cliente_nombre?: string;
  total: number;
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  usuario_id: number;
  usuario_nombre?: string;
  correlativo: string;
  caja_id: number | null;
  detalles?: DetalleVenta[];
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  producto_nombre?: string;
  producto_codigo?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  fecha: string;
  proveedor_id: number;
  proveedor_nombre?: string;
  total: number;
  usuario_id: number;
  usuario_nombre?: string;
  correlativo: string;
  detalles?: DetalleCompra[];
}

export interface DetalleCompra {
  id: number;
  compra_id: number;
  producto_id: number;
  producto_nombre?: string;
  producto_codigo?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  producto_nombre?: string;
  producto_codigo?: string;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: string;
  fecha: string;
  usuario_id: number;
  usuario_nombre?: string;
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
  total_calculado: number;
  estado: 'ABIERTA' | 'CERRADA';
  usuario_apertura_id: number;
  usuario_cierre_id: number | null;
  observaciones: string;
}

export interface DashboardMetrics {
  ventasHoyTotal: number;
  cantidadAgotados: number;
  cantidadStockBajo: number;
  gananciasTotales: number;
  cashFlowActual: number;
  agotadosList: Producto[];
  stockBajoList: Producto[];
  masVendidos: Array<{ nombre: string; codigo: string; cant: number; sub: number }>;
  actividadReciente: Array<{
    id: string;
    tipo: 'VENTA' | 'COMPRA' | 'CAJA_APERTURA' | 'CAJA_CIERRE';
    descripcion: string;
    fecha: string;
    icon: string;
  }>;
  cajaAbierta: boolean;
}

export interface ReportData {
  chartSales: Array<{ name: string; total: number }>;
  chartPayment: Array<{ name: string; value: number }>;
  chartCategories: Array<{ name: string; value: number }>;
  totals: {
    totalVendido: number;
    totalComprado: number;
    productosRegistrados: number;
    clientesRegistrados: number;
    proveedoresRegistrados: number;
  };
}
