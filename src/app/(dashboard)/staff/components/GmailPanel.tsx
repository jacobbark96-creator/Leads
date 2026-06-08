"use client";

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Mail, Search, Inbox, Send, Archive, LogOut, Loader2, AlertCircle, PenTool, X, Save, ArrowLeft, Reply, ExternalLink } from 'lucide-react';
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { EmailModal } from '@/components/EmailModal';
import { EmailDetailModal } from './EmailDetailModal';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const decodeGmailBody = (data: string) => {
  try {
    const decoded = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    // Handle UTF-8
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error('Failed to decode body', e);
    return '';
  }
};

const getEmailBody = (payload: any): string => {
  if (!payload) return '';
  
  if (payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }

  if (payload.parts) {
    // Try to find text/html first, then text/plain
    const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
    if (htmlPart?.body?.data) return decodeGmailBody(htmlPart.body.data);

    const plainPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
    if (plainPart?.body?.data) return decodeGmailBody(plainPart.body.data);

    // Recursive search in nested parts
    for (const part of payload.parts) {
      const nestedBody = getEmailBody(part);
      if (nestedBody) return nestedBody;
    }
  }

  return '';
};

const GmailPanelContent = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [fetchingFullEmail, setFetchingFullEmail] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'ARCHIVE'>('INBOX');
  
  const { profile, setProfile } = useAuthStore();
  const [signature, setSignature] = useState(profile?.email_signature || '');
  const [savingSignature, setSavingSignature] = useState(false);

  const signatureModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['link', 'image'],
      ['clean']
    ],
  };

  const signatureFormats = [
    'bold', 'italic', 'underline',
    'link', 'image'
  ];

  const fetchFullEmail = async (messageId: string) => {
    if (!accessToken) return;
    try {
      setFetchingFullEmail(true);
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch full email');
      const data = await res.json();
      
      const body = getEmailBody(data.payload);
      const headers = data.payload.headers || [];
      const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
      const fromEmail = fromHeader.includes('<') ? fromHeader.match(/<([^>]+)>/)?.[1] : fromHeader;
      
      setSelectedEmail({
        ...selectedEmail,
        body,
        fromEmail,
        fullData: data
      });
      setIsDetailModalOpen(true);
    } catch (error) {
      toast.error('Failed to load email content');
    } finally {
      setFetchingFullEmail(false);
    }
  };

  const handleEmailClick = (email: any) => {
    setSelectedEmail(email);
    fetchFullEmail(email.id);
  };

  const handleReply = () => {
    setIsReplyModalOpen(true);
  };

  useEffect(() => {
    if (profile?.id) {
      refreshGoogleToken();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.email_signature) {
      setSignature(profile.email_signature);
    }
  }, [profile?.email_signature]);

  const handleSaveSignature = async () => {
    if (!profile?.id) return;
    try {
      setSavingSignature(true);
      const { error } = await supabase
        .from('users')
        .update({ email_signature: signature })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, email_signature: signature });
      toast.success('Signature saved!');
      setIsSignatureModalOpen(false);
    } catch (error) {
      toast.error('Failed to save signature');
    } finally {
      setSavingSignature(false);
    }
  };

  const refreshGoogleToken = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.has_token === false) {
          setAccessToken(null);
          setLoading(false);
          return;
        }
        setAccessToken(data.access_token);
        fetchEmails(data.access_token);
      } else if (res.status === 401) {
        // Token was invalid and has been cleared by the server
        setAccessToken(null);
      }
    } catch (error) {
      console.error('Failed to refresh token', error);
    } finally {
      setLoading(false);
    }
  };

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.readonly',
    flow: 'auth-code',
    prompt: 'consent select_account',
    // @ts-ignore
    access_type: 'offline',
    onSuccess: async (codeResponse) => {
      console.log('Google login success, received code:', codeResponse.code ? 'yes' : 'no');
      console.log('Current profile ID:', profile?.id);
      
      try {
        setLoading(true);
        if (!profile?.id) {
          throw new Error('User profile not loaded. Please refresh and try again.');
        }

        const res = await fetch('/api/google/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code: codeResponse.code,
            userId: profile.id
          })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          console.error('Google Auth Error Details:', data);
          throw new Error(data.details || data.error || 'Failed to exchange code');
        }
        
        setAccessToken(data.access_token);
        fetchEmails(data.access_token);
        toast.success('Successfully connected to Google!');
      } catch (error: any) {
        console.error('Auth exchange failed', error);
        toast.error(error.message || 'Failed to connect to Google');
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Failed', error);
      toast.error('Failed to connect to Google');
    }
  });

  const handleLogout = async () => {
    if (accessToken) {
      try {
        // Revoke the token from Google so that next time they connect, they get a new refresh token
        await fetch('https://oauth2.googleapis.com/revoke?token=' + accessToken, {
          method: 'POST',
          headers: { 'Content-type': 'application/x-www-form-urlencoded' }
        });
      } catch (e) {
        console.error('Failed to revoke Google token', e);
      }
    }

    setAccessToken(null);
    setEmails([]);
    
    if (profile?.id) {
      // Clear refresh token from DB via server route to bypass RLS
      try {
        await fetch('/api/google/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id })
        });
      } catch (error) {
        console.error('Error clearing refresh token', error);
      }
    }
    
    toast.success('Disconnected from Google');
  };

  const fetchEmails = async (token: string, label: string = 'INBOX') => {
    setLoading(true);
    try {
      const query = label === 'INBOX' ? 'label:INBOX' : label === 'SENT' ? 'label:SENT' : 'label:TRASH';
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          throw new Error('Session expired, please reconnect');
        }
        const errorData = await res.text();
        console.error('Gmail API Error Response:', errorData);
        throw new Error('Failed to fetch emails. Check console for details.');
      }

      const data = await res.json();
      const messages = data.messages || [];
      
      const emailDetails = await Promise.all(
        messages.map(async (msg: any) => {
          const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const msgData = await msgRes.json();
          
          const headers = msgData.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
          let from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          
          if (from.includes('<')) {
            from = from.split('<')[0].trim();
          }

          const dateStr = headers.find((h: any) => h.name === 'Date')?.value;
          let time = '';
          if (dateStr) {
            const date = new Date(dateStr);
            const isToday = new Date().toDateString() === date.toDateString();
            time = isToday ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          }

          return {
            id: msg.id,
            subject,
            sender: from,
            preview: msgData.snippet || '',
            time
          };
        })
      );

      setEmails(emailDetails);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error loading emails');
    } finally {
      setLoading(false);
    }
  };

  const hasClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleTabChange = (tab: 'INBOX' | 'SENT' | 'ARCHIVE') => {
    setActiveTab(tab);
    if (accessToken) {
      fetchEmails(accessToken, tab);
    }
  };

  return (
    <>
      <GlassCard delay={0.7} className="p-4 flex flex-col h-full relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-red-400" />
            <h2 className="text-base font-semibold text-white">Gmail</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSignatureModalOpen(true)}
              className="text-gray-400 hover:text-blue-400 transition-colors"
              title="Edit Email Signature"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>
            {accessToken && (
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Disconnect">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
            <Search className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>

        {isSignatureModalOpen && (
          <div className="absolute inset-0 z-50 bg-[#0a0a14]/95 backdrop-blur-md rounded-2xl p-4 flex flex-col border border-white/10 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PenTool className="w-3.5 h-3.5 text-blue-400" />
                Edit Signature
              </h3>
              <button onClick={() => setIsSignatureModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-white rounded-xl overflow-hidden mb-3">
              <ReactQuill
                theme="snow"
                value={signature}
                onChange={setSignature}
                modules={signatureModules}
                formats={signatureFormats}
                placeholder="Kind Regards, John Smith"
                className="h-full signature-quill"
              />
            </div>
            
            <style jsx global>{`
              .signature-quill .ql-container {
                height: 150px;
                font-size: 12px;
                color: #374151;
              }
              .signature-quill .ql-editor {
                padding: 12px;
              }
              .signature-quill .ql-toolbar {
                border: none !important;
                border-bottom: 1px solid #e5e7eb !important;
                background: #f9fafb;
                padding: 4px 8px !important;
              }
              .signature-quill .ql-container {
                border: none !important;
              }
            `}</style>
            
            {profile?.divisions?.logo_url && (
              <div className="mb-3 p-2 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-wider">Division Logo (Appended to signature)</p>
                <img src={profile.divisions.logo_url} alt="Division Logo" className="max-h-12 w-auto" />
              </div>
            )}
            
            <button
              onClick={handleSaveSignature}
              disabled={savingSignature}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {savingSignature ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Signature
            </button>
          </div>
        )}

        <div className="flex gap-3 sm:gap-4 mb-4 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar no-scrollbar">
          <div 
            onClick={() => handleTabChange('INBOX')}
            className={`text-xs sm:text-sm font-medium cursor-pointer relative pb-1 transition-colors shrink-0 ${activeTab === 'INBOX' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Inbox className="w-3 sm:w-3.5 h-3 sm:h-3.5 inline mr-1 sm:mr-1.5 mb-0.5" />
            Inbox
            {activeTab === 'INBOX' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 rounded-t-full"></div>}
          </div>
          <div 
            onClick={() => handleTabChange('SENT')}
            className={`text-xs sm:text-sm font-medium cursor-pointer relative pb-1 transition-colors shrink-0 ${activeTab === 'SENT' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Send className="w-3 sm:w-3.5 h-3 sm:h-3.5 inline mr-1 sm:mr-1.5 mb-0.5" />
            Sent
            {activeTab === 'SENT' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 rounded-t-full"></div>}
          </div>
          <div 
            onClick={() => handleTabChange('ARCHIVE')}
            className={`text-xs sm:text-sm font-medium cursor-pointer relative pb-1 transition-colors shrink-0 ${activeTab === 'ARCHIVE' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Archive className="w-3 sm:w-3.5 h-3 sm:h-3.5 inline mr-1 sm:mr-1.5 mb-0.5" />
            Archive
            {activeTab === 'ARCHIVE' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 rounded-t-full"></div>}
          </div>
        </div>
        
        {!hasClientId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
            <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-[11px] text-gray-300 font-medium">Google Client ID is missing</p>
            <p className="text-[10px] text-gray-500 mt-1">Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env file to enable Gmail integration.</p>
          </div>
        ) : !accessToken ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Connect your account</p>
            <button 
              onClick={() => login()}
              className="mt-3 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold py-1.5 px-4 rounded-lg transition-colors border border-white/10 flex items-center gap-2"
            >
              Sign in with Google
            </button>
          </div>
        ) : loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-6 h-6 text-red-400 animate-spin mb-2" />
            <p className="text-[11px] text-gray-400">Loading emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Inbox is empty</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2 relative">
            {fetchingFullEmail && (
              <div className="absolute inset-0 z-10 bg-[#0a0a14]/40 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
                <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
              </div>
            )}
            {emails.map((email, i) => (
              <div 
                key={i} 
                onClick={() => handleEmailClick(email)}
                className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border-l-2 border-transparent hover:border-red-400"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-200 truncate pr-2">{email.sender}</span>
                  <span className="text-[10px] text-gray-500 shrink-0">{email.time}</span>
                </div>
                <h4 className="text-xs font-semibold text-white truncate">{email.subject}</h4>
                <p className="text-[11px] text-gray-400 truncate">{email.preview}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Lightbox Modal for Reading Email - Moved outside GlassCard to avoid stacking context issues */}
      <EmailDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        email={selectedEmail}
        onReply={handleReply}
      />

      {isReplyModalOpen && selectedEmail && (
        <EmailModal 
          isOpen={isReplyModalOpen}
          onClose={() => setIsReplyModalOpen(false)}
          lead={{
            email: selectedEmail.fromEmail,
            name: selectedEmail.sender,
            company: 'Gmail Reply'
          }}
          defaultType="custom"
        />
      )}
    </>
  );
};

export const GmailPanel = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId || "placeholder"}>
      <GmailPanelContent />
    </GoogleOAuthProvider>
  );
};