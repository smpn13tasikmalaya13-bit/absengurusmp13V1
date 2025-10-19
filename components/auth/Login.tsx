import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Role } from '../../types';
import { register } from '../../services/authService';
import Logo from '../ui/Logo';

// ========== PWA Install Prompt Component ==========
const PwaInstallPrompt: React.FC = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<Event | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed and update the state.
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsAppInstalled(true);
        return; // Don't set up listeners if already installed.
    }

    // Handler for the browser's install prompt event
    const beforeInstallPromptHandler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(e);
    };

    // Handler for when the app is successfully installed
    const appInstalledHandler = () => {
      // Clear the deferred prompt, it can't be used again.
      setInstallPromptEvent(null);
      setIsAppInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    window.addEventListener('appinstalled', appInstalledHandler);

    // Cleanup: remove the event listeners when the component unmounts
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    
    // Show the install prompt
    (installPromptEvent as any).prompt();
    
    // Wait for the user to respond to the prompt.
    await (installPromptEvent as any).userChoice;
    
    // We've used the prompt, and can't use it again, clear it.
    setInstallPromptEvent(null);
  };
  
  // If the app is installed, don't render the component.
  if (isAppInstalled) {
    return null;
  }

  const isInstallable = !!installPromptEvent;

  return (
    <div className="mt-8 p-6 bg-slate-800/50 rounded-lg text-center border border-slate-700">
      <h3 className="font-bold text-white">Instal Aplikasi untuk Pengalaman Terbaik</h3>
      <p className="text-sm text-slate-400 mt-2">Akses lebih cepat dan fitur offline dengan menambahkan aplikasi ini ke layar utama (home screen) Anda.</p>
      <Button
        onClick={handleInstallClick}
        disabled={!isInstallable}
        className={`mt-4 w-full transition-colors ${!isInstallable ? '!bg-slate-600 !cursor-not-allowed' : '!bg-green-600 hover:!bg-green-500 focus:!ring-green-500'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        {isInstallable ? 'Instal Aplikasi' : 'Instalasi Belum Siap'}
      </Button>
    </div>
  );
};

// ========== Common Header and Footer for Auth Pages ==========
const AuthHeader: React.FC = () => (
  <header className="text-center mb-8 flex flex-col items-center">
    <Logo className="h-20 w-auto" />
    <p className="text-slate-400 mt-4 text-base">Sistem Absensi Guru Digital</p>
  </header>
);

const AuthFooter: React.FC = () => (
  <footer className="text-center text-slate-500 text-sm mt-8">
    © 2025 Rullp. All rights reserved.
  </footer>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full px-4 py-3 bg-slate-900 text-white border-2 border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
  />
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full px-4 py-3 bg-slate-900 text-white border-2 border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
  />
);


// ========== LOGIN VIEW ==========
const LoginView: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('admin@hadirku.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-center text-3xl font-bold text-white mb-6">Login</h2>
        
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-400">Email</label>
          <FormInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="password"className="text-sm font-medium text-slate-400">Password</label>
            <a href="#" className="text-sm text-indigo-400 hover:underline">Lupa Password?</a>
          </div>
          <FormInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        
        {error && <p className="text-sm text-red-400 text-center bg-red-500/10 py-2 px-4 rounded-md border border-red-500/30">{error}</p>}

        <Button type="submit" isLoading={isLoading}>
          Login
        </Button>
      </form>
      
      <PwaInstallPrompt />

      <p className="text-center text-sm text-slate-400 mt-6">
        Belum punya akun?{' '}
        <button onClick={onSwitchToRegister} className="font-semibold text-indigo-400 hover:underline">
          Daftar
        </button>
      </p>
    </main>
  );
};

// ========== REGISTER VIEW ==========
const RegisterView: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.Teacher);
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name) {
      setError('Nama Lengkap is required.');
      return;
    }
    setIsLoading(true);
    try {
      await register(name, email, password, role, adminKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-center text-3xl font-bold text-white mb-6">Daftar Akun Baru</h2>
        
        <div>
          <label htmlFor="name" className="text-sm font-medium text-slate-400 block mb-1">Nama Lengkap</label>
          <FormInput id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="email-register" className="text-sm font-medium text-slate-400 block mb-1">Email</label>
          <FormInput id="email-register" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        
        <div>
          <label htmlFor="password-register" className="text-sm font-medium text-slate-400 block mb-1">Password</label>
          <FormInput id="password-register" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="role" className="text-sm font-medium text-slate-400 block mb-1">Daftar sebagai</label>
          <FormSelect id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} required>
            <option value={Role.Teacher}>Guru</option>
            <option value={Role.Coach}>Pembina Ekstrakurikuler</option>
            <option value={Role.AdministrativeStaff}>Tenaga Administrasi</option>
            <option value={Role.Admin}>Admin</option>
          </FormSelect>
        </div>
        
        {role === Role.Admin && (
            <div>
                <label htmlFor="adminKey" className="text-sm font-medium text-slate-400 block mb-1">Kode Pendaftaran Admin</label>
                <FormInput id="adminKey" type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} required placeholder="Masukkan kode rahasia"/>
            </div>
        )}
        
        {error && <p className="text-sm text-red-400 text-center bg-red-500/10 py-2 px-4 rounded-md border border-red-500/30">{error}</p>}

        <div className="pt-2">
            <Button type="submit" isLoading={isLoading}>
            Daftar
            </Button>
        </div>
      </form>
      
      <p className="text-center text-sm text-slate-400 mt-6">
        Sudah punya akun?{' '}
        <button onClick={onSwitchToLogin} className="font-semibold text-indigo-400 hover:underline">
          Login
        </button>
      </p>
    </main>
  );
};


// ========== Main Auth Component ==========
const AuthComponent: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-300 p-4">
      <div className="w-full max-w-md p-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-2xl shadow-indigo-500/10 rounded-2xl">
        <AuthHeader />
        {isLoginView 
          ? <LoginView onSwitchToRegister={() => setIsLoginView(false)} /> 
          : <RegisterView onSwitchToLogin={() => setIsLoginView(true)} />
        }
        <AuthFooter />
      </div>
    </div>
  );
};

export default AuthComponent;