import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

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
      <div className="flex flex-col items-center justify-center h-screen bg-neon-bg text-neon-text p-10 text-center">
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-neon-text-muted mb-6 max-w-[500px] text-sm">
          {this.state.error.message}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="rounded-md bg-neon-green/10 border border-neon-green/15
                     px-6 py-2.5 text-sm font-medium text-neon-green
                     hover:bg-neon-green/15 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
