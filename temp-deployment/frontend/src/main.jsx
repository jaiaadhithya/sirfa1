// SIRFA Agent Finance - Main Entry Point
// React application entry point with WebSocket integration

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Error boundary component for better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('React Error Boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                The SIRFA Agent Finance application encountered an unexpected error.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left bg-gray-50 rounded p-4 mb-4">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details (Development Mode)
                  </summary>
                  <div className="text-sm text-red-600 font-mono">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.toString()}
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React application
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser behavior
  event.preventDefault();
  
  // You could send this to a logging service in production
  if (import.meta.env.PROD) {
    // Example: sendErrorToLoggingService(event.reason);
  }
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  console.error('Global JavaScript error:', event.error);
  
  // You could send this to a logging service in production
  if (import.meta.env.PROD) {
    // Example: sendErrorToLoggingService(event.error);
  }
});

// WebSocket connection monitoring
if (import.meta.env.DEV) {
  // Development mode: log WebSocket events
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = new originalWebSocket(url, protocols);
    
    ws.addEventListener('open', () => {
      console.log('WebSocket connected:', url);
    });
    
    ws.addEventListener('close', (event) => {
      console.log('WebSocket disconnected:', url, 'Code:', event.code, 'Reason:', event.reason);
    });
    
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', url, error);
    });
    
    return ws;
  };
}

// Performance monitoring
if (import.meta.env.PROD && 'performance' in window) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log('Page load performance:', {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          totalTime: perfData.loadEventEnd - perfData.fetchStart
        });
      }
    }, 0);
  });
}