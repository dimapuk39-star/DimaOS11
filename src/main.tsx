import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import './explorer.css';
import './system-apps.css';
import './browser-player.css';
import './windows-suite.css';
import './desktop-experience.css';
import './final-polish.css';
import './photos-app.css';
import './settings-center.css';
import './dima-suite.css';
import './dima-connect.css';
import './shell-experience.css';
import './system-screens.css';
import './terminal-app.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
