import React, { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  userEmail: string;
  userId: string;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, clientId, userEmail, userId }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const amounts = [285, 600, 800, 1000];

  const handleTopUp = async (amount: number) => {
    if (amount < 1) {
      toast.error('Minimum top up is £1');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkoutType: 'topup',
          amount,
          clientId,
          userId,
          email: userEmail,
          discountCode: discountCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl leading-6 font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Top Up Balance
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {amounts.map(amt => (
                <button
                  key={amt}
                  onClick={() => handleTopUp(amt)}
                  disabled={loading}
                  className="py-3 px-4 border-2 border-blue-100 rounded-xl text-lg font-bold text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                >
                  £{amt}
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-white text-sm text-gray-500">Or custom amount</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold">£</span>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-8 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-base py-3"
                />
              </div>
              <button
                onClick={() => handleTopUp(Number(customAmount))}
                disabled={loading || !customAmount || Number(customAmount) < 1}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 shadow-sm disabled:opacity-50 transition-colors"
              >
                Top Up
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Have a discount code?</label>
              <input
                type="text"
                value={discountCode}
                onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="Enter code before selecting amount"
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};