import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Truck, 
  Inbox, 
  TrendingUp, 
  LogOut, 
  User, 
  Clock, 
  Wifi, 
  AlertCircle,
  Menu,
  X
} from 'lucide-react';

import { 
  UserPayload, 
  Producto, 
  Categoria, 
  Venta, 
  Compra, 
  MovimientoInventario, 
  Cliente, 
  Proveedor, 
  Caja, 
  DashboardMetrics 
} from './types';

// Panel components
import DashboardPanel from './components/DashboardPanel';
import InventarioPanel from './components/InventarioPanel';
import VentasPanel from './components/VentasPanel';
import ClientesPanel from './components/ClientesPanel';
import ComprasPanel from './components/ComprasPanel';
import CajaPanel from './components/CajaPanel';
import ReportesPanel from './components/ReportesPanel';

export default function App() {
  // Authentication & session state
  const [token, setToken] = useState<string | null>(localStorage.getItem('sf_token'));
  const [currentUser, setCurrentUser] = useState<UserPayload | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  
  // Login Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Applet active tab navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data models state
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);

  // Loading states
  const [contentLoading, setContentLoading] = useState<boolean>(false);
  
  // Real-time topbar clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Topbar live Clock Updater
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('es-CO', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Validate on load
  useEffect(() => {
    const validateSession = async () => {
      if (!token) {
        setAuthChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const resData = await response.json();
        if (response.ok) {
          setCurrentUser(resData.user);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Auth verification failed', err);
        handleLogout();
      } finally {
        setAuthChecking(false);
      }
    };

    validateSession();
  }, [token]);

  // Read database state when user session is active
  useEffect(() => {
    if (currentUser) {
      fetchAppDatabase();
    }
  }, [currentUser]);

  // Synchronous pull-down of all ERP states
  const fetchAppDatabase = async () => {
    if (!token) return;
    setContentLoading(true);

    try {
      // 1. Get simple lists
      const [
        prodsRes, 
        catsRes, 
        clientsRes, 
        supsRes, 
        movsRes, 
        cajasRes, 
        comprasRes, 
        ventasRes,
        dashRes
      ] = await Promise.all([
        fetch('/api/productos', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/categorias', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/clientes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/proveedores', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/movimientos', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/caja/historial', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/compras', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/ventas', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [
        prods, 
        cats, 
        cls, 
        sups, 
        movs, 
        boxList, 
        buysList, 
        sellsList,
        dMetrics
      ] = await Promise.all([
        prodsRes.json(),
        catsRes.json(),
        clientsRes.json(),
        supsRes.json(),
        movsRes.json(),
        cajasRes.json(),
        comprasRes.json(),
        ventasRes.json(),
        dashRes.json()
      ]);

      setProductos(Array.isArray(prods) ? prods : []);
      setCategorias(Array.isArray(cats) ? cats : []);
      setClientes(Array.isArray(cls) ? cls : []);
      setProveedores(Array.isArray(sups) ? sups : []);
      setMovimientos(Array.isArray(movs) ? movs : []);
      setCajas(Array.isArray(boxList) ? boxList : []);
      setCompras(Array.isArray(buysList) ? buysList : []);
      setVentas(Array.isArray(sellsList) ? sellsList : []);

      if (dashRes.ok) {
        setDashboardMetrics(dMetrics.metrics);
        setCajaAbierta(dMetrics.metrics.cajaAbierta);
      }

    } catch (error) {
      console.error('Error replenishing ERP database context', error);
    } finally {
      setContentLoading(false);
    }
  };

  // Perform login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setLoginError('Complete todos los campos del login.');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword })
      });
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Credenciales inválidas o cuenta de acceso inactiva.');
      }

      localStorage.setItem('sf_token', resData.token);
      setToken(resData.token);
      setCurrentUser(resData.user);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  // Logout clean
  const handleLogout = () => {
    localStorage.removeItem('sf_token');
    setToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Select tab and close mobile sidebar drawer
  const selectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // Navigation items filtering based on user permissions
  const getSidebarNavigation = () => {
    if (!currentUser) return [];

    const navs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CAJERO', 'BODEGUERO', 'VENDEDOR'] },
      { id: 'inventario', label: 'Inventario', icon: Package, roles: ['ADMIN', 'BODEGUERO'] },
      { id: 'ventas', label: 'Caja Ventas POS', icon: ShoppingBag, roles: ['ADMIN', 'CAJERO', 'VENDEDOR'] },
      { id: 'clientes', label: 'Clientes', icon: Users, roles: ['ADMIN', 'VENDEDOR'] },
      { id: 'compras', label: 'Compras / Reabastecer', icon: Truck, roles: ['ADMIN', 'BODEGUERO'] },
      { id: 'caja', label: 'Control de Caja', icon: Inbox, roles: ['ADMIN', 'CAJERO'] },
      { id: 'reportes', label: 'Métricas / Reportes', icon: TrendingUp, roles: ['ADMIN'] },
    ];

    return navs.filter(n => n.roles.includes(currentUser.rol));
  };

  // Render proper panel
  const renderPanelGridContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPanel 
            metrics={dashboardMetrics} 
            currentUser={currentUser} 
            goToTab={setActiveTab} 
            loading={contentLoading} 
          />
        );
      case 'inventario':
        return (
          <InventarioPanel
            productos={productos}
            categorias={categorias}
            movimientos={movimientos}
            currentUser={currentUser}
            onRefresh={fetchAppDatabase}
            token={token || ''}
          />
        );
      case 'ventas':
        return (
          <VentasPanel
            productos={productos}
            clientes={clientes}
            ventas={ventas}
            cajaAbierta={cajaAbierta}
            currentUser={currentUser}
            onRefresh={fetchAppDatabase}
            token={token || ''}
          />
        );
      case 'clientes':
        return (
          <ClientesPanel
            clientes={clientes}
            ventas={ventas}
            currentUser={currentUser}
            onRefresh={fetchAppDatabase}
            token={token || ''}
          />
        );
      case 'compras':
        return (
          <ComprasPanel
            proveedores={proveedores}
            compras={compras}
            productos={productos}
            currentUser={currentUser}
            onRefresh={fetchAppDatabase}
            token={token || ''}
          />
        );
      case 'caja':
        return (
          <CajaPanel
            cajas={cajas}
            cajaAbierta={cajaAbierta}
            currentUser={currentUser}
            onRefresh={fetchAppDatabase}
            token={token || ''}
          />
        );
      case 'reportes':
        return (
          <ReportesPanel
            ventas={ventas}
            compras={compras}
            productos={productos}
            clientes={clientes}
            categorias={categorias}
          />
        );
      default:
        return <div className="text-gray-400">Pestaña no implementada o disponible para su rol.</div>;
    }
  };

  // Initial Auth checking spinner
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest animate-pulse">Iniciando Servidor StockFlow ERP...</p>
      </div>
    );
  }

  // ==========================================================
  // RENDER: LOGIN MODULE
  // ==========================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" id="login-layout">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          
          {/* Logo overlay block */}
          <div className="bg-slate-950 p-6 text-center text-white space-y-2 relative">
            <div className="mx-auto w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg border border-emerald-500">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-black uppercase tracking-widest mt-3">StockFlow ERP</h1>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Plataforma de Control Comercial</p>
          </div>

          {/* Form container */}
          <form onSubmit={handleLoginSubmit} className="p-6 md:p-8 space-y-5 text-xs text-slate-700">
            
            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre de Usuario *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. admin"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-lg outline-none focus:bg-white focus:border-slate-350 font-medium text-slate-800 transition-colors"
                id="login-username"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contraseña Secreta *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-lg outline-none focus:bg-white focus:border-slate-350 font-medium text-slate-800 transition-colors animate"
                id="login-password"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 hover:shadow-xs text-white uppercase text-xs font-bold tracking-widest rounded-lg transition-all duration-150 shadow-xs cursor-pointer text-center"
              id="login-button"
            >
              Iniciar sesión ERP
            </button>

            {/* Quick click suggestion chips - fits developer RAD testing guidelines perfectly */}
            <div className="pt-4 border-t border-slate-100">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 text-center">Acceso Rápido (Perfiles de Prueba)</span>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('admin123');
                  }}
                  className="p-2 border rounded-md hover:bg-slate-50 font-bold text-slate-600 text-center transition-all bg-white cursor-pointer"
                >
                  👑 Admin General (Full permissions)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('cajero');
                    setPassword('cajero123');
                  }}
                  className="p-2 border rounded-md hover:bg-slate-50 font-bold text-slate-600 text-center transition-all bg-white cursor-pointer"
                >
                  💵 cajero Carlos (POS & Caja)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('bodeguero');
                    setPassword('bodeguero123');
                  }}
                  className="p-2 border rounded-md hover:bg-slate-50 font-bold text-slate-600 text-center transition-all bg-white cursor-pointer"
                >
                  📦 bodeguero Bernardo (Stock)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('vendedor');
                    setPassword('vendedor123');
                  }}
                  className="p-2 border rounded-md hover:bg-slate-50 font-bold text-slate-600 text-center transition-all bg-white cursor-pointer"
                >
                  💼 vendedor Vanessa (Clients)
                </button>
              </div>

            </div>

          </form>

        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER: APPMANAGER CORE LAYOUT WITH ROUTING STATE
  // ==========================================================
  const sidebarItems = getSidebarNavigation();

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row text-slate-700" id="applet-layout">
      
      {/* MOBILE HEADER RESPONSIVE DISPLAY */}
      <div className="md:hidden bg-slate-950 text-white flex justify-between items-center px-4 py-3 border-b flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-emerald-500" />
          <span className="font-extrabold uppercase tracking-widest text-xs">StockFlow ERP</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION CONTROL (RESPONSIVE DRAWER) */}
      <aside className={`
        ${sidebarItems.length > 0 ? '' : 'hidden'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-350 border-r border-slate-800 transition-transform md:translate-x-0 md:static md:flex md:flex-col md:w-64 md:h-screen flex-shrink-0
      `} id="app-sidebar">
        
        {/* Sidebar Header Title */}
        <div className="hidden md:flex items-center space-x-3 p-6 border-b border-slate-800 bg-slate-950">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center border border-emerald-400 shadow-md">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-black text-slate-50 uppercase text-xs tracking-wider">StockFlow ERP</h1>
            <span className="text-[9px] font-bold text-slate-500 tracking-wider">PORTAL CORPORATIVO</span>
          </div>
        </div>

        {/* Sidebar Nav menu links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {sidebarItems.map((nav) => {
            const isSelected = activeTab === nav.id;

            return (
              <button
                key={nav.id}
                onClick={() => selectTab(nav.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-800 text-white font-extrabold shadow-2xs border-l-4 border-emerald-500' 
                    : 'hover:bg-slate-900 hover:text-slate-100 text-slate-400'
                }`}
                id={`nav-${nav.id}`}
              >
                <nav.icon className={`w-4 h-4 ${isSelected ? 'text-emerald-500' : 'text-slate-500'}`} />
                <span>{nav.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Session bottom widget */}
        <div className="p-4 border-t border-slate-800 bg-slate-970/40 text-xs">
          <div className="flex items-center space-x-3 bg-slate-900/60 p-3 rounded-lg border border-slate-900/40">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-slate-200 truncate">{currentUser.nombre}</h4>
              <p className="text-[9.5px] font-bold text-emerald-400 uppercase tracking-widest">{currentUser.rol}</p>
            </div>
          </div>
        </div>

      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR CLOSURE */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
        ></div>
      )}

      {/* MAIN CONTAINER PANELS AND WORKSPACE HEADER */}
      <main className="flex-1 flex flex-col min-w-0 md:h-screen overflow-hidden">
        
        {/* APPLICATION WORKSPACE HEADER / TOPBAR */}
        <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0 shadow-3xs">
          
          <div className="flex items-center space-x-4">
            <h2 className="text-sm font-extrabold tracking-wider text-slate-800 uppercase">
              {sidebarItems.find(n => n.id === activeTab)?.label || 'Workspace'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Live Clock indicator */}
            <div className="hidden lg:flex items-center space-x-1.5 text-slate-400 text-xs font-semibold bg-slate-50 p-2 border rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-slate-500 select-none">{currentTime || 'Generando hora...'}</span>
            </div>

            {/* Connection Health status */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 animate-pulse" />
              <span>Conexión Segura</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-rose-100 transition-colors"
              id="logout-button"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>

          </div>

        </header>

        {/* WORKSPACE APP PANELS SCROLLABLE VIEW */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]/50 relative" id="main-content-scroll">
          {renderPanelGridContent()}
        </div>

      </main>

    </div>
  );
}
