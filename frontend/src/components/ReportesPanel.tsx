import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  ShoppingBag, 
  Truck, 
  Users, 
  Package, 
  Map 
} from 'lucide-react';
import { Venta, Compra, Producto, Cliente, Categoria } from '../types';

interface ReportesPanelProps {
  ventas: Venta[];
  compras: Compra[];
  productos: Producto[];
  clientes: Cliente[];
  categorias: Categoria[];
}

export default function ReportesPanel({
  ventas,
  compras,
  productos,
  clientes,
  categorias
}: ReportesPanelProps) {
  
  // Aggregate KPI Calculations
  const totalSellsRevenue = ventas.reduce((sum, v) => sum + v.total, 0);
  const totalRestockInvestment = compras.reduce((sum, c) => sum + c.total, 0);
  const activeProductsCount = productos.filter(p => p.estado === 'ACTIVO').length;
  const criticalStockItems = productos.filter(p => p.stock <= p.stock_minimo).length;

  // 1. Payment Methods breakdown logic
  const cashSales = ventas.filter(v => v.metodo_pago === 'EFECTIVO').reduce((sum, v) => sum + v.total, 0);
  const cardSales = ventas.filter(v => v.metodo_pago === 'TARJETA').reduce((sum, v) => sum + v.total, 0);
  const wireSales = ventas.filter(v => v.metodo_pago === 'TRANSFERENCIA').reduce((sum, v) => sum + v.total, 0);
  const totalSalesMethodCount = cashSales + cardSales + wireSales || 1;

  const cashPct = (cashSales / totalSalesMethodCount) * 100;
  const cardPct = (cardSales / totalSalesMethodCount) * 100;
  const wirePct = (wireSales / totalSalesMethodCount) * 100;

  // 2. Sales by Category distribution
  const salesByCategoryMap = new Map<number, number>();
  
  // Loop through past invoices and details to compute category metrics
  ventas.forEach(v => {
    if (v.detalles) {
      v.detalles.forEach(d => {
        const prod = productos.find(p => p.id === d.producto_id);
        if (prod) {
          const categoryId = prod.categoria_id;
          const currentAmount = salesByCategoryMap.get(categoryId) || 0;
          salesByCategoryMap.set(categoryId, currentAmount + d.subtotal);
        }
      });
    }
  });

  const categorySeries = categorias.map(cat => ({
    name: cat.nombre,
    amount: salesByCategoryMap.get(cat.id) || 0
  })).sort((a, b) => b.amount - a.amount);

  const maxCategoryAmount = Math.max(...categorySeries.map(c => c.amount), 1);

  // 3. Category Products breakdown counts
  const categoryWithProductCounts = categorias.map(cat => ({
    name: cat.nombre,
    productsCount: productos.filter(p => p.categoria_id === cat.id).length
  }));

  const maxProductsCategoryCount = Math.max(...categoryWithProductCounts.map(c => c.productsCount), 1);

  return (
    <div className="space-y-6" id="reportes-tab-panel">
      
      {/* High impact grid values */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sales KPI */}
        <div className="bg-white border rounded-xl p-5 shadow-2xs relative overflow-hidden flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ventas Acumuladas</span>
            <p className="text-lg md:text-xl font-mono font-black text-slate-900 mt-1">${totalSellsRevenue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Ingresos directos por POS</span>
          </div>
        </div>

        {/* Purchases Restocks KPI */}
        <div className="bg-white border rounded-xl p-5 shadow-2xs relative overflow-hidden flex items-center space-x-4">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inversión Proveedores</span>
            <p className="text-lg md:text-xl font-mono font-black text-slate-900 mt-1">${totalRestockInvestment.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
            <span className="text-[10px] text-rose-600 font-bold block mt-0.5">Egresos por abastecimiento</span>
          </div>
        </div>

        {/* Active Products Catálogo */}
        <div className="bg-white border rounded-xl p-5 shadow-2xs relative overflow-hidden flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Catálogo Activo</span>
            <p className="text-lg md:text-xl font-mono font-black text-slate-900 mt-1">{activeProductsCount} Items</p>
            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Productos con stock vigilado</span>
          </div>
        </div>

        {/* Critical alert objects counts */}
        <div className="bg-white border rounded-xl p-5 shadow-2xs relative overflow-hidden flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Alertas de Stock</span>
            <p className="text-lg md:text-xl font-mono font-black text-slate-900 mt-1">{criticalStockItems} Alertas</p>
            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">Stock mínimo o agotado</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Category Profit Chart representation */}
        <div className="bg-white border rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Distribución de Ventas por Categoría ($ COP)</h3>
            <p className="text-[11px] text-slate-400 mt-1">Suma agregada de ventas desglosadas por las categorías de origen en el POS.</p>
          </div>

          <div className="space-y-3.5">
            {categorySeries.length > 0 ? (
              categorySeries.map((item, idx) => {
                const pct = (item.amount / maxCategoryAmount) * 100;
                
                return (
                  <div key={idx} className="space-y-1.5 text-xs font-medium">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-bold">{item.name}</span>
                      <span className="font-mono font-bold text-slate-900">${item.amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                    </div>
                    {/* Visual Bar representation */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-slate-400 py-6">No se registran importes vendidos con categorías.</p>
            )}
          </div>
        </div>

        {/* Payment options distribution pie-like diagram represented in clean SVG */}
        <div className="bg-white border rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Participación Comercial por Forma de Pago</h3>
            <p className="text-[11px] text-slate-400 mt-1">Análisis por volumen de dinero transaccionado según Efectivo, Tarjeta o Transferencia.</p>
          </div>

          {totalSalesMethodCount > 1 ? (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
              
              {/* Pie SVG representation */}
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {/* Cash slice */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray={`${cashPct} ${100 - cashPct}`}
                    strokeDashoffset="0"
                  />
                  {/* Card slice */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3.5"
                    strokeDasharray={`${cardPct} ${100 - cardPct}`}
                    strokeDashoffset={-cashPct}
                  />
                  {/* Wire slice */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    strokeDasharray={`${wirePct} ${100 - wirePct}`}
                    strokeDashoffset={-(cashPct + cardPct)}
                  />
                </svg>
                {/* Center marker */}
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-400 text-center flex-col">
                  <span className="text-xs text-slate-800 font-extrabold">100%</span>
                  <span>Métodos</span>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-3.5 text-xs w-full max-w-xs">
                
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border-l-4 border-emerald-500">
                  <span className="font-bold text-slate-600">💵 Efectivo (Al Arqueo)</span>
                  <div className="text-right">
                    <p className="font-mono font-black text-slate-800">${cashSales.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">({cashPct.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border-l-4 border-blue-500">
                  <span className="font-bold text-slate-600">💳 Tarjeta / Crédito</span>
                  <div className="text-right">
                    <p className="font-mono font-black text-slate-800">${cardSales.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">({cardPct.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border-l-4 border-amber-500">
                  <span className="font-bold text-slate-600">🔗 Transferencia Bancaria</span>
                  <div className="text-right">
                    <p className="font-mono font-black text-slate-800">${wireSales.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">({wirePct.toFixed(1)}%)</span>
                  </div>
                </div>

              </div>
              
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              Incorpore ventas en el POS para desplegar la composición monetaria.
            </div>
          )}

        </div>

      </div>

      {/* Products count by Category bento representation */}
      <div className="bg-white border rounded-xl p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Volumen del Catálogo de Productos por Categoría</h3>
          <p className="text-[11px] text-slate-400 mt-1">Conteo total de artículos distintos asociados a cada sector de inventario.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {categoryWithProductCounts.map((item, idx) => {
            const hPct = (item.productsCount / maxProductsCategoryCount) * 80; // Scaler to fit container
            
            return (
              <div key={idx} className="bg-slate-50/50 p-4 border rounded-xl flex items-center justify-between lg:flex-col lg:justify-end lg:items-center min-h-[120px] text-center">
                
                {/* Horizontal progress representation on mobile, Column on desktop */}
                <div className="hidden lg:block w-full text-center">
                  <div className="w-5 bg-slate-200/65 rounded-full mx-auto h-20 relative flex items-end overflow-hidden pb-1">
                    <div 
                      className="w-full bg-slate-800 rounded-full transition-all duration-500 mx-auto" 
                      style={{ height: `${Math.max(hPct, 5)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-left lg:text-center mt-3 w-full">
                  <h4 className="font-bold text-slate-500 text-[10px] uppercase truncate">{item.name}</h4>
                  <p className="text-lg font-mono font-black text-slate-900 mt-1">{item.productsCount} <span className="text-[10px] text-slate-400 uppercase font-bold">SKUS</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
