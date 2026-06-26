import React, { useState, useEffect } from 'react';
import { Search, X, Copy, CheckCircle, ExternalLink, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import toast from 'react-hot-toast';

interface MagicCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

interface Contractor {
  id: string; // user id
  company_name: string;
  name: string;
  email: string;
  location: string;
  credit_balance: number;
}

export const MagicCheckoutModal: React.FC<MagicCheckoutModalProps> = ({ isOpen, onClose, lead }) => {
  const [search, setSearch] = useState('');
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchaseType, setPurchaseType] = useState<'exclusive' | 'share'>('exclusive');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchContractors();
      setGeneratedLink(null);
      setSelectedId(null);
      setSearch('');
      setExpiresAt(null);
      setCountdown(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!expiresAt) {
      setCountdown(null);
      return;
    }

    // Immediate calculation so it doesn't wait 1s to show
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setCountdown(null);
        setExpiresAt(null);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      // Fetch all users with role 'client'
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'client');

      if (userError) throw userError;

      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('user_id, company_name, credit_balance');

      if (clientError) throw clientError;

      const mapped: Contractor[] = (users || []).map(u => {
        const c = clients?.find(cl => cl.user_id === u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          company_name: c?.company_name || u.name,
          location: 'N/A',
          credit_balance: c?.credit_balance || 0
        };
      });

      setContractors(mapped);
    } catch (err: any) {
      toast.error('Failed to load contractors: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = contractors.filter(c => 
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = async () => {
    if (!selectedId) return;
    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/magic-checkout/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          leadId: lead.id,
          contractorId: selectedId,
          purchaseType
        })
      });

      const contentType = res.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response (${res.status}): ${text.substring(0, 100)}`);
      }

      if (!res.ok) {
        if (res.status === 409 && data.expiresAt) {
          setExpiresAt(data.expiresAt);
        }
        throw new Error(data.error || 'Failed to generate link');
      }

      setGeneratedLink(data.url);
      toast.success('Magic link generated successfully!');

      // Add timeline event
      await supabase.from('lead_notes').insert({
        lead_id: lead.id,
        user_id: session?.user.id,
        content: `Generated magic checkout link for ${contractors.find(c => c.id === selectedId)?.company_name}`
      });

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success('Copied to clipboard!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-gray-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
              <span className="text-xl font-bold">£</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generate Magic Checkout Link</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">For Lead #{lead.id.split('-')[0]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]">
          {generatedLink ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Link Generated Successfully!</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-md">
                  Send this link to the contractor. They will be automatically logged in and taken directly to the Stripe checkout page.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Magic Checkout URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={generatedLink} 
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono focus:outline-none"
                  />
                  <button 
                    onClick={handleCopy}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">Important Details</p>
                  <ul className="list-disc pl-4 space-y-1 opacity-90">
                    <li>Link expires in 15 minutes.</li>
                    <li>The lead is reserved for this contractor for 5 minutes.</li>
                    <li>One-time use only.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {countdown && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 animate-in fade-in flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Active Link Exists</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Another user is currently checking out this lead. Please wait <span className="font-mono font-bold text-red-900">{countdown}</span> before generating a new link.
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search contractors by name, company, or email..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-4">Company / Contact</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-4 text-right">Balance</div>
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                  {loading ? (
                    <div className="p-8 text-center text-sm text-gray-500">Loading contractors...</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">No contractors found.</div>
                  ) : filtered.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`px-4 py-3 grid grid-cols-12 gap-2 items-center cursor-pointer transition-colors ${selectedId === c.id ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedId === c.id ? 'border-indigo-600' : 'border-gray-300'}`}>
                          {selectedId === c.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.company_name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{c.name}</p>
                        </div>
                      </div>
                      <div className="col-span-4 min-w-0">
                        <p className="text-xs text-gray-600 truncate">{c.email}</p>
                      </div>
                      <div className="col-span-4 text-right">
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-100">
                          <CreditCard className="w-3 h-3" /> £{c.credit_balance}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Purchase Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPurchaseType('exclusive')}
                    className={`p-3 rounded-lg border text-left transition-all ${purchaseType === 'exclusive' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/30' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <div className="text-sm font-bold text-gray-900 mb-1">Exclusive Lead</div>
                    <div className="text-xs text-gray-500">£{lead.exclusive_price || 135}</div>
                  </button>
                  <button
                    onClick={() => setPurchaseType('share')}
                    className={`p-3 rounded-lg border text-left transition-all ${purchaseType === 'share' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/30' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <div className="text-sm font-bold text-gray-900 mb-1">LeadShare</div>
                    <div className="text-xs text-gray-500">£{lead.share_price || 45}</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          {generatedLink ? (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <a
                href={generatedLink}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-2.5 shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Link
              </a>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedId || generating}
                onClick={handleGenerate}
                className="px-6 py-2.5 shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate Link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};