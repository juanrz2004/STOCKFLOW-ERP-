import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Activity, 
  ShoppingBag, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Inbox, 
  Tag, 
  Truck, 
  Key, 
  Lock 
} from 'lucide-react';
import { DashboardMetrics, UserPayload } from '../types';
import { motion } from 'motion/react';

interface DashboardPanelProps {
  metrics: DashboardMetrics | null;
  currentUser: UserPayload;
  goToTab: (tab: string) => void;
  loading: boolean;
}

export default function DashboardPanel({ metrics, currentUser, goToTab, loading }: DashboardPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm font-medium">Cargando métricas de rendimiento real...</p>
      </div>
    );
  }

  const statCards = [
    {
      id: 'stat-sales',
      title: 'Ventas del Día',
      value: `$${(metrics?.ventasHoyTotal ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      description: 'Monto total facturado en la jornada actual',
      icon: DollarSign,
      color: 'from-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-300',
      iconColor: 'bg-emerald-100 text-emerald-800',
      action: currentUser.rol === 'BODEGUERO' ? undefined : () => goToTab('ventas')
    },
    {
      id: 'stat-earnings',
      title: 'Ganancias de Operación',
      value: `$${(metrics?.gananciasTotales ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      description: 'Margen de utilidad total (Venta - Compra)',
      icon: TrendingUp,
      color: 'from-blue-50 border-blue-100 text-blue-700 hover:border-blue-300',
      iconColor: 'bg-blue-100 text-blue-800',
      action: currentUser.rol === 'ADMIN' ? () => goToTab('reportes') : undefined
    },
    {
      id: 'stat-cashflow',
      title: 'Flujo en Caja Activo',
      value: `$${(metrics?.cashFlowActual ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      description: metrics?.cajaAbierta ? 'Session activa de caja registradora' : 'Caja cerrada o inactiva',
      icon: Activity,
      color: metrics?.cajaAbierta ? 'from-amber-50 border-amber-100 text-amber-700 hover:border-amber-300' : 'from-gray-50 border-gray-100 text-gray-500 hover:border-gray-300',
      iconColor: metrics?.cajaAbierta ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700',
      action: currentUser.rol === 'BODEGUERO' || currentUser.rol === 'VENDEDOR' ? undefined : () => goToTab('caja')
    },
    {
      id: 'stat-inventory',
      title: 'Alertas de Stock',
      value: `${(metrics?.cantidadAgotados ?? 0) + (metrics?.cantidadStockBajo ?? 0)}`,
      description: `${metrics?.cantidadAgotados ?? 0} agotados / ${metrics?.cantidadStockBajo ?? 0} bajo stock`,
      icon: AlertTriangle,
      color: ((metrics?.cantidadAgotados ?? 0) + (metrics?.cantidadStockBajo ?? 0)) > 0 ? 'from-rose-50 border-rose-100 text-rose-700 hover:border-rose-300' : 'from-slate-50 border-slate-100 text-slate-700',
      iconColor: ((metrics?.cantidadAgotados ?? 0) + (metrics?.cantidadStockBajo ?? 0)) > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-100 text-slate-800',
      action: currentUser.rol === 'VENDEDOR' ? undefined : () => goToTab('inventario')
    }
  ];

  // Quick Action Buttons based on User Roles
  const getQuickActions = () => {
    switch (currentUser.rol) {
      case 'ADMIN':
        return [
          { label: 'Nueva Venta (POS)', icon: ShoppingBag, tab: 'ventas', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
          { label: 'Ingresar Compra', icon: Truck, tab: 'compras', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
          { label: 'Apertura / Movimiento Caja', icon: Activity, tab: 'caja', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
          { label: 'Registrar Producto', icon: PlusCircle, tab: 'inventario', color: 'bg-slate-800 hover:bg-slate-900 text-white' }
        ];
      case 'CAJERO':
        return [
          { label: 'Nueva Venta (POS)', icon: ShoppingBag, tab: 'ventas', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
          { label: 'Movimiento de Caja', icon: Activity, tab: 'caja', color: 'bg-amber-600 hover:bg-amber-700 text-white' }
        ];
      case 'BODEGUERO':
        return [
          { label: 'Nuevo Producto', icon: PlusCircle, tab: 'inventario', color: 'bg-slate-800 hover:bg-slate-900 text-white' },
          { label: 'Ingresar Compra Mercancía', icon: Truck, tab: 'compras', color: 'bg-blue-600 hover:bg-blue-700 text-white' }
        ];
      case 'VENDEDOR':
        return [
          { label: 'Nueva Venta (POS)', icon: ShoppingBag, tab: 'ventas', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
          { label: 'Registrar Cliente', icon: 'UserPlus', tab: 'clientes', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' }
        ];
      default:
        return [];
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'VENTA': return <Tag className="w-4 h-4 text-emerald-600" />;
      case 'COMPRA': return <Truck className="w-4 h-4 text-blue-600" />;
      case 'CAJA_APERTURA': return <Key className="w-4 h-4 text-amber-600" />;
      case 'CAJA_CIERRE': return <Lock className="w-4 h-4 text-slate-600" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6" id="dashboard-tab-panel">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-900 rounded-xl text-white shadow-sm space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">¡Bienvenido al ERP, {currentUser.nombre}!</h2>
          <p className="text-slate-300 text-xs md:text-sm mt-1">
            Sesión de trabajo activa con el rol privilegiado de <strong className="text-emerald-400 font-semibold">{currentUser.rol}</strong>.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700 text-xs text-slate-300 self-start md:self-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Base de Datos PostgreSQL Activa (Simulada)</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={card.action}
            className={`p-5 rounded-xl border bg-gradient-to-br transition-all duration-200 ${card.color} ${card.action ? 'cursor-pointer transform hover:-translate-y-1' : ''}`}
            id={card.id}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.iconColor}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{card.value}</h3>
              <p className="text-xs mt-1 opacity-80">{card.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Action Bar */}
      <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs" id="quick-actions-box">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 ml-1">Atajos Operativos Rápidos</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {getQuickActions().map((act) => (
            <button
              key={act.label}
              onClick={() => goToTab(act.tab)}
              className={`flex items-center justify-center space-x-2 p-3 font-medium text-xs md:text-sm rounded-lg shadow-2xs transition-colors duration-150 ${act.color}`}
            >
              {typeof act.icon === 'string' ? null : <act.icon className="w-4 h-4" />}
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Critical Stock alerts and Recent Activity SideBySide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Activity Timeline */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col space-y-4" id="recent-activity-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-slate-800">Historial Reciente de Operaciones</h3>
            <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Capa Transaccional</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[360px] pr-2 space-y-1">
            {metrics?.actividadReciente && metrics.actividadReciente.length > 0 ? (
              metrics.actividadReciente.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start space-x-3 hover:bg-slate-50/50 px-1 rounded transition-colors duration-100">
                  <div className="p-1.5 bg-slate-100 rounded mt-0.5 max-h-[28px]">
                    {getActivityIcon(act.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-5 text-slate-700 font-medium">{act.descripcion}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(act.fecha).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Inbox className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-xs">No se registran transacciones el día de hoy.</p>
              </div>
            )}
          </div>
        </div>

        {/* Critical alerts (Low Stock, Agotados, Top Sales) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* Critical Inventory */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col space-y-4" id="critical-inventory-panel">
            <h3 className="text-sm font-semibold tracking-tight text-slate-800">Alertas Críticas de Inventario</h3>
            
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {metrics?.agotadosList && metrics.agotadosList.length > 0 && (
                metrics.agotadosList.map(prod => (
                  <div key={prod.id} className="flex items-center justify-between p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-red-900 truncate">{prod.nombre}</p>
                      <p className="font-mono text-[10px] text-red-600 mt-0.5">{prod.codigo}</p>
                    </div>
                    <span className="bg-red-200 text-red-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">AGOTADO</span>
                  </div>
                ))
              )}

              {metrics?.stockBajoList && metrics.stockBajoList.length > 0 && (
                metrics.stockBajoList.map(prod => (
                  <div key={prod.id} className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-amber-900 truncate">{prod.nombre}</p>
                      <p className="font-mono text-[10px] text-amber-600 mt-0.5">{prod.codigo} (Mín: {prod.stock_minimo})</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">STOCK: {prod.stock}</span>
                  </div>
                ))
              )}

              {(!metrics?.agotadosList?.length && !metrics?.stockBajoList?.length) && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <span className="text-3xl">☕</span>
                  <p className="text-xs mt-2 text-emerald-600 font-medium">¡Todo el Stock está en niveles óptimos!</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Sellers Chart/Representation */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-slate-800">Top 5 Productos Más Vendidos</h3>
            
            <div className="space-y-3">
              {metrics?.masVendidos && metrics.masVendidos.length > 0 ? (
                metrics.masVendidos.map((prod, idx) => {
                  const maxQty = metrics.masVendidos[0]?.cant || 1;
                  const ratio = Math.max(10, (prod.cant / maxQty) * 100);

                  return (
                    <div key={prod.codigo} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700 truncate max-w-[200px]">{idx + 1}. {prod.nombre}</span>
                        <span className="text-slate-500 font-semibold">{prod.cant} uds.</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${ratio}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 flex justify-center items-center text-slate-400 text-xs">
                  Aún no se reportan ventas de productos para este rango.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
