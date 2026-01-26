import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🔥 Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          color: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '18px' }}>
            🔥 3D Engine Crashed
          </h2>
          <pre style={{
            fontSize: '11px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '12px',
            borderRadius: '6px',
            maxWidth: '100%',
            overflow: 'auto',
            fontFamily: 'monospace',
          }}>
            {this.state.error?.message}
          </pre>
          <button 
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            🔄 Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
