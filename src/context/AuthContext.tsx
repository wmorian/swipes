// @/context/AuthContext.tsx
"use client";

import type { User } from '@/types'; // Standardized User type
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authService } from '@/services/authService';
import type { User as FirebaseUser } from 'firebase/auth'; // Keep FirebaseUser for service layer interactions

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedProfileData: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.onAuthUserChanged((appUser: User | null) => {
      setUser(appUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    setLoading(true);
    try {
      await authService.loginUser(email, pass);
      // Auth state change handled by onAuthUserChanged
    } catch (error) {
      setLoading(false); // Ensure loading is reset on error before re-throwing
      throw error;
    }
    // setLoading(false) will be handled by onAuthUserChanged
  };

  const signup = async (email: string, pass: string, name: string): Promise<void> => {
    setLoading(true);
    try {
      const firebaseUser = await authService.signupUser(email, pass, name);
      // Update local state immediately if needed, though onAuthUserChanged will also fire.
      // This provides a slightly faster UI update for name if signup is successful.
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: name,
        avatarUrl: firebaseUser.photoURL || undefined,
      });
    } catch (error) {
      setLoading(false);
      throw error;
    }
    // setLoading(false) handled by onAuthUserChanged
  };
  
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.logoutUser();
      // Auth state change handled by onAuthUserChanged
    } catch (error) {
      console.error("Error signing out: ", error);
      setLoading(false);
      throw error;
    }
  };

  const updateUser = async (updatedProfileData: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<void> => {
    const currentFirebaseUser = (await new Promise<FirebaseUser | null>((resolve) => {
        const unsubscribe = authService.onAuthUserChanged(user => {
            unsubscribe(); // Unsubscribe after getting the current user
            resolve(user ? ({ uid: user.id, email: user.email, displayName: user.name, photoURL: user.avatarUrl } as unknown as FirebaseUser) : null);
        });
    }));


    if (!currentFirebaseUser) { // Check against the actual current Firebase auth state
      throw new Error("No user currently signed in or auth state not yet available.");
    }
    setLoading(true);
    try {
      await authService.updateUserProfile(currentFirebaseUser, updatedProfileData);
      
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          name: updatedProfileData.name !== undefined ? updatedProfileData.name : prevUser.name,
          avatarUrl: updatedProfileData.avatarUrl !== undefined ? updatedProfileData.avatarUrl : prevUser.avatarUrl,
        };
      });
    } catch (error) {
      // Error already logged by service or calling component
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser, loading }}>
      {children}
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
