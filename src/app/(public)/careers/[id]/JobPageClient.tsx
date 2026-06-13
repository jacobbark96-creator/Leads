'use client';

import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  CheckCircle2, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface Job {
  id: string;
  title: string;
}

export default function JobPageClient({ job, variant = 'sidebar' }: { job: Job, variant?: 'sidebar' | 'hero' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cover_letter: ''
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      toast.error('Please upload your resume');
      return;
    }
    setLoading(true);

    try {
      // 1. Upload Resume
      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${job.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resumeFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // 3. Insert Application
      const { error } = await supabase
        .from('job_applications')
        .insert([{
          job_id: job.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cover_letter: formData.cover_letter,
          resume_url: publicUrl,
          status: 'pending'
        }]);

      if (error) throw error;

      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'hero') {
    return (
      <>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full py-4 bg-openlead-blue text-white font-black rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all"
        >
          Apply Now
        </button>

        {isModalOpen && (
          <ModalContent 
            job={job} 
            onClose={() => setIsModalOpen(false)} 
            onSubmit={handleSubmit}
            loading={loading}
            submitted={submitted}
            formData={formData}
            setFormData={setFormData}
            resumeFile={resumeFile}
            setResumeFile={setResumeFile}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full py-5 bg-openlead-blue text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-openlead-blue/90 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
        >
          Apply for this Role
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
          Takes less than 5 minutes
        </p>
      </div>

      {isModalOpen && (
        <ModalContent 
          job={job} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleSubmit}
          loading={loading}
          submitted={submitted}
          formData={formData}
          setFormData={setFormData}
          resumeFile={resumeFile}
          setResumeFile={setResumeFile}
        />
      )}
    </>
  );
}

function ModalContent({ 
  job, 
  onClose, 
  onSubmit, 
  loading, 
  submitted, 
  formData, 
  setFormData,
  resumeFile,
  setResumeFile
}: any) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
      <div className="min-h-screen px-4 py-24 md:py-32 flex items-start justify-center">
        {/* Backdrop overlay for closing */}
        <div className="fixed inset-0" onClick={onClose}></div>

        <div className="relative bg-white rounded-[32px] w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="p-8 md:p-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Apply Now</h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Applying for <span className="text-openlead-blue font-bold">{job.title}</span></p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {submitted ? (
              <div className="py-10 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900">Application Received!</h3>
                  <p className="text-sm text-slate-500">Thank you for applying. Our recruitment team will review your application and get back to you soon.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                    <input 
                      required
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                    <input 
                      required
                      type="email"
                      placeholder="john@example.com"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      placeholder="+44 7000 000000"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Resume / CV</label>
                    <div className="relative">
                      <input 
                        required
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="resume-upload"
                      />
                      <label 
                        htmlFor="resume-upload"
                        className="flex items-center gap-3 w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm cursor-pointer hover:bg-slate-100 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                          <Paperclip className={`w-5 h-5 ${resumeFile ? 'text-openlead-blue' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold truncate ${resumeFile ? 'text-slate-900' : 'text-slate-400'}`}>
                            {resumeFile ? resumeFile.name : 'Upload your CV (PDF, DOC)'}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Cover Letter (Optional)</label>
                  <textarea 
                    rows={4}
                    placeholder="Tell us why you're a great fit..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 transition-all resize-none"
                    value={formData.cover_letter}
                    onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
                  />
                </div>

                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full py-5 bg-openlead-blue text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-openlead-blue/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Application
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
