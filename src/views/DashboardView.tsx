import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  LineChart, 
  Line 
} from 'recharts';
import { Activity, Sun, Sunrise, Moon, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

// Redefining types locally for modularity
interface Measurement {
  id: string;
  userId: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  period: 'morning' | 'afternoon' | 'night';
  timestamp: Date;
  status: string;
}

type Period = 'morning' | 'afternoon' | 'night';

interface DashboardViewProps {
  measurements: Measurement[];
  chartFilter: 'all' | Period;
  setChartFilter: (filter: 'all' | Period) => void;
}

export function DashboardView({ measurements, chartFilter, setChartFilter }: DashboardViewProps) {
  const chartData = measurements
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .filter(m => chartFilter === 'all' || m.period === chartFilter)
    .map(m => ({
      ...m,
      dateFormatted: m.timestamp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      time: m.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }))
    .slice(-14);

  const getAverge = (key: 'systolic' | 'diastolic') => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + (curr[key] as number), 0);
    return Math.round(sum / chartData.length);
  };

  const avgSys = getAverge('systolic');
  const avgDia = getAverge('diastolic');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Análise de Tendências</h2>
          <p className="text-zinc-500 text-sm">Últimos {chartData.length} registros</p>
        </div>
        
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1 overflow-x-auto no-scrollbar">
          {(['all', 'morning', 'afternoon', 'night'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setChartFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0",
                chartFilter === f ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {f === 'all' && <Filter size={14} />}
              {f === 'morning' && <Sunrise size={14} />}
              {f === 'afternoon' && <Sun size={14} />}
              {f === 'night' && <Moon size={14} />}
              {f === 'all' ? 'Tudo' : f === 'morning' ? 'Manhã' : f === 'afternoon' ? 'Tarde' : 'Noite'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-[40px] rounded-full -mr-12 -mt-12 transition-all group-hover:bg-blue-600/10" />
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Média Sístol.</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{avgSys}</span>
            <span className="text-zinc-600 text-xs font-bold">mmHg</span>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/5 blur-[40px] rounded-full -mr-12 -mt-12 transition-all group-hover:bg-blue-400/10" />
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Média Diástol.</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{avgDia}</span>
            <span className="text-zinc-600 text-xs font-bold">mmHg</span>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />
        <div className="h-64 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="dateFormatted" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                domain={[40, 200]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#09090b', 
                  border: '1px solid #27272a',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                  fontSize: '12px',
                  color: '#fff'
                }}
                itemStyle={{ fontWeight: 700 }}
              />
              <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Normal', position: 'right', fill: '#22c55e', fontSize: 9, fontWeight: 700 }} />
              <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alerta', position: 'right', fill: '#ef4444', fontSize: 9, fontWeight: 700 }} />
              <Area 
                type="monotone" 
                dataKey="systolic" 
                stroke="#3b82f6" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorSys)" 
                animationDuration={2000}
                animationEasing="ease-in-out"
                activeDot={{ r: 6, stroke: '#000', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="diastolic" 
                stroke="#60a5fa" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorDia)" 
                animationDuration={2000}
                animationEasing="ease-in-out"
                activeDot={{ r: 5, stroke: '#000', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
