import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Check, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export const AssignTaskWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <LayoutGroup>
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              key="button"
              layoutId="assign-task-wrapper"
              onClick={() => setIsOpen(true)}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg border border-white/10 hover:opacity-90 z-10 relative"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <TaskModalContent onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
};

const TaskModalContent = ({ onClose }: { onClose: () => void }) => {
  const [search, setSearch] = useState('');
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [requestText, setRequestText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['admin', 'super_admin'])
        .order('name');
      if (data) setAdmins(data);
    };
    fetchAdmins();
  }, []);

  const filteredAdmins = search 
    ? admins.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) && a.id !== selectedAdmin?.id)
    : [];

  const handleSubmit = async () => {
    if (!selectedAdmin) {
      toast.error('Please select an admin');
      return;
    }
    if (!requestText.trim()) {
      toast.error('Please enter a request');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/google/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedAdmin.id,
          title: `Request: ${requestText.substring(0, 50)}${requestText.length > 50 ? '...' : ''}`,
          notes: requestText
        })
      });

      if (!res.ok) {
        throw new Error('Failed to assign task');
      }

      setShowSuccess(true);
      setTimeout(() => {
        onClose(); // This will trigger the suck back animation automatically
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Error assigning task');
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      layoutId="assign-task-wrapper"
      className="w-[400px] bg-[#0a0f1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10"
    >
      {showSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-[300px] flex items-center justify-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Assign Task</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">To</label>
              {selectedAdmin ? (
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-white font-medium">{selectedAdmin.name}</span>
                  <button onClick={() => setSelectedAdmin(null)} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type a name..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {search && filteredAdmins.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#131b2f] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20">
                      {filteredAdmins.map(admin => (
                        <button
                          key={admin.id}
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setSearch('');
                          }}
                          className="w-full text-left px-4 py-3 text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          {admin.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Request</label>
              <textarea
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder="What do you need them to do?"
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedAdmin || !requestText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-colors mt-4"
            >
              {isSubmitting ? 'Sending...' : 'Submit Request'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
