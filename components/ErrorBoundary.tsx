import React, { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: { message: string } | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Initializing state as a class property to resolve errors where
  // TypeScript was not recognizing `this.state` and `this.props` on the component instance.
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: { message: error.message } };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-gray-300 p-4">
            <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-lg shadow-2xl border border-yellow-500/50">
                <h1 className="text-3xl font-bold text-yellow-400 mb-4">Terjadi Kesalahan</h1>
                <p className="text-gray-400">Maaf, aplikasi mengalami masalah yang tidak terduga. Silakan coba muat ulang halaman atau hubungi administrator jika masalah berlanjut.</p>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;