import { Router, Request, Response, NextFunction } from 'express';
import { loadDatabase, saveDatabase, generateSimpleToken, verifySimpleToken } from './database';
import { Producto, Venta, DetalleVenta, Compra, DetalleCompra, MovimientoInventario, Caja, Cliente, Proveedor } from './types';

export const apiRouter = Router();

// Middleware to authenticate user and extract claims from Token
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    nombre: string;
    email: string;
    rol: 'ADMIN' | 'CAJERO' | 'BODEGUERO' | 'VENDEDOR';
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado. Inicie sesión.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const decoded = verifySimpleToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido. Vuelva a autenticarse.' });
  }

  req.user = decoded;
  next();
}

// Helper to check roles and restrict endpoint access
export function requireRoles(roles: Array<'ADMIN' | 'CAJERO' | 'BODEGUERO' | 'VENDEDOR'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!roles.includes(req.user.rol as any)) {
      return res.status(403).json({ error: `Acceso denegado. Su rol (${req.user.rol}) no tiene permisos para esta acción.` });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username: rawUsername, password: rawPassword } = req.body;
  const username = (rawUsername || '').trim();
  const password = (rawPassword || '').trim();
  if (!username || !password) {
    return res.status(400).json({ error: 'Debe ingresar usuario y contraseña.' });
  }

  const db = loadDatabase();
  const user = db.usuarios.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !user.activo) {
    return res.status(401).json({ error: 'El usuario no existe o está inactivo.' });
  }

  // Simulated simple verification: `sha256_${pwd}_mock`
  const passwordHashExpected = `sha256_${password}_mock`;
  if (user.passwordHash !== passwordHashExpected) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  const token = generateSimpleToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    }
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Sesión cerrada correctamente.' });
});

