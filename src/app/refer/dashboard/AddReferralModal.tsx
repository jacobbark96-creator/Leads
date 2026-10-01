"use client";

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function AddReferralModal({ 
  partnerId, 
  partnerRef,
  onClose, 
  onSuccess 
}: { 
  partnerId: string;
  partnerRef: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Basic Lead Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [leadType, setLeadType] = useState('residential');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_questions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
        
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasPermission !== true) {
      toast.error("You must have permission from the referral before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const mappedAnswers: Record<string, string> = {};
      questions.forEach(q => {
        mappedAnswers[q.question_text] = answers[q.id] || 'Not answered';
      });

      // 1. Call API Route to submit referral and bypass RLS
      const response = await fetch('/api/referral/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId,
          partnerRef,
          leadType,
          name,
          phone,
          email,
          mappedAnswers
        })
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || 'Failed to submit referral');
      }

      toast.success('Referral submitted successfully!');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to submit referral');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 flex justify-center">
          Loading questionnaire...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Add Referral</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="referral-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Dynamic Questions */}
            <div className="space-y-6 bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Qualification Questionnaire</h3>
              
              {questions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {q.question_text} {q.is_required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {q.question_type === 'multiple_choice' && (
                    <select
                      required={q.is_required}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    >
                      <option value="" disabled>Select an option</option>
                      {q.options?.map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.question_type === 'short_text' && (
                    <input
                      type="text"
                      required={q.is_required}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                  )}

                  {q.question_type === 'yes_no' && (
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input type="radio" name={q.id} value="Yes" required={q.is_required} onChange={() => handleAnswerChange(q.id, 'Yes')} className="text-[#0066FF] focus:ring-[#0066FF]" /> Yes
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name={q.id} value="No" required={q.is_required} onChange={() => handleAnswerChange(q.id, 'No')} className="text-[#0066FF] focus:ring-[#0066FF]" /> No
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Permission Check */}
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
              <label className="block text-sm font-semibold text-blue-900 mb-3">
                Have they given permission for OpenLead to contact them? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="permission" 
                    checked={hasPermission === true} 
                    onChange={() => setHasPermission(true)} 
                    className="w-4 h-4 text-[#0066FF] focus:ring-[#0066FF]" 
                  /> 
                  <span className="font-medium">Yes, they expect a call</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="permission" 
                    checked={hasPermission === false} 
                    onChange={() => setHasPermission(false)} 
                    className="w-4 h-4 text-red-600 focus:ring-red-500" 
                  /> 
                  <span className="font-medium text-red-700">No</span>
                </label>
              </div>
              
              {hasPermission === false && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>You cannot submit a referral without their explicit permission to be contacted.</p>
                </div>
              )}
            </div>

            {/* Contact Details - Only show if permission granted */}
            {hasPermission === true && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900">Contact Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referral Type <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={leadType}
                      onChange={(e) => setLeadType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    >
                      <option value="residential">Residential (Homeowner)</option>
                      <option value="commercial">Commercial (Business)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="referral-form"
            disabled={submitting || hasPermission !== true}
            className="px-5 py-2.5 font-medium text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Referral'}
          </button>
        </div>
      </div>
    </div>
  );
}