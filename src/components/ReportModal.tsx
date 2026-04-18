import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Share2, Download, X, User as UserIcon, Calendar, Stethoscope, Building2, ChevronRight, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStatusColor } from '../lib/bloodPressureUtils';

interface Measurement {
  id: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  period: 'morning' | 'afternoon' | 'night';
  timestamp: Date;
  status: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurements: Measurement[];
  mode: 'pdf' | 'share';
}

export function ReportModal({ isOpen, onClose, measurements, mode }: ReportModalProps) {
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Seabra Pressão Pro", 15, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Relatório Individual de Monitoramento", 15, 32);
      
      // Patient Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Informações do Paciente", 15, 55);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nome: ${patientName || 'Não informado'}`, 15, 65);
      doc.text(`Idade: ${patientAge || 'Não informada'}`, 15, 72);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 15, 79);

      if (doctorName || hospitalName) {
        doc.text(`Médico(a): ${doctorName || '-'}`, 110, 65);
        doc.text(`Instituição: ${hospitalName || '-'}`, 110, 72);
      }
      
      doc.line(15, 85, 195, 85);

      // Table
      const tableData = measurements
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map(m => [
          m.timestamp.toLocaleDateString('pt-BR'),
          m.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          `${m.systolic}/${m.diastolic}`,
          m.pulse || '-',
          m.status
        ]);

      autoTable(doc, {
        startY: 95,
        head: [['Data', 'Hora', 'P.A. (mmHg)', 'Pulso', 'Estado']],
        body: tableData,
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      if (mode === 'pdf') {
        doc.save(`relatorio_pressao_${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const pdfBase64 = doc.output('datauristring');
        if (navigator.share) {
          const blob = await (await fetch(pdfBase64)).blob();
          const file = new File([blob], 'relatorio_pressao.pdf', { type: 'application/pdf' });
          await navigator.share({
            files: [file],
            title: 'Relatório de Pressão Arterial',
            text: `Confira meu histórico de pressão arterial gerado pelo Seabra Pressão Pro.`
          });
        } else {
          window.open(pdfBase64);
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Gerar Relatório</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Paciente</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="Nome Completo"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Idade</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="Ex: 45"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Informações Complementares (Opcional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Médico Responsável</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Dr. Silva"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Clínica/Hospital</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Hospital Unimed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'pdf' ? <Download size={20} /> : <Share2 size={20} />}
                      {mode === 'pdf' ? 'BAIXAR RELATÓRIO PDF' : 'COMPARTILHAR NO WHATSAPP'}
                    </>
                  )}
                </button>
                <p className="text-center text-zinc-600 text-[9px] font-bold mt-4 uppercase tracking-[0.15em]">Este documento é apenas informativo e não substitui avaliação médica.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
