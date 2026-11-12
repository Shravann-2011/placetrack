import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { warmUp } from './lib/wake';
import { API_BASE } from './lib/api';

// Start waking the API (Render free tier) the moment the site opens
warmUp(API_BASE);
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
