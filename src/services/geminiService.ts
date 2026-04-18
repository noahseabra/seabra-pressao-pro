import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini lazily
let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key do Gemini não encontrada.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface AnalysisResult {
  systolic: number;
  diastolic: number;
  pulse?: number;
  error?: string;
}

export async function analyzePressureImage(base64Image: string): Promise<AnalysisResult> {
  try {
    const genAI = getAI();
    
    // In @google/genai v1, use ai.models.generateContent
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Analyze this image of a blood pressure monitor. Extract the Systolic (SYS), Diastolic (DIA), and Pulse (PUL/min) values. If you cannot read the values, return 0 for systolic and diastolic. Return ONLY JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            systolic: { type: Type.NUMBER },
            diastolic: { type: Type.NUMBER },
            pulse: { type: Type.NUMBER, nullable: true },
          },
          required: ["systolic", "diastolic"],
        },
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta da IA");

    const result = JSON.parse(text.trim());
    
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
