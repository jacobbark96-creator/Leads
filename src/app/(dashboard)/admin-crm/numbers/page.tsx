"use client";

import React, { useState, useEffect } from 'react';
import { Phone, Trash2, Plus, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { BuyTwilioNumberModal } from '@/components/BuyTwilioNumberModal';

interface TwilioNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  dateCreated: string;
  assignedUser: { id: string; name: string } | null;
}

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<TwilioNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/twilio/numbers');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch numbers');
      }
      const data = await res.json();
      setNumbers(data.numbers || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleDelete = async (sid: string, phone: string) => {
    if (!window.confirm(`Are you sure you want to release ${phone}? This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(sid);
      const res = await fetch(`/api/twilio/numbers?sid=${sid}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete number');
      }
      toast.success('Number released successfully');
      setNumbers(prev => prev.filter(n => n.sid !== sid));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Twilio Numbers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your incoming Twilio phone numbers and assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNumbers}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsBuyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Buy Number
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading && numbers.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
            <p>Loading numbers...</p>
          </div>
        ) : numbers.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <Phone className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">No numbers found</p>
            <p className="text-sm mt-1">You don't have any Twilio numbers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Friendly Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Added</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {numbers.map((number) => (
                  <tr key={number.sid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900">{number.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {number.friendlyName}
                    </td>
                    <td className="px-6 py-4">
                      {number.assignedUser ? (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {number.assignedUser.name}
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Unassigned
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(number.dateCreated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(number.sid, number.phoneNumber)}
                        disabled={deleting === number.sid}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Release Number"
                      >
                        {deleting === number.sid ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BuyTwilioNumberModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        userId=""
        onNumberBought={() => {
          fetchNumbers();
        }}
      />
    </div>
  );
}
