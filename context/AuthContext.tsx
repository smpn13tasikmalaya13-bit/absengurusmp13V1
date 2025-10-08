import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile } from '../services/authService';


interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  login: (email: string, pass: string) => Promise<FirebaseUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get their profile from Firestore.
        const userProfile = await getUserProfile(firebaseUser.uid);
        if (userProfile) {
          setUser(userProfile);
        } else {
           // This case can happen if user exists in Auth but not in Firestore.
           // For robustness, you might want to create a profile here or log them out.
           setUser(null);
        }
      } else {
        // User is signed out.
        setUser(null);
      }
      setIsAuthLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);


  const login = async (email: string, pass: string) => {
    // The service now throws on error, which will be caught by the component.
    // The onAuthStateChanged listener will handle setting the user state on success.
    return authService.login(email, pass);
  };

  const logout = async () => {
    await authService.logout();
    // The onAuthStateChanged listener will handle setting user to null.
  };

  return (
    <AuthContext.Provider value={{ user, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};