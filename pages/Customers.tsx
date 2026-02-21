
import React, { useState, useMemo } from 'react';
import { StoreState, Customer, PaymentMethod, InstallmentStatus } from '../types';
/* Added ShoppingBag to the imports from lucide-react */
import { Search, UserPlus, User as UserIcon, Edit2, Trash2, X, Check, AlertTriangle, History, Calendar, CreditCard, ChevronDown, ChevronUp, Plus, DollarSign, PieChart, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../constants';

interface Props {
  state: StoreState;
  updateState: (updater: (prev: StoreState) => StoreState) => void;
}

const Customers: React.FC<Props> = ({ state, updateState }) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [editForm, setEditForm] = useState<{ name: string; cpf: string; phone: string }>({ name: '', cpf: '', phone: '' });
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', cpf: '', phone: '' });
  const [error, setError] = useState<string | null>(null);

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const filtered = state.customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.cpf.includes(search)
  );

  const isNewCpfDuplicate = useMemo(() => {
    if (!newCustomerForm.cpf) return false;
    return state.customers.some(c => c.cpf === newCustomerForm.cpf);
  }, [newCustomerForm.cpf, state.customers]);

  const isEditCpfDuplicate = useMemo(() => {
    if (!editForm.cpf || !editingId) return false;
    return state.customers.some(c => c.cpf === editForm.cpf && c.id !== editingId);
  }, [editForm.cpf, editingId, state.customers]);

  const handleAddCustomer = () => {
    setError(null);
    if (!newCustomerForm.name || !newCustomerForm.cpf) {
      setError("Preencha todos os campos para cadastrar.");
      return;
    }

    if (isNewCpfDuplicate) {
      setError("Este CPF já está cadastrado para outro cliente.");
      return;
    }

    const newCustomer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCustomerForm.name,
      cpf: newCustomerForm.cpf,
      phone: newCustomerForm.phone
    };

    updateState(prev => ({
      ...prev,
      customers: [newCustomer, ...prev.customers]
    }));

    setNewCustomerForm({ name: '', cpf: '', phone: '' });
    setIsAdding(false);
    setError(null);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${name}? Isso não removerá o histórico de vendas, mas o cliente não aparecerá mais na lista.`)) {
      updateState(prev => ({
        ...prev,
        customers: prev.customers.filter(c => c.id !== id)
      }));
    }
  };

  const startEditing = (customer: Customer) => {
    setError(null);
    setEditingId(customer.id);
    setEditForm({ name: customer.name, cpf: customer.cpf, phone: customer.phone || '' });
    setExpandedId(null);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setError(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const saveEdit = (id: string) => {
    setError(null);
    if (!editForm.name || !editForm.cpf) {
      setError("O nome e o CPF não podem ficar vazios.");
      return;
    }

    if (isEditCpfDuplicate) {
      setError("Este CPF já está sendo usado por outro cliente.");
      return;
    }

    const oldCustomer = state.customers.find(c => c.id === id);
    if (!oldCustomer) return;

    const oldCpf = oldCustomer.cpf;
    const newCpf = editForm.cpf;

    updateState(prev => {
      const updatedCustomers = prev.customers.map(c => 
        c.id === id ? { ...c, name: editForm.name, cpf: editForm.cpf, phone: editForm.phone } : c
      );

      const updatedSales = prev.sales.map(sale => {
        if (sale.customerId === oldCpf) {
          return { ...sale, customerId: newCpf, customerName: editForm.name };
        }
        return sale;
      });

      return {
        ...prev,
        customers: updatedCustomers,
        sales: updatedSales
      };
    });

    setEditingId(null);
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return 'À Vista';
      case PaymentMethod.PIX: return 'Pix';
      case PaymentMethod.INSTALLMENTS: return 'Parcelado';
      default: return method;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestão de Clientes</h2>
          <p className="text-pink-500 text-sm font-medium">Visualize e gerencie sua base de contatos</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               placeholder="Pesquisar cliente..."
               className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-fuchsia-600 outline-none w-48 md:w-64 shadow-sm text-zinc-100 font-medium transition-all placeholder:text-zinc-500"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          <button 
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); setError(null); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95 ${isAdding ? 'bg-zinc-800 text-zinc-400' : 'bg-fuchsia-800 text-white hover:bg-fuchsia-900 hover:shadow-fuchsia-900/20'}`}
          >
            {isAdding ? <X size={20} /> : <Plus size={20} />}
            <span className="hidden md:inline">{isAdding ? 'Cancelar' : 'Novo Cliente'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-900 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="flex-shrink-0" size={20} />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold uppercase hover:underline">Fechar</button>
        </div>
      )}

      {isAdding && (
        <div className="bg-zinc-950 p-6 rounded-2xl shadow-xl border border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-lg font-bold mb-4 text-zinc-100 flex items-center gap-2">
            <UserPlus className="text-fuchsia-500" size={20} />
            Cadastrar Novo Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome Completo</label>
              <input 
                placeholder="Ex: Maria Oliveira"
                className="w-full p-3 border border-zinc-700 bg-zinc-900 rounded-xl focus:ring-2 focus:ring-fuchsia-600 outline-none transition-all text-zinc-100 placeholder:text-zinc-600 font-medium"
                value={newCustomerForm.name}
                onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">CPF</label>
              <input 
                placeholder="000.000.000-00"
                className={`w-full p-3 border ${isNewCpfDuplicate ? 'border-red-600 ring-1 ring-red-600' : 'border-zinc-700'} bg-zinc-900 rounded-xl focus:ring-2 focus:ring-fuchsia-600 outline-none transition-all text-zinc-100 placeholder:text-zinc-600 font-medium`}
                value={newCustomerForm.cpf}
                onChange={e => setNewCustomerForm({...newCustomerForm, cpf: maskCPF(e.target.value)})}
              />
              {isNewCpfDuplicate && (
                <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                  <AlertTriangle size={10} /> CPF já cadastrado no sistema
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Telefone / WhatsApp</label>
              <input 
                placeholder="(00) 00000-0000"
                className="w-full p-3 border border-zinc-700 bg-zinc-900 rounded-xl focus:ring-2 focus:ring-fuchsia-600 outline-none transition-all text-zinc-100 placeholder:text-zinc-600 font-medium"
                value={newCustomerForm.phone}
                onChange={e => setNewCustomerForm({...newCustomerForm, phone: maskPhone(e.target.value)})}
              />
            </div>
          </div>
          <div className="flex justify-end mt-6 gap-3">
            <button onClick={() => { setIsAdding(false); setError(null); }} className="px-5 py-2 text-zinc-400 font-semibold hover:text-zinc-200">Cancelar</button>
            <button 
              disabled={isNewCpfDuplicate || !newCustomerForm.name || !newCustomerForm.cpf}
              onClick={handleAddCustomer} 
              className="bg-fuchsia-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-fuchsia-900 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-900/20 transition-all flex items-center gap-2"
            >
              <Check size={18} /> Salvar Cliente
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {filtered.map((customer, index) => {
          const isEditing = editingId === customer.id;
          const isExpanded = expandedId === customer.id;
          const customerSales = state.sales.filter(s => s.customerId === customer.cpf);
          const totalSpent = customerSales.reduce((acc, s) => acc + s.totalDiscounted, 0);
          
          // Calculate active debt (pending installments)
          const activeDebt = state.installments
            .filter(inst => {
              const sale = state.sales.find(s => s.id === inst.saleId);
              return sale?.customerId === customer.cpf && inst.status !== InstallmentStatus.PAID;
            })
            .reduce((acc, inst) => acc + inst.amount, 0);

          return (
            <div 
              key={customer.id} 
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-both`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div 
                className={`p-6 transition-colors duration-300 cursor-pointer ${isEditing ? 'bg-zinc-50/50' : 'hover:bg-pink-50/20'}`}
                onClick={() => !isEditing && toggleExpand(customer.id)}
              >
                {isEditing ? (
                  <div className="space-y-4 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-fuchsia-700 text-sm uppercase">Editando Perfil</h4>
                      <button onClick={cancelEditing} className="text-zinc-400 hover:text-zinc-600 transition-transform hover:rotate-90">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Nome Completo</label>
                        <input 
                          className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fuchsia-600 outline-none text-zinc-100 font-medium"
                          value={editForm.name}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">CPF</label>
                        <input 
                          className={`w-full p-2 bg-zinc-900 border ${isEditCpfDuplicate ? 'border-red-600 ring-1 ring-red-600' : 'border-zinc-700'} rounded-lg text-sm focus:ring-2 focus:ring-fuchsia-600 outline-none text-zinc-100 font-medium`}
                          value={editForm.cpf}
                          onChange={e => setEditForm({...editForm, cpf: maskCPF(e.target.value)})}
                        />
                        {isEditCpfDuplicate && (
                          <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} /> CPF já em uso por outro cliente
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Telefone</label>
                        <input 
                          className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fuchsia-600 outline-none text-zinc-100 font-medium"
                          value={editForm.phone}
                          onChange={e => setEditForm({...editForm, phone: maskPhone(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        disabled={isEditCpfDuplicate || !editForm.name || !editForm.cpf}
                        onClick={() => saveEdit(customer.id)}
                        className="flex-1 bg-fuchsia-800 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-fuchsia-900 disabled:opacity-30 shadow-md shadow-fuchsia-900/10 transition-all active:scale-95"
                      >
                        <Check size={16} /> Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-bold text-xl shadow-inner transition-transform group-hover:scale-110">
                             {customer.name[0]}
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-800 line-clamp-1 transition-colors hover:text-pink-600 cursor-default">{customer.name}</h4>
                             <div className="flex flex-col">
                               <p className="text-[10px] text-gray-500 font-mono">CPF: {customer.cpf}</p>
                               {customer.phone && <p className="text-[10px] text-pink-600 font-bold">TEL: {customer.phone}</p>}
                             </div>
                          </div>
                       </div>
                       <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                         <button 
                          onClick={() => startEditing(customer)}
                          className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"
                          title="Editar Cliente"
                         >
                            <Edit2 size={16} />
                         </button>
                         <button 
                          onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir Cliente"
                         >
                            <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Total Gasto</p>
                          <p className="text-sm font-bold text-gray-800">{formatCurrency(totalSpent)}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Dívida Ativa</p>
                          <p className={`text-sm font-bold ${activeDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(activeDebt)}
                          </p>
                       </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-pink-400 bg-pink-50 px-2 py-1 rounded-full uppercase">
                          <History size={10} />
                          {customerSales.length} compras realizadas
                       </div>
                       <div className="text-pink-600 transition-transform">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                       </div>
                    </div>
                  </>
                )}
              </div>

              {isExpanded && !isEditing && (
                <div className="border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2 duration-300">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <PieChart size={14} className="text-pink-500" />
                        Histórico Detalhado
                      </h5>
                    </div>
                    
                    {customerSales.length > 0 ? (
                      <div className="space-y-2">
                        {customerSales.map((sale, sIdx) => (
                          <div 
                            key={sale.id} 
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300"
                            style={{ animationDelay: `${sIdx * 50}ms` }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-lg font-black text-gray-800">{formatCurrency(sale.totalDiscounted)}</span>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${sale.paymentMethod === PaymentMethod.INSTALLMENTS ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                      {getPaymentMethodLabel(sale.paymentMethod)}
                                      {sale.paymentMethod === PaymentMethod.INSTALLMENTS && ` (${sale.installmentsCount}x)`}
                                   </span>
                                   <span className="text-[10px] text-gray-400 font-mono">#{sale.id.slice(0, 8)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 flex items-center justify-end gap-1">
                                  <Calendar size={12} />
                                  {new Date(sale.date).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-[10px] text-pink-400 font-medium mt-1">
                                  {sale.products.reduce((a, b) => a + b.quantity, 0)} itens comprados
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex justify-between items-center">
                               <div className="flex -space-x-2">
                                  {/* Just a visual indicator of items */}
                                  {[...Array(Math.min(3, sale.products.length))].map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-pink-600">
                                      {i === 2 && sale.products.length > 3 ? `+${sale.products.length - 2}` : i + 1}
                                    </div>
                                  ))}
                                </div>
                                <button className="text-[10px] font-bold text-pink-600 hover:underline uppercase tracking-wider">
                                  Ver Comprovante
                                </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                        <ShoppingBag className="mx-auto mb-2 text-gray-200" size={32} />
                        <p className="text-gray-400 italic text-xs">Este cliente ainda não realizou compras.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && !isAdding && (
           <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 animate-in zoom-in duration-500">
              <UserPlus className="mx-auto mb-2 opacity-20" size={48} />
              <p>Nenhum cliente encontrado.</p>
           </div>
        )}
      </div>

      {(editingId || isAdding) && (
        <div className="flex items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 text-xs animate-in slide-in-from-bottom-2 duration-500">
          <AlertTriangle size={16} className="flex-shrink-0 text-fuchsia-600 animate-pulse" />
          <p>O CPF deve ser único para cada cliente. O sistema utiliza este documento para vincular o histórico de vendas e parcelas.</p>
        </div>
      )}
    </div>
  );
};

export default Customers;
