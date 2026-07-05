"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, Quote } from 'lucide-react';
import Image from 'next/image';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  address: z.string().optional(),
  other_contacts: z.string().optional(),
  other_contact_numbers: z.string().optional(),
}).superRefine((data, ctx) => {
  // We only require these fields if the user is actually trying to sign up.
  // The logic for isSignUp is handled in the component, so we will validate these inside onSubmit manually
  // or we can just let Zod handle the base schema and do a manual check in onSubmit.
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { user, profile } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const router = useRouter();

  const getHomePath = () => {
    if (!profile) return '/';
    if (profile.role === 'client') return '/client-portal';
    return '/staff';
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'client') {
        if (profile.is_approved === false) {
          router.replace('/pending-approval');
        } else {
          router.replace('/client-portal');
        }
      } else {
        router.replace('/staff');
      }
    }
  }, [user, profile, router]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset instructions sent to your email.');
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    if (isSignUp) {
      if (!data.name || !data.name.trim()) return toast.error('Full Name is required');
      if (!data.company_name || !data.company_name.trim()) return toast.error('Company Name is required');
      if (!data.phone || !data.phone.trim()) return toast.error('Phone Number is required');
      if (!data.address || !data.address.trim()) return toast.error('Business Address is required');
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/email-confirmed`,
            data: {
              full_name: data.name || '',
              phone: data.phone || '',
              company_name: data.company_name || '',
              address: data.address || '',
              other_contacts: data.other_contacts || '',
              other_contact_numbers: data.other_contact_numbers || '',
            }
          }
        });
        if (error) throw error;
        toast.success('Registration successful!');
        
        // Redirect to the check-email page instead of staying on login
        if (signUpData.user) {
          router.replace(`/check-email?email=${encodeURIComponent(data.email)}`);
        }
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        // Successful login
        toast.success('Successfully logged in!');
        
        if (authData.user) {
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
            
          if (profileData) {
            useAuthStore.getState().setProfile(profileData);
            if (profileData.role === 'client') {
              if (profileData.is_approved === false) {
                router.replace('/pending-approval');
              } else {
                router.replace('/client-portal');
              }
            } else {
              router.replace('/staff');
            }
          } else {
            router.replace('/pending-approval');
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 xl:px-24 relative bg-slate-50/30 lg:bg-white py-12 lg:py-0">
        <div className="absolute top-6 left-6 lg:top-8 lg:left-8">
          <a href={getHomePath()} className="inline-flex items-center text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 lg:text-slate-500 hover:text-slate-900 transition-colors bg-white lg:bg-transparent px-3 py-1.5 lg:p-0 rounded-full border border-slate-100 lg:border-0 shadow-sm lg:shadow-none">
            <ArrowLeft className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5 lg:mr-2" /> Back
          </a>
        </div>
        
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10 text-center lg:text-left">
            <img src="/openlead-logo.png" alt="Openlead" className="h-10 lg:h-8 object-contain mb-8 mx-auto lg:mx-0" />
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-tight">
              {isForgotPassword 
                ? 'Reset Password' 
                : isSignUp 
                  ? 'Join Openlead' 
                  : 'Welcome Back'}
            </h2>
            <p className="mt-3 text-sm lg:text-base text-slate-500 font-medium leading-relaxed">
              {isForgotPassword 
                ? "Enter your email and we'll send you a link to reset your password."
                : isSignUp 
                  ? "Start getting exclusive, high-intent leads today."
                  : "Sign in to access your exclusive leads and CRM."}
            </p>
          </div>

          <div className="mt-8">
            {isForgotPassword ? (
              <form className="space-y-6" onSubmit={handlePasswordReset}>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email address</label>
                  <div className="mt-1">
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-openlead-blue hover:bg-openlead-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-openlead-blue disabled:opacity-50 transition-all duration-200"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-xs font-black text-openlead-blue hover:text-openlead-blue/80 transition-colors uppercase tracking-widest"
                  >
                    I remember my password
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email address</label>
                    <div className="mt-1">
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                      />
                      {errors.email && <p className="mt-2 text-xs font-bold text-red-500 ml-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 ml-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[10px] font-black text-openlead-blue hover:text-openlead-blue/80 transition-colors uppercase tracking-widest"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="mt-1">
                      <input
                        {...register('password')}
                        type="password"
                        placeholder="••••••••"
                        className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                      />
                      {errors.password && <p className="mt-2 text-xs font-bold text-red-500 ml-1">{errors.password.message}</p>}
                    </div>
                  </div>

                  {isSignUp && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                        <div className="mt-1">
                          <input
                            {...register('name')}
                            type="text"
                            placeholder="John Doe"
                            className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                          />
                          {errors.name && <p className="mt-2 text-xs font-bold text-red-500 ml-1">{errors.name.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Company Name</label>
                        <div className="mt-1">
                          <input
                            {...register('company_name')}
                            type="text"
                            placeholder="Acme Corp"
                            className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                          />
                          {errors.company_name && <p className="mt-2 text-xs font-bold text-red-500 ml-1">{errors.company_name.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                        <div className="mt-1">
                          <input
                            {...register('phone')}
                            type="tel"
                            placeholder="+44 123 456 7890"
                            className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                          />
                          {errors.phone && <p className="mt-2 text-xs font-bold text-red-500 ml-1">{errors.phone.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Business Address</label>
                        <div className="mt-1">
                          <input
                            {...register('address')}
                            type="text"
                            placeholder="123 Business Rd, London"
                            className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                          />
                          {errors.address && <p className="mt-2 text-xs font-bold text-red-500 ml-1">{errors.address.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Other Contacts</label>
                          <div className="mt-1">
                            <input
                              {...register('other_contacts')}
                              type="text"
                              placeholder="Jane Smith"
                              className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Other Numbers</label>
                          <div className="mt-1">
                            <input
                              {...register('other_contact_numbers')}
                              type="tel"
                              placeholder="07712345678"
                              className="appearance-none block w-full px-5 py-4 border border-slate-200 lg:border-slate-300 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-openlead-blue/20 focus:border-openlead-blue text-base lg:text-sm transition-all bg-white/50 lg:bg-white backdrop-blur-sm lg:backdrop-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-[0_8px_30px_rgb(57,204,204,0.3)] hover:shadow-[0_8px_30px_rgb(57,204,204,0.5)] hover:-translate-y-0.5 text-sm font-black text-white bg-openlead-blue disabled:opacity-50 transition-all duration-300"
                    >
                      {isLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                  </div>
                </form>

                <div className="mt-10">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100 lg:border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
                      <span className="px-4 bg-slate-50/30 lg:bg-white text-slate-400">Or</span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="w-full flex justify-center py-4 px-4 border-2 border-slate-200 rounded-2xl shadow-sm text-sm font-black text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                    >
                      {isSignUp ? 'Sign in to existing account' : 'Create a new account'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Right Side - Graphic/Value Prop */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-slate-900">
        <Image
          src="https://images.unsplash.com/photo-1555421689-491a97ff2040?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Modern architecture"
          fill
          className="object-cover object-center opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        
        <div className="relative z-10 flex flex-col justify-end p-12 lg:p-16 xl:p-24 w-full h-full">
          <div className="max-w-md">
            <Quote className="w-10 h-10 text-openlead-blue mb-6 opacity-80" />
            <blockquote className="text-2xl font-medium text-white mb-6 leading-snug">
              "Switching to Openlead was the best decision for our roofing company. The exclusivity of the leads means we're actually closing deals, not just racing to the bottom on price."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden relative">
                <Image 
                  src="https://i.pravatar.cc/150?img=11"
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-white font-bold text-base">James Carter</p>
                <p className="text-slate-400 text-sm">Director, Apex Roofing</p>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-700/50 grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">100% Exclusive Leads</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">Built-in CRM</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">High Intent Prospects</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-openlead-blue shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-300">Predictable Growth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}