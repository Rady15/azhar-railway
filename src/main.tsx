import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './services/firebase';
import { initializeWhatsAppService } from './services/whatsappService';

// Optional: configures the WhatsApp notification layer from env vars.
// When unconfigured, maintenance/complaint creation is unaffected.
initializeWhatsAppService();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
      console.log('SW registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
