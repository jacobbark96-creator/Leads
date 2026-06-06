import React, { useState } from 'react';
import { X, Search, Phone, Check, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  isoCountry: string;
  price: string;
}

interface BuyTwilioNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onNumberBought: (number: string) => void;
}

export const BuyTwilioNumberModal: React.FC<BuyTwilioNumberModalProps> = ({ 
  isOpen, 
  onClose, 
  userId,
  onNumberBought 
}) => {
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState(false);
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [searchParams, setSearchParams] = useState({
    countryCode: 'GB',
    areaCode: '',
    contains: ''
  });
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSearching(true);
      setSelectedNumber(null);
      
      const params = new URLSearchParams({
        countryCode: searchParams.countryCode,
        ...(searchParams.areaCode && { areaCode: searchParams.areaCode }),
        ...(searchParams.contains && { contains: searchParams.contains })
      });

      const res = await fetch(`/api/twilio/available-numbers?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to search numbers');
      
      setNumbers(data.numbers || []);
      if (data.numbers?.length === 0) {
        toast.error('No numbers found matching your criteria');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleBuy = async () => {
    if (!selectedNumber) return;

    if (!window.confirm(`Are you sure you want to buy ${selectedNumber.friendlyName}? This will incur a monthly charge on your Twilio account.`)) {
      return;
    }

    try {
      setBuying(true);
      const res = await fetch('/api/twilio/buy-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber.phoneNumber,
          userId: userId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to purchase number');

      toast.success(`Successfully purchased ${data.phoneNumber}`);
      onNumberBought(data.phoneNumber);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Buy Twilio Number</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Country</label>
                <select 
                  value={searchParams.countryCode}
                  onChange={e => setSearchParams({...searchParams, countryCode: e.target.value})}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="IE">Ireland</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Area Code (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. 0161"
                  value={searchParams.areaCode}
                  onChange={e => setSearchParams({...searchParams, areaCode: e.target.value})}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={searching}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search Available Numbers
            </button>
          </form>

          {/* Results List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {numbers.length > 0 ? (
              numbers.map((num) => (
                <div 
                  key={num.phoneNumber}
                  onClick={() => setSelectedNumber(num)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                    selectedNumber?.phoneNumber === num.phoneNumber 
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                      : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{num.friendlyName}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tight">
                      {num.locality}{num.locality && num.region ? ', ' : ''}{num.region}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {num.price}
                    </span>
                    {selectedNumber?.phoneNumber === num.phoneNumber ? (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-200 group-hover:border-blue-300 bg-white" />
                    )}
                  </div>
                </div>
              ))
            ) : !searching && (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Phone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Search for numbers above to see results.</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100 mb-6">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Purchasing a number will automatically configure it for inbound calls and SMS. 
                The cost will be deducted from your Twilio account balance monthly.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBuy}
                disabled={!selectedNumber || buying}
                className="flex-[2] bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm & Buy Number
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
