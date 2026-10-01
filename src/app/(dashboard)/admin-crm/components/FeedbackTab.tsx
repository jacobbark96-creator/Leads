import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function FeedbackTab() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('client_feedback')
        .select(`
          *,
          users (
            name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error: any) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('client_feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated');
      fetchFeedback();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading feedback...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Client Feedback
          </h2>
          <p className="text-sm text-gray-500 mt-1">Review and manage feedback submitted by clients.</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {feedback.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No feedback found.</div>
        ) : (
          feedback.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">{item.users?.name || 'Unknown User'}</span>
                    <span className="text-sm text-gray-500">{item.users?.email}</span>
                    <span className="text-xs text-gray-400">• {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    item.status === 'resolved' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {item.status === 'resolved' ? 'Resolved' : 'New'}
                  </span>
                  
                  {item.status !== 'resolved' && (
                    <button
                      onClick={() => updateStatus(item.id, 'resolved')}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Mark as resolved"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {item.status === 'resolved' && (
                    <button
                      onClick={() => updateStatus(item.id, 'new')}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Mark as new"
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
