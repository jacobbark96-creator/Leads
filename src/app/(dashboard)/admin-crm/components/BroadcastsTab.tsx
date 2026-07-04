"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Megaphone, Search, Clock, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Broadcast {
  id: string;
  title: string;
  content: string;
  type: 'broadcast';
  created_at: string;
}

export const BroadcastsTab = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBroadcast, setNewBroadcast] = useState({ title: '', content: '' });
  const [isSending, setIsSending] = useState(false);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .is('user_id', null)
        .eq('type', 'broadcast')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch broadcasts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this broadcast? It will disappear from all client dashboards.')) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Broadcast deleted successfully');
      fetchBroadcasts();
    } catch (error: any) {
      toast.error('Failed to delete broadcast: ' + error.message);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcast.title || !newBroadcast.content) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          title: newBroadcast.title,
          content: newBroadcast.content,
          type: 'broadcast',
          user_id: null // Null means it's a broadcast to all clients
        }]);

      if (error) throw error;
      toast.success('Broadcast sent to all clients!');
      setIsModalOpen(false);
      setNewBroadcast({ title: '', content: '' });
      fetchBroadcasts();
    } catch (error: any) {
      toast.error('Failed to send broadcast: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredBroadcasts = broadcasts.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search broadcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> New Broadcast
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredBroadcasts.length > 0 ? (
          filteredBroadcasts.map((broadcast) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={broadcast.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2.5 bg-blue-50 rounded-xl">
                    <Megaphone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{broadcast.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">{broadcast.content}</p>
                    <div className="flex items-center gap-3 mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                      </span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Live Broadcast</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(broadcast.id)}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No broadcasts found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Create your first broadcast to send a message to all active clients on the platform.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Broadcast
            </button>
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSending && setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                  Create Broadcast
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSend} className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Broadcast Title</label>
                  <input
                    type="text"
                    required
                    disabled={isSending}
                    value={newBroadcast.title}
                    onChange={e => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                    placeholder="e.g. New Platform Update"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Message Content</label>
                  <textarea
                    required
                    disabled={isSending}
                    value={newBroadcast.content}
                    onChange={e => setNewBroadcast({ ...newBroadcast, content: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium h-32 resize-none transition-all"
                    placeholder="Describe the update or announcement..."
                  />
                  <p className="mt-2 text-[10px] text-gray-400 italic">This message will be visible to all clients in their notification bell.</p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSending}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Broadcast
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
