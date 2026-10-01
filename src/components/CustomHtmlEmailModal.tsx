import React, { useState, useEffect } from 'react';
import { X, Send, Users, Eye, Code } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function CustomHtmlEmailModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async () => {
    if (selectedEmails.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!htmlContent.trim()) {
      toast.error('Please enter HTML content');
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/admin/send-html-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedEmails,
          subject,
          html: htmlContent
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');

      toast.success('Email sent successfully!');
      onClose();
      // Reset form
      setSelectedEmails([]);
      setSubject('');
      setHtmlContent('');
      setPreviewMode(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Send HTML Email
            </h2>
            <p className="text-sm text-gray-500 mt-1">Send a custom HTML email via Resend to selected staff or clients.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Sidebar - Recipients */}
          <div className="w-full md:w-1/3 border-r border-gray-100 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                Recipients ({selectedEmails.length})
              </h3>
              <input 
                type="text" 
                placeholder="Search name, email, or role..." 
                className="w-full text-sm rounded-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setSelectedEmails(filteredUsers.map(u => u.email).filter(Boolean))}
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  Select All
                </button>
                <button 
                  onClick={() => setSelectedEmails([])}
                  className="text-xs text-gray-500 font-medium hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loadingUsers ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map(user => user.email && (
                    <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedEmails.includes(user.email)}
                        onChange={() => toggleEmail(user.email)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-gray-800 truncate">{user.name || 'Unnamed'}</span>
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                      </div>
                      <span className="ml-auto text-[10px] font-bold px-2 py-1 bg-gray-200 text-gray-600 rounded-md uppercase">
                        {user.role}
                      </span>
                    </label>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center p-4">No users found.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Area - Composer */}
          <div className="w-full md:w-2/3 flex flex-col bg-white">
            <div className="p-4 border-b border-gray-100 shrink-0">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
              <input 
                type="text" 
                className="w-full font-medium rounded-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email Subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
            
            <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
              <button
                onClick={() => setPreviewMode(false)}
                className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${!previewMode ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Code className="w-4 h-4" /> HTML Code
              </button>
              <button
                onClick={() => setPreviewMode(true)}
                className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${previewMode ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {!previewMode ? (
                <textarea 
                  className="absolute inset-0 w-full h-full resize-none border-none p-4 font-mono text-sm bg-slate-900 text-green-400 focus:ring-0"
                  placeholder="<!-- Paste your HTML email code here -->"
                  value={htmlContent}
                  onChange={e => setHtmlContent(e.target.value)}
                />
              ) : (
                <div 
                  className="absolute inset-0 w-full h-full overflow-y-auto bg-white p-6"
                >
                  <div 
                    className="max-w-2xl mx-auto border border-gray-200 shadow-sm min-h-full"
                    dangerouslySetInnerHTML={{ __html: htmlContent || '<p style="color: #999; text-align: center; padding: 20px;">No HTML content to preview.</p>' }} 
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending || selectedEmails.length === 0 || !subject || !htmlContent}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-md"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sending ? 'Sending...' : `Send to ${selectedEmails.length} recipient${selectedEmails.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
