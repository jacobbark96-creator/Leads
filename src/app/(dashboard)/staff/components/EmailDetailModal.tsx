"use client";

import React from 'react';
import { X, Reply, Mail, Clock, User, ArrowLeft } from 'lucide-react';

interface EmailDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: any;
  onReply: () => void;
}

export const EmailDetailModal = ({ isOpen, onClose, email, onReply }: EmailDetailModalProps) => {
  if (!isOpen || !email) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20 flex flex-col animate-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-bold truncate max-w-md">{email.subject}</h3>
              <p className="text-gray-400 text-xs">View Email Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onReply}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Email Metadata */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-700">{email.sender}</span>
            <span className="text-xs text-gray-400">&lt;{email.fromEmail}&gt;</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{email.time}</span>
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
          <style dangerouslySetInnerHTML={{ __html: `
            .email-content-view img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
            .email-content-view a { color: #2563eb; text-decoration: underline; font-weight: 500; }
            .email-content-view p { margin-bottom: 1rem; line-height: 1.6; color: #374151; }
            .email-content-view ul, .email-content-view ol { margin-left: 1.5rem; margin-bottom: 1rem; }
            .email-content-view blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; color: #6b7280; font-style: italic; margin: 1rem 0; }
          `}} />
          <div 
            className="email-content-view text-sm"
            dangerouslySetInnerHTML={{ __html: email.body || '<p class="text-gray-500 italic text-center py-8">No content found for this email.</p>' }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Secure Gmail Integration</p>
          <button 
            onClick={onClose}
            className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
};
