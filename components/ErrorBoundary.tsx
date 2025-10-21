import React, { ReactNode, ErrorInfo } from 'react';

const ApiConfigurationGuide = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-gray-300 p-4 font-sans">
            <div className="w-full max-w-3xl bg-slate-800 p-8 rounded-lg shadow-2xl border border-red-500/50">
                <h1 className="text-3xl font-bold text-red-400 mb-4">Kesalahan Konfigurasi Firebase</h1>
                <p className="text-lg text-gray-400 mb-6">
                    Aplikasi gagal terhubung ke Firebase karena kunci API (API Key) tidak valid. Ini biasanya terjadi karena konfigurasi Firebase belum diisi.
                </p>

                <h2 className="text-2xl font-semibold text-white mb-3">Langkah-langkah Perbaikan:</h2>
                <ol className="list-decimal list-inside space-y-4 text-gray-300">
                    <li>
                        Buka proyek Anda di <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">Firebase Console</a>.
                    </li>
                    <li>
                        Klik ikon gerigi (⚙️) di pojok kiri atas, lalu pilih <strong>Project settings</strong>.
                    </li>
                    <li>
                        Di tab <strong>General</strong>, gulir ke bawah ke bagian "Your apps" dan temukan objek `firebaseConfig` untuk aplikasi web Anda.
                    </li>
                    <li>
                        Salin seluruh objek `firebaseConfig` tersebut.
                    </li>
                    <li>
                        Buka file <code className="bg-slate-900 text-amber-400 font-mono text-sm px-2 py-1 rounded">firebase.ts</code> di editor kode Anda.
                    </li>
                    <li>
                        Tempel (paste) objek yang Anda salin untuk menggantikan placeholder yang ada.
                    </li>
                </ol>

                <div className="mt-8 bg-slate-900 p-4 rounded-md">
                    <p className="text-sm text-gray-500 mb-2 font-mono">Contoh isi file `firebase.ts` setelah diisi:</p>
                    <pre className="text-sm text-gray-300 overflow-x-auto"><code>
{`const firebaseConfig = {
  apiKey: "AIzaSyB..._KUNCI_ASLI_ANDA_...",
  authDomain: "nama-proyek-anda.firebaseapp.com",
  projectId: "nama-proyek-anda",
  storageBucket: "nama-proyek-anda.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:a1b2c3d4e5f6g7h8"
};`}
                    </code></pre>
                </div>

                <p className="mt-6 text-gray-400">
                    Setelah menyimpan perubahan pada file <code className="bg-slate-900 text-amber-400 font-mono text-sm px-2 py-1 rounded">firebase.ts</code>, muat ulang (refresh) halaman aplikasi ini.
                </p>
            </div>
        </div>
    );
};


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Re-introduced the constructor to correctly initialize state and props context. The class property initialization was causing a type error where `this.props` was not recognized.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
        const isConfigError = this.state.error?.message.includes('api-key-not-valid');
        
        if (isConfigError) {
            return <ApiConfigurationGuide />;
        }

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
