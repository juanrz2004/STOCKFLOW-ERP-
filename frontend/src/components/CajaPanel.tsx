import React, { useState } from 'react';
import { 
  Inbox, 
  Plus, 
  Minus, 
  CheckCircle, 
  X, 
  History, 
  TrendingUp, 
  ArrowRightLeft, 
  Calendar, 
  Settings,
  AlertCircle
} from 'lucide-react';
import { Caja, UserPayload } from '../types';

interface CajaPanelProps {
  cajas: Caja[];
  cajaAbierta: boolean;
  currentUser: UserPayload;
  onRefresh: () => void;
  token: string;
}

export default function CajaPanel({
  cajas,
  cajaAbierta,
  currentUser,
  onRefresh,
  token
}: CajaPanelProps) {
  const [activeTab, setActiveTab] = useState<'estado' | 'historial'>('estado');
  
  // Forms & Modal states
  const [openingBalance, setOpeningBalance] = useState<number>(100.00);
  const [openingNotes, setOpeningNotes] = useState<string>('Apertura de turno de operaciones.');
  
  // Custom manual deposit/withdrawal
  const [manualModal, setManualModal] = useState(false);
  const [manualTipo, setManualTipo] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [manualMonto, setManualMonto] = useState<string>('');
  const [manualMotivo, setManualMotivo] = useState<string>('');

  // Close Register Modal
  const [closeRegisterModal, setCloseRegisterModal] = useState(false);
  const [measuredCash, setMeasuredCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('Arqueo de caja conforme y cuadrado al término del turno.');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Safe checks
  const canModify = currentUser.rol === 'ADMIN' || currentUser.rol === 'CAJERO';

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Get active session
  const activeCaja = cajas.find(c => c.estado === 'ABIERTA');

  // Submit Open Caja
  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    if (openingBalance < 0) {
      triggerError('El saldo inicial de la caja no puede ser negativo.');
      return;
    }

    try {
      const response = await fetch('/api/caja/apertura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          monto_apertura: openingBalance,
          observaciones: openingNotes
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo abrir la sesión de caja.');
      }

      triggerSuccess('Se ha APERTURADO la caja registradora para el turno actual.');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Submit Manual Deposit or Withdrawal
  const handleManualTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashVal = parseFloat(manualMonto);
    if (isNaN(cashVal) || cashVal <= 0) {
      triggerError('El importe monetario debe ser positivo.');
      return;
    }
    if (!manualMotivo) {
      triggerError('Debe especificar un motivo descriptor de la transacción.');
      return;
    }

    try {
      const response = await fetch('/api/caja/movimiento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo: manualTipo,
          monto: cashVal,
          motivo: manualMotivo
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo registrar la operación de caja.');
      }

      triggerSuccess(`Operación de ${manualTipo} registrada en caja por: $${cashVal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`);
      setManualModal(false);
      setManualMonto('');
      setManualMotivo('');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Submit Session Closure & Arqueo
  const handleCloseCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    const measuredVal = parseFloat(measuredCash);
    if (isNaN(measuredVal) || measuredVal < 0) {
      triggerError('Por correo de control, especifique el importe de efectivo arqueado.');
      return;
    }

    try {
      const response = await fetch('/api/caja/cierre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          monto_cierre: measuredVal,
          observaciones: closingNotes
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'No se pudo cerrar la caja.');
      }

      const diff = resData.monto_cierre - resData.total_calculado;
      let notification = 'Caja CERRADA correctamente.';
      if (diff === 0) {
        notification += ' ¡Caja cuadrada con 0 de discrepancia!';
      } else if (diff > 0) {
        notification += ` Sobrante de efectivo de: $${diff.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
      } else {
        notification += ` Faltante de efectivo detectado de: $${Math.abs(diff).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
      }

      triggerSuccess(notification);
      setCloseRegisterModal(false);
      setMeasuredCash('');
      onRefresh();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  return (
    <div className="space-y-6" id="caja-tab-panel">
      
      {/* Dynamic alert logs */}
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

      {/* Internal Tab switch */}
      <div className="flex border-b border-slate-100 justify-between items-center">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('estado')}
            className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'estado'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            📊 Estado del Cajón de Dinero
          </button>
          
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-5 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'historial'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            📋 Historial de Turnos y Arqueos
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: ACTIVE STATUS ==================== */}
      {activeTab === 'estado' && (
        <div className="space-y-6" id="caja-estado-deck">
          
          {activeCaja ? (
            /* Open register visualization */
            <div className="space-y-6">
              
              {/* Header metadata layout */}
              <div className="bg-emerald-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-emerald-700 font-extrabold text-[10px] uppercase rounded tracking-widest text-emerald-100">
                    SITUACIÓN: ABIERTA PARA TRANSACCIONES
                  </span>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight mt-2">Caja Turno #{activeCaja.id}</h2>
                  <p className="text-xs text-emerald-100/85 mt-1">Apertura: {new Date(activeCaja.fecha_apertura).toLocaleString('es-CO')} • Operador: {currentUser.nombre}</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualTipo('EGRESO');
                      setManualModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-800 border border-emerald-700 hover:bg-emerald-700 text-white text-[10px] font-bold tracking-wider uppercase rounded"
                  >
                    💸 Retirar / Egreso
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualTipo('INGRESO');
                      setManualModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-800 border border-emerald-700 hover:bg-emerald-700 text-white text-[10px] font-bold tracking-wider uppercase rounded"
                  >
                    📥 Depositar / Ingreso
                  </button>
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => {
                        setMeasuredCash(activeCaja.total_calculado.toString());
                        setCloseRegisterModal(true);
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-emerald-990 text-xs font-bold rounded shadow-xs"
                    >
                      🔒 Arqueo & Cerrar Caja
                    </button>
                  )}
                </div>
              </div>

              {/* KPI layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="bg-white border rounded-xl p-4 shadow-2xs">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">💵 Saldo Inicial ($ COP)</span>
                  <p className="text-lg font-mono font-bold text-slate-800 mt-2">${activeCaja.monto_apertura.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                </div>

                <div className="bg-white border rounded-xl p-4 shadow-2xs">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">🛍️ Ventas Efectivo ($ COP)</span>
                  <p className="text-lg font-mono font-bold text-emerald-600 mt-2">${activeCaja.monto_ventas.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                </div>

                <div className="bg-white border rounded-xl p-4 shadow-2xs">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 font-semibold text-sky-600">📥 Depósitos Sencillo ($ COP)</span>
                  <p className="text-lg font-mono font-bold text-slate-800 mt-2">${activeCaja.monto_ingresos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                </div>

                <div className="bg-white border rounded-xl p-4 shadow-2xs">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 font-semibold text-rose-600">💸 Egresos / Gastos ($ COP)</span>
                  <p className="text-lg font-mono font-bold text-slate-800 mt-2">${activeCaja.monto_egresos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                </div>

                <div className="bg-slate-900 border border-slate-900 text-white rounded-xl p-4 shadow-2xs">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-300">💰 Efectivo Teórico Esperado</span>
                  <p className="text-xl font-mono font-black text-emerald-400 mt-1">${activeCaja.total_calculado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                </div>

              </div>

              {/* Subtitle / advice audit */}
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl text-xs space-y-2">
                <h4 className="font-bold text-slate-700">Verificación de Flujo de Caja</h4>
                <p className="text-slate-500 leading-relaxed font-normal">
                  Todas las transacciones de ventas realizadas mediante el método <strong>EFECTIVO</strong> se consignan directamente en el balance de arqueo teórico de la caja. Los egresos e ingresos manuales permiten reportar gastos operativos menores en efectivo (como compra de bolsas, meriendas) o cambios adicionales inyectados de forma manual.
                </p>
              </div>

            </div>
          ) : (
            /* Close register, request opening balance */
            <div className="max-w-xl mx-auto bg-white border border-slate-100 rounded-xl p-6 shadow-md text-xs space-y-6">
              
              <div className="text-center space-y-2">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                <h2 className="text-lg font-extrabold text-slate-800">Caja Registradora Inactiva (Cerrada)</h2>
                <p className="text-slate-400 max-w-sm mx-auto">Debes aperturar un nuevo turno con un saldo inicial en efectivo para poder facturar artículos en la terminal de ventas POS.</p>
              </div>

              {canModify ? (
                <form onSubmit={handleOpenCaja} className="space-y-4 pt-4 border-t border-slate-50">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monto de Apertura (Saldo Inicial en Caja) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 font-mono">$</span>
                      <input
                        type="number"
                        step="1000"
                        required
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                        placeholder="Monto en pesos"
                        className="w-full pl-7 pr-4 py-2 font-mono font-bold text-slate-800 border rounded outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Sencillo o efectivo de base para dar cambio inicial a los clientes.</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Observaciones Iniciales</label>
                    <textarea
                      rows={2}
                      value={openingNotes}
                      onChange={(e) => setOpeningNotes(e.target.value)}
                      placeholder="Comentarios (ej. Sencillo en monedas de 100 y 500, etc.)"
                      className="w-full px-3 py-2 border rounded resize-none outline-none font-medium text-slate-600"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition-colors cursor-pointer text-center uppercase tracking-wider"
                  >
                    Aperturar Turno de Caja
                  </button>

                </form>
              ) : (
                <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded text-center font-bold">
                  DENEGADO: Solo usuarios con el rol CAJERO u ADMIN poseen privilegios para abrir turnos de ventas.
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ==================== TAB 2: HISTORIC CLOSED SESSIONS ==================== */}
      {activeTab === 'historial' && (
        <div className="space-y-4 bg-white border border-slate-100 rounded-xl p-4 shadow-2xs" id="history-box">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Cierres de Caja Realizados (Arqueos)</h3>
            <p className="text-[11.5px] text-slate-400 mt-1">Auditoría de arqueo físico versus saldo teórico teórico en el cajón de dinero.</p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-md text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase text-[9.5px]">
                  <th className="p-3">TURNO ID</th>
                  <th className="p-3">APERTURA</th>
                  <th className="p-3">CIERRE</th>
                  <th className="p-3 text-right">INICIAL ($ COP)</th>
                  <th className="p-3 text-right">COMPUTADO ($ COP)</th>
                  <th className="p-3 text-right">ARQUEO FÍSICO ($ COP)</th>
                  <th className="p-3 text-center">DESVIACIÓN / GAP</th>
                  <th className="p-3">NOTAS DE CIERRE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {cajas.map(c => {
                  const isClosed = c.estado === 'CERRADA';
                  const variance = isClosed && c.monto_cierre !== null 
                    ? c.monto_cierre - c.total_calculado 
                    : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/20">
                      <td className="p-3 font-mono font-bold text-slate-800">#{c.id}</td>
                      <td className="p-3 font-mono text-slate-400">{new Date(c.fecha_apertura).toLocaleString('es-CO')}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-CO') : <span className="text-emerald-600 font-bold">Activo / En Curso</span>}
                      </td>
                      <td className="p-3 text-right font-mono">${c.monto_apertura.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-right font-mono text-slate-500">${c.total_calculado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        {c.monto_cierre !== null ? `$${c.monto_cierre.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        {isClosed ? (
                          variance === 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px]">✓ Cuadrada</span>
                          ) : variance > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-bold text-[10px]">+$${variance.toLocaleString('es-CO', { maximumFractionDigits: 0 })} Sobrante</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-50 text-red-800 rounded font-bold text-[10px]">-$${Math.abs(variance).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Faltante</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="p-3 max-w-[190px] truncate italic text-slate-400" title={c.observaciones || ''}>
                        {c.observaciones || 'Sin observaciones'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DEPOSIT/WITHDRAWAL MANUAL TRANSACTION MODAL                    */}
      {/* ============================================================== */}
      {manualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-sm overflow-hidden text-xs font-semibold">
            
            <div className="flex items-center justify-between p-4 bg-slate-950 text-white">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                {manualTipo === 'EGRESO' ? '💸 Registrar Retiro / Egreso de Efectivo' : '📥 Registrar Depósito / Inyección en Caja'}
              </h2>
              <button onClick={() => setManualModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualTxSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monto de la Operación ($ COP) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={manualMonto}
                  onChange={(e) => setManualMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded font-mono font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Justificación o Motivo *</label>
                <input
                  type="text"
                  required
                  value={manualMotivo}
                  onChange={(e) => setManualMotivo(e.target.value)}
                  placeholder="Ej. Compra de bolsas biodegradables"
                  className="w-full px-3 py-2 border rounded outline-none font-medium text-slate-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setManualModal(false)}
                  className="px-4 py-2 hover:bg-slate-100 border text-slate-600 font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded shadow-2xs"
                >
                  Confirmar Operación
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CLOSE BOX / CLOSURE ARQUEO MODAL                               */}
      {/* ============================================================== */}
      {closeRegisterModal && activeCaja && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-sm overflow-hidden text-xs">
            
            <div className="flex items-center justify-between p-4 bg-slate-950 text-white">
              <h2 className="text-xs font-bold uppercase tracking-wider">🔒 Arqueo Físico de Efectivo</h2>
              <button onClick={() => setCloseRegisterModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseCaja} className="p-5 space-y-4">
              
              <div className="bg-slate-50 border p-3 rounded space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Teórico de Caja Esperado:</span>
                  <span className="font-mono font-bold text-slate-850">${activeCaja.total_calculado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Compare el arqueo de billetes y monedas que posea físicamente en la gaveta contra el saldo que StockFlow calculó basándose en el historial de transacciones.
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monto Físico Contado en Caja (Arqueado) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={measuredCash}
                  onChange={(e) => setMeasuredCash(e.target.value)}
                  placeholder="Monto total contado"
                  className="w-full px-3 py-2 border rounded font-mono font-bold text-slate-800 focus:border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Comentarios / Observaciones de Cierre</label>
                <textarea
                  rows={2}
                  required
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded resize-none outline-none font-medium text-slate-650"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCloseRegisterModal(false)}
                  className="px-4 py-2 hover:bg-slate-100 border text-slate-600 font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs"
                >
                  Realizar Cierre de Turno
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