apiRouter.get('/auth/me', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// ==========================================
// DASHBOARD & ANALYTICS ENDPOINTS
// ==========================================

apiRouter.get('/dashboard', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  const today = new Date().toISOString().split('T')[0];

  // Ventas del día (monto total)
  const salesToday = db.ventas.filter(v => v.fecha.startsWith(today));
  const ventasHoyTotal = salesToday.reduce((sum, v) => sum + v.total, 0);

  // Inventario: Productos agotados y stock bajo
  const agotados = db.productos.filter(p => p.stock <= 0 && p.estado === 'ACTIVO');
  const stockBajo = db.productos.filter(p => p.stock > 0 && p.stock <= p.stock_minimo && p.estado === 'ACTIVO');

  // Ganancias (total ventas - costo total de productos vendidos)
  let totalVentasMonto = 0;
  let totalCostoVendido = 0;

  db.detalle_ventas.forEach(dv => {
    totalVentasMonto += dv.subtotal;
    const prod = db.productos.find(p => p.id === dv.producto_id);
    if (prod) {
      totalCostoVendido += (prod.precio_compra * dv.cantidad);
    }
  });
  const gananciasTotales = totalVentasMonto - totalCostoVendido;

  // Productos más vendidos (agregados por cantidad)
  const productSalesMap: Record<number, { nombre: string; codigo: string; cant: number; sub: number }> = {};
  db.detalle_ventas.forEach(dv => {
    const prod = db.productos.find(p => p.id === dv.producto_id);
    if (prod) {
      if (!productSalesMap[dv.producto_id]) {
        productSalesMap[dv.producto_id] = {
          nombre: prod.nombre,
          codigo: prod.codigo,
          cant: 0,
          sub: 0
        };
      }
      productSalesMap[dv.producto_id].cant += dv.cantidad;
      productSalesMap[dv.producto_id].sub += dv.subtotal;
    }
  });

  const masVendidos = Object.values(productSalesMap)
    .sort((a, b) => b.cant - a.cant)
    .slice(0, 5);

  // Flujo de caja activo (caja abierta)
  const cajaActiva = db.cajas.find(c => c.estado === 'ABIERTA');
  const cashFlowActual = cajaActiva ? cajaActiva.total_calculado : 0.00;

  // Actividad Reciente (combinada)
  const actividades: any[] = [];
  
  db.ventas.slice(-5).forEach(v => {
    actividades.push({
      id: `V-${v.id}`,
      tipo: 'VENTA',
      descripcion: `Venta registrada por un total de $${v.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })} (Ref: ${v.correlativo})`,
      fecha: v.fecha,
      icon: 'Tag'
    });
  });

  db.compras.slice(-5).forEach(c => {
    const provee = db.proveedores.find(p => p.id === c.proveedor_id);
    actividades.push({
      id: `C-${c.id}`,
      tipo: 'COMPRA',
      descripcion: `Compra recibida de ${provee ? provee.nombre : 'Proveedor'} por $${c.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      fecha: c.fecha,
      icon: 'Truck'
    });
  });

  db.cajas.slice(-3).forEach(c => {
    actividades.push({
      id: `CJ-${c.id}-${c.fecha_apertura}`,
      tipo: 'CAJA_APERTURA',
      descripcion: `Apertura de caja realizada con saldo inicial de $${c.monto_apertura.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      fecha: c.fecha_apertura,
      icon: 'Key'
    });
    if (c.fecha_cierre) {
      actividades.push({
        id: `CJ-${c.id}-${c.fecha_cierre}`,
        tipo: 'CAJA_CIERRE',
        descripcion: `Cierre de caja completado con saldo final de $${c.monto_cierre?.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        fecha: c.fecha_cierre,
        icon: 'Lock'
      });
    }
  });

  const actividadReciente = actividades
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 8);

  res.json({
    ventasHoyTotal,
    cantidadAgotados: agotados.length,
    cantidadStockBajo: stockBajo.length,
    gananciasTotales,
    cashFlowActual,
    agotadosList: agotados.slice(0, 5),
    stockBajoList: stockBajo.slice(0, 5),
    masVendidos,
    actividadReciente,
    cajaAbierta: !!cajaActiva
  });
});

// ==========================================
// CATEGORIES ENDPOINTS
// ==========================================

apiRouter.get('/categorias', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  res.json(db.categorias);
});

apiRouter.post('/categorias', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre de categoría es requerido.' });
  }

  const db = loadDatabase();
  const existing = db.categorias.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una categoría con ese nombre.' });
  }

  const nextId = db.categorias.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  const newCat = { id: nextId, nombre, descripcion: descripcion || '' };
  db.categorias.push(newCat);
  saveDatabase(db);

  res.status(201).json(newCat);
});

apiRouter.put('/categorias/:id', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { nombre, descripcion } = req.body;

  const db = loadDatabase();
  const idx = db.categorias.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Categoría no encontrada.' });
  }

  if (nombre) {
    const existing = db.categorias.find(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== id);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe otra categoría con ese nombre.' });
    }
    db.categorias[idx].nombre = nombre;
  }
  if (descripcion !== undefined) {
    db.categorias[idx].descripcion = descripcion;
  }

  saveDatabase(db);
  res.json(db.categorias[idx]);
});

apiRouter.delete('/categorias/:id', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const db = loadDatabase();

  const idx = db.categorias.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Categoría no encontrada.' });
  }

  // Check if any product is assigned to this category
  const assigned = db.productos.some(p => p.categoria_id === id);
  if (assigned) {
    return res.status(400).json({ error: 'No se puede eliminar la categoría porque tiene productos asignados. Reasigne los productos primero.' });
  }

  db.categorias.splice(idx, 1);
  saveDatabase(db);
  res.json({ success: true, message: 'Categoría eliminada con éxito.' });
});

// ==========================================
// PRODUCTS ENDPOINTS
// ==========================================

apiRouter.get('/productos', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  res.json(db.productos);
});

apiRouter.post('/productos', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const { codigo, nombre, descripcion, precio_compra, precio_venta, stock, stock_minimo, categoria_id } = req.body;
  if (!codigo || !nombre || precio_compra === undefined || precio_venta === undefined || stock === undefined || stock_minimo === undefined || !categoria_id) {
    return res.status(400).json({ error: 'Todos los campos son requeridos para registrar el producto.' });
  }

  const db = loadDatabase();
  const existingByCode = db.productos.find(p => p.codigo.trim().toLowerCase() === codigo.trim().toLowerCase());
  if (existingByCode) {
    return res.status(400).json({ error: 'Ya existe un producto registrado con ese código.' });
  }

  const catExits = db.categorias.some(c => c.id === parseInt(categoria_id));
  if (!catExits) {
    return res.status(400).json({ error: 'La categoría seleccionada no es válida.' });
  }

  const nextId = db.productos.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const newProduct: Producto = {
    id: nextId,
    codigo: codigo.trim().toUpperCase(),
    nombre,
    descripcion: descripcion || '',
    precioIndex: nextId,
    precio_compra: parseFloat(precio_compra),
    precio_venta: parseFloat(precio_venta),
    stock: parseInt(stock),
    stock_minimo: parseInt(stock_minimo),
    categoria_id: parseInt(categoria_id),
    estado: 'ACTIVO'
  };

  db.productos.push(newProduct);

  // Register initial intake movement if stock > 0
  if (newProduct.stock > 0) {
    const movementId = db.movimientos_inventario.reduce((max, m) => Math.max(max, m.id), 0) + 1;
    const initMovement: MovimientoInventario = {
      id: movementId,
      producto_id: newProduct.id,
      tipo: 'ENTRADA',
      cantidad: newProduct.stock,
      motivo: 'Registro inicial de producto',
      fecha: new Date().toISOString(),
      usuario_id: req.user?.id || 1,
      referencia: 'REGISTRO'
    };
    db.movimientos_inventario.push(initMovement);
  }

  saveDatabase(db);
  res.status(201).json(newProduct);
});

apiRouter.put('/productos/:id', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { codigo, nombre, descripcion, precio_compra, precio_venta, stock, stock_minimo, categoria_id, estado } = req.body;

  const db = loadDatabase();
  const idx = db.productos.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }

  const product = db.productos[idx];

  if (codigo) {
    const existing = db.productos.find(p => p.codigo.toLowerCase() === codigo.trim().toLowerCase() && p.id !== id);
    if (existing) {
      return res.status(400).json({ error: 'El código ingresado ya pertenece a otro producto.' });
    }
    product.codigo = codigo.trim().toUpperCase();
  }

  if (nombre) product.nombre = nombre;
  if (descripcion !== undefined) product.descripcion = descripcion;
  if (precio_compra !== undefined) product.precio_compra = parseFloat(precio_compra);
  if (precio_venta !== undefined) product.precio_venta = parseFloat(precio_venta);
  
  if (stock_minimo !== undefined) product.stock_minimo = parseInt(stock_minimo);
  if (categoria_id !== undefined) product.categoria_id = parseInt(categoria_id);
  if (estado !== undefined) product.estado = estado;

  // Handle stock adjustments directly if they passed stock differences
  if (stock !== undefined && parseInt(stock) !== product.stock) {
    const newStock = parseInt(stock);
    const diff = newStock - product.stock;
    const tipo = diff > 0 ? 'ENTRADA' : 'SALIDA';
    const amount = Math.abs(diff);

    const movementId = db.movimientos_inventario.reduce((max, m) => Math.max(max, m.id), 0) + 1;
    const adjustmentMove: MovimientoInventario = {
      id: movementId,
      producto_id: id,
      tipo,
      cantidad: amount,
      motivo: 'Ajuste manual de stock',
      fecha: new Date().toISOString(),
      usuario_id: req.user?.id || 1,
      referencia: 'AJUSTE'
    };
    db.movimientos_inventario.push(adjustmentMove);
    product.stock = newStock;
  }

  saveDatabase(db);
  res.json(product);
});

apiRouter.delete('/productos/:id', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const db = loadDatabase();

  const idx = db.productos.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }

  // Deactivate instead of hard deleting if they have records
  const hasMovements = db.movimientos_inventario.some(m => m.producto_id === id);
  if (hasMovements) {
    db.productos[idx].estado = 'INACTIVO';
    saveDatabase(db);
    return res.json({ success: true, message: 'Producto desactivado con éxito ya que cuenta con historial de movimientos.' });
  }

  db.productos.splice(idx, 1);
  saveDatabase(db);
  res.json({ success: true, message: 'Producto eliminado físicamente.' });
});

// ==========================================
// CLIENTS ENDPOINTS
// ==========================================

apiRouter.get('/clientes', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  res.json(db.clientes);
});

apiRouter.post('/clientes', authenticateJWT, requireRoles(['ADMIN', 'VENDEDOR', 'CAJERO']), (req: AuthenticatedRequest, res: Response) => {
  const { nombre, documento, telefono, email, direccion } = req.body;
  if (!nombre || !documento) {
    return res.status(400).json({ error: 'Nombre y documento son requeridos.' });
  }

  const db = loadDatabase();
  const existing = db.clientes.find(c => c.documento.trim() === documento.trim());
  if (existing) {
    return res.status(400).json({ error: 'Ya existe un cliente con ese mismo documento.' });
  }

  const nextId = db.clientes.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  const newClient: Cliente = {
    id: nextId,
    nombre,
    documento,
    telefono: telefono || '',
    email: email || '',
    direccion: direccion || ''
  };

  db.clientes.push(newClient);
  saveDatabase(db);
  res.status(201).json(newClient);
});

apiRouter.put('/clientes/:id', authenticateJWT, requireRoles(['ADMIN', 'VENDEDOR', 'CAJERO']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { nombre, documento, telefono, email, direccion } = req.body;

  const db = loadDatabase();
  const idx = db.clientes.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

  if (documento) {
    const existing = db.clientes.find(c => c.documento.trim() === documento.trim() && c.id !== id);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe otro cliente con este documento.' });
    }
    db.clientes[idx].documento = documento;
  }

  if (nombre) db.clientes[idx].nombre = nombre;
  if (telefono !== undefined) db.clientes[idx].telefono = telefono;
  if (email !== undefined) db.clientes[idx].email = email;
  if (direccion !== undefined) db.clientes[idx].direccion = direccion;

  saveDatabase(db);
  res.json(db.clientes[idx]);
});

apiRouter.delete('/clientes/:id', authenticateJWT, requireRoles(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (id === 1) {
    return res.status(400).json({ error: 'No se puede eliminar la cuenta de Consumidor Final predeterminada.' });
  }

  const db = loadDatabase();
  const idx = db.clientes.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

  // Delete only if they have no registered invoices
  const hasInvoices = db.ventas.some(v => v.cliente_id === id);
  if (hasInvoices) {
    return res.status(400).json({ error: 'No se puede eliminar el cliente porque posee historial de compras en el sistema.' });
  }

  db.clientes.splice(idx, 1);
  saveDatabase(db);
  res.json({ success: true, message: 'Cliente eliminado con éxito.' });
});

// ==========================================
// SUPPLIERS ENDPOINTS
// ==========================================

apiRouter.get('/proveedores', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  res.json(db.proveedores);
});

apiRouter.post('/proveedores', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const { nombre, nif, telefono, email, direccion } = req.body;
  if (!nombre || !nif) {
    return res.status(400).json({ error: 'Nombre y NIF / RUC / Identificación tributaria son obligatorios.' });
  }

  const db = loadDatabase();
  const existing = db.proveedores.find(p => p.nif.trim() === nif.trim());
  if (existing) {
    return res.status(400).json({ error: 'Ya existe un proveedor registrado con ese mismo identificador.' });
  }

  const nextId = db.proveedores.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const newProveedor: Proveedor = {
    id: nextId,
    nombre,
    nif,
    telefono: telefono || '',
    email: email || '',
    direccion: direccion || ''
  };

  db.proveedores.push(newProveedor);
  saveDatabase(db);
  res.status(201).json(newProveedor);
});

apiRouter.put('/proveedores/:id', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { nombre, nif, telefono, email, direccion } = req.body;

  const db = loadDatabase();
  const idx = db.proveedores.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Proveedor no encontrado.' });
  }

  if (nif) {
    const existing = db.proveedores.find(p => p.nif.trim() === nif.trim() && p.id !== id);
    if (existing) {
      return res.status(400).json({ error: 'El NIF/RUC ingresado ya pertenece a otro proveedor.' });
    }
    db.proveedores[idx].nif = nif;
  }

  if (nombre) db.proveedores[idx].nombre = nombre;
  if (telefono !== undefined) db.proveedores[idx].telefono = telefono;
  if (email !== undefined) db.proveedores[idx].email = email;
  if (direccion !== undefined) db.proveedores[idx].direccion = direccion;

  saveDatabase(db);
  res.json(db.proveedores[idx]);
});

apiRouter.delete('/proveedores/:id', authenticateJWT, requireRoles(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const db = loadDatabase();

  const idx = db.proveedores.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Proveedor no encontrado.' });
  }

  const hasPurchases = db.compras.some(c => c.proveedor_id === id);
  if (hasPurchases) {
    return res.status(400).json({ error: 'No se puede eliminar el proveedor porque se le han registrado compras en el sistema.' });
  }

  db.proveedores.splice(idx, 1);
  saveDatabase(db);
  res.json({ success: true, message: 'Proveedor eliminado del sistema con éxito.' });
});

// ==========================================
// CASH REGISTER (CAJA) ENDPOINTS
// ==========================================

apiRouter.get('/caja/estado', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  const active = db.cajas.find(c => c.estado === 'ABIERTA');
  res.json({ caja: active || null });
});

apiRouter.post('/caja/apertura', authenticateJWT, requireRoles(['ADMIN', 'CAJERO']), (req: AuthenticatedRequest, res: Response) => {
  const { monto_apertura, observaciones } = req.body;
  if (monto_apertura === undefined || isNaN(parseFloat(monto_apertura))) {
    return res.status(400).json({ error: 'Debe ingresar un monto de apertura válido.' });
  }

  const db = loadDatabase();
  const existing = db.cajas.find(c => c.estado === 'ABIERTA');
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una sesión de caja activa. Debe cerrarla previamente.' });
  }

  const nextId = db.cajas.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  const newCaja: Caja = {
    id: nextId,
    fecha_apertura: new Date().toISOString(),
    fecha_cierre: null,
    monto_apertura: parseFloat(monto_apertura),
    monto_ventas: 0.00,
    monto_ingresos: 0.00,
    monto_egresos: 0.00,
    monto_cierre: null,
    total_calculado: parseFloat(monto_apertura),
    estado: 'ABIERTA',
    usuario_apertura_id: req.user?.id || 1,
    usuario_cierre_id: null,
    observaciones: observaciones || 'Apertura de caja manual'
  };

  db.cajas.push(newCaja);
  saveDatabase(db);
  res.status(201).json(newCaja);
});

apiRouter.post('/caja/cierre', authenticateJWT, requireRoles(['ADMIN', 'CAJERO']), (req: AuthenticatedRequest, res: Response) => {
  const { monto_cierre, observaciones } = req.body;
  if (monto_cierre === undefined || isNaN(parseFloat(monto_cierre))) {
    return res.status(400).json({ error: 'Debe ingresar una cantidad del cierre de arqueo.' });
  }

  const db = loadDatabase();
  const activeIdx = db.cajas.findIndex(c => c.estado === 'ABIERTA');
  if (activeIdx === -1) {
    return res.status(400).json({ error: 'No hay ninguna caja abierta en este momento.' });
  }

  const active = db.cajas[activeIdx];
  const totalArqueo = parseFloat(monto_cierre);

  active.fecha_cierre = new Date().toISOString();
  active.monto_cierre = totalArqueo;
  active.usuario_cierre_id = req.user?.id || 1;
  active.estado = 'CERRADA';
  active.observaciones = `${active.observaciones}. Cierre: ${observaciones || 'Sin observaciones'}. Monto Esperado: $${active.total_calculado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}, Monto Arqueado: $${totalArqueo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}. Diferencia: $${(totalArqueo - active.total_calculado).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

  db.cajas[activeIdx] = active;
  saveDatabase(db);
  res.json(active);
});

apiRouter.post('/caja/movimiento', authenticateJWT, requireRoles(['ADMIN', 'CAJERO']), (req: AuthenticatedRequest, res: Response) => {
  const { tipo, monto, motivo } = req.body;
  if (!tipo || !monto || isNaN(parseFloat(monto)) || !motivo) {
    return res.status(400).json({ error: 'Monto, tipo (INGRESOS | EGRESOS) y motivo son requeridos.' });
  }

  if (tipo !== 'INGRESOS' && tipo !== 'EGRESOS') {
    return res.status(400).json({ error: 'Tipo de movimiento de caja incorrecto.' });
  }

  const db = loadDatabase();
  const activeIdx = db.cajas.findIndex(c => c.estado === 'ABIERTA');
  if (activeIdx === -1) {
    return res.status(400).json({ error: 'La caja debe estar ABIERTA para registrar ingresos o egresos directos.' });
  }

  const active = db.cajas[activeIdx];
  const value = parseFloat(monto);

  if (tipo === 'INGRESOS') {
    active.monto_ingresos += value;
    active.total_calculado += value;
  } else {
    active.monto_egresos += value;
    active.total_calculado -= value;
  }

  active.observaciones += `\n[Movimiento ${tipo}: $${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })} - Motivo: ${motivo}]`;
  db.cajas[activeIdx] = active;
  saveDatabase(db);
  res.json(active);
});

apiRouter.get('/caja/historial', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  // Sort latest first
  const orderList = [...db.cajas].sort((a, b) => new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime());
  res.json(orderList);
});

// ==========================================
// PURCHASES (COMPRAS) ENDPOINTS
// ==========================================

apiRouter.get('/compras', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  // Map supplier node
  const purchasesMapped = db.compras.map(c => {
    const prov = db.proveedores.find(p => p.id === c.proveedor_id);
    const userObj = db.usuarios.find(u => u.id === c.usuario_id);
    const items = db.detalle_compras.filter(dc => dc.compra_id === c.id).map(dc => {
      const p = db.productos.find(pro => pro.id === dc.producto_id);
      return {
        ...dc,
        producto_nombre: p ? p.nombre : 'Producto no identificado',
        producto_codigo: p ? p.codigo : 'N/A'
      };
    });
    return {
      ...c,
      proveedor_nombre: prov ? prov.nombre : 'Proveedor Desconocido',
      usuario_nombre: userObj ? userObj.nombre : 'Usuario',
      detalles: items
    };
  });

  res.json(purchasesMapped.reverse());
});

apiRouter.post('/compras', authenticateJWT, requireRoles(['ADMIN', 'BODEGUERO']), (req: AuthenticatedRequest, res: Response) => {
  const { proveedor_id, items } = req.body; // items: array of {producto_id, cantidad, precio_unitario}
  if (!proveedor_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe ingresar un proveedor válido y al menos un producto para la orden de compra.' });
  }

  const db = loadDatabase();
  const provExists = db.proveedores.some(p => p.id === parseInt(proveedor_id));
  if (!provExists) {
    return res.status(400).json({ error: 'El proveedor seleccionado es inválido.' });
  }

  // Create purchase
  const nextId = db.compras.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  const nextCorrelativo = `C051-${String(nextId).padStart(6, '0')}`;
  
  let purchaseTotal = 0;
  const purchaseDetails: DetalleCompra[] = [];
  const inventoryMovements: MovimientoInventario[] = [];

  // Validate items and compute details
  let detailIdIndex = db.detalle_compras.reduce((max, dc) => Math.max(max, dc.id), 0) + 1;
  let movementIdIndex = db.movimientos_inventario.reduce((max, m) => Math.max(max, m.id), 0) + 1;

  for (const item of items) {
    const pId = parseInt(item.producto_id);
    const cant = parseInt(item.cantidad);
    const cost = parseFloat(item.precio_unitario);

    if (isNaN(pId) || isNaN(cant) || isNaN(cost) || cant <= 0 || cost <= 0) {
      return res.status(400).json({ error: 'Artículos de compra con formato inválido, cantidad o precio no admitidos.' });
    }

    const prodIdx = db.productos.findIndex(p => p.id === pId);
    if (prodIdx === -1) {
      return res.status(400).json({ error: `El producto con ID ${pId} no está registrado en el inventario.` });
    }

    const sub = cant * cost;
    purchaseTotal += sub;

    purchaseDetails.push({
      id: detailIdIndex++,
      compra_id: nextId,
      producto_id: pId,
      cantidad: cant,
      precio_unitario: cost,
      subtotal: sub
    });

    // Update Product Stock In Database
    db.productos[prodIdx].stock += cant;
    // Overwrite buying cost to stay updated
    db.productos[prodIdx].precio_compra = cost;

    // Record Inventory Movement
    inventoryMovements.push({
      id: movementIdIndex++,
      producto_id: pId,
      tipo: 'ENTRADA',
      cantidad: cant,
      motivo: `Ingreso por Compra Inbound (Correlativo: ${nextCorrelativo})`,
      fecha: new Date().toISOString(),
      usuario_id: req.user?.id || 1,
      referencia: `COMPRA #${nextId}`
    });
  }

  const newCompra: Compra = {
    id: nextId,
    fecha: new Date().toISOString(),
    proveedor_id: parseInt(proveedor_id),
    total: purchaseTotal,
    usuario_id: req.user?.id || 1,
    correlativo: nextCorrelativo
  };

  // Push all to Db
  db.compras.push(newCompra);
  db.detalle_compras.push(...purchaseDetails);
  db.movimientos_inventario.push(...inventoryMovements);

  saveDatabase(db);
  res.status(201).json({
    ...newCompra,
    detalles: purchaseDetails
  });
});

// ==========================================
// SALES (VENTAS) ENDPOINTS
// ==========================================

apiRouter.get('/ventas', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  const salesMapped = db.ventas.map(v => {
    const cli = db.clientes.find(c => c.id === v.cliente_id);
    const userObj = db.usuarios.find(u => u.id === v.usuario_id);
    const items = db.detalle_ventas.filter(dv => dv.venta_id === v.id).map(dv => {
      const p = db.productos.find(pro => pro.id === dv.producto_id);
      return {
        ...dv,
        producto_nombre: p ? p.nombre : 'Producto no identificado',
        producto_codigo: p ? p.codigo : 'N/A'
      };
    });
    return {
      ...v,
      cliente_nombre: cli ? cli.nombre : 'Clientes Varios',
      usuario_nombre: userObj ? userObj.nombre : 'Cajero',
      detalles: items
    };
  });
  res.json(salesMapped.reverse());
});

apiRouter.post('/ventas', authenticateJWT, requireRoles(['ADMIN', 'CAJERO', 'VENDEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { cliente_id, metodo_pago, items } = req.body;
  if (!cliente_id || !metodo_pago || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe elegir un cliente, método de pago y agregar productos al carrito.' });
  }

  const db = loadDatabase();

  // Validate the cash drawer session is open for cash transactions
  const activeCajaIdx = db.cajas.findIndex(c => c.estado === 'ABIERTA');
  if (activeCajaIdx === -1) {
    return res.status(400).json({ error: 'OPERACIÓN DENEGADA: No hay ninguna caja registradora ABIERTA en este momento. El cajero debe aperturar caja.' });
  }

  const clientExists = db.clientes.some(c => c.id === parseInt(cliente_id));
  if (!clientExists) {
    return res.status(400).json({ error: 'El cliente seleccionado no es válido.' });
  }

  const nextId = db.ventas.reduce((max, v) => Math.max(max, v.id), 0) + 1;
  const nextCorrelativo = `V051-${String(nextId).padStart(6, '0')}`;

  let saleTotal = 0;
  const saleDetails: DetalleVenta[] = [];
  const inventoryMovements: MovimientoInventario[] = [];

  let detailIdIndex = db.detalle_ventas.reduce((max, dv) => Math.max(max, dv.id), 0) + 1;
  let movementIdIndex = db.movimientos_inventario.reduce((max, m) => Math.max(max, m.id), 0) + 1;

  // Validate all items before writing any modification
  for (const item of items) {
    const pId = parseInt(item.producto_id);
    const cant = parseInt(item.cantidad);

    if (isNaN(pId) || isNaN(cant) || cant <= 0) {
      return res.status(400).json({ error: 'Valores inválidos en la lista de items.' });
    }

    const prod = db.productos.find(p => p.id === pId);
    if (!prod || prod.estado === 'INACTIVO') {
      return res.status(400).json({ error: `El producto seleccionado con ID ${pId} no está activo o no existe.` });
    }

    if (prod.stock < cant) {
      return res.status(400).json({ error: `Stock insuficiente para [${prod.codigo}] ${prod.nombre}. Solicitado: ${cant}, Disponible: ${prod.stock}` });
    }
  }

  // Record stock deduction and collect items
  for (const item of items) {
    const pId = parseInt(item.producto_id);
    const cant = parseInt(item.cantidad);

    const prodIdx = db.productos.findIndex(p => p.id === pId);
    const prod = db.productos[prodIdx];

    const sub = cant * prod.precio_venta;
    saleTotal += sub;

    saleDetails.push({
      id: detailIdIndex++,
      venta_id: nextId,
      producto_id: pId,
      cantidad: cant,
      precio_unitario: prod.precio_venta,
      subtotal: parseFloat(sub.toFixed(2))
    });

    // Deduct inventory stock
    db.productos[prodIdx].stock -= cant;

    // Register Outbound Movement log
    inventoryMovements.push({
      id: movementIdIndex++,
      producto_id: pId,
      tipo: 'SALIDA',
      cantidad: cant,
      motivo: `Despacho de stock por Venta (Factura: ${nextCorrelativo})`,
      fecha: new Date().toISOString(),
      usuario_id: req.user?.id || 1,
      referencia: `VENTA #${nextId}`
    });
  }

  // Register Transaction into Cash Register Open session
  const activeCaja = db.cajas[activeCajaIdx];
  activeCaja.monto_ventas += saleTotal;
  activeCaja.total_calculado += saleTotal;
  db.cajas[activeCajaIdx] = activeCaja;

  const newVenta: Venta = {
    id: nextId,
    fecha: new Date().toISOString(),
    cliente_id: parseInt(cliente_id),
    total: parseFloat(saleTotal.toFixed(2)),
    metodo_pago,
    usuario_id: req.user?.id || 1,
    correlativo: nextCorrelativo,
    caja_id: activeCaja.id
  };

  db.ventas.push(newVenta);
  db.detalle_ventas.push(...saleDetails);
  db.movimientos_inventario.push(...inventoryMovements);

  saveDatabase(db);

  res.status(201).json({
    ...newVenta,
    detalles: saleDetails,
    caja_actualizada: activeCaja
  });
});

// ==========================================
// INVENTORY MOVEMENTS LIST ENPOINT
// ==========================================

apiRouter.get('/movimientos', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();
  const mapped = db.movimientos_inventario.map(m => {
    const p = db.productos.find(pro => pro.id === m.producto_id);
    const u = db.usuarios.find(usr => usr.id === m.usuario_id);
    return {
      ...m,
      producto_nombre: p ? p.nombre : 'Producto Elimiado/Inactivo',
      producto_codigo: p ? p.codigo : 'N/A',
      usuario_nombre: u ? u.nombre : 'Operador'
    };
  });
  res.json(mapped.reverse());
});

// ==========================================
// DETAILED REPORTS ENDPOINTS
// ==========================================

apiRouter.get('/reportes', authenticateJWT, requireRoles(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const db = loadDatabase();

  // 1. Month-by-month sales representation
  const salesByMonth: Record<string, number> = {};
  db.ventas.forEach(v => {
    const isodate = new Date(v.fecha);
    const monthKey = isodate.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
    salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + v.total;
  });

  const chartSales = Object.keys(salesByMonth).map(key => ({
    name: key,
    total: parseFloat(salesByMonth[key].toFixed(2))
  }));

  // 2. Sales by payment method
  const salesByPayment: Record<string, number> = {
    'EFECTIVO': 0,
    'TARJETA': 0,
    'TRANSFERENCIA': 0
  };
  db.ventas.forEach(v => {
    if (salesByPayment[v.metodo_pago] !== undefined) {
      salesByPayment[v.metodo_pago] += v.total;
    }
  });

  const chartPayment = Object.keys(salesByPayment).map(key => ({
    name: key,
    value: parseFloat(salesByPayment[key].toFixed(2))
  }));

  // 3. Category distribution (Product share value count)
  const categoryCount: Record<string, number> = {};
  db.productos.forEach(p => {
    const cat = db.categorias.find(c => c.id === p.categoria_id);
    const catName = cat ? cat.nombre : 'Sin Categoría';
    categoryCount[catName] = (categoryCount[catName] || 0) + 1;
  });

  const chartCategories = Object.keys(categoryCount).map(key => ({
    name: key,
    value: categoryCount[key]
  }));

  res.json({
    chartSales,
    chartPayment,
    chartCategories,
    totals: {
      totalVendido: db.ventas.reduce((s, v) => s + v.total, 0),
      totalComprado: db.compras.reduce((s, c) => s + c.total, 0),
      productosRegistrados: db.productos.length,
      clientesRegistrados: db.clientes.length,
      proveedoresRegistrados: db.proveedores.length
    }
  });
});
