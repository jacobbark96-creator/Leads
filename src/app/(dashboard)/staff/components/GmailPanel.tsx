import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { Mail, Search, Inbox, Send, Archive, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import toast from 'react-hot-toast';

const GmailPanelContent = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
      fetchEmails(savedToken);
    }
  }, []);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: (tokenResponse) => {
      const token = tokenResponse.access_token;
      setAccessToken(token);
      localStorage.setItem('google_access_token', token);
      fetchEmails(token);
      toast.success('Successfully connected to Gmail!');
    },
    onError: (error) => {
      console.error('Google Login Failed', error);
      toast.error('Failed to connect to Gmail');
    }
  });

  const handleLogout = () => {
    setAccessToken(null);
    setEmails([]);
    localStorage.removeItem('google_access_token');
    toast.success('Disconnected from Gmail');
  };

  const fetchEmails = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          throw new Error('Session expired, please reconnect');
        }
        throw new Error('Failed to fetch emails');
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

  return (
    <GlassCard delay={0.7} className="p-4 flex flex-col h-full relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white">Gmail</h2>
        </div>
        <div className="flex items-center gap-3">
          {accessToken && (
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Disconnect">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
          <Search className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      <div className="flex gap-4 mb-4 border-b border-white/10 pb-2">
        <div className="text-xs font-medium text-white cursor-pointer relative pb-1">
          <Inbox className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
          Inbox
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 rounded-t-full"></div>
        </div>
        <div className="text-xs font-medium text-gray-400 hover:text-gray-200 cursor-pointer pb-1 transition-colors">
          <Send className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
          Sent
        </div>
        <div className="text-xs font-medium text-gray-400 hover:text-gray-200 cursor-pointer pb-1 transition-colors">
          <Archive className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
          Archive
        </div>
      </div>
      
      {!hasClientId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
          <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-[10px] text-gray-300 font-medium">Google Client ID is missing</p>
          <p className="text-[9px] text-gray-500 mt-1">Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env file to enable Gmail integration.</p>
        </div>
      ) : !accessToken ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Mail className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">Connect your account</p>
          <button 
            onClick={() => login()}
            className="mt-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-1.5 px-4 rounded-lg transition-colors border border-white/10 flex items-center gap-2"
          >
            Sign in with Google
          </button>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-6 h-6 text-red-400 animate-spin mb-2" />
          <p className="text-[10px] text-gray-400">Loading emails...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Mail className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">Inbox is empty</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {emails.map((email, i) => (
            <div key={i} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border-l-2 border-transparent hover:border-red-400">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-gray-200 truncate pr-2">{email.sender}</span>
                <span className="text-[9px] text-gray-500 shrink-0">{email.time}</span>
              </div>
              <h4 className="text-[11px] font-semibold text-white truncate">{email.subject}</h4>
              <p className="text-[10px] text-gray-400 truncate">{email.preview}</p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
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