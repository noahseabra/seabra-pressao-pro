import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Save, Loader2, AlertCircle, Plus, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzePressureImage } from '../services/geminiService';
import { getAutoPeriod, getStatus, BloodPressureStatus } from '../lib/bloodPressureUtils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { cn } from '../lib/utils';

interface LoggerViewProps {
  user: User;
  setMeasurements: React.Dispatch<React.SetStateAction<any[]>>;
}

export function LoggerView({ user, setMeasurements }: LoggerViewProps) {
  // Local state for the logger
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [period, setPeriod] = useState<'morning' | 'afternoon' | 'night'>(getAutoPeriod());
  const [showForm, setShowForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await analyzePressureImage(base64);
        
        if (result.error) {
          setError(result.error);
        } else {
          setSystolic(result.systolic.toString());
          setDiastolic(result.diastolic.toString());
          if (result.pulse) setPulse(result.pulse.toString());
          setPeriod(getAutoPeriod());
          setShowForm(true);
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem.");
      setIsAnalyzing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systolic || !diastolic) return;

    setIsSaving(true);
    const newMeasurement = {
      userId: user.uid,
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic),
      pulse: pulse ? parseInt(pulse) : null,
      period,
      timestamp: new Date(),
      status: getStatus(parseInt(systolic), parseInt(diastolic))
    };

    try {
      await addDoc(collection(db, 'measurements'), newMeasurement);
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'measurements');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-600/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="group relative h-48 sm:h-64 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98] shadow-lg overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/20 transition-all" />
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
              {isAnalyzing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Análise por Foto</h3>
            <p className="text-zinc-500 text-sm text-center max-w-[200px] leading-relaxed">Deixe nossa IA ler os valores do seu aparelho automaticamente.</p>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </button>

          <button 
            onClick={() => setShowForm(!showForm)}
            className="group relative h-48 sm:h-64 bg-zinc-900 border border-zinc-700/50 rounded-3xl p-8 flex flex-col items-center justify-center transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98] shadow-lg overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/10 blur-[40px] rounded-full -ml-16 -mb-16 group-hover:bg-blue-400/20 transition-all" />
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 mb-4 group-hover:scale-110 group-hover:bg-zinc-700 group-hover:text-white transition-all shadow-xl">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Entrada Manual</h3>
            <p className="text-zinc-500 text-sm text-center max-w-[200px] leading-relaxed">Digite os valores manualmente se preferir maior controle.</p>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500 text-sm flex items-start gap-4 shadow-lg shadow-red-500/5"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black uppercase tracking-widest text-[10px] mb-1">Erro de Processamento</p>
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          </motion.div>
        )}

        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500">
                <ClipboardList size={20} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Nova Leitura</h2>
            </div>
            
            <form onSubmit={handleSave} className="space-y-8 relative z-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Sistólica (Máx)</label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-6 px-6 text-4xl font-black text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-center placeholder:text-zinc-900"
                      placeholder="120"
                      required
                    />
                    <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/0 group-focus-within:border-blue-500/30 pointer-events-none transition-all" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Diastólica (Mín)</label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-6 px-6 text-4xl font-black text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-center placeholder:text-zinc-900"
                      placeholder="80"
                      required
                    />
                    <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/0 group-focus-within:border-blue-500/30 pointer-events-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-8">
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Pulsação (Opcional)</label>
                  <input 
                    type="number" 
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 px-6 text-xl font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all text-center placeholder:text-zinc-900"
                    placeholder="70 BPM"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Período</label>
                  <div className="grid grid-cols-3 gap-2 bg-zinc-950/50 p-2 rounded-2xl border border-zinc-800">
                    {(['morning', 'afternoon', 'night'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          period === p ? "bg-blue-600 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        {p === 'morning' ? 'Manhã' : p === 'afternoon' ? 'Tarde' : 'Noite'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-5 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      SALVAR REGISTRO
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
