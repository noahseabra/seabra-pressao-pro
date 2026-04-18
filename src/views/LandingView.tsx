import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ArrowRight, Shield, Zap, Bell, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/Logo';

interface LandingViewProps {
  onStart: () => void;
}

export function LandingView({ onStart }: LandingViewProps) {
  const features = [
    { 
      icon: <Zap className="w-5 h-5 text-yellow-400" />, 
      title: "Análise por IA", 
      desc: "Tire uma foto do monitor e deixe nossa IA ler os valores." 
    },
    { 
      icon: <Shield className="w-5 h-5 text-blue-400" />, 
      title: "100% Privado", 
      desc: "Seus dados são protegidos por criptografia de ponta a ponta." 
    },
    { 
      icon: <Bell className="w-5 h-5 text-red-400" />, 
      title: "Alertas Inteligentes", 
      desc: "Receba avisos instantâneos sobre níveis críticos de pressão." 
    }
  ];

  return (
    <div className="min-h-screen bg-black overflow-hidden selection:bg-blue-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-12">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-xl font-black text-white tracking-tight hidden sm:block">Seabra Pressão Pro</span>
          </div>
          <button 
            onClick={onStart}
            className="text-sm font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Acessar Conta
          </button>
        </nav>

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 mb-32">
          <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 size={12} />
              Lançamento Nacional 2026
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight">
              Sua saúde cardíaca <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">em suas mãos.</span>
            </h1>
            
            <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed">
              O monitoramento mais inteligente e intuitivo do Brasil. 
              Organize seus registros e gere relatórios profissionais com apenas 3 cliques.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={onStart}
                className="w-full sm:w-auto px-8 py-5 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-2xl shadow-white/10 group"
              >
                COMEÇAR AGORA
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="text-zinc-600 font-bold text-xs uppercase tracking-widest">
                Utilizado por +5.000 pessoas
              </div>
            </div>
          </div>

          <div className="flex-1 relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-500">
            <div className="absolute inset-0 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-4 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
              <img 
                src="https://picsum.photos/seed/medical/1200/800" 
                alt="Interface do App" 
                className="rounded-[1.5rem] w-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
          {features.map((f, i) => (
            <div key={i} className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-8 rounded-3xl hover:bg-zinc-900/60 transition-all group">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-zinc-600 text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span>&copy; 2026 Seabra Health Tech</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-zinc-400 transition-colors">Termos</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Contato</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
