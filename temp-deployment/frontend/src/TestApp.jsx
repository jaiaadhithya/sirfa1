// Simple test component to check if React is working
import React from 'react';

function TestApp() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1e293b',
      color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: '8px',
        border: '1px solid rgba(71, 85, 105, 0.3)'
      }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '2rem' }}>✅ React is Working!</h1>
        <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>SIRFA Agent Finance - Test Mode</p>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>If you can see this, React is mounting correctly.</p>
      </div>
    </div>
  );
}

export default TestApp;