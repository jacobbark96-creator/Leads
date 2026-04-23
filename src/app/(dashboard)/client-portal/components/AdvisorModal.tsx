import React from 'react';
import { X, User, Phone, Mail, Clock, Briefcase } from 'lucide-react';

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
  } | null;
}

export function AdvisorModal({ isOpen, onClose, advisor }: AdvisorModalProps) {
  if (!isOpen || !advisor) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
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

          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-10 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold">{advisor.name}</h3>
              <p className="text-blue-100 font-medium mt-1">{advisor.job_title || 'Personal Account Manager'}</p>
            </div>
          </div>

          <div className="px-6 py-6 sm:p-8 space-y-6">
            
            {advisor.about && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">About</h4>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {advisor.about}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                  <a href={`tel:${advisor.phone}`} className="text-sm font-bold text-blue-600 hover:text-blue-800">
                    {advisor.phone || 'Not provided'}
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                  <a href={`mailto:${advisor.email}`} className="text-sm font-bold text-blue-600 hover:text-blue-800 truncate block w-48">
                    {advisor.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start sm:col-span-2 mt-2">
                <Clock className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</p>
                  <p className="text-sm font-medium text-gray-900">
                    {advisor.working_hours || 'Mon-Fri, 9:00 AM - 5:00 PM'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
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