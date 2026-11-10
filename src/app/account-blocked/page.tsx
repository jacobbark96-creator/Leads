'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function AccountBlockedPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [outstandingAmount, setOutstandingAmount] = useState<number>(0);
  const [blockReason, setBlockReason] = useState<string>('');

  useEffect(() => {
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (!profile.is_blocked) {
      router.replace('/client-portal');
      return;
    }

    const fetchBlockDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('outstanding_amount, block_reason')
          .eq('id', profile.id)
          .single();

        if (error) throw error;
        if (data) {
          setOutstandingAmount(data.outstanding_amount || 0);
          setBlockReason(data.block_reason || 'Unknown reason');
        }
      } catch (err) {
        console.error('Error fetching block details:', err);
      }
    };

    fetchBlockDetails();
  }, [profile, router]);

  const handlePayment = async () => {
    if (outstandingAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutType: 'invoice',
          userId: profile?.id,
          email: profile?.email,
          amount: outstandingAmount
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create payment session');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Account Suspended
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your account has been temporarily blocked from accessing the marketplace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-red-500">
          <div className="bg-red-50 p-4 rounded-md mb-6">
            <h3 className="text-sm font-medium text-red-800">Reason for Suspension</h3>
            <p className="mt-1 text-sm text-red-700">{blockReason || 'Unpaid Invoices'}</p>
          </div>

          {outstandingAmount > 0 && (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 text-center">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Outstanding Balance</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">£{outstandingAmount.toFixed(2)}</p>
              
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : 'Pay Outstanding Balance'}
              </button>
              <p className="mt-3 text-xs text-gray-500">
                Your account will be automatically restored once payment is completed.
              </p>
            </div>
          )}

          <div className="text-sm text-center mt-6">
            <p className="text-gray-600">
              If you believe this is an error or need assistance, please{' '}
              <a href="mailto:support@openlead.co.uk" className="font-medium text-blue-600 hover:text-blue-500">
                contact support
              </a>.
            </p>
          </div>
          
          <div className="mt-6 border-t border-gray-200 pt-6">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                useAuthStore.getState().setProfile(null);
                router.replace('/login');
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
