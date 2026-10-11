import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dressflow ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #fff1f2, #fdf2f8)',
          color: '#1f2937'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Oups ! Un imprévu est survenu
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', maxWidth: '320px', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {this.state.error?.message || "L'application a rencontré une erreur d'affichage inattendue."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '16px',
              background: 'var(--primary, #be185d)',
              color: 'white',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <RefreshCw size={16} /> Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
