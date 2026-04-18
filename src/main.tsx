import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with error handling
try {
  registerSW({ 
    immediate: true,
    onRegisterError(error) {
      console.error('SW Registration error', error);
    }
  });
} catch (e) {
  console.warn('PWA initialization skipped:', e);
}

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (err) {
    console.error('Fatal React Error:', err);
    rootElement.innerHTML = `
      <div style="background-color: #000; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ef4444; font-family: sans-serif; padding: 20px; text-align: center;">
        <h1 style="font-size: 16px;">Erro Crítico de Sistema</h1>
        <p style="color: #666; font-size: 12px;">${err instanceof Error ? err.message : String(err)}</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; background: #3B82F6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold;">Recarregar</button>
      </div>
    `;
  }
}
