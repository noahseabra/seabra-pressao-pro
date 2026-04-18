import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: '10mb' }));

// API routes
// Gemini analysis removed here and moved to frontend for better API key compliance.

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
