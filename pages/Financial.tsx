
import React, { useState } from 'react';
import { StoreState, InstallmentStatus, Installment } from '../types';
import { formatCurrency } from '../constants';
import { Calendar, Search, CheckCircle, AlertCircle, Clock, Filter } from 'lucide-react';

interface Props {
  state: StoreState;
  updateState: (updater: (prev: StoreState) => StoreState) => void;
}

const Financial: React.FC<Props> = ({ state, updateState }) => {
  const [filter, setFilter] = useState<InstallmentStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const toggleInstallmentPaid = (id: string) => {
    updateState(prev => ({
      ...prev,
      installments: prev.installments.map(i => 
        i.id === id ? { ...i, status: i.status === InstallmentStatus.PAID ? InstallmentStatus.PENDING : InstallmentStatus.PAID } : i
      )
    }));
  };

  const filteredInstallments = state.installments
    .filter(i => {
      const matchStatus = filter === 'ALL' || i.status === filter;
      const sale = state.sales.find(s => s.id === i.saleId);
      const matchSearch = sale?.customerName.toLowerCase().includes(search.toLowerCase()) || i.saleId.includes(search);
      return matchStatus && matchSearch;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getStatusStyle = (status: InstallmentStatus) => {
    switch (status) {
      case InstallmentStatus.PAID: return 'bg-green-100 text-green-700';
      case InstallmentStatus.OVERDUE: return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusLabel = (status: InstallmentStatus) => {
    switch (status) {
      case InstallmentStatus.PAID: return 'Pago';
      case InstallmentStatus.OVERDUE: return 'Vencido';
      default: return 'Pendente';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Controle Financeiro</h2>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
           {(['ALL', InstallmentStatus.PENDING, InstallmentStatus.PAID] as const).map(f => (
             <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-pink-600 text-white' : 'text-gray-500 hover:bg-pink-50'}`}
             >
               {f === 'ALL' ? 'Todos' : getStatusLabel(f as InstallmentStatus)}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input 
            placeholder="Buscar por cliente ou ID da venda..."
            className="bg-transparent border-none outline-none w-full text-gray-800 font-medium placeholder:text-gray-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Parcela</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInstallments.map(inst => {
                const sale = state.sales.find(s => s.id === inst.saleId);
                const isOverdue = inst.status === InstallmentStatus.PENDING && new Date(inst.dueDate) < new Date();
                const displayStatus = isOverdue ? InstallmentStatus.OVERDUE : inst.status;

                return (
                  <tr key={inst.id} className="hover:bg-pink-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-800 font-medium">
                        <Calendar size={16} className="text-gray-400" />
                        {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{sale?.customerName}</p>
                      <p className="text-xs text-gray-500">ID: {inst.saleId}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {inst.number}ª de {sale?.installmentsCount}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {formatCurrency(inst.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${getStatusStyle(displayStatus)}`}>
                        {getStatusLabel(displayStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleInstallmentPaid(inst.id)}
                        className={`p-2 rounded-lg transition-all ${inst.status === InstallmentStatus.PAID ? 'bg-green-50 text-green-600 shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-pink-100 hover:text-pink-600'}`}
                        title={inst.status === InstallmentStatus.PAID ? "Marcar como pendente" : "Marcar como pago"}
                      >
                        <CheckCircle size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredInstallments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhuma parcela encontrada para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Financial;
