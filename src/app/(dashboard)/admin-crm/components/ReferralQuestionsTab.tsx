"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, GripVertical, X } from 'lucide-react';

export function ReferralQuestionsTab() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<any>(null);

  // Form State
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [options, setOptions] = useState<string[]>(['']);
  const [isRequired, setIsRequired] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_questions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setQuestionText('');
    setQuestionType('multiple_choice');
    setOptions(['']);
    setIsRequired(true);
    setIsActive(true);
  };

  const handleEdit = (q: any) => {
    setIsEditing(q.id);
    setQuestionText(q.question_text);
    setQuestionType(q.question_type);
    setOptions(q.options || []);
    setIsRequired(q.is_required);
    setIsActive(q.is_active);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        question_text: questionText,
        question_type: questionType,
        options: questionType === 'multiple_choice' ? options.filter(o => o.trim()) : [],
        is_required: isRequired,
        is_active: isActive
      };

      if (isEditing) {
        const { error } = await supabase.from('referral_questions').update(payload).eq('id', isEditing);
        if (error) throw error;
        toast.success('Question updated');
      } else {
        const { error } = await supabase.from('referral_questions').insert({
          ...payload,
          sort_order: questions.length + 1
        });
        if (error) throw error;
        toast.success('Question added');
      }
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save question');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const { error } = await supabase.from('referral_questions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Question deleted');
      fetchQuestions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete question');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Referral Questions Manager</h2>
        <button
          onClick={resetForm}
          className="bg-[#0066FF] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0052CC] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">{isEditing ? 'Edit Question' : 'New Question'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
              <input
                type="text"
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF]"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="yes_no">Yes / No</option>
                <option value="short_text">Short Text</option>
                <option value="number">Number</option>
              </select>
            </div>

            {questionType === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF]"
                      placeholder={`Option ${idx + 1}`}
                    />
                    <button type="button" onClick={() => setOptions(options.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOptions([...options, ''])}
                  className="text-sm text-[#0066FF] font-medium hover:underline"
                >
                  + Add Option
                </button>
              </div>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded text-[#0066FF]" />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded text-[#0066FF]" />
                Active
              </label>
            </div>

            <div className="pt-2 flex gap-2">
              <button type="submit" className="flex-1 bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800">
                {isEditing ? 'Update' : 'Save'}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Active Questions</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No questions found.</div>
            ) : (
              questions.map((q) => (
                <div key={q.id} className={`p-4 flex items-start gap-4 ${!q.is_active ? 'opacity-50 grayscale' : ''}`}>
                  <div className="mt-1 text-gray-400 cursor-move"><GripVertical className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{q.question_text}</h4>
                      {q.is_required && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">REQ</span>}
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">{q.question_type.replace('_', ' ')}</span>
                    </div>
                    {q.question_type === 'multiple_choice' && (
                      <p className="text-sm text-gray-500">{q.options?.join(', ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}