import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Tag, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter, 
  ArrowUpDown, 
  History, 
  X, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { Producto, Categoria, MovimientoInventario, UserPayload } from '../types';

interface InventarioPanelProps {
  productos: Producto[];
  categorias: Categoria[];
  movimientos: MovimientoInventario[];
  currentUser: UserPayload;
  onRefresh: () => void;
  token: string;
}

export default function InventarioPanel({ 
  productos, 
  categorias, 
  movimientos, 
  currentUser, 
  onRefresh,
  token 
}: InventarioPanelProps) {
  // Navigation internal tabs: "productos" | "categorias" | "movimientos"
  const [subTab, setSubTab] = useState<'productos' | 'categorias' | 'movimientos'>('productos');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockSortFilter, setStockSortFilter] = useState<'all' | 'alert' | 'out'>('all');

  // Modals state
  const [productModal, setProductModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'edit';
    product?: Producto;
  }>({ isOpen: false, type: 'create' });

  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'edit';
    category?: Categoria;
  }>({ isOpen: false, type: 'create' });

  // Form states products
  const [prodCodigo, setProdCodigo] = useState('');
  const [prodNombre, setProdNombre] = useState('');
  const [prodDescripcion, setProdDescripcion] = useState('');
  const [prodPrecioCompra, setProdPrecioCompra] = useState(0);
  const [prodPrecioVenta, setProdPrecioVenta] = useState(0);
  const [prodStock, setProdStock] = useState(0);
  const [prodStockMin, setProdStockMin] = useState(5);
  const [prodCatId, setProdCatId] = useState(1);
  const [prodEstado, setProdEstado] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');

  // Form states categories
  const [catNombre, setCatNombre] = useState('');
  const [catDescripcion, setCatDescripcion] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Can this user modify inventory (ADMIN or BODEGUERO)
  const canModify = currentUser.rol === 'ADMIN' || currentUser.rol === 'BODEGUERO';

  // Flash warnings helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Open Product Modal
  const openProdModal = (type: 'create' | 'edit', p?: Producto) => {
    if (!canModify) return;
    setErrorMsg('');
    setProductModal({ isOpen: true, type, product: p });

    if (type === 'create') {
      setProdCodigo('');
      setProdNombre('');
      setProdDescripcion('');
      setProdPrecioCompra(0);
      setProdPrecioVenta(0);
      setProdStock(0);
      setProdStockMin(5);
      setProdCatId(categorias[0]?.id || 1);
      setProdEstado('ACTIVO');
    } else if (p) {
      setProdCodigo(p.codigo);
      setProdNombre(p.nombre);
      setProdDescripcion(p.descripcion);
      setProdPrecioCompra(p.precio_compra);
      setProdPrecioVenta(p.precio_venta);
      setProdStock(p.stock);
      setProdStockMin(p.stock_minimo);
      setProdCatId(p.categoria_id);
      setProdEstado(p.estado);
    }
  };

  // Open Category Modal
  const openCatModal = (type: 'create' | 'edit', c?: Categoria) => {
    if (!canModify) return;
    setErrorMsg('');
    setCategoryModal({ isOpen: true, type, category: c });

    if (type === 'create') {
      setCatNombre('');
      setCatDescripcion('');
    } else if (c) {
      setCatNombre(c.nombre);
      setCatDescripcion(c.descripcion);
    }
  };

  // Submit Product Form
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCodigo || !prodNombre || prodPrecioCompra <= 0 || prodPrecioVenta <= 0 || prodStock < 0 || prodStockMin < 0) {
      triggerError('Por favor complete todos los datos del producto con valores válidos.');
      return;
    }

    const payload = {
      codigo: prodCodigo,
      nombre: prodNombre,
      descripcion: prodDescripcion,
      precio_compra: prodPrecioCompra,
      precio_venta: prodPrecioVenta,
      stock: prodStock,
      stock_minimo: prodStockMin,
      categoria_id: prodCatId,
      estado: prodEstado
    };

    try {
      const url = productModal.type === 'edit' && productModal.product
        ? `/api/productos/${productModal.product.id}`
        : '/api/productos';
      const method = productModal.type === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo guardar el producto.');
      }

      triggerSuccess(productModal.type === 'edit' ? 'Producto actualizado correctamente.' : 'Producto registrado e ingresado al stock.');
      setProductModal({ isOpen: false, type: 'create' });
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Submit Category Form
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNombre) {
      triggerError('El nombre de la categoría es requerido.');
      return;
    }

    const payload = {
      nombre: catNombre,
      descripcion: catDescripcion
    };

    try {
      const url = categoryModal.type === 'edit' && categoryModal.category
        ? `/api/categorias/${categoryModal.category.id}`
        : '/api/categorias';
      const method = categoryModal.type === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo registrar la categoría.');
      }

      triggerSuccess(categoryModal.type === 'edit' ? 'Categoría modificada con éxito.' : 'Categoría registrada con éxito.');
      setCategoryModal({ isOpen: false, type: 'create' });
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('¿Está completamente seguro de eliminar esta categoría? Se comprobará que no existan productos asignados.')) {
      return;
    }
    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo eliminar la categoría.');
      }
      triggerSuccess('Categoría eliminada del catálogo.');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Delete / Deactivate Product
  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Desea dar de baja/quitar este producto? Si posee transacciones pasadas, se inactivará para preservar los registros de auditoría.')) {
      return;
    }
    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al eliminar producto.');
      }
      triggerSuccess(resData.message || 'Operación completada con éxito.');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Product filtering logic
  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || 
                          p.codigo.toLowerCase().includes(search.toLowerCase()) ||
                          p.descripcion.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = !catFilter || p.categoria_id === parseInt(catFilter);

    let matchesStock = true;
    if (stockSortFilter === 'out') {
      matchesStock = p.stock <= 0;
    } else if (stockSortFilter === 'alert') {
      matchesStock = p.stock > 0 && p.stock <= p.stock_minimo;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6" id="inventario-panel">
      
      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-fade-in shadow-2xs">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800 text-xs font-semibold flex items-center space-x-2 animate-fade-in shadow-2xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Internal Navigation tabs */}
      <div className="flex border-b border-slate-100 space-x-1">
        <button
          onClick={() => setSubTab('productos')}
          className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
            subTab === 'productos' 
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Catálogo de Productos</span>
          </div>
        </button>

        <button
          onClick={() => setSubTab('categorias')}
          className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
            subTab === 'categorias' 
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4" />
            <span>Categorías del Catálogo</span>
          </div>
        </button>

        <button
          onClick={() => setSubTab('movimientos')}
          className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
            subTab === 'movimientos' 
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>Kardex / Movimientos</span>
          </div>
        </button>
      </div>

      {/* ==================== TAB 1: PRODUCTOS ==================== */}
      {subTab === 'productos' && (
        <div className="space-y-4">
          
          {/* Action controls & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-2xs">
            <div className="flex flex-1 flex-col sm:flex-row gap-2 max-w-4xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50/50 rounded-lg border border-slate-200 outline-none focus:border-slate-300 focus:bg-white"
                />
              </div>

              {/* Category Filter */}
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-2.5 text-xs bg-slate-50/50 rounded-lg border border-slate-200 outline-none focus:bg-white text-slate-600"
              >
                <option value="">Todas las Categorías</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>

              {/* Status Stock Filter */}
              <select
                value={stockSortFilter}
                onChange={(e) => setStockSortFilter(e.target.value as any)}
                className="px-3 py-2.5 text-xs bg-slate-50/50 rounded-lg border border-slate-200 outline-none focus:bg-white text-slate-600"
              >
                <option value="all">Filtro de Alertas Stock</option>
                <option value="alert">⚠️ Stock Bajo / Alerta</option>
                <option value="out">🛑 Productos Agotados</option>
              </select>
            </div>

            {canModify && (
              <button
                onClick={() => openProdModal('create')}
                className="flex items-center justify-center space-x-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            )}
          </div>

          {/* Product Items Table */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">CÓDIGO</th>
                    <th className="p-4">PRODUCTO</th>
                    <th className="p-4">CATEGORÍA</th>
                    <th className="p-4 text-right">PRECIO COMPRA</th>
                    <th className="p-4 text-right">PRECIO VENTA</th>
                    <th className="p-4 text-center">STOCK ACTUAL</th>
                    <th className="p-4 text-center">ALERTA</th>
                    <th className="p-4 text-center">ESTADO</th>
                    {canModify && <th className="p-4 text-center">ACCIONES</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => {
                      const cat = categorias.find(c => c.id === p.categoria_id);
                      const isStockOut = p.stock <= 0;
                      const isLowStock = p.stock > 0 && p.stock <= p.stock_minimo;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-800">{p.codigo}</td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-800">{p.nombre}</div>
                            <div className="text-[10px] text-slate-400 max-w-[190px] truncate">{p.descripcion || 'Sin descripción'}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-500">{cat ? cat.nombre : 'General'}</td>
                          <td className="p-4 text-right font-mono text-slate-500">${p.precio_compra.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                          <td className="p-4 text-right font-mono font-semibold text-slate-800">${p.precio_venta.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold font-mono text-[11px] ${
                              isStockOut 
                                ? 'bg-red-50 text-red-700 border border-red-100' 
                                : isLowStock 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono text-slate-500">{p.stock_minimo}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {p.estado}
                            </span>
                          </td>
                          {canModify && (
                            <td className="p-4">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => openProdModal('edit', p)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Editar Producto"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Eliminar / Desactivar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={canModify ? 9 : 8} className="p-12 text-center text-slate-400">
                        No se registran productos con los filtros especificados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB 2: CATEGORÍAS ==================== */}
      {subTab === 'categorias' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">ID</th>
                    <th className="p-4">CATEGORÍA</th>
                    <th className="p-4">DESCRIPCIÓN</th>
                    <th className="p-4 text-center">PRODUCTOS ASOCIADOS</th>
                    {canModify && <th className="p-4 text-center">ACCIONES</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {categorias.map(cat => {
                    const count = productos.filter(p => p.categoria_id === cat.id).length;

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-800">#{cat.id}</td>
                        <td className="p-4 font-bold text-slate-800">{cat.nombre}</td>
                        <td className="p-4 font-medium text-slate-500">{cat.descripcion || 'Sin descripción'}</td>
                        <td className="p-4 text-center font-bold font-mono text-slate-700">{count}</td>
                        {canModify && (
                          <td className="p-4">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => openCatModal('edit', cat)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-50 border border-slate-200/50 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Registrar Nueva Categoría</h3>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Las categorías permiten clasificar los artículos del catálogo para facilitar la búsqueda en el rincón de ventas y reportar de manera agregada los resultados comerciales.
            </p>
            {canModify ? (
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Categoría *</label>
                  <input
                    type="text"
                    required
                    value={catNombre}
                    onChange={(e) => setCatNombre(e.target.value)}
                    placeholder="Ej. Lubricantes, Repuestos, etc."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    value={catDescripcion}
                    onChange={(e) => setCatDescripcion(e.target.value)}
                    placeholder="Explicación o detalles"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-950 text-white font-semibold text-xs rounded shadow-2xs transition-colors"
                >
                  Guardar Categoría
                </button>
              </form>
            ) : (
              <div className="p-3 bg-white text-slate-400 rounded text-center border text-[11px]">
                Usted no tiene permisos para crear o modificar categorías.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================== TAB 3: MOVIMIENTOS HISTORY ==================== */}
      {subTab === 'movimientos' && (
        <div className="space-y-4 bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Historial Transaccional / Kardex</h3>
            <p className="text-[11px] text-slate-400 mt-1">Este auditor registra todas las entradas (compras o ajustes) y salidas (ventas o despieces) de mercadería con timestamp preciso.</p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="p-3">FECHA</th>
                  <th className="p-3">PRODUCTO</th>
                  <th className="p-3 text-center">TIPO</th>
                  <th className="p-3 text-right">CANTIDAD</th>
                  <th className="p-3">MOTIVO / NOTA</th>
                  <th className="p-3">MÉTRICA / REF</th>
                  <th className="p-3">OPERADO POR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {movimientos.length > 0 ? (
                  movimientos.map(mov => {
                    const isIntake = mov.tipo === 'ENTRADA';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/20">
                        <td className="p-3 font-mono font-medium text-slate-400">
                          {new Date(mov.fecha).toLocaleString('es-CO')}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{mov.producto_nombre}</div>
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{mov.producto_codigo}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            isIntake 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-800 border border-rose-100'
                          }`}>
                            {mov.tipo}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold font-mono text-slate-700">
                          {isIntake ? `+${mov.cantidad}` : `-${mov.cantidad}`}
                        </td>
                        <td className="p-3 font-medium text-slate-600">{mov.motivo}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-400 uppercase">{mov.referencia || 'N/A'}</td>
                        <td className="p-3 font-medium text-slate-500">{mov.usuario_nombre || 'Usuario'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      No se registran movimientos de stock en el Kardex.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PRODUCT FORM ==================== */}
      {productModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-2xl overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-950 text-white">
              <h2 className="text-sm font-semibold tracking-wide uppercase">
                {productModal.type === 'edit' ? '✏️ Editar Producto del Catálogo' : '📦 Registrar Nuevo Producto'}
              </h2>
              <button 
                onClick={() => setProductModal({ isOpen: false, type: 'create' })}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                id="close-product-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código de Barras / SKU *</label>
                  <input
                    type="text"
                    required
                    value={prodCodigo}
                    onChange={(e) => setProdCodigo(e.target.value)}
                    placeholder="Ej. TEC-1234"
                    disabled={productModal.type === 'edit'}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none disabled:bg-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    value={prodNombre}
                    onChange={(e) => setProdNombre(e.target.value)}
                    placeholder="Ej. Refrigerador Indurama"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción Detallada</label>
                  <input
                    type="text"
                    value={prodDescripcion}
                    onChange={(e) => setProdDescripcion(e.target.value)}
                    placeholder="Ej. Modelo Inverter, 400 litros, acero inoxidable"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría Asociada *</label>
                  <select
                    value={prodCatId}
                    onChange={(e) => setProdCatId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none text-slate-600"
                  >
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estado de Venta *</label>
                  <select
                    value={prodEstado}
                    onChange={(e) => setProdEstado(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none text-slate-600"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Costo de Compra ($ COP) *</label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={prodPrecioCompra}
                    onChange={(e) => setProdPrecioCompra(parseFloat(e.target.value) || 0)}
                    placeholder="Por ejemplo 1500"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precio de Venta ($ COP) *</label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={prodPrecioVenta}
                    onChange={(e) => setProdPrecioVenta(parseFloat(e.target.value) || 0)}
                    placeholder="Por ejemplo 2500"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(parseInt(e.target.value) || 0)}
                    placeholder="Cantidad física en góndola"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Mínimo (Alerta) *</label>
                  <input
                    type="number"
                    required
                    value={prodStockMin}
                    onChange={(e) => setProdStockMin(parseInt(e.target.value) || 0)}
                    placeholder="Límite advertencia"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none font-mono"
                  />
                </div>

              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductModal({ isOpen: false, type: 'create' })}
                  className="px-4 py-2 hover:bg-slate-100 border text-slate-600 font-semibold text-xs rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition-colors shadow-2xs"
                >
                  Guardar Producto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CATEGORY EDIT FORM ==================== */}
      {categoryModal.isOpen && categoryModal.type === 'edit' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-950 text-white">
              <h2 className="text-xs font-semibold tracking-wide uppercase">✏️ Editar Categoría</h2>
              <button 
                onClick={() => setCategoryModal({ isOpen: false, type: 'create' })}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Categoría</label>
                <input
                  type="text"
                  required
                  value={catNombre}
                  onChange={(e) => setCatNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={catDescripcion}
                  onChange={(e) => setCatDescripcion(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ isOpen: false, type: 'create' })}
                  className="px-4 py-2 hover:bg-slate-100 border text-slate-600 font-semibold text-xs rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded shadow-2xs"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
