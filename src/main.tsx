import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import './desktop-experience.css';
import './final-polish.css';
import './shell-experience.css';
import './system-screens.css';
import './performance-mode.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
      console.warn('DimaOS application cache is unavailable', error);
    });
  });
}
