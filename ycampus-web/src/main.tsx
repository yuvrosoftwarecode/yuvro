import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress known Recharts ResponsiveContainer warning (recharts v2.x issue).
// The warning fires even when ResponsiveContainer is needed for width responsiveness,
// because the measured height resolves to a fixed pixel value from the parent CSS.
const _origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('maybe you don\'t need to use a ResponsiveContainer')) {
    return;
  }
  _origWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
