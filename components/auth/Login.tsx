import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Role } from '../../types';
import { register } from '../../services/authService';
import Logo from '../ui/Logo';

// ========== Common Header and Footer for Auth Pages ==========
const AuthHeader: React.FC = () => (
  <header className="text-center mb-8 flex flex-col items-center">
    <Logo className="h-12 w-auto" />
    <p className="text-slate-400 text-sm mt-2">Sistem Absensi Guru Digital</p>
  </header>
);

const AuthFooter: React.FC = () => (
  <footer className="text-center text-slate-500 text-sm mt-6">
    © Rullp 2025 HadirKu. All rights reserved.
  </footer>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full px-4 py-3 bg-slate-800/50 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
  />
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full px-4 py-3 bg-slate-800/50 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
  />
);


// ========== LOGIN VIEW ==========
const LoginView: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        <h2 className="text-center text-3xl font-bold text-white mb-8">Login</h2>
        
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-400">Email</label>
          <FormInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="password"className="text-sm font-medium text-slate-400">Password</label>
            <a href="#" className="text-sm text-emerald-400 hover:underline">Lupa Password?</a>
          </div>
          <FormInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        
        {error && (
          <p className="text-sm text-red-400 text-center bg-red-500/10 py-2 px-4 rounded-md border border-red-500/30">{error}</p>
        )}

        <Button type="submit" isLoading={isLoading} className="w-full !py-3">
          Login
        </Button>
      </form>
      
      <p className="text-center text-sm text-slate-400 mt-6">
        Belum punya akun?{' '}
        <button onClick={onSwitchToRegister} className="font-semibold text-emerald-400 hover:underline">
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
        <h2 className="text-center text-3xl font-bold text-white mb-8">Daftar Akun Baru</h2>
        
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
            <Button type="submit" isLoading={isLoading} className="w-full !py-3">
            Daftar
            </Button>
        </div>
      </form>
      
      <p className="text-center text-sm text-slate-400 mt-6">
        Sudah punya akun?{' '}
        <button onClick={onSwitchToLogin} className="font-semibold text-emerald-400 hover:underline">
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
      <div className="w-full max-w-md">
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
