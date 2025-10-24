/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 */

import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Create root element if it doesn't exist
let container = document.getElementById('root');
if (!container) {
  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
