// @/context/AuthContext.tsx
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>; // Simulate async login
  signup: (email: string, pass: string, name: string) => Promise<void>; // Simulate async signup
  logout: () => void;
  updateUser: (updatedUser: User) => Promise<void>; // Simulate async update
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // For initial load check

  useEffect(() => {
    // Simulate checking for an existing session
    const storedUser = localStorage.getItem('cardSurveyUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);


  const login = async (email: string, _: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // This is a mock login. In a real app, verify credentials.
    if (email === "user@example.com") { // Mock successful login
      const mockUser: User = { id: '1', email, name: 'Test User', avatarUrl: '' };
      setUser(mockUser);
      localStorage.setItem('cardSurveyUser', JSON.stringify(mockUser));
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const signup = async (email: string, _:string, name: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
     // Simulate new user creation
     const newUser: User = { id: Date.now().toString(), email, name, avatarUrl: ''};
     setUser(newUser);
     localStorage.setItem('cardSurveyUser', JSON.stringify(newUser));
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('cardSurveyUser');
  };

  const updateUser = async (updatedUserData: User): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (user && user.id === updatedUserData.id) {
      setUser(updatedUserData);
      localStorage.setItem('cardSurveyUser', JSON.stringify(updatedUserData));
    } else {
      throw new Error("User not found or mismatch.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
