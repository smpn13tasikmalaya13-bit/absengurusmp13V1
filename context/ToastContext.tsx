import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Toast as ToastType } from '../types';
import ToastComponent from '../components/ui/Toast';

interface ToastContextValue {
  toasts: ToastType[];
  addToast: (message: string, type: ToastType['type']) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = useCallback((message: string, type: ToastType['type']) => {
    const id = Date.now() + Math.random();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.addToast;
};

export const ToastContainer = () => {
    const context = useContext(ToastContext);
    if (!context) return null;
    const { toasts, removeToast } = context;

    return (
        <div className="fixed top-5 right-5 z-[100] w-full max-w-sm space-y-3">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}
