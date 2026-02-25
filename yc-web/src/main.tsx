import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

import { GoogleOAuthProvider } from '@react-oauth/google';

// Use a placeholder if no client ID is provided (will be hidden in UI)
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
