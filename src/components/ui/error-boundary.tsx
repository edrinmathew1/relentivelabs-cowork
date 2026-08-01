'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Client ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-[#141414] border border-[#7A0000] rounded-xl shadow-2xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-[#E10600] mx-auto" />
          <h2 className="text-base font-bold text-white">Something went wrong</h2>
          <p className="text-xs text-[#A3A3A3]">
            {this.state.error?.message || 'A client-side error occurred. Please refresh or check your Supabase environment variables.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" /> Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
