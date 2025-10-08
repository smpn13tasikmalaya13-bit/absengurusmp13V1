
import React, { ReactNode, ErrorInfo } from 'react';

// FIX: Removed the ApiConfigurationGuide component and related logic for detecting
// configuration errors. UI for managing API keys is against the guidelines.
// The application should rely on environment variables for configuration.

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Initialize state in the constructor to resolve property access errors.
  public readonly state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-gray-300 p-4">
            <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-lg shadow-2xl border border-yellow-500/50">
                <h1 className="text-3xl font-bold text-yellow-400 mb-4">Terjadi Kesalahan</h1>
                <p className="text-gray-400">Aplikasi mengalami error yang tidak terduga. Silakan coba muat ulang halaman.</p>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;