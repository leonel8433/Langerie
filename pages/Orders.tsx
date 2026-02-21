
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreState, Order, OrderStatus, Product, Customer, PaymentMethod } from '../types';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Package, 
  User, 
  Tag, 
  Palette, 
  Maximize2, 
  X, 
  ShoppingBag, 
  Trash2,
  Printer,
  ArrowRight,
  AlertCircle,
  Minus
} from 'lucide-react';
import { formatCurrency } from '../constants';

interface Props {
  state: StoreState;
  updateState: (updater: (prev: StoreState) => StoreState) => void;
}

const Orders: React.FC<Props> = ({ state, updateState }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // New Order State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  const filteredOrders = state.orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.productName.toLowerCase().includes(search.toLowerCase()) ||
      order.productReference?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const selectedProduct = state.products.find(p => p.id === selectedProductId);

  const handleCreateOrder = () => {
    if (!selectedCustomerId || !selectedProductId || !selectedColor || !selectedSize) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    const customer = state.customers.find(c => c.id === selectedCustomerId);
    const product = state.products.find(p => p.id === selectedProductId);

    if (!customer || !product) return;

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: customer.id,
      customerName: customer.name,
      productId: product.id,
      productName: product.name,
      productReference: product.reference,
      color: selectedColor,
      size: selectedSize,
      quantity: quantity,
      unitPrice: product.price,
      totalAmount: product.price * quantity,
      status: OrderStatus.PENDING,
      date: new Date().toISOString()
    };

    updateState(prev => ({
      ...prev,
      orders: [newOrder, ...prev.orders]
    }));

    // Reset form
    setSelectedCustomerId('');
    setSelectedProductId('');
    setSelectedColor('');
    setSelectedSize('');
    setQuantity(1);
    setShowOrderForm(false);
  };

  const handleMarkAsArrived = (orderId: string) => {
    updateState(prev => ({
      ...prev,
      orders: prev.orders.map(o => 
        o.id === orderId ? { ...o, status: OrderStatus.ARRIVED, arrivalDate: new Date().toISOString() } : o
      )
    }));
  };

  const handleConvertToSale = (order: Order) => {
    // Find the product in the catalog to get its full data (like image)
    const product = state.products.find(p => p.id === order.productId);
    if (!product) {
      alert("Produto não encontrado no catálogo. A venda não pode ser processada sem o produto no catálogo.");
      return;
    }

    const prefillData = {
      customer: { 
        name: order.customerName, 
        cpf: '', 
        phone: '' 
      },
      items: [{ product, quantity: order.quantity }],
      orderId: order.id
    };

    // Save to localStorage as backup because location.state can sometimes be lost in some environments
    localStorage.setItem('pos_prefill', JSON.stringify(prefillData));

    // Navigate to POS with the order data
    navigate('/vendas', { state: { prefill: prefillData } });
    
    // Fallback: If navigate didn't change the hash after a short delay, try direct hash change
    // This is a safety measure for environments where the router might be unresponsive
    setTimeout(() => {
      if (!window.location.hash.includes('/vendas')) {
        window.location.hash = '#/vendas';
      }
    }, 100);
  };

  const removeOrder = (id: string) => {
    if (window.confirm("Deseja remover esta encomenda?")) {
      updateState(prev => ({
        ...prev,
        orders: prev.orders.filter(o => o.id !== id)
      }));
    }
  };

  // Group pending orders by product for the "Buying List"
  const buyingList = useMemo(() => {
    const pending = state.orders.filter(o => o.status === OrderStatus.PENDING);
    const grouped: { [key: string]: { product: string, ref?: string, items: { color: string, size: string, qty: number }[] } } = {};

    pending.forEach(o => {
      const key = o.productId;
      if (!grouped[key]) {
        grouped[key] = {
          product: o.productName,
          ref: o.productReference,
          items: []
        };
      }
      
      const existingItem = grouped[key].items.find(i => i.color === o.color && i.size === o.size);
      if (existingItem) {
        existingItem.qty += o.quantity;
      } else {
        grouped[key].items.push({ color: o.color, size: o.size, qty: o.quantity });
      }
    });

    return Object.values(grouped);
  }, [state.orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Encomendas</h2>
          <p className="text-pink-500 text-sm font-medium italic">Gerencie pedidos de clientes para peças fora de estoque</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowReport(true)}
            className="flex items-center gap-2 bg-white text-blue-600 border-2 border-blue-100 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-sm active:scale-95 font-semibold"
          >
            <Printer size={20} />
            <span className="hidden md:inline">Lista de Compras</span>
          </button>
          <button 
            onClick={() => setShowOrderForm(true)}
            className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-xl hover:bg-pink-700 transition-all shadow-md active:scale-95 font-semibold"
          >
            <Plus size={20} />
            <span>Nova Encomenda</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Buscar por cliente ou produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', OrderStatus.PENDING, OrderStatus.ARRIVED, OrderStatus.COMPLETED] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                statusFilter === status 
                  ? 'bg-pink-600 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {status === 'ALL' ? 'Todos' : 
               status === OrderStatus.PENDING ? 'Pendentes' :
               status === OrderStatus.ARRIVED ? 'Chegaram' : 'Finalizados'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Tam/Cor</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhuma encomenda encontrada.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-pink-50/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{order.customerName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-700">{order.productName}</p>
                      <p className="text-xs text-gray-400 font-mono">{order.productReference}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded text-xs font-bold border border-pink-100">
                          {order.size}
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold border border-gray-200">
                          {order.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-700">{order.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === OrderStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                        order.status === OrderStatus.ARRIVED ? 'bg-blue-50 text-blue-600' :
                        order.status === OrderStatus.COMPLETED ? 'bg-green-50 text-green-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {order.status === OrderStatus.PENDING && <Clock size={12} />}
                        {order.status === OrderStatus.ARRIVED && <Package size={12} />}
                        {order.status === OrderStatus.COMPLETED && <CheckCircle2 size={12} />}
                        {order.status === OrderStatus.PENDING ? 'Pendente' :
                         order.status === OrderStatus.ARRIVED ? 'Chegou' :
                         order.status === OrderStatus.COMPLETED ? 'Finalizado' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === OrderStatus.PENDING && (
                          <button 
                            onClick={() => handleMarkAsArrived(order.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Marcar como Chegou"
                          >
                            <Package size={18} />
                          </button>
                        )}
                        {order.status === OrderStatus.ARRIVED && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleConvertToSale(order);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-xs font-bold shadow-sm cursor-pointer"
                            title="Converter em Venda"
                          >
                            <ShoppingBag size={14} />
                            Vender
                          </button>
                        )}
                        <button 
                          onClick={() => removeOrder(order.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-pink-50/50">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Plus className="text-pink-600" /> Nova Encomenda
              </h3>
              <button onClick={() => setShowOrderForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} className="text-pink-500" /> Cliente
                </label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-medium"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Selecione um cliente...</option>
                  {state.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Tag size={14} className="text-pink-500" /> Produto do Catálogo
                </label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-medium"
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(e.target.value);
                    setSelectedColor('');
                    setSelectedSize('');
                  }}
                >
                  <option value="">Selecione um produto...</option>
                  {state.products.map(p => (
                    <option key={p.id} value={p.id}>{p.reference ? `[${p.reference}] ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Palette size={14} className="text-pink-500" /> Cor
                    </label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-medium"
                      value={selectedColor}
                      onChange={e => setSelectedColor(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {selectedProduct.colors?.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Outra">Outra (Especificar na descrição)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Maximize2 size={14} className="text-pink-500" /> Tamanho
                    </label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-medium"
                      value={selectedSize}
                      onChange={e => setSelectedSize(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {selectedProduct.sizes?.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Plus size={14} className="text-pink-500" /> Quantidade
                </label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Preço Unitário: <span className="font-bold text-pink-600">{selectedProduct ? formatCurrency(selectedProduct.price) : 'R$ 0,00'}</span>
                </div>
                <button 
                  onClick={handleCreateOrder}
                  className="bg-pink-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all active:scale-95"
                >
                  Confirmar Encomenda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buying Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Printer className="text-blue-600" /> Relação de Pedido (Lista de Compras)
              </h3>
              <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
              {buyingList.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <AlertCircle className="mx-auto text-gray-300" size={48} />
                  <p className="text-gray-500 italic">Não há encomendas pendentes para gerar a lista.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {buyingList.map((item, idx) => (
                    <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-gray-800">{item.product}</h4>
                          <p className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block">REF: {item.ref || 'S/ REF'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {item.items.map((variant, vIdx) => (
                          <div key={vIdx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">Cor / Tam</p>
                              <p className="font-semibold text-gray-700">{variant.color} / {variant.size}</p>
                            </div>
                            <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 font-bold text-blue-600">
                              {variant.qty}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
              >
                <Printer size={18} /> Imprimir Lista
              </button>
              <button 
                onClick={() => setShowReport(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
