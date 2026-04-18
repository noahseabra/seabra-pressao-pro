export type BloodPressureStatus = 'Normal' | 'Elevada' | 'Hipertensão Estágio 1' | 'Hipertensão Estágio 2' | 'Crise Hipertensiva';

export const getStatus = (sys: number, dia: number): BloodPressureStatus => {
  if (sys >= 180 || dia >= 120) return 'Crise Hipertensiva';
  if (sys >= 140 || dia >= 90) return 'Hipertensão Estágio 2';
  if (sys >= 130 || dia >= 80) return 'Hipertensão Estágio 1';
  if (sys >= 120 && dia < 80) return 'Elevada';
  return 'Normal';
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Normal': return 'text-brand-green';
    case 'Elevada': return 'text-brand-yellow';
    case 'Hipertensão Estágio 1': return 'text-orange-500';
    case 'Hipertensão Estágio 2': return 'text-brand-red';
    case 'Crise Hipertensiva': return 'text-red-700 font-bold';
    default: return 'text-gray-400';
  }
};

export type Period = 'morning' | 'afternoon' | 'night';

export const getAutoPeriod = (): Period => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
};
