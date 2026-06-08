"use client";

import React, { useState, useEffect } from 'react';
import { Mail, X, Send, Loader2, FileText, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  defaultType?: 'request_bills' | 'chase_bills' | 'custom';
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
}

export const EmailModal = ({ isOpen, onClose, lead, defaultType }: EmailModalProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState(lead?.email || '');
  const [senderEmail, setSenderEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { profile } = useAuthStore();

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const quillFormats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setTo(lead?.email || '');
      
      // Default to secondary email if it's an OpenEnergy domain
      if (profile?.secondary_email?.toLowerCase().includes('openenergyservices.co.uk')) {
        setSenderEmail(profile.secondary_email);
      } else {
        setSenderEmail(profile?.email || '');
      }
      
      if (!selectedTemplate) {
        let initialBody = profile?.email_signature ? `<br/><br/>${profile.email_signature.replace(/\n/g, '<br/>')}` : '';
        if (profile?.divisions?.logo_url) {
          initialBody += `<br/><br/><img src="${profile.divisions.logo_url}" alt="Logo" style="max-height: 60px; width: auto; display: block; margin-top: 10px;" />`;
        }
        setBody(initialBody);
      }
    }
  }, [isOpen, lead, profile?.email_signature]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*');
      
      if (error) throw error;
      setTemplates(data || []);

      // If defaultType is provided, find and select that template
      if (defaultType) {
        const template = data?.find(t => t.type === defaultType);
        if (template) {
          applyTemplate(template);
          setSelectedTemplate(template.id);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: Template) => {
    // Lead name can be in .name or .contact_name depending on the object structure
    const fullName = lead?.contact_name || lead?.name || '';
    const firstName = fullName.split(' ')[0] || '';
    const leadCompanyName = lead?.company_name || lead?.company || '';

    let parsedSubject = template.subject
      .replace(/{company_name}/gi, leadCompanyName)
      .replace(/{contact_name}/gi, firstName)
      .replace(/{Rep_Name}/gi, profile?.name || 'Your Representative');
    
    let parsedBody = template.body
      .replace(/{company_name}/gi, leadCompanyName)
      .replace(/{contact_name}/gi, firstName)
      .replace(/{Rep_Name}/gi, profile?.name || 'Your Representative');

    if (profile?.email_signature) {
      parsedBody += `<br/><br/>${profile.email_signature.replace(/\n/g, '<br/>')}`;
      if (profile?.divisions?.logo_url) {
        parsedBody += `<br/><br/><img src="${profile.divisions.logo_url}" alt="Logo" style="max-height: 60px; width: auto; display: block; margin-top: 10px;" />`;
      }
    }

    setSubject(parsedSubject);
    setBody(parsedBody);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) applyTemplate(template);
    } else {
      setSubject('');
      let resetBody = profile?.email_signature ? `<br/><br/>${profile.email_signature.replace(/\n/g, '<br/>')}` : '';
      if (profile?.divisions?.logo_url) {
        resetBody += `<br/><br/><img src="${profile.divisions.logo_url}" alt="Logo" style="max-height: 60px; width: auto; display: block; margin-top: 10px;" />`;
      }
      setBody(resetBody);
    }
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSending(true);
      
      // 1. Send email via API
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          fromEmail: senderEmail,
          to,
          subject,
          body,
          leadId: lead?.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send email');

      toast.success('Email sent successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Compose Email</h3>
              <p className="text-gray-400 text-xs">{lead?.company_name || 'New Email'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* To/From Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
              {profile?.secondary_email ? (
                <div className="relative mt-1">
                  <select
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full appearance-none bg-transparent border-none p-0 text-sm text-gray-700 font-medium focus:ring-0 cursor-pointer"
                  >
                    <option value={profile.email}>{profile.email}</option>
                    <option value={profile.secondary_email}>{profile.secondary_email}</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <div className="text-sm text-gray-700 font-medium truncate mt-1">{profile?.email || 'Your linked Gmail account'}</div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
              <input 
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-transparent border-none p-0 text-sm text-gray-700 font-medium focus:ring-0"
                placeholder="recipient@email.com"
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Template</label>
            <div className="relative">
              <select 
                value={selectedTemplate}
                onChange={handleTemplateChange}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                <option value="">Blank Email (Custom)</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Subject</label>
            <input 
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="Enter email subject..."
            />
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Message</label>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
              <ReactQuill 
                theme="snow"
                value={body}
                onChange={setBody}
                modules={quillModules}
                formats={quillFormats}
                className="flex-1 flex flex-col"
                placeholder="Type your message here..."
              />
            </div>
          </div>
        </div>

        <style jsx global>{`
          .ql-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 200px;
            font-size: 14px;
          }
          .ql-editor {
            flex: 1;
            overflow-y: auto;
          }
          .ql-toolbar {
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: 1px solid #f3f4f6 !important;
            background: #f9fafb;
          }
          .ql-container {
            border: none !important;
          }
        `}</style>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <FileText className="w-3.5 h-3.5" />
            Interaction will be logged automatically
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSend}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-blue-500/20 active:scale-95"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
