import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Role } from '../../types';
import { register } from '../../services/authService';

// ========== Common Header and Footer for Auth Pages ==========
const AuthHeader: React.FC = () => (
  <header className="text-center mb-8">
    <h1 className="text-5xl font-bold text-blue-500">HadirKu</h1>
    <p className="text-gray-400 mt-2">Sistem Absensi Guru Digital</p>
  </header>
);

const AuthFooter: React.FC = () => (
  <footer className="absolute bottom-4 text-center text-gray-500 text-sm">
    © 2025 Rullp. All rights reserved.
  </footer>
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
      // On successful login, the AuthContext's onAuthStateChanged will handle navigation.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-center text-2xl font-bold text-white mb-6">Login</h2>
        
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-400">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="password"className="text-sm font-medium text-gray-400">Password</label>
            <a href="#" className="text-sm text-blue-500 hover:underline">Lupa Password?</a>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <Button type="submit" isLoading={isLoading} className="w-full !bg-blue-600 hover:!bg-blue-700">
          Login
        </Button>
      </form>
      
      <p className="text-center text-sm text-gray-400 mt-6">
        Belum punya akun?{' '}
        <button onClick={onSwitchToRegister} className="font-medium text-blue-500 hover:underline">
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
      // On successful registration, the AuthContext's onAuthStateChanged will log the user in.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-center text-2xl font-bold text-white mb-6">Daftar Akun Baru</h2>
        
        <div>
          <label htmlFor="name" className="text-sm font-medium text-gray-400 block mb-1">Nama Lengkap</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label htmlFor="email-register" className="text-sm font-medium text-gray-400 block mb-1">Email</label>
          <input id="email-register" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        <div>
          <label htmlFor="password-register" className="text-sm font-medium text-gray-400 block mb-1">Password</label>
          <input id="password-register" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label htmlFor="role" className="text-sm font-medium text-gray-400 block mb-1">Daftar sebagai</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} required className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value={Role.Teacher}>Guru</option>
            <option value={Role.Coach}>Pembina Ekstrakurikuler</option>
            <option value={Role.Admin}>Admin</option>
          </select>
        </div>
        
        {role === Role.Admin && (
            <div>
                <label htmlFor="adminKey" className="text-sm font-medium text-gray-400 block mb-1">Kode Pendaftaran Admin</label>
                <input 
                    id="adminKey" 
                    type="password" 
                    value={adminKey} 
                    onChange={(e) => setAdminKey(e.target.value)} 
                    required 
                    placeholder="Masukkan kode rahasia"
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
        )}
        
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <div className="pt-2">
            <Button type="submit" isLoading={isLoading} className="w-full !bg-blue-600 hover:!bg-blue-700">
            Daftar
            </Button>
        </div>
      </form>
      
      <p className="text-center text-sm text-gray-400 mt-6">
        Sudah punya akun?{' '}
        <button onClick={onSwitchToLogin} className="font-medium text-blue-500 hover:underline">
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-800 text-gray-300 p-4">
      <div className="w-full max-w-sm">
        <AuthHeader />
        {isLoginView 
          ? <LoginView onSwitchToRegister={() => setIsLoginView(false)} /> 
          : <RegisterView onSwitchToLogin={() => setIsLoginView(true)} />
        }
      </div>
      <AuthFooter />
    </div>
  );
};

export default AuthComponent;