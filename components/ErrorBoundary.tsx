import React, { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: { message: string } | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: The original code used a class field for state initialization.
  // This is refactored to a constructor to ensure wider compatibility with
  // various TypeScript configurations and linters, which might have caused
  // the incorrect error about `this.props` not being accessible.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

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
            <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-lg shadow-2xl border border-red-500/50">
                <h1 className="text-3xl font-bold text-red-400 mb-4">Terjadi Kesalahan Aplikasi</h1>
                <p className="text-gray-400 mb-6">Maaf, aplikasi mengalami masalah yang tidak terduga. Silakan coba muat ulang halaman atau hubungi administrator jika masalah berlanjut.</p>
                
                <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-400">Detail Teknis (untuk developer):</h2>
                    <pre className="mt-2 text-xs text-red-300 whitespace-pre-wrap font-mono">
                        {this.state.error?.message || 'Tidak ada detail error.'}
                    </pre>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
