import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

import api from '../lib/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function changePassword(currentPassword, newPassword) {
    if (!auth.currentUser) throw new Error("No authenticated user");
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    return updatePassword(auth.currentUser, newPassword);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profile: null
        });
        setLoading(false);

        try {
          const res = await api.get(`/users/${user.uid}`);
          setCurrentUser(prev => prev ? {
            ...prev,
            profile: res.data
          } : null);
          api.defaults.headers.common['x-user-name'] = res.data?.name || user.displayName || 'BHUPAT BHUT';
          api.defaults.headers.common['x-user-role'] = res.data?.designation || 'Administrator';
        } catch (error) {
          console.error('Failed to fetch user profile data:', error);
          api.defaults.headers.common['x-user-name'] = user.displayName || 'BHUPAT BHUT';
          api.defaults.headers.common['x-user-role'] = 'Administrator';
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
        api.defaults.headers.common['x-user-name'] = 'BHUPAT BHUT';
        api.defaults.headers.common['x-user-role'] = 'Administrator';
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    logout,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Loading your workspace...</h2>
          <p className="text-gray-500 mt-2">Please wait while we connect to the server.</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
