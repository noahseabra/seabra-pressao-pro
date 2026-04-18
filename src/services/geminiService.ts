import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini on the client side
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  systolic: number;
  diastolic: number;
  pulse?: number;
  error?: string;
}

export async function analyzePressureImage(base64Image: string): Promise<AnalysisResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: "Analyze this image of a blood pressure monitor. Extract the Systolic (SYS), Diastolic (DIA), and Pulse (PUL/min) values. If you cannot read the values, return 0 for systolic and diastolic.",
            },
          ],
        },
      ],
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
    if (!text) throw new Error("No response from AI");
    
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
