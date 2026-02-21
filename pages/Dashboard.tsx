
import React, { useMemo } from 'react';
import { StoreState, InstallmentStatus, OrderStatus } from '../types';
import { formatCurrency } from '../constants';
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Clock,
  ArrowUpRight,
  ShoppingBag,
  CheckCircle2,
  ClipboardList
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  state: StoreState;
}

const Dashboard: React.FC<Props> = ({ state }) => {
  const totalSales = state.sales.reduce((acc, sale) => acc + sale.totalDiscounted, 0);
  const pendingInstallments = state.installments.filter(i => i.status === InstallmentStatus.PENDING || i.status === InstallmentStatus.OVERDUE);
  const totalToReceive = pendingInstallments.reduce((acc, i) => acc + i.amount, 0);
  const activeCustomers = state.customers.length;

  const overdueCount = state.installments.filter(i => i.status === InstallmentStatus.OVERDUE).length;
  const pendingOrdersCount = state.orders.filter(o => o.status === OrderStatus.PENDING).length;
  const arrivedOrdersCount = state.orders.filter(o => o.status === OrderStatus.ARRIVED).length;

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = months[d.getMonth()];
      const salesInMonth = state.sales.filter(s => {
        const sd = new Date(s.date);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      });
      const total = salesInMonth.reduce((acc, s) => acc + s.totalDiscounted, 0);
      result.push({ name: mLabel, total });
    }
    return result;
  }, [state.sales]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Vendas Totais" value={formatCurrency(totalSales)} icon={<TrendingUp className="text-green-600" />} color="bg-green-100" />
        <StatCard title="A Receber" value={formatCurrency(totalToReceive)} icon={<Clock className="text-blue-600" />} color="bg-blue-100" />
        <StatCard title="Clientes Ativos" value={activeCustomers.toString()} icon={<Users className="text-purple-600" />} color="bg-purple-100" />
        <StatCard title="Atrasos" value={overdueCount.toString()} icon={<AlertCircle className="text-red-600" />} color="bg-red-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Faturamento Mensal</h3>
          <div className="flex-1 w-full min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={false} />
                <Tooltip 
                  cursor={{ fill: '#fdf2f8' }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#db2777' : '#fbcfe8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Alertas</h3>
          <div className="space-y-4">
            {overdueCount > 0 ? (
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Parcelas Vencidas</p>
                  <p className="text-xs text-red-700">Você tem {overdueCount} parcelas em atraso. Verifique o financeiro.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Tudo em dia!</p>
                  <p className="text-xs text-green-700">Não há cobranças atrasadas hoje.</p>
                </div>
              </div>
            )}

            {arrivedOrdersCount > 0 && (
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <ShoppingBag className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Encomendas Chegaram!</p>
                  <p className="text-xs text-blue-700">Você tem {arrivedOrdersCount} encomendas prontas para entrega.</p>
                </div>
              </div>
            )}

            {pendingOrdersCount > 0 && (
              <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <ClipboardList className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Encomendas Pendentes</p>
                  <p className="text-xs text-amber-700">Há {pendingOrdersCount} itens aguardando compra/chegada.</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-4 p-4 bg-pink-50 rounded-xl border border-pink-100">
               <ShoppingBag className="text-pink-600 flex-shrink-0" />
               <div>
                  <p className="text-sm font-semibold text-pink-900">Catálogo</p>
                  <p className="text-xs text-pink-700">Mantenha seus produtos atualizados para facilitar as vendas.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <ArrowUpRight className="text-gray-400 w-5 h-5" />
    </div>
    <p className="text-sm text-gray-500 font-medium">{title}</p>
    <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
  </div>
);

export default Dashboard;
