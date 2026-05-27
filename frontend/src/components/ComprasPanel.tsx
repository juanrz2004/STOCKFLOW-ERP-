import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  ListOrdered, 
  ShoppingBag, 
  X, 
  Inbox, 
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Proveedor, Compra, Producto, UserPayload } from '../types';

interface ComprasPanelProps {
  proveedores: Proveedor[];
  compras: Compra[];
  productos: Producto[];
  currentUser: UserPayload;
  onRefresh: () => void;
  token: string;
}

export default function ComprasPanel({
  proveedores,
  compras,
  productos,
  currentUser,
  onRefresh,
  token
}: ComprasPanelProps) {
  const [activeTab, setActiveTab] = useState<'compras' | 'proveedores' | 'registrar'>('compras');
  
  // Search state
  const [supplierSearch, setSupplierSearch] = useState('');
  const [compraSearch, setCompraSearch] = useState('');

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Suppliers CRUD modals
  const [supModal, setSupModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'edit';
    supplier?: Proveedor;
  }>({ isOpen: false, type: 'create' });

  // Form states supplier
  const [supNombre, setSupNombre] = useState('');
  const [supNif, setSupNif] = useState('');
  const [supTelefono, setSupTelefono] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supDireccion, setSupDireccion] = useState('');

  // Order state Compras Inbound
  const [selectedProveedorId, setSelectedProveedorId] = useState<number>(1);
  const [buyCart, setBuyCart] = useState<Array<{
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
  }>>([]);

  const [activeProductSelect, setActiveProductSelect] = useState<number>(0);
  const [activeBuyQty, setActiveBuyQty] = useState<number>(10);
  const [activeBuyCost, setActiveBuyCost] = useState<number>(0);

  // Compra detailed drilldown modal
  const [viewCompra, setViewCompra] = useState<{
    isOpen: boolean;
    compra?: Compra;
  }>({ isOpen: false });

  const canModify = currentUser.rol === 'ADMIN' || currentUser.rol === 'BODEGUERO';

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Open Edit/Create Supplier Modal
  const openSupModal = (type: 'create' | 'edit', s?: Proveedor) => {
    if (!canModify) return;
    setErrorMsg('');
    setSupModal({ isOpen: true, type, supplier: s });

    if (type === 'create') {
      setSupNombre('');
      setSupNif('');
      setSupTelefono('');
      setSupEmail('');
      setSupDireccion('');
    } else if (s) {
      setSupNombre(s.nombre);
      setSupNif(s.nif);
      setSupTelefono(s.telefono);
      setSupEmail(s.email);
      setSupDireccion(s.direccion);
    }
  };

  // Supplier Submit Handle
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supNombre || !supNif) {
      triggerError('Nombre comercial e Identificación tributaria (RUT/NIF) son mandatorios.');
      return;
    }

    const payload = {
      nombre: supNombre,
      nif: supNif,
      telefono: supTelefono,
      email: supEmail,
      direccion: supDireccion
    };

    try {
      const url = supModal.type === 'edit' && supModal.supplier
        ? `/api/proveedores/${supModal.supplier.id}`
        : '/api/proveedores';
      const method = supModal.type === 'edit' ? 'PUT' : 'POST';

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
        throw new Error(resData.error || 'No se pudo guardar el proveedor.');
      }

      triggerSuccess(supModal.type === 'edit' ? 'Proveedor actualizado con éxito.' : 'Proveedor registrado exitosamente.');
      setSupModal({ isOpen: false, type: 'create' });
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Delete Supplier node
  const handleDeleteSupplier = async (id: number) => {
    if (!window.confirm('¿Desea dar de baja definitiva a este proveedor? Se comprobará que no posea compras asociadas.')) {
      return;
    }

    try {
      const response = await fetch(`/api/proveedores/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo eliminar el proveedor.');
      }
      triggerSuccess('Proveedor eliminado con éxito.');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Add Item to Buy Cart (Inbound order build)
  const handleAddInboundItem = () => {
    const pId = activeProductSelect || (productos[0]?.id);
    if (!pId) {
      triggerError('No hay productos disponibles.');
      return;
    }

    const qty = activeBuyQty;
    const cost = activeBuyCost;

    if (qty <= 0 || cost <= 0) {
      triggerError('La cantidad y el costo de compra unitario deben ser superiores a cero.');
      return;
    }

    const existingIdx = buyCart.findIndex(item => item.producto_id === pId);
    if (existingIdx !== -1) {
      const updated = [...buyCart];
      updated[existingIdx].cantidad += qty;
      updated[existingIdx].precio_unitario = cost; // Update with latest price
      setBuyCart(updated);
    } else {
      setBuyCart([...buyCart, { producto_id: pId, cantidad: qty, precio_unitario: cost }]);
    }

    // Reset simple values
    setActiveBuyQty(10);
    setActiveBuyCost(0);
  };

  // Remove Item from Inbound Build
  const handleRemoveInboundItem = (pId: number) => {
    setBuyCart(buyCart.filter(item => item.producto_id !== pId));
  };

  // Submit Restock Purchase order
  const handleRegisterPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (buyCart.length === 0) {
      triggerError('Debe agregar al menos un artículo a la orden de compra de reabastecimiento.');
      return;
    }

    try {
      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          proveedor_id: selectedProveedorId || proveedores[0]?.id,
          items: buyCart
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo registrar el reabastecimiento.');
      }

      triggerSuccess(`Compra procesada correctamente. Stock actualizado. Referencia: ${resData.correlativo}`);
      setBuyCart([]);
      setActiveTab('compras');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const filteredSuppliers = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    p.nif.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredCompras = compras.filter(c =>
    c.correlativo.toLowerCase().includes(compraSearch.toLowerCase()) ||
    (c.proveedor_nombre && c.proveedor_nombre.toLowerCase().includes(compraSearch.toLowerCase()))
  );

  const totalBuyBuildCost = buyCart.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

  return (
    <div className="space-y-6" id="compras-tab-panel">
      
      {/* Alert indicators */}
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

      {/* Panel subnavigation */}
      <div className="flex border-b border-slate-100 justify-between items-center">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('compras')}
            className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'compras'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            📋 Registro de Compras Totales
          </button>
          
          <button
            onClick={() => {
              setActiveTab('registrar');
              if (proveedores.length > 0) setSelectedProveedorId(proveedores[0].id);
              if (productos.length > 0) {
                setActiveProductSelect(productos[0].id);
                setActiveBuyCost(productos[0].precio_compra);
              }
            }}
            className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'registrar'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🚚 Formulario de Abastecimiento
          </button>

          <button
            onClick={() => setActiveTab('proveedores')}
            className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'proveedores'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🏢 Directorio de Proveedores
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: COMPRAS TIMELINE ==================== */}
      {activeTab === 'compras' && (
        <div className="space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar compras por correlativo o proveedor..."
                value={compraSearch}
                onChange={(e) => setCompraSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-lg outline-none text-xs focus:bg-white"
              />
            </div>
            <span className="text-[11px] text-slate-500">Historial transaccional de reabastecimiento: <strong className="font-bold text-slate-800">{compras.length} órdenes</strong></span>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">COD COMPRA</th>
                    <th className="p-4">FECHA / HORA</th>
                    <th className="p-4">PROVEEDOR</th>
                    <th className="p-4 text-right">TOTAL INVERTIDO</th>
                    <th className="p-4">REGISTRADO POR</th>
                    <th className="p-4 text-center">DETALLES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredCompras.length > 0 ? (
                    filteredCompras.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-800">{c.correlativo}</td>
                        <td className="p-4 font-medium text-slate-500">{new Date(c.fecha).toLocaleString('es-CO')}</td>
                        <td className="p-4 font-bold text-slate-800">{c.proveedor_nombre || `Proveedor #${c.proveedor_id}`}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">${c.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                        <td className="p-4 font-medium text-slate-500">{c.usuario_nombre || `Bodeguero #${c.usuario_id}`}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setViewCompra({ isOpen: true, compra: c })}
                            className="bg-slate-100 hover:bg-slate-250 text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded"
                          >
                            Ver Artículos
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        No se reportan compras de stock registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB 2: INBOUND FORMULARY (RESTOCK) ==================== */}
      {activeTab === 'registrar' && (
        <form onSubmit={handleRegisterPurchaseSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" id="purchase-creator-view">
          
          {/* Main Items Adder */}
          <div className="xl:col-span-7 bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Agregar Artículos al Reabastecimiento</h3>
              <p className="text-[10px] text-slate-400 mt-1">Seleccione el producto del catálogo que ingresará físicamente al almacén con el costo unitario de compra provisto por el proveedor.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              
              {/* Product selector */}
              <div className="md:col-span-6">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Elegir Producto</label>
                <select
                  value={activeProductSelect}
                  onChange={(e) => {
                    const pId = parseInt(e.target.value);
                    setActiveProductSelect(pId);
                    const prodObj = productos.find(p => p.id === pId);
                    if (prodObj) setActiveBuyCost(prodObj.precio_compra);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg outline-none text-slate-700 focus:bg-white"
                >
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>[{p.codigo}] {p.nombre} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>

              {/* Quantity input */}
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unidades</label>
                <input
                  type="number"
                  min="1"
                  value={activeBuyQty}
                  onChange={(e) => setActiveBuyQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg outline-none font-mono focus:bg-white"
                />
              </div>

              {/* Unitary cost input */}
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Costo Unit ($ COP)</label>
                <input
                  type="number"
                  step="100"
                  min="1"
                  value={activeBuyCost}
                  onChange={(e) => setActiveBuyCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg outline-none font-mono focus:bg-white"
                />
              </div>

              <div className="md:col-span-12 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddInboundItem}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded shadow-2xs transition-colors cursor-pointer"
                >
                  + Agregar a la Factura
                </button>
              </div>

            </div>

            {/* List of currently drafted inbound items */}
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="p-3">PRODUCTO</th>
                    <th className="p-3 text-center">CANTIDAD</th>
                    <th className="p-3 text-right">COSTO UNITARIO</th>
                    <th className="p-3 text-right">SUBTOTAL</th>
                    <th className="p-3 text-center">BORRAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {buyCart.length > 0 ? (
                    buyCart.map((item) => {
                      const prodObj = productos.find(p => p.id === item.producto_id);

                      return (
                        <tr key={item.producto_id}>
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{prodObj ? prodObj.nombre : 'Producto desconocido'}</span>
                            <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded ml-2 text-slate-500">{prodObj?.codigo}</span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold">{item.cantidad} uds.</td>
                          <td className="p-3 text-right font-mono">${item.precio_unitario.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">${(item.cantidad * item.precio_unitario).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveInboundItem(item.producto_id)}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No se registran artículos de compra agregados en este reabastecimiento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Checkout Restock metadata card */}
          <div className="xl:col-span-5 bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-4">
            
            <div className="border-b pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detalles de Facturación Inbound</h3>
            </div>

            {/* Choose Supplier */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proveedor Corporativo *</label>
              <select
                value={selectedProveedorId}
                onChange={(e) => setSelectedProveedorId(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg outline-none text-slate-600 focus:bg-white"
              >
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (ID: {p.nif})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 border border-slate-200/50 rounded-lg">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Cantidad Artículos Diferentes:</span>
                <span className="font-mono font-bold text-slate-800">{buyCart.length} descripciones</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t pt-2 mt-2">
                <span className="text-slate-500 font-semibold uppercase">Importe de Inversión Total:</span>
                <span className="text-lg font-mono font-extrabold text-slate-900">${totalBuyBuildCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Submit restock order completely */}
            {canModify ? (
              <button
                type="submit"
                disabled={buyCart.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm shadow rounded-lg transition-colors duration-150 disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400 cursor-pointer"
              >
                INGRESAR COMPRA A ALMACÉN
              </button>
            ) : (
              <div className="p-3 bg-red-50 text-red-800 rounded border border-red-100 text-center text-[11px] font-medium">
                DENEGADO: Su rol no cuenta con autorizaciones en el almacén de compras.
              </div>
            )}

          </div>

        </form>
      )}

      {/* ==================== TAB 3: PROVEEDORES CRUD ==================== */}
      {activeTab === 'proveedores' && (
        <div className="space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar proveedor por identificación o razón social..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-lg text-xs outline-none focus:bg-white"
              />
            </div>

            {canModify && (
              <button
                onClick={() => openSupModal('create')}
                className="flex items-center justify-center space-x-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Proveedor</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">NIF / RUC / IDENTIFICACIÓN</th>
                    <th className="p-4">RAZÓN SOCIAL</th>
                    <th className="p-4">TELÉFONO</th>
                    <th className="p-4">EMAIL DE CONTACTO</th>
                    <th className="p-4">DIRECCIÓN DE CORRESPONDENCIA</th>
                    {canModify && <th className="p-4 text-center">ACCIONES</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(prov => (
                      <tr key={prov.id} className="hover:bg-slate-55/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-850">{prov.nif}</td>
                        <td className="p-4 font-bold text-slate-800">{prov.nombre}</td>
                        <td className="p-4 font-mono text-slate-500">{prov.telefono || 'No asociado'}</td>
                        <td className="p-4 font-medium text-slate-600">{prov.email || 'N/A'}</td>
                        <td className="p-4 text-slate-500 max-w-[200px] truncate">{prov.direccion || 'Sin registrar'}</td>
                        {canModify && (
                          <td className="p-4">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => openSupModal('edit', prov)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSupplier(prov.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={canModify ? 6 : 5} className="p-12 text-center text-slate-400">
                        No se registran proveedores cargados en la base de datos corporativa.
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
      {/* COMPRA DETAILS DRILLDOWN MODAL                                 */}
      {/* ============================================================== */}
      {viewCompra.isOpen && viewCompra.compra && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-xl overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between p-4 bg-slate-950 text-white">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Detalle de Almacenamiento Inbound</span>
              </span>
              <button onClick={() => setViewCompra({ isOpen: false })} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg">
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Nº Compra:</span>
                  <span className="font-bold text-slate-800 font-mono text-sm">{viewCompra.compra.correlativo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Inscrito:</span>
                  <span className="font-medium text-slate-700">{new Date(viewCompra.compra.fecha).toLocaleString('es-CO')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Distribuidor (Proveedor):</span>
                  <span className="font-bold text-slate-800">{viewCompra.compra.proveedor_nombre}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Monto Total Invertido:</span>
                  <span className="font-semibold text-emerald-700 font-mono">${viewCompra.compra.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b font-bold text-slate-500 uppercase text-[9px]">
                      <th className="p-3">PRODUCTO / COD</th>
                      <th className="p-3 text-center">CANTIDAD</th>
                      <th className="p-3 text-right">COSTO COMPRA</th>
                      <th className="p-3 text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {viewCompra.compra.detalles && viewCompra.compra.detalles.length > 0 ? (
                      viewCompra.compra.detalles.map((det) => (
                        <tr key={det.id}>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{det.producto_nombre}</div>
                            <span className="font-mono text-[9px] text-slate-400">{det.producto_codigo}</span>
                          </td>
                          <td className="p-3 text-center font-mono">{det.cantidad} uds.</td>
                          <td className="p-3 text-right font-mono">${det.precio_unitario.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">${det.subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 text-[10px]">No se reportan desgloses de artículos para esta orden.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button
                onClick={() => setViewCompra({ isOpen: false })}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUPPLIER MODAL (CREATE/EDIT)                                   */}
      {/* ============================================================== */}
      {supModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between p-4 border-b bg-slate-950 text-white">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                {supModal.type === 'edit' ? '✏️ Editar Datos del Proveedor' : '🚚 Registrar Nuevo Proveedor'}
              </h2>
              <button onClick={() => setSupModal({ isOpen: false, type: 'create' })} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="p-5 space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre Comercial / Distribuidores *</label>
                <input
                  type="text"
                  required
                  value={supNombre}
                  onChange={(e) => setSupNombre(e.target.value)}
                  placeholder="Ej. Distribuidora del Pacífico S.A.C."
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Identificador Tributario (NIF / RUC / RUT) *</label>
                <input
                  type="text"
                  required
                  value={supNif}
                  onChange={(e) => setSupNif(e.target.value)}
                  placeholder="Ej. 20609876543"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono Enlace</label>
                <input
                  type="text"
                  value={supTelefono}
                  onChange={(e) => setSupTelefono(e.target.value)}
                  placeholder="Ej. 01 444-5566"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email de Operaciones</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="Ej. ventas@distglobal.com"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dirección Legal / Almacén Origen</label>
                <input
                  type="text"
                  value={supDireccion}
                  onChange={(e) => setSupDireccion(e.target.value)}
                  placeholder="Av. Industrial 1250, Cercado"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSupModal({ isOpen: false, type: 'create' })}
                  className="px-4 py-2 hover:bg-slate-100 border text-slate-600 font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded shadow-2xs"
                >
                  Guardar Perfil
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
