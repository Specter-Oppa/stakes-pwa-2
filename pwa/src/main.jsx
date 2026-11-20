import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = createRoot(document.getElementById('root'));

root.render(publishableKey
  ? <React.StrictMode><ClerkProvider publishableKey={publishableKey}><App /></ClerkProvider></React.StrictMode>
  : <main style={{ maxWidth: 520, margin: '15vh auto', padding: 24, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Stakes setup needed</h1>
      <p>Add your Clerk publishable key as <code>VITE_CLERK_PUBLISHABLE_KEY</code> to a local <code>.env</code> file, then restart the app.</p>
    </main>);

// Register the service worker in production builds only (it caches aggressively during dev).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
