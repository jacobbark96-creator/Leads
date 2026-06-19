"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Plus, Save, Trash2, Edit2, Check, X, FileText, Send, Clock, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { ImageHostingModal } from '@/components/ImageHostingModal';
import { CustomHtmlEmailModal } from '@/components/CustomHtmlEmailModal';
import 'react-quill-new/dist/quill.snow.css';

// Force rebuild with react-quill-new
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'request_bills' | 'chase_bills' | 'custom';
  created_at: string;
}

export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState<'request_bills' | 'chase_bills' | 'custom'>('request_bills');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Template>>({});
  const [showImageHosting, setShowImageHosting] = useState(false);
  const [showSendCustomEmail, setShowSendCustomEmail] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error('Failed to load templates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    const newTemplate = {
      name: 'New Template',
      subject: 'New Subject',
      body: 'Type your message here...',
      type: activeTab
    };

    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([newTemplate])
        .select()
        .single();

      if (error) throw error;
      setTemplates([data, ...templates]);
      setEditingId(data.id);
      setEditForm(data);
      toast.success('Template created!');
    } catch (error: any) {
      toast.error('Failed to create template: ' + error.message);
    }
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: editForm.name,
          subject: editForm.subject,
          body: editForm.body,
          type: editForm.type
        })
        .eq('id', id);

      if (error) throw error;
      
      setTemplates(templates.map(t => t.id === id ? { ...t, ...editForm } as Template : t));
      setEditingId(null);
      toast.success('Template saved!');
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const filteredTemplates = templates.filter(t => t.type === activeTab);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-500 text-sm">Manage templates for bill requests and automated chases.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSendCustomEmail(true)}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Send className="w-4 h-4 text-blue-500" /> Send Email
          </button>
          <button 
            onClick={() => setShowImageHosting(true)}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <ImageIcon className="w-4 h-4 text-blue-500" /> Image Hosting
          </button>
          <button 
            onClick={handleCreateTemplate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Template
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          {[
            { id: 'request_bills', label: 'Request Bills', icon: FileText },
            { id: 'chase_bills', label: 'Chase Bills', icon: Clock },
            { id: 'custom', label: 'Custom Templates', icon: Mail }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingId(null);
              }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id 
                ? 'text-blue-600 bg-white border-r border-l first:border-l-0 border-gray-200' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No templates found for this category.</p>
              <button 
                onClick={handleCreateTemplate}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                Create your first template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredTemplates.map(template => (
                <div 
                  key={template.id} 
                  className={`border rounded-xl transition-all ${
                    editingId === template.id ? 'border-blue-300 shadow-md ring-1 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    {editingId === template.id ? (
                      <input 
                        className="font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Template Name"
                      />
                    ) : (
                      <h3 className="font-bold text-gray-900">{template.name}</h3>
                    )}
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {editingId === template.id ? (
                        <>
                          <button 
                            onClick={() => handleSave(template.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingId(template.id);
                              setEditForm(template);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(template.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Subject</label>
                      {editingId === template.id ? (
                        <input 
                          className="w-full text-sm font-medium border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          value={editForm.subject || ''}
                          onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                          placeholder="Subject"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-700">{template.subject}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Body</label>
                      {editingId === template.id ? (
                        <div className="bg-white">
                          <ReactQuill 
                            theme="snow"
                            value={editForm.body || ''}
                            onChange={content => setEditForm({ ...editForm, body: content })}
                            modules={quillModules}
                            formats={quillFormats}
                            className="rounded-lg h-64 mb-12"
                          />
                        </div>
                      ) : (
                        <div 
                          className="text-sm text-gray-600 bg-gray-50/50 p-4 rounded-lg border border-gray-100 italic quill-preview"
                          dangerouslySetInnerHTML={{ __html: template.body }}
                        />
                      )}
                    </div>

                    <div className="pt-2 flex items-center gap-4 text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        Available Placeholders: <span className="text-gray-600 font-mono">{'{company_name}'}</span>, <span className="text-gray-600 font-mono">{'{contact_name}'}</span>, <span className="text-gray-600 font-mono">{'{Rep_Name}'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ImageHostingModal 
        isOpen={showImageHosting} 
        onClose={() => setShowImageHosting(false)} 
      />
      <CustomHtmlEmailModal
        isOpen={showSendCustomEmail}
        onClose={() => setShowSendCustomEmail(false)}
      />
    </div>
  );
}
