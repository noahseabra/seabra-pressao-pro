import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  LogOut, 
  ChevronRight, 
  Loader2,
  FileText,
  Share2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';

import { auth, db, logout } from './firebase';
import { Logo } from './components/Logo';
import { LandingView } from './views/LandingView';
import { AuthView } from './views/AuthView';
import { cn } from './lib/utils';
import { Period } from './lib/bloodPressureUtils';

// Lazy load views for better performance
const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const HistoryView = lazy(() => import('./views/HistoryView').then(m => ({ default: m.HistoryView })));
const LoggerView = lazy(() => import('./views/LoggerView').then(m => ({ default: m.LoggerView })));
const ReportModal = lazy(() => import('./components/ReportModal').then(m => ({ default: m.ReportModal })));

// --- Types ---
interface Measurement {
  id: string;
  userId: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  period: Period;
  timestamp: Date;
  status: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hoje' | 'grafico' | 'logs'>('hoje');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [chartFilter, setChartFilter] = useState<'all' | Period>('all');
  
  // Modals
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalMode, setReportModalMode] = useState<'pdf' | 'share'>('pdf');

  // Landing visibility
  const [showLanding, setShowLanding] = useState(true);

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setShowLanding(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Data observer
  useEffect(() => {
    if (!user) {
      setMeasurements([]);
      return;
    }

    const q = query(
      collection(db, 'measurements'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Measurement[];
      setMeasurements(data);
    });

    return () => unsubscribe();
  }, [user]);

  // Methods
  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 sm:p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <Logo size="lg" className="animate-pulse" />
          <div className="mt-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">Carregando Saúde...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // View: Landing Page
  if (showLanding && !user) {
    return <LandingView onStart={() => setShowLanding(false)} />;
  }

  // View: Auth Page
  if (!user) {
    return <AuthView error={error} setError={setError} />;
  }

  // View: Dashboard App
  return (
    <div className="min-h-screen bg-black pb-32 selection:bg-blue-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/10 to-transparent" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 pt-8 sm:pt-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 sm:mb-12">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-white/5 rounded-2xl border border-white/5">
              <Logo size="sm" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Seabra Pro</p>
              <h1 className="text-xl font-black text-white tracking-tight">Painel Principal</h1>
            </div>
          </div>
          
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
          >
            <LogOut size={20} />
          </button>
        </header>

        {/* Action Bar (Only for charts/logs) */}
        {(activeTab === 'grafico' || activeTab === 'logs') && (
          <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => { setReportModalMode('pdf'); setShowReportModal(true); }}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <Download size={16} className="text-blue-500" />
              Relatório PDF
            </button>
            <button 
              onClick={() => { setReportModalMode('share'); setShowReportModal(true); }}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <Share2 size={16} className="text-green-500" />
              Compartilhar Médico
            </button>
          </div>
        )}

        {/* Global Loading for Lazy Components */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        }>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'hoje' && (
              <LoggerView 
                user={user} 
                setMeasurements={setMeasurements} 
              />
            )}

            {activeTab === 'grafico' && (
              <DashboardView 
                measurements={measurements} 
                chartFilter={chartFilter}
                setChartFilter={setChartFilter}
              />
            )}

            {activeTab === 'logs' && (
              <HistoryView 
                measurements={measurements} 
                expandedMonths={expandedMonths}
                toggleMonth={toggleMonth}
                handleDelete={async (id) => {
                  const { deleteDoc, doc } = await import('firebase/firestore');
                  try {
                    await deleteDoc(doc(db, 'measurements', id));
                  } catch (err) {
                    const { handleFirestoreError, OperationType } = await import('./firebase');
                    handleFirestoreError(err, OperationType.DELETE, `measurements/${id}`);
                  }
                }}
              />
            )}
          </div>
        </Suspense>
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50">
        <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 shadow-2xl flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('hoje')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-3xl transition-all duration-300 relative overflow-hidden group",
              activeTab === 'hoje' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {activeTab === 'hoje' && (
              <motion.div layoutId="nav-glow" className="absolute inset-0 bg-blue-600/10 blur-xl" />
            )}
            <div className={cn(
              "p-2 rounded-xl transition-all group-active:scale-90",
              activeTab === 'hoje' ? "bg-blue-600 shadow-lg shadow-blue-500/20" : "bg-transparent"
            )}>
              <Logo size="xs" color={activeTab === 'hoje' ? 'white' : 'zinc'} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
          </button>

          <button 
            onClick={() => setActiveTab('grafico')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-3xl transition-all duration-300 relative overflow-hidden group",
              activeTab === 'grafico' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {activeTab === 'grafico' && (
              <motion.div layoutId="nav-glow" className="absolute inset-0 bg-blue-600/10 blur-xl" />
            )}
            <div className={cn(
              "p-2 rounded-xl transition-all group-active:scale-90",
              activeTab === 'grafico' ? "bg-blue-600 shadow-lg shadow-blue-500/20" : "bg-transparent"
            )}>
              <FileText size={18} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Painel</span>
          </button>

          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-3xl transition-all duration-300 relative overflow-hidden group",
              activeTab === 'logs' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {activeTab === 'logs' && (
              <motion.div layoutId="nav-glow" className="absolute inset-0 bg-blue-600/10 blur-xl" />
            )}
            <div className={cn(
              "p-2 rounded-xl transition-all group-active:scale-90",
              activeTab === 'logs' ? "bg-blue-600 shadow-lg shadow-blue-500/20" : "bg-transparent"
            )}>
              <LogOut className="rotate-180" size={18} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Histórico</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl relative z-10"
            >
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Deseja sair?</h3>
              <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Sua sessão será encerrada e você precisará entrar novamente para acessar seus dados.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { logout(); setShowLogoutConfirm(false); setShowLanding(true); }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20"
                >
                  Sair Agora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        {showReportModal && (
          <ReportModal 
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            measurements={measurements}
            mode={reportModalMode}
          />
        )}
      </Suspense>
    </div>
  );
}
