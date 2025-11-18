/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 */

import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';

// Create root element if it doesn't exist
let container = document.getElementById('root');
if (!container) {
  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
}

const root = createRoot(container);
root.render(<App />);

// Remove splash screen after React has rendered
document.getElementById('splash')?.remove();
