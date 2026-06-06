'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function MagicCheckoutContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing checkout token.');
      return;
    }

    const processCheckout = async (session: any) => {
      try {
        if (!session) {
          throw new Error('Authentication failed. No session established.');
        }

        const res = await fetch(`/api/magic-checkout/consume?token=${token}`, {
          method: 'POST',
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to process checkout link');
        }

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No redirect URL provided');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    };

    let processed = false;

    // Listen for auth state changes (which happens when Supabase parses the URL hash/code)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !processed) {
        processed = true;
        processCheckout(session);
      }
    });

    // Also check immediately in case the session is already established
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !processed) {
        processed = true;
        processCheckout(session);
      }
    });

    // Timeout if no session after 5 seconds
    const timeout = setTimeout(() => {
      if (!processed) {
        setError('Authentication timed out. Please try again.');
      }
    }, 5000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        {error ? (
          <div>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Checkout Link Failed</h2>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Securely logging you in...</h2>
            <p className="text-gray-500 text-sm">Please wait while we prepare your checkout session.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MagicCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    }>
      <MagicCheckoutContent />
    </Suspense>
  );
}
