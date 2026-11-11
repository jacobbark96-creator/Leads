"use client";

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Bot, User, Sparkles, Command, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LoadingState = () => {
  const facts = [
    "Scanning the database...",
    "Judging your sales reps' call times...",
    "Finding out who's actually working today...",
    "Cross-referencing lead activity...",
    "Formulating a sufficiently sarcastic response...",
    "Did you know? Fast responses increase conversions by 400%."
  ];
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 my-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center shrink-0 shadow-md border border-slate-700">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center max-w-[85%]">
         <AnimatePresence mode="wait">
           <motion.div 
             key={factIndex}
             initial={{ opacity: 0, y: 4 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -4 }}
             transition={{ duration: 0.2 }}
             className="text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent animate-pulse"
           >
             {facts[factIndex]}
           </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

export const AIAssistantWidget = () => {
  const { profile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  
  const sarcasticGreetings = [
    "Oh, you again. What do you want now?",
    "Sigh... yes? I was in the middle of a digital nap.",
    "Welcome back. Try not to break anything this time. How can I 'help'?",
    "Let me guess, you need me to do your job for you again?",
    "I'm awake, I'm awake! What's the emergency now?",
    "I have access to the entire database, and you're going to ask me something trivial, aren't you?"
  ];

  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setMessages([{ 
      role: 'model', 
      content: sarcasticGreetings[Math.floor(Math.random() * sarcasticGreetings.length)] 
    }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Strict Security Checks
  console.log("AIAssistantWidget Evaluated", { mounted, role: profile?.role, ai_chat_enabled: profile?.ai_chat_enabled, pathname });

  if (!mounted || !profile) return null;
  if (profile.role !== 'super_admin') return null;
  if (!profile.ai_chat_enabled) return null;
  
  // We want it across all CRM pages, so we check if the pathname includes 'crm' 
  // (which matches /admin-crm, /sales-crm, /contractor-crm)
  if (!pathname?.includes('crm')) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (err: any) {
      console.error('AI Error:', err);
      toast.error('Failed to get response from AI');
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center justify-center z-[9999] transition-all hover:scale-105 border border-slate-700 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Command className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 left-6 w-96 max-h-[600px] h-[80vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden z-[9999] border border-gray-200/50"
          >
            {/* Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-inner">
                  <Command className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-wide">CRM Intelligence</h3>
                  <p className="text-[10px] text-indigo-200/80 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Read-Only Access
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="relative z-10 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg border border-transparent hover:border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-gray-50/50 to-white/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-tr from-slate-800 to-slate-900 border-slate-700 text-white' 
                      : 'bg-white border-gray-200 text-indigo-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Command className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[90%] min-w-0 rounded-2xl px-4 py-3 text-sm shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-tr-sm border-slate-800' 
                      : 'bg-white border-gray-100/80 text-slate-800 rounded-tl-sm prose prose-sm prose-indigo max-w-none overflow-hidden'
                  }`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-600" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-600" {...props} />,
                          li: ({node, ...props}) => <li className="leading-snug" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                          table: ({node, ...props}) => <div className="w-full overflow-x-auto mb-2 rounded-lg border border-gray-100"><table className="min-w-full divide-y divide-gray-100" {...props} /></div>,
                          th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50" {...props} />,
                          td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 border-t border-gray-50" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {loading && <LoadingState />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white/80 backdrop-blur-xl border-t border-gray-100 shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-gray-50/80 border border-gray-200/60 rounded-full p-1 pl-4 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/30 transition-all shadow-inner">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about installers or leads..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 placeholder:text-slate-400"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 shadow-md"
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </form>
              <div className="text-center mt-2 flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] text-slate-400 font-medium tracking-wider uppercase">
                  AI Responses may be inaccurate
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
