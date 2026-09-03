import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import toast from 'react-hot-toast';
import { Mail, Plus, Save, Trash2 } from 'lucide-react';

interface TrialsTabProps {
  users: UserProfile[];
  onUpdate: () => void;
}

export const TrialsTab: React.FC<TrialsTabProps> = ({ users, onUpdate }) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', secondary_email: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  const [isSendingLogin, setIsSendingLogin] = useState<string | null>(null);

  // Filter trial accounts
  const trialAccounts = useMemo(() => {
    return users.filter(u => 
      u.role === 'rep' && 
      /^trial\d+@openlead\.co\.uk$/i.test(u.email || '')
    ).sort((a, b) => {
      const numA = parseInt((a.email?.match(/\d+/) || ['0'])[0]);
      const numB = parseInt((b.email?.match(/\d+/) || ['0'])[0]);
      return numA - numB;
    });
  }, [users]);

  const handleEditClick = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditForm({ name: user.name || '', secondary_email: user.secondary_email || '' });
  };

  const handleSave = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: editForm.name, secondary_email: editForm.secondary_email })
        .eq('id', userId);
      if (error) throw error;
      toast.success('Updated successfully');
      setEditingUserId(null);
      onUpdate();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  const handleSendLogin = async (user: UserProfile) => {
    if (!user.secondary_email) {
      toast.error('Please add a personal email first');
      return;
    }
    
    setIsSendingLogin(user.id);
    try {
      const response = await fetch('/api/trials/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send login');
      toast.success('Login details sent to ' + user.secondary_email);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSendingLogin(null);
    }
  };

  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      // Find highest trial number
      let maxNum = 0;
      trialAccounts.forEach(u => {
        const num = parseInt((u.email?.match(/\d+/) || ['0'])[0]);
        if (num > maxNum) maxNum = num;
      });
      const newNum = maxNum + 1;
      const newEmail = `trial${newNum}@openlead.co.uk`;

      // Find Trial1 to duplicate permissions
      const trial1 = trialAccounts.find(u => u.email?.toLowerCase() === 'trial1@openlead.co.uk');
      const permissions = trial1 ? trial1.permissions : [];

      const response = await fetch('/api/trials/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, permissions })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create trial account');
      
      toast.success(`Created new trial account: ${newEmail}`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClearChats = async () => {
    if (!window.confirm('Are you sure you want to clear all internal chats for all trial accounts? This action cannot be undone.')) {
      return;
    }

    setIsClearingChats(true);
    try {
      const trialUserIds = trialAccounts.map(u => u.id);
      
      if (trialUserIds.length === 0) {
        toast.error('No trial accounts found');
        return;
      }

      const response = await fetch('/api/trials/clear-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: trialUserIds })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to clear chats');
      
      toast.success('Internal chats cleared for all trial accounts');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsClearingChats(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Trial Accounts</h2>
          <p className="text-sm text-gray-500">Manage representative trial accounts and dispatch login details.</p>
        </div>
        <button
          onClick={handleClearChats}
          disabled={isClearingChats || trialAccounts.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
          title="Clear all internal chats for all trial accounts"
        >
          {isClearingChats ? (
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Clear Chats
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Twilio Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personal Email</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trialAccounts.map((user) => {
              const accountName = user.email?.split('@')[0];
              const formattedAccountName = accountName ? accountName.charAt(0).toUpperCase() + accountName.slice(1) : 'Unknown';
              const isEditing = editingUserId === user.id;

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formattedAccountName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border"
                        placeholder="Enter name"
                      />
                    ) : (
                      user.name || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.twilio_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.secondary_email}
                        onChange={(e) => setEditForm({...editForm, secondary_email: e.target.value})}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border"
                        placeholder="Personal email"
                      />
                    ) : (
                      user.secondary_email || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <button
                          onClick={() => handleSave(user.id)}
                          className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 p-1.5 rounded"
                          title="Save"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditClick(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleSendLogin(user)}
                        disabled={isSendingLogin === user.id || !user.secondary_email}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-white text-xs font-medium ${
                          !user.secondary_email 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isSendingLogin === user.id ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        Send Logins
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {trialAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No trial accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Create New Trial Account</h3>
          <p className="text-xs text-gray-500 mt-1">Automatically generates the next sequential trial email and duplicates Trial1 permissions.</p>
        </div>
        <button
          onClick={handleCreateNew}
          disabled={isCreating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {isCreating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Create Trial Account
        </button>
      </div>
    </div>
  );
};
