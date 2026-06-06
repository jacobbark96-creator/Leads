import React from 'react';
import { X, Phone, Mail, Clock } from 'lucide-react';

interface AdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisor: {
    name: string;
    email: string;
    phone: string;
    job_title: string;
    about: string;
    working_hours: string;
    avatar_url?: string | null;
  } | null;
}

export function AdvisorModal({ isOpen, onClose, advisor }: AdvisorModalProps) {
  if (!isOpen || !advisor) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full border border-[#39CCCC]/20">
          <div className="absolute top-0 right-0 pt-4 pr-4 z-10">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900"></div>
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(57,204,204,0.35),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.25),transparent_55%)]"></div>
            <div className="relative z-10 px-6 py-10 sm:px-8 sm:py-12 text-white">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-md shadow-lg flex items-center justify-center">
                  {advisor.avatar_url ? (
                    <img src={advisor.avatar_url} alt={advisor.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-extrabold text-2xl">
                      {(advisor.name || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">{advisor.name}</h3>
                  <p className="text-sm sm:text-base text-slate-200 font-medium mt-1 truncate">{advisor.job_title || 'Personal Account Manager'}</p>
                  <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-[#39CCCC]/35 text-cyan-100">
                    Openlead Support
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:p-8 space-y-6 bg-white">
            
            {advisor.about && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">About</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{advisor.about}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone</p>
                    {advisor.phone ? (
                      <a href={`tel:${advisor.phone}`} className="text-sm font-bold text-slate-900 hover:text-[#39CCCC] transition-colors">
                        {advisor.phone}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-slate-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Email</p>
                    <a href={`mailto:${advisor.email}`} className="text-sm font-bold text-slate-900 hover:text-[#39CCCC] transition-colors truncate block">
                      {advisor.email}
                    </a>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Working Hours</p>
                    <p className="text-sm font-semibold text-slate-900">{advisor.working_hours || 'Mon-Fri, 9:00 AM - 5:00 PM'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
            <button
              type="button"
              className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-5 py-2.5 bg-slate-900 text-sm font-extrabold text-white hover:bg-slate-800 focus:outline-none"
              onClick={onClose}
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
