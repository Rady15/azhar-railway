import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './services/firebase';
import { initializeWhatsAppService } from './services/whatsappService';

// Optional: configures the WhatsApp notification layer from env vars.
// When unconfigured, maintenance/complaint creation is unaffected.
initializeWhatsAppService();

// Firebase Cloud Messaging needs this service worker, and it only works when
// the Firebase keys are actually configured. Registering it unconditionally
// threw "encountered an error during installation" on every deploy without
// Firebase keys, so only try when they are present.
const firebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID,
);

if (firebaseConfigured && 'serviceWorker' in navigator) {
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
