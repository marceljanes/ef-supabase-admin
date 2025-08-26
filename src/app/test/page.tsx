'use client';

import { useState } from 'react';
import { testSupabaseConnection } from '@/lib/supabase';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Starting connection test...');
      const testResult = await testSupabaseConnection();
      console.log('Test completed successfully:', testResult);
      setResult({ success: true, data: testResult });
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
            </div>
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </div>
            <div>
              <strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
            </div>
            <div>
              <strong>Key Length:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0} characters
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Connection Test</h2>
          
          <button
            onClick={runTest}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          
          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">
                {result.success ? '✅ Success' : '❌ Failed'}
              </h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6">
          <a 
            href="/admin" 
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-block"
          >
            Go to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
