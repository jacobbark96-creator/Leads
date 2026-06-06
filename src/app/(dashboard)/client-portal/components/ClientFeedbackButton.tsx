import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';
import toast from 'react-hot-toast';

export function ClientFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !profile) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          user_id: profile.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast.success('Thank you for your feedback!');
      setFeedback('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-4 mb-4 w-80 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Tell us your thoughts</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            How can we do better? We're always looking to improve our platform.
          </p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Type your feedback here..."
              className="w-full h-24 text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none mb-3"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !feedback.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-openlead-blue to-blue-600 text-white font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-openlead-blue to-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold text-sm">Feedback</span>
        </button>
      )}
    </div>
  );
}
