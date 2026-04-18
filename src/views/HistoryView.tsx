import React from 'react';
import { History, ChevronDown, ChevronRight, Activity, Trash2, Sun, Sunrise, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStatusColor } from '../lib/bloodPressureUtils';
import { cn } from '../lib/utils';

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

interface HistoryViewProps {
  measurements: Measurement[];
  expandedMonths: Record<string, boolean>;
  toggleMonth: (month: string) => void;
  handleDelete: (id: string) => void;
}

export function HistoryView({ measurements, expandedMonths, toggleMonth, handleDelete }: HistoryViewProps) {
  const groupedMeasurements = measurements
    .slice()
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .reduce((acc, m) => {
      const monthName = m.timestamp.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      if (!acc[capitalizedMonth]) {
        acc[capitalizedMonth] = { date: m.timestamp, items: [] };
      }
      acc[capitalizedMonth].items.push(m);
      return acc;
    }, {} as Record<string, { date: Date, items: Measurement[] }>);

  if (measurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-600 space-y-4">
        <History size={48} className="opacity-20 translate-y-2" />
        <p className="font-bold tracking-widest text-xs uppercase">Nenhum registro encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          Seu Histórico
        </h2>
        <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
          {measurements.length} Registros
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedMeasurements).map(([month, { items }]) => (
          <div key={month} className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleMonth(month)}
              className="w-full select-none flex items-center justify-between p-5 hover:bg-zinc-900/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Activity size={18} />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-white text-sm tracking-tight">{month}</h3>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">{items.length} leituras realizadas</p>
                </div>
              </div>
              {expandedMonths[month] ? (
                <ChevronDown className="text-zinc-600" size={20} />
              ) : (
                <ChevronRight className="text-zinc-600" size={20} />
              )}
            </button>
            <AnimatePresence>
              {expandedMonths[month] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 overflow-hidden"
                >
                  <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                    {items.map((m) => (
                      <div key={m.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-between group/item">
                        <div className="flex items-center gap-4">
                          <div className="text-center w-12 py-1.5 bg-black rounded-xl border border-zinc-800">
                            <p className="text-[10px] font-black leading-none text-zinc-500 uppercase">{m.timestamp.toLocaleString('pt-BR', { weekday: 'short' }).slice(0,3)}</p>
                            <p className="text-lg font-black text-white leading-tight">{m.timestamp.getDate()}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {m.period === 'morning' && <Sunrise size={12} className="text-amber-500" />}
                              {m.period === 'afternoon' && <Sun size={12} className="text-orange-500" />}
                              {m.period === 'night' && <Moon size={12} className="text-blue-400" />}
                              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                {m.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-white leading-none">{m.systolic}</span>
                              <span className="text-zinc-700 font-bold">/</span>
                              <span className="text-xl font-black text-white leading-none">{m.diastolic}</span>
                              <span className="text-xs font-bold text-zinc-600 ml-1">PA</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", getStatusColor(m.status))}>
                              {m.status}
                            </p>
                            {m.pulse && (
                              <p className="text-[10px] font-bold text-zinc-500 leading-none">
                                ❤️ {m.pulse} BPM
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={() => handleDelete(m.id)}
                            className="p-3 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover/item:opacity-100"
                            aria-label="Excluir registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
