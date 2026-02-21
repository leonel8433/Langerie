
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  FileText, 
  ClipboardList,
  CreditCard, 
  Package, 
  PlusCircle, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  Share2
} from 'lucide-react';
import { StoreState, Product, Customer, Sale, PaymentMethod, InstallmentStatus, Installment } from './types';
import { STORAGE_KEY, formatCurrency, COLORS } from './constants';

// Pages
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Catalog from './pages/Catalog';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Financial from './pages/Financial';
import Reports from './pages/Reports';

const App: React.FC = () => {
  const [state, setState] = useState<StoreState>({
    products: [],
    customers: [],
    sales: [],
    installments: [],
    orders: []
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load store data", e);
      }
    }
  }, []);

  // Save on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (updater: (prev: StoreState) => StoreState) => {
    setState(prev => updater(prev));
  };

  return (
    <HashRouter>
      <div className="flex min-h-screen">
        {/* Mobile Menu Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-transform transform lg:translate-x-0 lg:static lg:inset-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-pink-600 mb-8 flex items-center gap-2">
              <Package className="w-8 h-8" />
              Lingerie Pro
            </h1>
            <nav className="space-y-2">
              <SidebarItem to="/" icon={<LayoutDashboard />} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
              <SidebarItem to="/vendas" icon={<ShoppingBag />} label="Vendas (PDV)" onClick={() => setIsSidebarOpen(false)} />
              <SidebarItem to="/catalogo" icon={<FileText />} label="Catálogo" onClick={() => setIsSidebarOpen(false)} />
              <SidebarItem to="/encomendas" icon={<ClipboardList />} label="Encomendas" onClick={() => setIsSidebarOpen(false)} />
              <SidebarItem to="/clientes" icon={<Users />} label="Clientes" onClick={() => setIsSidebarOpen(false)} />
              <SidebarItem to="/financeiro" icon={<CreditCard />} label="Financeiro" onClick={() => setIsSidebarOpen(false)} />
              <SidebarItem to="/relatorios" icon={<AlertCircle />} label="Relatórios" onClick={() => setIsSidebarOpen(false)} />
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-pink-50/30">
          <header className="bg-white shadow-sm h-16 flex items-center px-4 lg:px-8 justify-between sticky top-0 z-30">
            <button 
              className="lg:hidden p-2 text-gray-600 hover:bg-pink-100 rounded-md"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 px-4 lg:px-0">
               <h2 className="text-xl font-medium text-gray-800">
                  {/* Title updated by components dynamically */}
               </h2>
            </div>
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                  JS
               </div>
            </div>
          </header>

          <div className="p-4 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard state={state} />} />
              <Route path="/vendas" element={<POS state={state} updateState={updateState} />} />
              <Route path="/catalogo" element={<Catalog state={state} updateState={updateState} />} />
              <Route path="/encomendas" element={<Orders state={state} updateState={updateState} />} />
              <Route path="/clientes" element={<Customers state={state} updateState={updateState} />} />
              <Route path="/financeiro" element={<Financial state={state} updateState={updateState} />} />
              <Route path="/relatorios" element={<Reports state={state} />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium
        ${isActive ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'}
      `}
    >
      {/* Fixed: Added <any> type casting to cloneElement to support passing the 'size' prop to the Lucide icon */}
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      <span>{label}</span>
    </Link>
  );
};

export default App;
