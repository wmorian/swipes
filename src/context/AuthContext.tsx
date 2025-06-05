// @/context/AuthContext.tsx
"use client";

import type { User as AppUser } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import initialized auth from firebase.ts

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedProfileData: Partial<Pick<AppUser, 'name' | 'avatarUrl'>>) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const appUser: AppUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "", // Firebase email can be null
          name: firebaseUser.displayName || undefined,
          avatarUrl: firebaseUser.photoURL || undefined,
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Auth state change will be handled by onAuthStateChanged
    } catch (error) {
      setLoading(false);
      throw error; // Re-throw error to be caught by UI
    }
    // setLoading(false) will be handled by onAuthStateChanged listener
  };

  const signup = async (email: string, pass: string, name: string): Promise<void> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name,
        });
        // Refresh user state or let onAuthStateChanged handle it
        // For immediate UI update reflecting name:
        setUser(prevUser => prevUser ? {...prevUser, name} : {
            id: userCredential.user.uid,
            email: userCredential.user.email || "",
            name: name,
            avatarUrl: undefined
        });
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
    // setLoading(false) will be handled by onAuthStateChanged listener
  };
  
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // Auth state change will set user to null via onAuthStateChanged
    } catch (error) {
      console.error("Error signing out: ", error);
      // Even if sign out fails, we might want to clear local state or show error
      setLoading(false); // Ensure loading is reset if error
      throw error;
    }
  };

  const updateUser = async (updatedProfileData: Partial<Pick<AppUser, 'name' | 'avatarUrl'>>): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error("No user currently signed in.");
    }
    setLoading(true);
    try {
      const profileUpdates: { displayName?: string; photoURL?: string } = {};
      if (updatedProfileData.name !== undefined) {
        profileUpdates.displayName = updatedProfileData.name;
      }
      if (updatedProfileData.avatarUrl !== undefined) {
        profileUpdates.photoURL = updatedProfileData.avatarUrl;
      }
      
      await updateProfile(auth.currentUser, profileUpdates);
      
      // Update local user state to reflect changes immediately
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          name: updatedProfileData.name !== undefined ? updatedProfileData.name : prevUser.name,
          avatarUrl: updatedProfileData.avatarUrl !== undefined ? updatedProfileData.avatarUrl : prevUser.avatarUrl,
        };
      });
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false); // Ensure loading is reset
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
