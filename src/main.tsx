/**
 * Application Entry Point
 *
 * Initializes React 18 with createRoot and i18n configuration.
 * This is the main entry point for the Google Authenticator QR Export Tool.
 *
 * Key responsibilities:
 * - Initialize i18next internationalization (must be imported before App)
 * - Create React 18 root with createRoot API
 * - Render App with StrictMode and Suspense for i18n loading
 */

import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

// Import global styles with Tailwind CSS v4 and shadcn/ui CSS variables
// This must be imported before any components to ensure styles are available
import './index.css';

// Import i18n configuration BEFORE App component
// This ensures translations are initialized when components mount
import './i18n';

// Import main App component
import App from './App';

// Import ThemeProvider for light/dark mode support
import { ThemeProvider } from './context/ThemeContext';

/**
 * Loading fallback component for Suspense
 * Displayed while i18n translations are being loaded
 */
function LoadingFallback(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily:
          '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: 'hsl(225 20% 6%)',
        color: 'hsl(210 20% 95%)',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid hsl(225 15% 20%)',
          borderTopColor: 'hsl(160 84% 39%)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
        aria-hidden="true"
      />
      <p style={{ marginTop: '16px', fontSize: '16px' }}>Loading...</p>
      {/* Inject keyframes for spinner animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

// Get the root DOM element
const rootElement = document.getElementById('root');

// Ensure root element exists
if (!rootElement) {
  throw new Error(
    'Root element not found. Ensure there is a <div id="root"></div> in index.html'
  );
}

// Create React 18 root and render application
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ThemeProvider>
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    </ThemeProvider>
  </StrictMode>
);
