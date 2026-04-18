import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini safely
let genAI: GoogleGenAI | null = null;
const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return null;
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

// API routes
app.post('/api/analyze', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

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
                data: image,
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
    res.json(result);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).send('URL is required');
  }
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    let buffer: Buffer;
    let contentType: string;

    if (!response.ok) {
      const fallbackRes = await fetch('https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&q=80&w=512&h=512');
      const arrayBuffer = await fallbackRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = fallbackRes.headers.get('content-type') || 'image/jpeg';
    } else {
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get('content-type') || 'image/png';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    console.error('Proxy error:', error);
    res.redirect('https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&q=80&w=512&h=512');
  }
});

// Outras rotas da API podem ser adicionadas aqui
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Seabra Pro API' });
});

export default app;
