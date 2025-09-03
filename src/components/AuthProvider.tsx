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
  const [mounted, setMounted] = useState(false);

  // Fix hydration issues by waiting for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const checkAuth = async (retryCount = 0, maxRetries = 3) => {
    if (!mounted) return;
    
    try {
      // Increased timeout to 60 seconds for maximum online stability
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 60000)
      );
      
      const authPromise = (async () => {
        const authUser = await dbService.getCurrentUser();
        
        if (authUser) {
          const profile = await dbService.getCurrentUserProfile();
          setUser(authUser);
          setUserProfile(profile);
          
          // Store successful auth timestamp for heartbeat
          if (typeof window !== 'undefined') {
            localStorage.setItem('ef-auth-last-success', Date.now().toString());
            sessionStorage.setItem('ef-auth-backup', JSON.stringify({ 
              userId: authUser.id, 
              email: authUser.email,
              timestamp: Date.now() 
            }));
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      })();
      
      await Promise.race([authPromise, timeoutPromise]);
      
    } catch (error) {
      console.error(`Auth check failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Retry on timeout or network errors
      if ((errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('fetch')) && retryCount < maxRetries) {
        console.warn(`Retrying auth check in ${(retryCount + 1) * 2} seconds...`);
        setTimeout(() => {
          checkAuth(retryCount + 1, maxRetries);
        }, (retryCount + 1) * 2000);
        return;
      }
      
      // Check if we have a backup session
      if (typeof window !== 'undefined') {
        const lastSuccess = localStorage.getItem('ef-auth-last-success');
        const backupSession = sessionStorage.getItem('ef-auth-backup');
        
        if (lastSuccess && backupSession) {
          const timeSinceSuccess = Date.now() - parseInt(lastSuccess);
          // Keep session alive if last success was within 10 minutes
          if (timeSinceSuccess < 10 * 60 * 1000) {
            console.warn('Auth check failed but keeping session based on recent success');
            return;
          }
        }
      }
      
      // Only logout if we're sure the session is invalid
      if (!errorMessage.includes('timeout') && !errorMessage.includes('network')) {
        setUser(null);
        setUserProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  const signOut = async () => {
    try {
      await dbService.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    // Force loading to false after 30 seconds max
    const maxLoadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 30000);

    checkAuth().finally(() => {
      clearTimeout(maxLoadingTimeout);
    });
    
    // Session heartbeat - check auth every 5 minutes to keep session alive
    const heartbeatInterval = setInterval(() => {
      if (user && typeof window !== 'undefined') {
        const lastSuccess = localStorage.getItem('ef-auth-last-success');
        if (lastSuccess) {
          const timeSinceSuccess = Date.now() - parseInt(lastSuccess);
          // Only do heartbeat check if it's been more than 4 minutes since last success
          if (timeSinceSuccess > 4 * 60 * 1000) {
            console.log('Performing session heartbeat...');
            checkAuth(0, 1); // Single retry for heartbeat
          }
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        try {
          console.log('Auth state change:', event, session?.user?.email);
          
          if (event === 'SIGNED_IN' && session?.user) {
            const profile = await dbService.getCurrentUserProfile();
            setUser(session.user);
            setUserProfile(profile);
            
            // Update success timestamp
            if (typeof window !== 'undefined') {
              localStorage.setItem('ef-auth-last-success', Date.now().toString());
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserProfile(null);
            
            // Clear stored timestamps
            if (typeof window !== 'undefined') {
              localStorage.removeItem('ef-auth-last-success');
              sessionStorage.removeItem('ef-auth-backup');
            }
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('Token refreshed successfully');
            if (typeof window !== 'undefined') {
              localStorage.setItem('ef-auth-last-success', Date.now().toString());
            }
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          // Don't set loading false on auth state change errors
        }
        setLoading(false);
      }
    );

    // Listen for network status changes
    const handleOnline = () => {
      console.log('Network online - checking auth status');
      if (user) {
        checkAuth(0, 1); // Quick auth check when coming back online
      }
    };
    
    const handleOffline = () => {
      console.log('Network offline - preserving current auth state');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      subscription.unsubscribe();
      clearTimeout(maxLoadingTimeout);
      clearInterval(heartbeatInterval);
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [mounted, user]);

  const value = {
    user,
    userProfile,
    loading,
    signOut,
    refreshAuth
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  // Show loading spinner for maximum 2 seconds
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // Show auth form if no user
  if (!user) {
    return (
      <AuthContext.Provider value={value}>
        <AuthForm />
      </AuthContext.Provider>
    );
  }

  // Show pending approval message
  if (userProfile && userProfile.status === 'pending') {
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md mx-auto text-center p-8 bg-gray-800 rounded-lg shadow-lg">
            <div className="mb-4">
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Approval Pending</h2>
              <p className="text-gray-300 mb-4">
                Your account is pending approval. Please wait for an administrator to approve your access.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Email: {user.email}
              </p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  // Show access denied for non-approved users
  if (!userProfile || userProfile.status !== 'approved') {
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md mx-auto text-center p-8 bg-gray-800 rounded-lg shadow-lg">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-gray-300 mb-4">
                Your account access has been denied or is not properly configured.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Email: {user.email}
              </p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  // User is approved, show the app
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
