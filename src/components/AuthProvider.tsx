'use client';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/database';
import { dbService, supabase } from '@/lib/supabase';
import AuthForm from './AuthForm';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await dbService.getCurrentUserProfile();
          console.log('Profile after sign in:', profile);
          if (profile && profile.status === 'approved') {
            setUser(session.user);
            setUserProfile(profile);
          } else {
            console.log('User not approved, showing pending state');
            setUser(session.user);
            setUserProfile(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    // Check user status every 30 seconds if user is pending
    const statusCheckInterval = setInterval(async () => {
      if (user && userProfile && userProfile.status === 'pending') {
        console.log('Checking user status...');
        const updatedProfile = await dbService.getCurrentUserProfile();
        console.log('Updated profile:', updatedProfile);
        if (updatedProfile && updatedProfile.status !== userProfile.status) {
          setUserProfile(updatedProfile);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(statusCheckInterval);
    };
  }, [user, userProfile]);

  const checkAuth = async () => {
    try {
      console.log('Starting auth check...');
      
      // Add timeout to prevent infinite loading
      const authPromise = Promise.race([
        (async () => {
          const currentUser = await dbService.getCurrentUser();
          console.log('Current user:', currentUser?.email);
          
          if (currentUser) {
            const profile = await dbService.getCurrentUserProfile();
            console.log('Current user profile:', profile);
            if (profile && profile.status === 'approved') {
              setUser(currentUser);
              setUserProfile(profile);
            } else {
              // User exists but not approved, show pending state
              setUser(currentUser);
              setUserProfile(profile);
            }
          } else {
            console.log('No current user found');
          }
        })(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 10000)
        )
      ]);
      
      await authPromise;
      console.log('Auth check completed');
    } catch (error) {
      console.error('Auth check failed:', error);
      // On error, still proceed to show the app (might be network issue)
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await dbService.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const refreshAuth = async () => {
    setLoading(true);
    await checkAuth();
  };

  const value = {
    user,
    userProfile,
    loading,
    signOut,
    refreshAuth
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border border-zinc-600 border-t-white"></div>
          <div className="text-zinc-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <AuthForm onSuccess={checkAuth} />;
  }

  // Show pending message if user is not approved
  if (userProfile.status !== 'approved') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-500/20 rounded-full p-3">
                <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Account Pending Approval</h1>
            <p className="text-zinc-400 mb-4">
              Your account ({user.email}) is waiting for admin approval. 
              You&apos;ll be able to access the admin panel once approved.
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              Status: <span className="text-amber-400 font-medium">{userProfile.status}</span>
              <br />
              <span className="text-xs">Your account will be automatically refreshed when approved.</span>
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={refreshAuth}
                disabled={loading}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border border-zinc-400 border-t-white"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Check Now</span>
                  </>
                )}
              </button>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'superadmin';
}

export function ProtectedRoute({ children, requiredRole = 'user' }: ProtectedRouteProps) {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  const roleHierarchy = { user: 0, admin: 1, superadmin: 2 };
  const userRoleLevel = roleHierarchy[userProfile.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Insufficient Permissions</h1>
          <p className="text-zinc-400">You need {requiredRole} role to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
