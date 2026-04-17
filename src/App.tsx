/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Camera, 
  Image as ImageIcon, 
  Sun, 
  Sunrise, 
  Moon, 
  Save, 
  History, 
  Share2, 
  LogOut, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  FileText,
  Folder,
  ChevronDown,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ClipboardList,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { analyzePressureImage } from './services/geminiService';
import { cn } from './lib/utils';

// --- Types ---

const LOGO_URL = `/api/proxy-image?url=${encodeURIComponent('https://storage.googleapis.com/test-media-objects/69796030-cf8b-4a30-811c-6d9b13903104')}`;

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

// --- Utils ---

const getStatus = (sys: number, dia: number) => {
  if (sys >= 180 || dia >= 120) return 'Crise Hipertensiva';
  if (sys >= 140 || dia >= 90) return 'Hipertensão Estágio 2';
  if (sys >= 130 || dia >= 80) return 'Hipertensão Estágio 1';
  if (sys >= 120 && dia < 80) return 'Elevada';
  return 'Normal';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Normal': return 'text-brand-green';
    case 'Elevada': return 'text-brand-yellow';
    case 'Hipertensão Estágio 1': return 'text-orange-500';
    case 'Hipertensão Estágio 2': return 'text-brand-red';
    case 'Crise Hipertensiva': return 'text-red-700 font-bold';
    default: return 'text-gray-400';
  }
};

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hoje' | 'grafico' | 'logs'>('hoje');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [chartFilter, setChartFilter] = useState<'all' | Period>('all');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Report Info Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalMode, setReportModalMode] = useState<'pdf' | 'share'>('pdf');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  // Initial fill for name if available
  useEffect(() => {
    if (user?.displayName && !patientName) {
      setPatientName(user.displayName);
    }
  }, [user]);

  // Methods
  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'measurements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `measurements/${id}`);
    }
  };

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setAuthLoading(true);
    setError(null);

    try {
      if (isLoginMode) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err: any) {
      const message = err.code === 'auth/user-not-found' ? 'Usuário não encontrado.' :
                      err.code === 'auth/wrong-password' ? 'Senha incorreta.' :
                      err.code === 'auth/email-already-in-use' ? 'Este e-mail já está em uso.' :
                      err.code === 'auth/weak-password' ? 'A senha deve ter pelo menos 6 caracteres.' :
                      'Erro ao realizar autenticação.';
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Informe seu e-mail para recuperar a senha.');
      return;
    }
    try {
      await resetPassword(email);
      alert('E-mail de recuperação enviado!');
    } catch (err: any) {
      setError('Erro ao enviar e-mail de recuperação.');
    }
  };

  const handleShare = async () => {
    if (!showReportModal) {
      setReportModalMode('share');
      setShowReportModal(true);
      return;
    }
    
    setShowReportModal(false);

    if (measurements.length === 0) {
      const basicText = 'Acompanhe sua saúde cardiovascular com Seabra Pressão Pro!';
      if (navigator.share) {
        await navigator.share({ title: 'Seabra Pressão Pro', text: basicText, url: window.location.href });
      } else {
        navigator.clipboard.writeText(`${basicText} ${window.location.href}`);
        alert('Link copiado!');
      }
      return;
    }

    // Header
    let text = `📋 *RELATÓRIO MAPA - SEABRA PRESSÃO PRO* 📋\n`;
    text += `👤 *Paciente:* ${patientName || 'Não identificado'}\n`;
    text += `📊 *Total de registros:* ${measurements.length}\n`;
    text += `📅 *Gerado em:* ${new Date().toLocaleString('pt-BR')}\n\n`;
    text += `--- *HISTÓRICO DE MEDIÇÕES (SYS x DIA)* ---\n\n`;

    // Grouping for Text Report (same logic as PDF)
    const groupedByDate: Record<string, Record<string, string[]>> = {};
    const sortedMeasurements = [...measurements].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    sortedMeasurements.forEach(m => {
      const dateStr = m.timestamp.toLocaleDateString('pt-BR');
      if (!groupedByDate[dateStr]) groupedByDate[dateStr] = { morning: [], afternoon: [], night: [] };
      groupedByDate[dateStr][m.period].push(`${m.systolic}x${m.diastolic}`);
    });

    // Building the body
    Object.entries(groupedByDate).reverse().forEach(([date, periods]) => {
      text += `📅 *DIA: ${date}*\n`;
      if (periods.morning.length > 0) text += `🌅 Manhã: ${periods.morning.join(' | ')}\n`;
      if (periods.afternoon.length > 0) text += `☀️ Tarde: ${periods.afternoon.join(' | ')}\n`;
      if (periods.night.length > 0) text += `🌙 Noite: ${periods.night.join(' | ')}\n`;
      text += `--------------------------\n`;
    });

    text += `\n🔗 *Acesse o Painel:* ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Relatório MAPA - Seabra Pressão Pro',
          text: text
        });
      } catch (err) {
        console.log('Erro ao compartilhar:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Relatório completo copiado para a área de transferência!');
    }
  };

  const generatePDF = () => {
    if (!showReportModal) {
      setReportModalMode('pdf');
      setShowReportModal(true);
      return;
    }

    setShowReportModal(false);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Brand Colors
    const brandBlue = [37, 99, 235]; // #2563EB
    
    // --- DARK HEADER SECTION ---
    doc.setFillColor(20, 20, 26); // Midnight black/grey
    doc.rect(0, 0, pageWidth, 55, 'F');
    
    // Brand Name
    doc.setFontSize(26); 
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('SEABRA PRESSÃO PRO', 15, 28);
    
    // Brand Subtext
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.text('SISTEMA INTELIGENTE DE MONITORAMENTO CARDIOVASCULAR', 15, 38);
    
    // Report Date Box (Top Right)
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    doc.setFillColor(40, 40, 45);
    doc.roundedRect(pageWidth - 70, 15, 55, 25, 3, 3, 'F');
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'bold');
    doc.text('EMISSÃO DO RELATÓRIO', pageWidth - 65, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${dateStr}`, pageWidth - 65, 30);
    doc.setFontSize(9);
    doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]); 
    doc.text(`Hora: ${timeStr}`, pageWidth - 65, 36);

    // --- DADOS CLÍNICOS E IDENTIFICAÇÃO ---
    let currentY = 75;
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS CLÍNICOS E IDENTIFICAÇÃO', 15, currentY);
    
    // Underline
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, currentY + 3, pageWidth - 15, currentY + 3);
    
    // Info Grid
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'bold');
    
    // Labels
    currentY += 15;
    doc.text('PACIENTE', 15, currentY);
    doc.text('IDADE', pageWidth / 2, currentY);
    
    currentY += 21;
    doc.text('MÉDICO RESPONSÁVEL', 15, currentY);
    doc.text('INSTITUIÇÃO / HOSPITAL', pageWidth / 2, currentY);
    
    // Values
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    
    doc.text(patientName || 'Não Informado', 15, currentY - 14);
    doc.text(patientAge ? `${patientAge} anos` : '-- anos', pageWidth / 2, currentY - 14);
    
    doc.text(doctorName || 'Não Informado', 15, currentY + 7);
    doc.text(hospitalName || 'Não Informado', pageWidth / 2, currentY + 7);

    // --- HISTÓRICO DE AFERIÇÕES ---
    currentY += 25;
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTÓRICO DE AFERIÇÕES', 15, currentY);

    // Prepare Table Data (Individual Rows)
    const tableRows = [...measurements].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).map(m => {
      const date = m.timestamp.toLocaleDateString('pt-BR');
      const hour = m.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const periodLabel = m.period === 'morning' ? 'Manhã' : m.period === 'afternoon' ? 'Tarde' : 'Noite';
      const pressure = `${m.systolic} / ${m.diastolic}`;
      const pulseVal = m.pulse ? `${m.pulse} bpm` : '-';
      const status = m.status;
      
      return [date, hour, periodLabel, pressure, pulseVal, status];
    });

    autoTable(doc, {
      startY: currentY + 8,
      head: [['DATA', 'HORA', 'PERÍODO', 'PRESSÃO (mmHg)', 'PULSO', 'CLASSIFICAÇÃO / STATUS']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [20, 20, 26],
        textColor: [255, 255, 255],
        fontSize: 9,
        halign: 'center',
        cellPadding: 6
      },
      styles: {
        halign: 'center',
        fontSize: 9,
        valign: 'middle',
        cellPadding: 6,
        lineColor: [210, 210, 210],
        lineWidth: 0.2
      },
      columnStyles: {
        3: { fontStyle: 'bold' },
        5: { fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const statusText = data.cell.text[0];
          if (statusText.includes('Crise') || statusText.includes('Estágio 2')) {
            data.cell.styles.textColor = [180, 0, 0];
          } else if (statusText.includes('Estágio 1')) {
            data.cell.styles.textColor = [160, 100, 0];
          } else if (statusText.includes('Elevada')) {
            data.cell.styles.textColor = [200, 150, 0];
          } else {
            data.cell.styles.textColor = [0, 120, 0];
          }
        }
      }
    });

    // --- SIGNATURE AREA ---
    const finalTableY = (doc as any).lastAutoTable.finalY || currentY + 100;
    const signatureY = Math.max(finalTableY + 40, pageHeight - 60);

    doc.setDrawColor(200, 200, 200);
    doc.line(60, signatureY, pageWidth - 60, signatureY);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Assinatura / Carimbo do Profissional', pageWidth / 2, signatureY + 6, { align: 'center' });

    // --- FOOTER ---
    const footerY = pageHeight - 15;
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    const disclaimer = 'Este documento é um relatório técnico gerado pelo sistema Seabra Pressão Pro. Os dados aqui contidos devem ser interpretados\nexclusivamente por um profissional de saúde qualificado. Este relatório não constitui diagnóstico médico isolado.';
    doc.text(disclaimer, pageWidth / 2, footerY - 5, { align: 'center' });
    
    doc.text(`Página 1 de 1`, pageWidth - 20, footerY, { align: 'right' });

    doc.save(`MAPA_PROFISSIONAL_${user?.displayName?.replace(/\s+/g, '_') || 'PACIENTE'}.pdf`);
  };

  // Form State
  const [systolic, setSystolic] = useState<string>('');
  const [diastolic, setDiastolic] = useState<string>('');
  const [pulse, setPulse] = useState<string>('');
  const [period, setPeriod] = useState<Period>('afternoon');
  const [showForm, setShowForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
        timestamp: (doc.data().timestamp as Timestamp).toDate()
      })) as Measurement[];
      setMeasurements(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'measurements');
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!systolic || !diastolic) {
      setError('Por favor, preencha a pressão sistólica e diastólica.');
      return;
    }

    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    const pul = pulse ? parseInt(pulse) : undefined;

    if (isNaN(sys) || isNaN(dia) || sys < 40 || sys > 300 || dia < 30 || dia > 200) {
      setError('Valores de pressão arterial parecem irreais.');
      return;
    }

    try {
      await addDoc(collection(db, 'measurements'), {
        userId: user.uid,
        systolic: sys,
        diastolic: dia,
        pulse: pul,
        period,
        timestamp: Timestamp.now(),
        status: getStatus(sys, dia)
      });
      
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setError(null);
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'measurements');
    }
  };

  const stats = {
    last: measurements[0],
    todayAvg: measurements.filter(m => m.timestamp.toDateString() === new Date().toDateString()).length > 0 
      ? {
          sys: Math.round(measurements.filter(m => m.timestamp.toDateString() === new Date().toDateString()).reduce((acc, m) => acc + m.systolic, 0) / measurements.filter(m => m.timestamp.toDateString() === new Date().toDateString()).length),
          dia: Math.round(measurements.filter(m => m.timestamp.toDateString() === new Date().toDateString()).reduce((acc, m) => acc + m.diastolic, 0) / measurements.filter(m => m.timestamp.toDateString() === new Date().toDateString()).length)
        }
      : null,
    totalAvg: measurements.length > 0 ? {
      sys: Math.round(measurements.reduce((acc, m) => acc + m.systolic, 0) / measurements.length),
      dia: Math.round(measurements.reduce((acc, m) => acc + m.diastolic, 0) / measurements.length)
    } : null,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#000000]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          {/* Logo Area */}
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="relative group w-32 h-32 mb-8">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue to-brand-red rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative aspect-square w-full rounded-[32px] overflow-hidden bg-[#121214] border border-white/10 shadow-2xl">
                <img 
                  src={LOGO_URL} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-white">Seabra Pressão <span className="text-brand-blue">Pro</span></h1>
              <p className="text-gray-500 font-medium text-sm">Controle Inteligente da Pressão Arterial</p>
            </div>
          </div>

          {/* Login Form */}
          <div className="glass-card p-10 space-y-8 rounded-[40px] border border-white/5">
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] pl-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1A1A1A] border-none rounded-3xl py-5 pl-14 pr-5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-brand-blue/50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Senha</label>
                  <button 
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.2em] hover:text-blue-400 transition-colors"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1A1A1A] border-none rounded-3xl py-5 pl-14 pr-14 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-brand-blue/50 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-5 bg-brand-red/10 text-brand-red rounded-2xl text-[11px] font-bold leading-normal border border-brand-red/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-brand-blue text-white py-5 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 transition-all hover:bg-blue-600 active:scale-[0.97] disabled:opacity-50 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)]"
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginMode ? 'Entrar no Aplicativo' : 'Criar Minha Conta')}
              </button>
            </form>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-[1px] bg-white/5" />
              <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.25em]">OU CONTINUE COM</span>
              <div className="flex-1 h-[1px] bg-white/5" />
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full bg-white text-black py-4 rounded-[22px] font-bold flex items-center justify-center gap-4 transition-all active:scale-[0.97] hover:bg-gray-100 shadow-xl"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" referrerPolicy="no-referrer" />
              <span className="text-sm tracking-tight">Login com Google</span>
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-gray-500 text-[11px] font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                {isLoginMode ? 'Não tem conta? Cadastre-se' : 'Já tem uma conta? Conecte-se'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-white pb-32">
      <header className="p-6 pb-2 space-y-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10">
              <img src={LOGO_URL} alt="Seabra Pro" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Seabra Pressão Pro</h1>
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-brand-blue uppercase">
                <Activity className="w-3 h-3" />
                Premium Access
              </div>
            </div>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
        
        {/* PWA Install Promo */}
        <AnimatePresence>
          {showInstallBtn && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-2xl p-4 flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center">
                    <Download className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Instalar Aplicativo</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Acesso rápido e offline</p>
                  </div>
                </div>
                <button 
                  onClick={handleInstallClick}
                  className="bg-brand-blue text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-blue/20"
                >
                  Instalar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="px-6 space-y-8 max-w-2xl mx-auto py-4">
        {activeTab === 'hoje' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Quick Stats Rows */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 space-y-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Última</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{stats.last ? `${stats.last.systolic}/${stats.last.diastolic}` : '--'}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase">mmHg</span>
              </div>
              <div className="glass-card p-6 space-y-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Média Hoje</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{stats.todayAvg ? `${stats.todayAvg.sys}/${stats.todayAvg.dia}` : '--'}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase">mmHg</span>
              </div>
            </div>

            {/* General Average Card */}
            <div className="glass-card p-8 flex items-center justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Média Geral</span>
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-bold">{stats.totalAvg ? `${stats.totalAvg.sys}/${stats.totalAvg.dia}` : '--'}</span>
                  <span className="text-sm font-bold text-gray-500">MMHG</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-4">
                <Activity className="w-6 h-6 text-brand-blue" />
                {stats.totalAvg && (
                   <span className="px-4 py-1.5 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-bold tracking-widest uppercase border border-brand-green/20">Ideal</span>
                )}
              </div>
            </div>

            {/* Health Tips Card */}
            <div className="glass-card p-8 relative overflow-hidden">
               <div className="absolute top-4 right-4 text-gray-700"><AlertCircle className="w-5 h-5" /></div>
               <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-brand-blue">
                   <Activity className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-lg">Dicas de Saúde</h3>
                   <span className="text-[10px] font-bold text-brand-blue tracking-[0.2em] uppercase">Como aferir corretamente</span>
                 </div>
               </div>
               <ul className="space-y-4">
                 {[
                   'Repouse por 5 min antes da medição.',
                   'Pés no chão e costas apoiadas.',
                   'Braço relaxado na altura do coração.',
                   'Evite cafeína 30 min antes.'
                 ].map((tip, i) => (
                   <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                     <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                     {tip}
                   </li>
                 ))}
               </ul>
            </div>

            {/* New Measurement Trigger */}
            <div className="space-y-4 pt-4">
                <h2 className="text-3xl font-bold tracking-tight">Nova Medição</h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Registre seus dados manualmente ou por foto</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setShowForm(true); setTimeout(() => fileInputRef.current?.click(), 100); }} className="flex items-center justify-center gap-3 py-6 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-colors font-bold">
                    <Camera className="w-6 h-6" /> Câmera
                  </button>
                  <button onClick={() => { setShowForm(true); setTimeout(() => fileInputRef.current?.click(), 100); }} className="flex items-center justify-center gap-3 py-6 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-colors font-bold">
                    <ImageIcon className="w-6 h-6" /> Galeria
                  </button>
                </div>

                <AnimatePresence>
                  {showForm && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-8">
                       <div className="space-y-4">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Período</span>
                         <div className="grid grid-cols-3 gap-4">
                            <PeriodButton active={period==='morning'} onClick={()=>setPeriod('morning')} icon={<Sunrise className="w-6 h-6"/>} label="MANHÃ" />
                            <PeriodButton active={period==='afternoon'} onClick={()=>setPeriod('afternoon')} icon={<Sun className="w-6 h-6"/>} label="TARDE" />
                            <PeriodButton active={period==='night'} onClick={()=>setPeriod('night')} icon={<Moon className="w-6 h-6"/>} label="NOITE" />
                         </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                               <Activity className="w-3 h-3 text-brand-red" /> Sistólica (SYS)
                            </div>
                            <div className="relative">
                               <input type="number" value={systolic} onChange={e=>setSystolic(e.target.value)} placeholder="120" className="w-full bg-[#1C1C1E] border border-white/5 rounded-[32px] p-6 text-3xl font-bold pr-20" />
                               <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">MMHG</span>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                               <Activity className="w-3 h-3 text-brand-blue" /> Diastólica (DIA)
                            </div>
                            <div className="relative">
                               <input type="number" value={diastolic} onChange={e=>setDiastolic(e.target.value)} placeholder="80" className="w-full bg-[#1C1C1E] border border-white/5 rounded-[32px] p-6 text-3xl font-bold pr-20" />
                               <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">MMHG</span>
                            </div>
                         </div>
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                             <Activity className="w-3 h-3 text-brand-green" /> Pulso
                          </div>
                          <div className="relative">
                             <input type="number" value={pulse} onChange={e=>setPulse(e.target.value)} placeholder="70 (Opcional)" className="w-full bg-[#1C1C1E] border border-white/5 rounded-[32px] p-6 pr-20" />
                             <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">BPM</span>
                          </div>
                       </div>

                       <button onClick={handleSave} className="w-full btn-primary glow-blue mt-4">Salvar Medição</button>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
          </motion.div>
        )}

        {activeTab === 'grafico' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Evolução</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Acompanhe seus dados graficamente</p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {(['all', 'morning', 'afternoon', 'night'] as const).map((f) => (
                <button 
                  key={f} 
                  onClick={() => setChartFilter(f)}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-all shrink-0",
                    chartFilter === f ? "bg-brand-blue border-brand-blue text-white" : "bg-bg-input border-white/5 text-gray-500"
                  )}
                >
                  {f === 'all' ? 'todos' : f === 'morning' ? 'manhã' : f === 'afternoon' ? 'tarde' : 'noite'}
                </button>
              ))}
            </div>

            <div className="glass-card p-8 space-y-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...measurements].filter(m => chartFilter === 'all' || m.period === chartFilter).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.5} />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis domain={['auto', 'auto']} stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    />
                    <Line type="monotone" dataKey="systolic" stroke="#EF4444" strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="diastolic" stroke="#3B82F6" strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-8">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-red" /> Sistólica
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" /> Diastólica
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
               <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Histórico</h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Consulte todas as suas medições</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleShare} className="w-12 h-12 glass-card flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Share2 className="w-5 h-5"/></button>
                <button onClick={generatePDF} className="w-12 h-12 glass-card flex items-center justify-center text-brand-blue hover:text-white transition-colors"><FileText className="w-5 h-5"/></button>
              </div>
            </div>

            <div className="space-y-4">
              {(Object.entries(
                measurements.reduce<Record<string, Measurement[]>>((acc, m) => {
                  const monthName = m.timestamp.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                  if (!acc[capitalizedMonth]) acc[capitalizedMonth] = [];
                  acc[capitalizedMonth].push(m);
                  return acc;
                }, {})
              ) as [string, Measurement[]][]).map(([month, monthMeasurements]) => (
                <div key={month} className="space-y-3">
                  <button 
                    onClick={() => toggleMonth(month)}
                    className="w-full flex items-center justify-between p-6 glass-card hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                        <Folder className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold tracking-tight">{month}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{monthMeasurements.length} REGISTROS</p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-6 h-6 text-gray-600 transition-transform", expandedMonths[month] && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {(expandedMonths[month] ?? true) && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 ml-6 border-l border-white/5 pl-6">
                        {monthMeasurements.map((m) => (
                          <div key={m.id} className="glass-card p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                m.period === 'morning' ? "text-orange-500 bg-orange-500/10" :
                                m.period === 'afternoon' ? "text-brand-yellow bg-brand-yellow/10" :
                                "text-brand-blue bg-brand-blue/10"
                              )}>
                                {m.period === 'morning' ? <Sunrise className="w-5 h-5"/> : m.period === 'afternoon' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                              </div>
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-bold">{m.systolic}/{m.diastolic}</span>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase">mmHg</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter">
                                   <span className={getStatusColor(m.status)}>{m.status}</span>
                                   <span className="text-gray-700">•</span>
                                   <span className="text-gray-500">{m.timestamp.toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleDelete(m.id)} className="text-gray-600 hover:text-brand-red transition-colors"><Trash2 className="w-5 h-5"/></button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg-main/90 backdrop-blur-xl border-t border-white/5 px-8 pt-4 pb-8 z-[100]">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button onClick={() => setActiveTab('hoje')} className={cn("nav-item", activeTab === 'hoje' && "active")}>
            <Activity className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Hoje</span>
          </button>
          <button onClick={() => setActiveTab('grafico')} className={cn("nav-item", activeTab === 'grafico' && "active")}>
            <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18l6-6 4 4 8-8" /></svg>
            <span className="text-[10px] font-bold tracking-widest uppercase">Gráfico</span>
          </button>
          <button onClick={() => setActiveTab('logs')} className={cn("nav-item", activeTab === 'logs' && "active")}>
            <History className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Logs</span>
          </button>
        </div>
      </nav>

      {/* Inputs Ocultos */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      
      {/* Logout Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutConfirm(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative glass-card p-10 w-full max-w-sm text-center space-y-8">
              <div className="w-20 h-20 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto text-brand-red"><LogOut className="w-10 h-10" /></div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Deseja sair?</h3>
                <p className="text-gray-400">Suas medições estarão guardadas para quando você voltar.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowLogoutConfirm(false)} className="py-5 px-6 bg-white/5 rounded-3xl font-bold hover:bg-white/10 transition-colors">Cancelar</button>
                <button onClick={() => { logout(); setShowLogoutConfirm(false); }} className="py-5 px-6 bg-brand-red rounded-3xl font-bold hover:bg-red-600 transition-colors">Sair Agora</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Report Info Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 glass-morphism">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#121214] border border-white/10 rounded-[40px] p-8 shadow-2xl space-y-8"
          >
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/20 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-6 h-6 text-brand-blue" />
              </div>
              <h2 className="text-xl font-bold text-white">Dados do Relatório</h2>
              <p className="text-gray-500 text-sm">Preencha os dados que aparecerão no documento formal.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Paciente</label>
                <input 
                  type="text" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border-none rounded-2xl py-4 px-5 text-white placeholder:text-gray-700 focus:ring-1 focus:ring-brand-blue/50"
                  placeholder="Nome completo"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Idade</label>
                <input 
                  type="number" 
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full bg-[#1A1A1A] border-none rounded-2xl py-4 px-5 text-white placeholder:text-gray-700 focus:ring-1 focus:ring-brand-blue/50"
                  placeholder="Ex: 45"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Médico Responsável</label>
                <input 
                  type="text" 
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border-none rounded-2xl py-4 px-5 text-white placeholder:text-gray-700 focus:ring-1 focus:ring-brand-blue/50"
                  placeholder="Nome do médico"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Hospital / Clínica</label>
                <input 
                  type="text" 
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border-none rounded-2xl py-4 px-5 text-white placeholder:text-gray-700 focus:ring-1 focus:ring-brand-blue/50"
                  placeholder="Nome da instituição"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold text-sm hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={reportModalMode === 'pdf' ? generatePDF : handleShare}
                className="flex-[2] py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm shadow-lg shadow-brand-blue/20 hover:bg-blue-600 transition-all"
              >
                Confirmar e Gerar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function PeriodButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] border transition-all duration-300 aspect-square",
        active 
          ? "bg-brand-yellow/10 border-brand-yellow text-brand-yellow glow-yellow" 
          : "bg-bg-input border-white/5 text-gray-500 hover:bg-white/5 transition-colors"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "scale-110")}>{icon}</div>
      <span className="text-[10px] font-bold tracking-widest">{label}</span>
    </button>
  );
}
