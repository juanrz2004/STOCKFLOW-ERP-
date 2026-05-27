import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  Award,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { Cliente, Venta, UserPayload } from '../types';

interface ClientesPanelProps {
  clientes: Cliente[];
  ventas: Venta[];
  currentUser: UserPayload;
  onRefresh: () => void;
  token: string;
}

export default function ClientesPanel({
  clientes,
  ventas,
  currentUser,
  onRefresh,
  token
}: ClientesPanelProps) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'edit';
    cliente?: Cliente;
  }>({ isOpen: false, type: 'create' });

  // Form states
  const [cliNombre, setCliNombre] = useState('');
  const [cliDocumento, setCliDocumento] = useState('');
  const [cliTelefono, setCliTelefono] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliDireccion, setCliDireccion] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isVendedorOrAdmin = currentUser.rol === 'ADMIN' || currentUser.rol === 'VENDEDOR' || currentUser.rol === 'CAJERO';

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const openModal = (type: 'create' | 'edit', c?: Cliente) => {
    if (!isVendedorOrAdmin) return;
    setErrorMsg('');
    setModal({ isOpen: true, type, cliente: c });

    if (type === 'create') {
      setCliNombre('');
      setCliDocumento('');
      setCliTelefono('');
      setCliEmail('');
      setCliDireccion('');
    } else if (c) {
      setCliNombre(c.nombre);
      setCliDocumento(c.documento);
      setCliTelefono(c.telefono);
      setCliEmail(c.email);
      setCliDireccion(c.direccion);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliNombre || !cliDocumento) {
      triggerError('Nombre del cliente y RUT/Documento son campos obligatorios.');
      return;
    }

    const payload = {
      nombre: cliNombre,
      documento: cliDocumento,
      telefono: cliTelefono,
      email: cliEmail || `${cliDocumento}@stockflow.com`,
      direccion: cliDireccion
    };

    try {
      const url = modal.type === 'edit' && modal.cliente
        ? `/api/clientes/${modal.cliente.id}`
        : '/api/clientes';
      const method = modal.type === 'edit' ? 'PUT' : 'POST';

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
        throw new Error(resData.error || 'No se pudo guardar el perfil del cliente.');
      }

      triggerSuccess(modal.type === 'edit' ? 'Perfil del cliente actualizado con éxito.' : 'Cliente registrado exitosamente.');
      setModal({ isOpen: false, type: 'create' });
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (id === 1) {
      triggerError('No se puede eliminar la cuenta de Consumidor Final predeterminada.');
      return;
    }

    if (!window.confirm('¿Está totalmente seguro de eliminar este cliente del sistema? Se verificará que no cuente con historial de facturación.')) {
      return;
    }

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al eliminar cliente.');
      }
      triggerSuccess('Cliente dado de baja exitosamente.');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.documento.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" id="clientes-tab-panel">
      
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg text-emerald-800 text-xs font-semibold flex items-center space-x-2 shadow-2xs">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800 text-xs font-semibold flex items-center space-x-2 shadow-2xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-2xs" id="customers-bar">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar clientes por nombre, documento o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none text-xs focus:bg-white focus:border-slate-300 transition-all font-medium"
          />
        </div>

        {isVendedorOrAdmin && (
          <button
            onClick={() => openModal('create')}
            className="flex items-center justify-center space-x-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        )}
      </div>

      {/* Clientes Card list or Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4">RUT / IDENTIFICACIÓN</th>
                <th className="p-4">CLIENTE / CONTÁCTO</th>
                <th className="p-4">TELÉFONO</th>
                <th className="p-4">DIRECCIÓN</th>
                <th className="p-4 text-center">COMPRAS REGISTRADAS</th>
                <th className="p-4 text-right">TOTAL FACTURADO INBOUND</th>
                <th className="p-4 text-center">MÉTRICA</th>
                {isVendedorOrAdmin && <th className="p-4 text-center">ACCIONES</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredClientes.length > 0 ? (
                filteredClientes.map(c => {
                  const clientInvoices = ventas.filter(v => v.cliente_id === c.id);
                  const purchasesCount = clientInvoices.length;
                  const totalSpent = clientInvoices.reduce((sum, v) => sum + v.total, 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-800">{c.documento}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{c.nombre}</div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">
                        {c.telefono ? (
                          <div className="flex items-center space-x-1 text-slate-500">
                            <Phone className="w-3 h-3" />
                            <span>{c.telefono}</span>
                          </div>
                        ) : (
                          <span className="text-slate-405">Sin especificar</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 max-w-[200px] truncate">
                        {c.direccion ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3" />
                            <span className="truncate">{c.direccion}</span>
                          </div>
                        ) : (
                          <span className="text-slate-404">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono font-bold text-slate-800 bg-slate-50 border px-2 py-0.5 rounded text-[11px]">
                          {purchasesCount} uds.
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900">
                        ${totalSpent.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-4 text-center">
                        {totalSpent > 1000000 ? (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center space-x-1 w-max mx-auto">
                            <Award className="w-3 h-3 text-amber-600" />
                            <span>Premium VIP</span>
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Minorista</span>
                        )}
                      </td>
                      {isVendedorOrAdmin && (
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => openModal('edit', c)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar Perfil"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {c.id !== 1 && (
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Eliminar Cliente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isVendedorOrAdmin ? 8 : 7} className="p-12 text-center text-slate-400">
                    No se registran clientes disponibles en esta sección.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== CREATE/EDIT CLIENT MODAL ==================== */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md overflow-hidden">
            
            <div className="flex items-center justify-between p-4 border-b bg-slate-950 text-white">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                {modal.type === 'edit' ? '✏️ Editar Datos de Cliente' : '👤 Registrar Nuevo Cliente'}
              </h2>
              <button onClick={() => setModal({ isOpen: false, type: 'create' })} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre Completo de la Persona o Empresa *</label>
                <input
                  type="text"
                  required
                  value={cliNombre}
                  onChange={(e) => setCliNombre(e.target.value)}
                  placeholder="Ej. Consorcio de Alimentos S.A."
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Documento Identidad / RUT / RUC / NIF *</label>
                <input
                  type="text"
                  required
                  value={cliDocumento}
                  onChange={(e) => setCliDocumento(e.target.value)}
                  placeholder="Ej. 20601234567"
                  disabled={modal.type === 'edit' && modal.cliente?.id === 1}
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono Fijo / Celular</label>
                <input
                  type="text"
                  value={cliTelefono}
                  onChange={(e) => setCliTelefono(e.target.value)}
                  placeholder="Ej. +51 987654321"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Correo Electrónico (Email)</label>
                <input
                  type="email"
                  value={cliEmail}
                  onChange={(e) => setCliEmail(e.target.value)}
                  placeholder="Ej. administracion@empresa.com"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dirección Física / Despacho</label>
                <input
                  type="text"
                  value={cliDireccion}
                  onChange={(e) => setCliDireccion(e.target.value)}
                  placeholder="Calle Las Palmeras 120, San Isidro"
                  className="w-full px-3 py-2 border rounded outline-none focus:border-slate-300 bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModal({ isOpen: false, type: 'create' })}
                  className="px-4 py-2 hover:bg-slate-100 border text-slate-600 font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-2xs"
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
