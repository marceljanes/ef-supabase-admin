'use client';
import { useState, useEffect } from 'react';
import { dbService, supabase } from '@/lib/supabase';

export default function DebugAuth() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check auth user
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session);
      setAuthUser(session?.user || null);

      if (session?.user) {
        // Get profile directly from database
        const { data: profile, error: profileError } = await supabase
          .from('user_profile')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log('Profile from DB:', profile, profileError);
        setUserProfile(profile);

        if (profileError) {
          setError(`Profile error: ${profileError.message}`);
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Debug error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUserProfile(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Auth Debug Tool</h1>
        
        <div className="space-y-4">
          <button
            onClick={checkStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
          >
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>

          {authUser && (
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded ml-2"
            >
              Sign Out
            </button>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded p-3 text-red-300">
              Error: {error}
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-700 rounded p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Auth User</h2>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
              {authUser ? JSON.stringify(authUser, null, 2) : 'No auth user'}
            </pre>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded p-4">
            <h2 className="text-lg font-semibold text-white mb-3">User Profile</h2>
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
              {userProfile ? JSON.stringify(userProfile, null, 2) : 'No user profile'}
            </pre>
          </div>

          {userProfile && (
            <div className="bg-zinc-900 border border-zinc-700 rounded p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Status Check</h2>
              <div className="space-y-2 text-sm">
                <div className="text-zinc-300">
                  <span className="text-zinc-400">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    userProfile.status === 'approved' 
                      ? 'bg-green-700 text-green-200' 
                      : userProfile.status === 'pending'
                      ? 'bg-amber-700 text-amber-200'
                      : 'bg-red-700 text-red-200'
                  }`}>
                    {userProfile.status}
                  </span>
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-400">Role:</span> 
                  <span className="ml-2">{userProfile.role}</span>
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-400">Created:</span> 
                  <span className="ml-2">{new Date(userProfile.created_at).toLocaleString()}</span>
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-400">Updated:</span> 
                  <span className="ml-2">{new Date(userProfile.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
