import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  CreditCard, 
  DollarSign, 
  Inbox, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  X,
  FileText 
} from 'lucide-react';
import { Producto, Cliente, Venta, CartItem, UserPayload, Caja } from '../types';

interface VentasPanelProps {
  productos: Producto[];
  clientes: Cliente[];
  ventas: Venta[];
  cajaAbierta: boolean;
  currentUser: UserPayload;
  onRefresh: () => void;
  token: string;
}

export default function VentasPanel({
  productos,
  clientes,
  ventas,
  cajaAbierta,
  currentUser,
  onRefresh,
  token
}: VentasPanelProps) {
  // POS tab or History tab
  const [activeTab, setActiveTab] = useState<'pos' | 'historial'>('pos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Cart logic
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<number>(1); // 1 = Consumidor Final
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [amountPaid, setAmountPaid] = useState<string>('');

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Completed Ticket Modal (Receipt)
  const [receiptModel, setReceiptModel] = useState<{
    isOpen: boolean;
    venta?: Venta;
  }>({ isOpen: false });

  // Quick Client registration modal within POS
  const [newClientModal, setNewClientModal] = useState(false);
  const [newClientNombre, setNewClientNombre] = useState('');
  const [newClientDocumento, setNewClientDocumento] = useState('');
  const [newClientTelefono, setNewClientTelefono] = useState('');

  // History search filter
  const [historySearch, setHistorySearch] = useState('');

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Filter Active products
  const activeProducts = productos.filter(p => p.estado === 'ACTIVO');
  const filteredProducts = activeProducts.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === null || p.categoria_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Unique categories list from products
  const productCategoriesIds = Array.from(new Set(activeProducts.map(p => p.categoria_id)));

  // Add Item to POS Cart
  const handleAddToCart = (product: Producto) => {
    if (!cajaAbierta) {
      triggerError('OPERACIÓN DENEGADA: Debe abrir la caja registradora en la pestaña "Caja" previo a registrar ventas.');
      return;
    }

    if (product.stock <= 0) {
      triggerError(`El producto ${product.nombre} se encuentra completamente AGOTADO.`);
      return;
    }

    const existingIdx = cart.findIndex(item => item.producto.id === product.id);
    if (existingIdx !== -1) {
      const currentQty = cart[existingIdx].cantidad;
      if (currentQty >= product.stock) {
        triggerError(`No puede agregar más unidades. Cantidad excede el Stock disponible (${product.stock} uds).`);
        return;
      }
      const updated = [...cart];
      updated[existingIdx].cantidad += 1;
      setCart(updated);
    } else {
      setCart([...cart, { producto: product, cantidad: 1 }]);
    }
  };

  // Adjust Cart qty
  const handleUpdateQty = (productId: number, difference: number) => {
    const idx = cart.findIndex(item => item.producto.id === productId);
    if (idx === -1) return;

    const currentQty = cart[idx].cantidad;
    const itemStock = cart[idx].producto.stock;
    const targetQty = currentQty + difference;

    if (targetQty <= 0) {
      // Remove
      setCart(cart.filter(item => item.producto.id !== productId));
    } else if (targetQty > itemStock) {
      triggerError(`Stock insuficiente. Solo hay ${itemStock} unidades de este producto disponibles.`);
    } else {
      const updated = [...cart];
      updated[idx].cantidad = targetQty;
      setCart(updated);
    }
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
    setAmountPaid('');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.producto.precio_venta * item.cantidad), 0);
  const cashChange = amountPaid && parseFloat(amountPaid) >= cartTotal 
    ? parseFloat(amountPaid) - cartTotal 
    : 0;

  // POS Checkout Proceed
  const handleCheckout = async () => {
    if (!cajaAbierta) {
      triggerError('Debe habilitar y abrir la caja registradora para poder facturar.');
      return;
    }

    if (cart.length === 0) {
      triggerError('El carrito de compras se encuentra vacío.');
      return;
    }

    if (metodoPago === 'EFECTIVO' && amountPaid !== '') {
      const cashVal = parseFloat(amountPaid);
      if (isNaN(cashVal) || cashVal < cartTotal) {
        triggerError('El efectivo ingresado debe ser mayor o igual al total a pagar.');
        return;
      }
    }

    const itemsPayload = cart.map(item => ({
      producto_id: item.producto.id,
      cantidad: item.cantidad
    }));

    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cliente_id: selectedClienteId,
          metodo_pago: metodoPago,
          items: itemsPayload
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo realizar la transacción de venta.');
      }

      triggerSuccess(`Venta registrada exitosamente con el correlativo: ${resData.correlativo}`);
      handleClearCart();
      onRefresh();

      // Automatically construct and display real Ticket details
      setReceiptModel({
        isOpen: true,
        venta: {
          id: resData.id,
          fecha: resData.fecha,
          cliente_id: resData.cliente_id,
          total: resData.total,
          metodo_pago: resData.metodo_pago,
          usuario_id: resData.usuario_id,
          correlativo: resData.correlativo,
          caja_id: resData.caja_id,
          detalles: resData.detalles.map((d: any) => {
            const pr = productos.find(p => p.id === d.producto_id);
            return {
              ...d,
              producto_nombre: pr ? pr.nombre : 'Producto',
              producto_codigo: pr ? pr.codigo : ''
            };
          })
        }
      });

    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Fast Client register
  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientNombre || !newClientDocumento) {
      triggerError('Nombre y RUT/Documento son obligatorios.');
      return;
    }

    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: newClientNombre,
          documento: newClientDocumento,
          telefono: newClientTelefono,
          email: `${newClientDocumento}@stockflow.com`,
          direccion: 'Dirección POS'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al guardar cliente.');
      }

      triggerSuccess(`Cliente registrado: ${resData.nombre}`);
      onRefresh();
      setSelectedClienteId(resData.id);
      setNewClientModal(false);
      setNewClientNombre('');
      setNewClientDocumento('');
      setNewClientTelefono('');
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Inspect particular historic invoice ticket
  const handleViewInvoice = (venta: Venta) => {
    setReceiptModel({ isOpen: true, venta });
  };

  // Filter history
  const filteredVentas = ventas.filter(v => {
    const val = historySearch.toLowerCase();
    return v.correlativo.toLowerCase().includes(val) || 
           (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(val)) ||
           (v.usuario_nombre && v.usuario_nombre.toLowerCase().includes(val));
  });

  return (
    <div className="space-y-6" id="ventas-tab-panel">
      
      {/* Alert Notices */}
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

      {/* POS Sub Navigation */}
      <div className="flex border-b border-slate-100 justify-between items-center">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'pos'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🛒 Terminal Punto de Venta (POS)
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'historial'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            📋 Facturas / Historial de Ventas
          </button>
        </div>

        {/* Caja global Status */}
        <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold bg-slate-50 border border-slate-200 p-2 rounded-lg pr-4">
          <span className={`w-2 h-2 rounded-full ${cajaAbierta ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-slate-600">{cajaAbierta ? 'Caja Registradora Abierta' : 'Caja Registradora Serrada (Inactiva)'}</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* POS VIEW                                                       */}
      {/* ============================================================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" id="pos-view">
          
          {/* POS Catalog section */}
          <div className="xl:col-span-7 space-y-4">
            
            {/* Catalog search and category pills */}
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-2xs space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Escriba para buscar por código de barra, código SKU o nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg outline-none text-xs focus:bg-white focus:border-slate-300 transition-all font-medium"
                />
              </div>

              {/* Quick Category filter pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-full transition-colors uppercase ${
                    selectedCategory === null ? 'bg-slate-800 text-white hover:bg-slate-800' : ''
                  }`}
                >
                  Todos
                </button>
                {productCategoriesIds.map(catId => {
                  const pCat = productos.find(p => p.categoria_id === catId);
                  const catName = pCat ? `Categoría ${catId}` : `Cat. ${catId}`;
                  return (
                    <button
                      key={catId}
                      onClick={() => setSelectedCategory(catId)}
                      className={`px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-full transition-all uppercase ${
                        selectedCategory === catId ? 'bg-slate-800 text-white hover:bg-slate-800' : ''
                      }`}
                    >
                      {pCat?.categoria_id === 1 ? 'Tecnología' : pCat?.categoria_id === 2 ? 'Línea Blanca' : pCat?.categoria_id === 3 ? 'Herramientas' : pCat?.categoria_id === 4 ? 'Alimentos y Bebidas' : pCat?.categoria_id === 5 ? 'Papelería y Oficina' : catName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => {
                  const inCartQty = cart.find(item => item.producto.id === p.id)?.cantidad || 0;
                  const isStockOut = p.stock <= 0;
                  const isAlmostOut = !isStockOut && p.stock <= p.stock_minimo;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddToCart(p)}
                      className={`flex flex-col bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-xs relative ${
                        isStockOut
                          ? 'border-slate-200 opacity-60'
                          : isAlmostOut
                            ? 'border-amber-200 hover:border-amber-400 bg-amber-50/10'
                            : 'border-slate-100 hover:border-emerald-500'
                      }`}
                    >
                      {/* Already in cart badge */}
                      {inCartQty > 0 && (
                        <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full font-mono">
                          {inCartQty} en carro
                        </span>
                      )}

                      <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 bg-slate-50 rounded px-1.5 py-0.5 w-max">
                        {p.codigo}
                      </span>

                      <h4 className="font-extrabold text-slate-800 text-xs mt-3 truncate">{p.nombre}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 min-h-[30px] line-clamp-2">{p.descripcion || 'Sin descripción'}</p>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                        <span className="font-mono font-bold text-slate-900 text-xs md:text-sm">
                          ${p.precio_venta.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          isStockOut
                            ? 'text-red-500'
                            : isAlmostOut
                              ? 'text-amber-600'
                              : 'text-slate-400'
                        }`}>
                          {isStockOut ? 'Agotado' : `Disponibles: ${p.stock}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white border rounded-xl">
                  No se encontraron productos disponibles en esta sección.
                </div>
              )}
            </div>
          </div>

          {/* POS Cart Sidebar Section */}
          <div className="xl:col-span-5 bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col min-h-[600px] justify-between space-y-5" id="cart-box">
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Orden de Venta / Carrito</span>
                </div>
                <button
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                  className="text-[10px] text-rose-600 font-bold hover:underline disabled:opacity-40"
                >
                  Vaciar Carrito
                </button>
              </div>

              {/* Cart List */}
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[300px] pr-1">
                {cart.length > 0 ? (
                  cart.map((item, idx) => (
                    <div key={item.producto.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 rounded px-1">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-bold text-slate-800 truncate">{item.producto.nombre}</p>
                        <p className="font-mono text-[9px] text-slate-400 mt-0.5">${item.producto.precio_venta.toLocaleString('es-CO', { maximumFractionDigits: 0 })} / ud</p>
                      </div>

                      {/* Qty Adjustment Controls */}
                      <div className="flex items-center space-x-2.5">
                        <button
                          onClick={() => handleUpdateQty(item.producto.id, -1)}
                          className="p-1 hover:bg-slate-100 border rounded cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-slate-500" />
                        </button>
                        <span className="font-mono font-bold text-slate-800 w-4 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => handleUpdateQty(item.producto.id, 1)}
                          className="p-1 hover:bg-slate-100 border rounded cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-500" />
                        </button>

                        <span className="font-mono font-bold text-slate-900 w-24 text-right">
                          ${(item.producto.precio_venta * item.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 opacity-45 mx-auto mb-2" />
                    <p className="text-xs">Haga clic en los productos del catálogo de la izquierda para agregarlos al POS.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer, Payment type & Total pricing processing */}
            <div className="pt-4 border-t border-slate-100 space-y-4 bg-slate-50 -mx-5 -mb-5 p-5 rounded-b-xl border-t border-slate-200/50">
              
              {/* Select Customer node */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Establecer Cliente</span>
                  </label>
                  <button
                    onClick={() => setNewClientModal(true)}
                    className="text-[10px] text-emerald-600 font-bold hover:underline"
                  >
                    + Registrar Cliente
                  </button>
                </div>
                <select
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none text-slate-600"
                >
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} (ID: {c.documento})</option>
                  ))}
                </select>
              </div>

              {/* Payment Methods */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Método de Pago Preferido</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const).map(m => {
                    const isSelected = metodoPago === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMetodoPago(m);
                          if (m !== 'EFECTIVO') setAmountPaid('');
                        }}
                        className={`py-2 text-[10px] font-bold rounded border transition-colors outline-none text-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash change computation */}
              {metodoPago === 'EFECTIVO' && cart.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pb-1">
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Paga con ($ COP)</label>
                    <input
                      type="number"
                      step="1000"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="Ej. Cantidad de efectivo"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-slate-300 rounded outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Su Cambio ($ COP)</label>
                    <div className="px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded font-bold font-mono text-emerald-700 min-h-[30px]">
                      ${cashChange.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              )}

              {/* Invoiced Totals */}
              <div className="flex justify-between items-center text-slate-800 py-2 border-t border-slate-200/50">
                <span className="text-xs font-semibold text-slate-500 uppercase">Monto Total a Pagar</span>
                <span className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
                  ${cartTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Primary submit action */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm shadow-md text-center rounded-lg transition-colors duration-150 disabled:bg-slate-300 disabled:shadow-none"
              >
                PROCESAR PAGO Y FACTURAR
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* HISTORIAL/INVOICES VIEW                                        */}
      {/* ============================================================== */}
      {activeTab === 'historial' && (
        <div className="space-y-4" id="invoices-list-view">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por correlativo o cliente..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none text-xs focus:bg-white"
              />
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Ventas realizadas: <strong className="text-slate-700 font-bold">{ventas.length} sesiones</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">IMPRESIÓN</th>
                    <th className="p-4">CORRELATIVO</th>
                    <th className="p-4">FECHA / HORA</th>
                    <th className="p-4">CLIENTE</th>
                    <th className="p-4">MÉTODO PAGO</th>
                    <th className="p-4 text-right">TOTAL FACTURADO</th>
                    <th className="p-4">REGISTRADO POR</th>
                    <th className="p-4 text-center">TICKET TÓPICO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredVentas.length > 0 ? (
                    filteredVentas.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="p-4 text-center">
                          <Printer className="w-4 h-4 text-slate-400 hover:text-slate-800 cursor-pointer mx-auto" onClick={() => handleViewInvoice(v)} />
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800">{v.correlativo}</td>
                        <td className="p-4 font-medium text-slate-500">{new Date(v.fecha).toLocaleString('es-CO')}</td>
                        <td className="p-4 font-bold text-slate-800">{v.cliente_nombre || `Cliente #${v.cliente_id}`}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-700 font-mono tracking-wide">{v.metodo_pago}</span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">${v.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                        <td className="p-4 font-medium text-slate-500">{v.usuario_nombre || `Operador #${v.usuario_id}`}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleViewInvoice(v)}
                            className="text-[10px] text-emerald-600 font-bold hover:underline"
                          >
                            Ver Recibo
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        No se registran transacciones que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* QUICK CLIENT MODAL                                             */}
      {/* ============================================================== */}
      {newClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border">
            <div className="flex items-center justify-between p-4 border-b bg-slate-950 text-white">
              <h2 className="text-xs font-bold uppercase tracking-wider">👤 Registro Rápido de Cliente</h2>
              <button onClick={() => setNewClientModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickClientSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newClientNombre}
                  onChange={(e) => setNewClientNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">RUT / Documento / NIF *</label>
                <input
                  type="text"
                  required
                  value={newClientDocumento}
                  onChange={(e) => setNewClientDocumento(e.target.value)}
                  placeholder="Ej. 12345678-9"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono Móvil</label>
                <input
                  type="text"
                  value={newClientTelefono}
                  onChange={(e) => setNewClientTelefono(e.target.value)}
                  placeholder="+506 9999-9999"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded shadow-2xs transition-colors"
              >
                Grabar en Base de Datos
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TICKET RECEIPT MODAL                                           */}
      {/* ============================================================== */}
      {receiptModel.isOpen && receiptModel.venta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="receipt-modal-card">
          <div className="bg-white rounded-xl shadow-2xl border w-full max-w-sm overflow-hidden animate-slide-up flex flex-col">
            
            {/* Header control */}
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-950 text-white">
              <span className="text-xs font-bold tracking-widest uppercase flex items-center space-x-1">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>Ticket de Compra</span>
              </span>
              <button
                onClick={() => setReceiptModel({ isOpen: false })}
                className="text-slate-400 hover:text-white p-1"
                id="close-receipt-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Layout */}
            <div className="p-6 bg-amber-50/20 text-slate-700 text-xs font-medium space-y-4">
              
              {/* Store details */}
              <div className="text-center space-y-1">
                <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">StockFlow ERP S.A.</h2>
                <p className="text-[10px] text-slate-400">RUC: 20601245892</p>
                <p className="text-[10px] text-slate-400">Av. Industrial 450, Lima - Perú</p>
                <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">*** VENTA AUTORIZADA ***</p>
              </div>

              {/* Metadata details */}
              <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nº Ticket:</span>
                  <span className="font-mono font-bold text-slate-800">{receiptModel.venta.correlativo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha / Hora:</span>
                  <span className="text-slate-600">{new Date(receiptModel.venta.fecha).toLocaleString('es-CR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Adquirido por:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[170px]">
                    {clientes.find(c => c.id === receiptModel.venta!.cliente_id)?.nombre || 'Consumidor Final'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Método Pago:</span>
                  <span className="font-bold font-mono uppercase text-slate-800">{receiptModel.venta.metodo_pago}</span>
                </div>
              </div>

              {/* Products Details List */}
              <div className="space-y-2 py-1">
                <div className="flex justify-between text-[10px] border-b pb-1 font-bold text-slate-400">
                  <span>DESCRIPCIÓN DEL ARTÍCULO</span>
                  <div className="flex space-x-6">
                    <span className="w-12 text-center">CANT</span>
                    <span className="w-16 text-right">TOTAL</span>
                  </div>
                </div>

                <div className="divide-y divide-dashed divide-slate-200 text-[11px] max-h-[160px] overflow-y-auto pr-1">
                  {receiptModel.venta.detalles && receiptModel.venta.detalles.length > 0 ? (
                    receiptModel.venta.detalles.map((det) => (
                      <div key={det.id} className="py-2.5 flex justify-between">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="font-bold text-slate-800 truncate">{det.producto_nombre}</p>
                          <span className="text-[9px] text-slate-400 font-mono">${det.precio_unitario.toLocaleString('es-CO', { maximumFractionDigits: 0 })}/ud</span>
                        </div>
                        <div className="flex space-x-6 items-center">
                          <span className="w-12 text-center font-mono font-bold text-slate-600">x{det.cantidad}</span>
                          <span className="w-20 text-right font-mono font-bold text-slate-800">${det.subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-3 text-center text-slate-400 text-[10px]">
                      No se registran detalles disponibles de los artículos.
                    </div>
                  )}
                </div>
              </div>

              {/* Computations */}
              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-xs font-extrabold text-slate-900 border-b pb-1.5">
                  <span className="uppercase tracking-wider">TOTAL A PAGAR</span>
                  <span className="font-mono">${receiptModel.venta.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                </div>
                <p className="text-[9px] text-slate-400 italic text-center pt-2">
                  ¡Gracias por su preferencia comercial!
                </p>
              </div>

            </div>

            {/* Print trigger */}
            <div className="p-4 bg-slate-50 border-t flex space-x-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => setReceiptModel({ isOpen: false })}
                className="px-4 py-2 hover:bg-slate-200 border bg-white rounded text-slate-600 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
