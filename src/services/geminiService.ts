export interface AnalysisResult {
  systolic: number;
  diastolic: number;
  pulse?: number;
  error?: string;
}

export async function analyzePressureImage(base64Image: string): Promise<AnalysisResult> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze image');
    }

    const result = await response.json();
    
    if (result.systolic === 0 && result.diastolic === 0) {
      return { systolic: 0, diastolic: 0, error: "Não foi possível ler os valores. Tente uma foto mais clara." };
    }
    
    return result;
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return { 
      systolic: 0, 
      diastolic: 0, 
      error: error.message || "Falha na leitura da imagem. Verifique a iluminação e tente novamente." 
    };
  }
}
