
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StoreState, Product, PaymentMethod, Sale, Installment, InstallmentStatus, OrderStatus } from '../types';
import { formatCurrency, calculateDiscount } from '../constants';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard, CheckCircle2, Share2, FileText, Image as ImageIcon, CalendarDays, QrCode, Phone } from 'lucide-react';

interface Props {
  state: StoreState;
  updateState: (updater: (prev: StoreState) => StoreState) => void;
}

const POS: React.FC<Props> = ({ state, updateState }) => {
  const location = useLocation();
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customer, setCustomer] = useState({ name: '', cpf: '', phone: '' });
  const [prefilledOrderId, setPrefilledOrderId] = useState<string | null>(null);

  // Handle prefilled data from Orders page
  useEffect(() => {
    const prefillFromState = location.state?.prefill;
    const prefillFromStorage = localStorage.getItem('pos_prefill');
    
    let prefill = prefillFromState;
    if (!prefill && prefillFromStorage) {
      try {
        prefill = JSON.parse(prefillFromStorage);
      } catch (e) {
        console.error("Error parsing prefill from storage", e);
      }
    }

    if (prefill) {
      const { customer: prefillCustomer, items, orderId } = prefill;
      
      // Try to find full customer data if they exist
      const existingCustomer = state.customers.find(c => c.name.toLowerCase() === prefillCustomer.name.toLowerCase());
      
      if (existingCustomer) {
        setCustomer({ 
          name: existingCustomer.name, 
          cpf: existingCustomer.cpf, 
          phone: existingCustomer.phone || '' 
        });
      } else {
        setCustomer({
          ...prefillCustomer,
          phone: prefillCustomer.phone || ''
        });
      }
      
      setCart(items);
      if (orderId) setPrefilledOrderId(orderId);
      
      // Clear location state and storage to avoid re-prefilling on refresh
      window.history.replaceState({}, document.title);
      localStorage.removeItem('pos_prefill');
    }
  }, [location.state, state.customers]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [search, setSearch] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [lastSaleId, setLastSaleId] = useState('');

  const filteredProducts = state.products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const discountRate = calculateDiscount(totalQty);
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;

  const handleFinishSale = () => {
    if (!customer.name || !customer.cpf || cart.length === 0) return;

    const saleId = Math.random().toString(36).substr(2, 9);
    
    const newSale: Sale = {
      id: saleId,
      customerId: customer.cpf,
      customerName: customer.name,
      products: cart.map(item => ({ productId: item.product.id, quantity: item.quantity, unitPrice: item.product.price })),
      totalOriginal: subtotal,
      totalDiscounted: total,
      discountPercentage: discountRate * 100,
      paymentMethod,
      installmentsCount: paymentMethod === PaymentMethod.INSTALLMENTS ? installmentsCount : 1,
      date: new Date().toISOString()
    };

    const newInstallments: Installment[] = [];
    if (paymentMethod === PaymentMethod.INSTALLMENTS) {
      const installmentAmount = total / installmentsCount;
      for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        newInstallments.push({
          id: Math.random().toString(36).substr(2, 9),
          saleId,
          number: i,
          dueDate: dueDate.toISOString(),
          amount: installmentAmount,
          status: InstallmentStatus.PENDING
        });
      }
    } else {
      newInstallments.push({
        id: Math.random().toString(36).substr(2, 9),
        saleId,
        number: 1,
        dueDate: new Date().toISOString(),
        amount: total,
        status: InstallmentStatus.PAID
      });
    }

    updateState(prev => ({
      ...prev,
      sales: [newSale, ...prev.sales],
      installments: [...prev.installments, ...newInstallments],
      customers: prev.customers.some(c => c.cpf === customer.cpf) 
        ? prev.customers 
        : [...prev.customers, { id: Math.random().toString(36).substr(2, 9), ...customer }],
      orders: prefilledOrderId 
        ? prev.orders.map(o => o.id === prefilledOrderId ? { ...o, status: OrderStatus.COMPLETED } : o)
        : prev.orders
    }));

    setLastSaleId(saleId);
    setIsFinished(true);
    setPrefilledOrderId(null);
  };

  const shareToWhatsApp = () => {
    const methodLabel = paymentMethod === PaymentMethod.PIX ? 'Pix' : 
                        paymentMethod === PaymentMethod.INSTALLMENTS ? 'Parcelado' : 'À Vista';
    
    const installmentsText = paymentMethod === PaymentMethod.INSTALLMENTS ? ` em ${installmentsCount}x` : '';
    const pixInfo = paymentMethod === PaymentMethod.PIX ? '\n\nChave Pix (CPF): 21957822856' : '';
    
    const message = `Olá ${customer.name}! Seu pedido na Lingerie Pro foi finalizado.\n\nTotal: ${formatCurrency(total)}${installmentsText}\nForma de Pagamento: ${methodLabel}${pixInfo}\n\nObrigado pela preferência!`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const resetSale = () => {
    setCart([]);
    setCustomer({ name: '', cpf: '', phone: '' });
    setIsFinished(false);
    setPaymentMethod(PaymentMethod.CASH);
    setInstallmentsCount(1);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setCustomer(prev => ({ ...prev, name }));
    
    const existing = state.customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setCustomer({ name: existing.name, cpf: existing.cpf, phone: existing.phone || '' });
    }
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value as PaymentMethod;
    setPaymentMethod(method);
    if (method !== PaymentMethod.INSTALLMENTS) {
      setInstallmentsCount(1);
    }
  };

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Pedido Finalizado!</h2>
        <p className="text-gray-500">O pedido #{lastSaleId} foi registrado com sucesso.</p>
        
        <div className="bg-pink-50 p-6 rounded-2xl text-left border border-pink-100 space-y-3">
           <p className="text-xs font-bold text-pink-800 uppercase tracking-widest border-b border-pink-100 pb-2">Resumo do Pedido</p>
           
           <div className="flex justify-between text-sm">
              <span className="text-pink-700">Cliente:</span> 
              <span className="font-bold text-gray-800">{customer.name}</span>
           </div>
           
           <div className="flex justify-between text-sm">
              <span className="text-pink-700">Pagamento:</span> 
              <span className="font-bold text-gray-800">
                {paymentMethod === PaymentMethod.INSTALLMENTS ? `${installmentsCount}x Parcelado` : 
                 paymentMethod === PaymentMethod.PIX ? 'Pix' : 'À Vista'}
              </span>
           </div>

           {paymentMethod === PaymentMethod.PIX && (
             <div className="mt-2 p-3 bg-white rounded-xl border border-pink-200 flex items-center gap-3">
                <QrCode className="text-pink-600" size={24} />
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Chave Pix (CPF)</p>
                   <p className="text-sm font-mono font-bold text-pink-600">21957822856</p>
                </div>
             </div>
           )}

           <div className="flex justify-between text-base pt-2 border-t border-pink-100">
              <span className="font-bold text-gray-800">Total:</span> 
              <span className="font-black text-pink-600">{formatCurrency(total)}</span>
           </div>
           
           <p className="text-[10px] text-pink-700 italic text-center pt-2">
             Desconto de {discountRate * 100}% aplicado ({totalQty} itens).
           </p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={shareToWhatsApp}
            className="flex items-center justify-center gap-2 bg-green-500 text-white py-4 rounded-2xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-100 active:scale-95"
          >
            <Share2 size={20} />
            Enviar Pedido via WhatsApp
          </button>
          <button 
            onClick={resetSale}
            className="text-pink-600 font-bold py-2 hover:underline"
          >
            Realizar Nova Venda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
            <Search size={20} className="text-pink-600" />
            Produtos do Catálogo
          </h3>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              placeholder="Buscar por nome ou REF..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-gray-800 placeholder:text-gray-400 font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map(p => (
              <button 
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition-all text-left group overflow-hidden"
              >
                <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono font-bold text-gray-500">REF: {p.reference || "---"}</span>
                    <p className="font-bold text-gray-800 line-clamp-1">{p.name}</p>
                  </div>
                  <p className="text-sm text-pink-600 font-semibold">{formatCurrency(p.price)}</p>
                </div>
                <div className="bg-pink-100 text-pink-600 p-2 rounded-lg group-hover:bg-pink-600 group-hover:text-white transition-colors">
                  <Plus size={20} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-pink-100 flex flex-col h-full">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
            <ShoppingCart className="text-pink-600" />
            Carrinho
          </h3>
          
          <div className="flex-1 space-y-4 mb-6 max-h-[400px] overflow-auto pr-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="mx-auto mb-2 opacity-20" size={48} />
                <p>Nenhum produto selecionado</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                   {item.product.imageUrl ? (
                     <img src={item.product.imageUrl} className="w-full h-full object-cover" />
                   ) : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-gray-300"/></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.product.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.product.price)} un.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateCartQuantity(item.product.id, -1)} className="p-1 hover:bg-gray-200 rounded-md text-gray-600"><Minus size={14}/></button>
                  <span className="text-sm font-bold w-4 text-center text-gray-800">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.product.id, 1)} className="p-1 hover:bg-gray-200 rounded-md text-gray-600"><Plus size={14}/></button>
                  <button onClick={() => removeFromCart(item.product.id)} className="ml-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6 border-t border-gray-100 pt-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</label>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                  <input 
                    type="text"
                    list="customers-search-list"
                    placeholder="Nome do Cliente"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                    value={customer.name}
                    onChange={handleNameChange}
                  />
                  <datalist id="customers-search-list">
                    {state.customers.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                  <input 
                    placeholder="CPF do Cliente"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                    value={customer.cpf}
                    onChange={e => setCustomer({...customer, cpf: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                  <input 
                    placeholder="Telefone do Cliente"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400 font-medium transition-all"
                    value={customer.phone}
                    onChange={e => setCustomer({...customer, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pagamento</label>
              <div className="space-y-3">
                <select 
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:bg-white outline-none text-gray-900 font-medium cursor-pointer transition-all"
                  value={paymentMethod}
                  onChange={handlePaymentMethodChange}
                >
                  <option value={PaymentMethod.CASH}>À Vista (Dinheiro/Cartão)</option>
                  <option value={PaymentMethod.PIX}>Pix</option>
                  <option value={PaymentMethod.INSTALLMENTS}>Parcelado</option>
                </select>

                {paymentMethod === PaymentMethod.INSTALLMENTS && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays size={14} className="text-pink-500" />
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Número de Parcelas</label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setInstallmentsCount(n)}
                          className={`py-2 rounded-lg font-bold text-sm transition-all border ${
                            installmentsCount === n 
                              ? 'bg-pink-600 text-white border-pink-600' 
                              : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-pink-400 italic font-medium">* Máximo permitido: 3x</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-pink-50/50 p-4 rounded-xl space-y-2 border border-pink-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600 font-bold">
                <span>Desconto ({discountRate * 100}%):</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-pink-100 pt-2">
                <span>Total:</span>
                <span className="text-pink-600">{formatCurrency(total)}</span>
              </div>
              {paymentMethod === PaymentMethod.INSTALLMENTS && (
                <div className="text-[10px] text-gray-500 text-right font-medium">
                  {installmentsCount} parcelas de {formatCurrency(total / installmentsCount)}
                </div>
              )}
            </div>

            <button 
              disabled={cart.length === 0 || !customer.name || !customer.cpf}
              onClick={handleFinishSale}
              className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-100 transition-all active:scale-[0.98]"
            >
              <CreditCard size={20} />
              Finalizar Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
