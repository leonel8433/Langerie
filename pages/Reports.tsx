
import React, { useMemo } from 'react';
import { StoreState } from '../types';
import { formatCurrency } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Printer, History, Users, BarChart2 } from 'lucide-react';

interface Props {
  state: StoreState;
}

const Reports: React.FC<Props> = ({ state }) => {
  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.sales.forEach(s => {
      counts[s.paymentMethod] = (counts[s.paymentMethod] || 0) + s.totalDiscounted;
    });
    const data = Object.entries(counts).map(([name, value]) => ({ 
      name: name === 'CASH' ? 'À Vista' : name === 'PIX' ? 'Pix' : 'Parcelado', 
      value 
    }));
    return data.length > 0 ? data : [{ name: 'Sem dados', value: 0 }];
  }, [state.sales]);

  const COLORS = ['#db2777', '#ec4899', '#f472b6', '#fbcfe8'];

  const customerRanking = useMemo(() => {
    const ranking: Record<string, { name: string, total: number, count: number }> = {};
    state.sales.forEach(s => {
      if (!ranking[s.customerId]) {
        ranking[s.customerId] = { name: s.customerName, total: 0, count: 0 };
      }
      ranking[s.customerId].total += s.totalDiscounted;
      ranking[s.customerId].count += 1;
    });
    return Object.values(ranking).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [state.sales]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Relatórios</h2>
          <p className="text-pink-500 text-sm italic">Análise detalhada do seu desempenho comercial</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
          <Printer size={18} />
          Imprimir Relatório
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[450px] flex flex-col">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart2 className="text-pink-600" />
            Vendas por Pagamento
          </h3>
          <div className="flex-1 w-full min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Users className="text-pink-600" />
            Top 5 Clientes
          </h3>
          <div className="space-y-4">
            {customerRanking.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.count} compras</p>
                  </div>
                </div>
                <p className="font-bold text-pink-600">{formatCurrency(c.total)}</p>
              </div>
            ))}
            {customerRanking.length === 0 && (
              <p className="text-center py-12 text-gray-400 italic">Sem dados registrados.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <History className="text-pink-600" />
          Histórico Recente
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Desconto</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.sales.slice(0, 10).map(s => (
                <tr key={s.id} className="hover:bg-pink-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{s.customerName}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">
                    {s.paymentMethod === 'CASH' ? 'À Vista' : s.paymentMethod === 'PIX' ? 'Pix' : 'Parcelado'}
                  </td>
                  <td className="px-6 py-4">{s.products.reduce((a, b) => a + b.quantity, 0)}</td>
                  <td className="px-6 py-4 text-green-600 font-medium">-{s.discountPercentage}%</td>
                  <td className="px-6 py-4 font-bold text-pink-600 text-right">{formatCurrency(s.totalDiscounted)}</td>
                </tr>
              ))}
              {state.sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhuma venda encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
