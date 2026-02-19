import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { tokens } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: tokens.colors.bg,
          color: tokens.colors.textPrimary,
          fontFamily: tokens.fonts.body,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ color: tokens.colors.textMuted, marginBottom: 24, maxWidth: 500 }}>
          {this.state.error.message}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            background: tokens.colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.radii.sm,
            padding: '10px 24px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
