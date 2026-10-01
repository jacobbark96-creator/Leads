"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Send, ChevronDown, FileText, Loader2, User, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Lead, UserProfile } from '@/types';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface BdEmailSenderProps {
  lead: Lead;
  user: UserProfile;
  onSendSuccess?: () => void;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
}

export function BdEmailSender({ lead, user, onSendSuccess }: BdEmailSenderProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [fromEmail, setFromEmail] = useState<string>(user.default_sender_email || user.email);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(true);
  const [gmailAliases, setGmailAliases] = useState<{ label: string; value: string }[]>([]);
  const [updatingDefault, setUpdatingDefault] = useState(false);
  const [updatingTemplate, setUpdatingTemplate] = useState(false);

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link'
  ];

  const aliases = [
    { label: `Primary (${user.email})`, value: user.email },
    ...(user.secondary_email ? [{ label: `${user.secondary_email.includes('openenergyservices') ? 'OpenEnergy' : 'Secondary'} (${user.secondary_email})`, value: user.secondary_email }] : []),
    ...gmailAliases.filter(ga => ga.value !== user.email && ga.value !== user.secondary_email)
  ];

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  useEffect(() => {
    fetchTemplates();
    fetchGmailAliases();
  }, []);

  const handleSetDefaultSender = async () => {
    try {
      setUpdatingDefault(true);
      const { error } = await supabase
        .from('users')
        .update({ default_sender_email: fromEmail })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Default sender updated');
    } catch (error) {
      console.error('Error setting default sender:', error);
      toast.error('Failed to update default sender');
    } finally {
      setUpdatingDefault(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplateId) return;
    
    try {
      setUpdatingTemplate(true);
      
      // We need to strip variables back to placeholders if we want to save correctly,
      // but usually the user wants to save the current state as the new template.
      // However, we'll just save the subject and body as is.
      const { error } = await supabase
        .from('email_templates')
        .update({ 
          subject: subject,
          body: body
        })
        .eq('id', selectedTemplateId);

      if (error) throw error;
      
      // Refresh templates
      await fetchTemplates();
      toast.success('Template updated successfully');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    } finally {
      setUpdatingTemplate(false);
    }
  };

  const fetchGmailAliases = async () => {
    if (!user.google_refresh_token) return;
    
    try {
      const response = await fetch('/api/google/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.aliases && data.aliases.length > 0) {
          const formatted = data.aliases.map((a: any) => ({
            label: `${a.name || 'Gmail Alias'} (${a.email})`,
            value: a.email
          }));
          setGmailAliases(formatted);
        }
      }
    } catch (error) {
      console.error('Error fetching Gmail aliases:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setFetchingTemplates(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .in('type', ['intro', 'follow', 'chase', 'custom']);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setFetchingTemplates(false);
    }
  };

  const replaceVariables = (text: string) => {
    if (!text) return '';
    
    // Extract building data if available
    const building = lead.buildings && lead.buildings.length > 0 ? lead.buildings[0] : null;
    const csv = lead.csv_data || {};
    
    const replacements: Record<string, string> = {
      'name': lead.name || lead.company || csv.Name || csv.Contact || 'there',
      'company': lead.company || lead.name || csv.Company || csv.Business || '',
      'roof size': lead.roof_size || (building?.roof_area_estimate ? `${building.roof_area_estimate} SqM` : null) || csv['Roof Size'] || csv.RoofSize || lead.est_system_size || 'N/A',
      'location': lead.location || building?.address || csv.Location || csv.Address || '',
      'email': lead.email || csv.Email || '',
      'phone': lead.phone || csv.Phone || csv.Mobile || '',
      'industry': lead.industry || csv.Industry || 'N/A',
      'property type': lead.property_type || building?.property_type || csv['Property Type'] || 'N/A',
      'roof condition': lead.roof_condition || building?.roof_condition || csv['Roof Condition'] || 'N/A',
      'roof material': lead.roof_material || building?.roof_type || csv['Roof Material'] || 'N/A',
      'orientation': lead.orientation || building?.orientation || csv.Orientation || 'N/A',
      'system size': lead.est_system_size || (building?.max_array_panels_count ? `${(building.max_array_panels_count * 0.4).toFixed(1)} kW` : null) || csv['System Size'] || 'N/A',
    };

    let result = text;
    Object.entries(replacements).forEach(([key, value]) => {
      // Support flexible spacing: {{name}}, {{ name }}, {{  name  }}
      // Also support both snake_case and space separated: {{roof_size}}, {{roof size}}
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const snakeKey = key.replace(/\s+/g, '_');
      
      const pattern = `\\{\\{\\s*(${escapedKey}|${snakeKey})\\s*\\}\\}`;
      const regex = new RegExp(pattern, 'gi');
      result = result.replace(regex, value);
    });

    return result;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(replaceVariables(template.subject));
      setBody(replaceVariables(template.body));
    }
  };

  const handleSend = async () => {
    if (!lead.email) {
      toast.error('Lead has no email address');
      return;
    }

    if (!subject || !body) {
      toast.error('Subject and body are required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          to: lead.email,
          fromEmail: fromEmail,
          subject: subject,
          body: body,
          leadId: lead.id
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send email');

      // Update lead status based on template type
      if (selectedTemplateId) {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template && ['intro', 'follow', 'chase'].includes(template.type)) {
          const statusMap: Record<string, string> = {
            'intro': 'Intro',
            'follow': 'Follow up',
            'chase': 'Chase up'
          };
          const newStatus = statusMap[template.type];
          
          if (newStatus) {
            await supabase
              .from('leads')
              .update({ 
                bd_pipeline_status: newStatus,
                status: newStatus 
              })
              .eq('id', lead.id);
          }
        }
      }

      toast.success('Email sent successfully!');
      setSubject('');
      setBody('');
      setSelectedTemplateId('');
      if (onSendSuccess) onSendSuccess();
    } catch (error: any) {
      console.error('Send Error:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <style jsx global>{`
        .bd-quill-container .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid #f3f4f6;
          padding: 8px 16px;
          background: #f9fafb;
        }
        .bd-quill-container .ql-container.ql-snow {
          border: none;
          font-family: inherit;
          font-size: 0.875rem;
        }
        .bd-quill-container .ql-editor {
          padding: 24px;
          min-height: 200px;
          color: #374151;
        }
        .bd-quill-container .ql-editor.ql-blank::before {
          left: 24px;
          color: #d1d5db;
          font-style: normal;
        }
      `}</style>

      {/* Top Bar - Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          {/* Sender Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative group">
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="appearance-none pl-8 pr-8 py-1.5 text-xs font-semibold bg-white text-gray-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[140px] max-w-[180px] hover:bg-gray-50 truncate"
              >
                {aliases.map(alias => (
                  <option key={alias.value} value={alias.value}>{alias.label}</option>
                ))}
              </select>
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            
            {fromEmail !== user.default_sender_email && (
              <button
                onClick={handleSetDefaultSender}
                disabled={updatingDefault}
                title="Set as Default Sender"
                className="p-1.5 bg-white text-gray-400 hover:text-green-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition-all"
              >
                {updatingDefault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Template Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative group">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                disabled={fetchingTemplates}
                className="appearance-none pl-8 pr-8 py-1.5 text-xs font-semibold bg-white text-gray-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[130px] hover:bg-gray-50 truncate"
              >
                <option value="">Quick Templates</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {selectedTemplateId && isAdmin && (
              <button
                onClick={handleUpdateTemplate}
                disabled={updatingTemplate}
                title="Save Changes to Template"
                className="p-1.5 bg-white text-gray-400 hover:text-blue-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition-all"
              >
                {updatingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Floating Subject Box */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3 z-10">
          <span className="text-[10px] font-black text-blue-600/70 uppercase tracking-[0.2em]">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Type message subject..."
            className="flex-1 text-sm font-bold text-gray-900 border-none focus:ring-0 p-0 placeholder:text-gray-300 bg-transparent"
          />
        </div>

        {/* Full Size Message Content Box */}
        <div className="flex-1 relative flex flex-col p-0 bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto bd-quill-container">
            <ReactQuill
              theme="snow"
              value={body}
              onChange={setBody}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Compose your message here..."
              className="h-full"
            />
          </div>

          {/* Floating Send Button */}
          <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
            {user.email_signature && user.email_signature !== '<p><br></p>' && (
              <span className="text-[10px] text-gray-400 font-medium bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm">
                Signature will be appended
              </span>
            )}
            <button
              onClick={handleSend}
              disabled={loading || !lead.email}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-xs font-black rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-200 active:scale-95 uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Email
            </button>
          </div>
        </div>

        {/* Footer info / Error state */}
        {!lead.email && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-bold flex items-center gap-2 border-t border-red-100 backdrop-blur-sm">
            <AlertCircle className="w-3.5 h-3.5" />
            MISSING RECIPIENT EMAIL: PLEASE UPDATE LEAD RECORD TO ENABLE SENDING
          </div>
        )}
      </div>
    </div>
  );
}
