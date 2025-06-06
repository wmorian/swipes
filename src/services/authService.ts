// @/services/authService.ts
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from '@/types';

export const authService = {
  onAuthUserChanged: (callback: (user: User | null) => void): (() => void) => {
    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const appUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || undefined,
          avatarUrl: firebaseUser.photoURL || undefined,
        };
        callback(appUser);
      } else {
        callback(null);
      }
    });
  },

  loginUser: async (email: string, pass: string): Promise<FirebaseUser> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  },

  signupUser: async (email: string, pass: string, name: string): Promise<FirebaseUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: name,
      });
    }
    return userCredential.user;
  },

  logoutUser: async (): Promise<void> => {
    await firebaseSignOut(auth);
  },

  updateUserProfile: async (
    firebaseUser: FirebaseUser,
    profileData: Partial<Pick<User, 'name' | 'avatarUrl'>>
  ): Promise<void> => {
    const updates: { displayName?: string | null; photoURL?: string | null } = {};
    if (profileData.name !== undefined) {
      updates.displayName = profileData.name;
    }
    if (profileData.avatarUrl !== undefined) {
      updates.photoURL = profileData.avatarUrl;
    }
    await updateProfile(firebaseUser, updates);
  },
};
