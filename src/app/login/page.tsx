"use client";
import React, { useState, useEffect } from 'react';
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

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'client') {
        if (profile.is_approved === false) {
          window.location.href = '/pending-approval';
        } else {
          window.location.href = '/my-openlead';
        }
      } else {
        window.location.href = '/staff';
      }
    }
  }, [user, profile]);

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
          window.location.href = `/check-email?email=${encodeURIComponent(data.email)}`;
        }
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        // Successful login
        toast.success('Successfully logged in!');
        
        // Force a full page reload to the dashboard to clear all state
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
                window.location.href = '/pending-approval';
              } else {
                window.location.href = '/my-openlead';
              }
            } else {
              window.location.href = '/staff';
            }
          } else {
            window.location.href = '/pending-approval';
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
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 relative">
        <div className="absolute top-8 left-8">
          <a href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </a>
        </div>
        
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <img src="/openlead-logo.png" alt="Openlead" className="h-8 object-contain mb-8" />
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isForgotPassword 
                ? 'Reset your password' 
                : isSignUp 
                  ? 'Create your account' 
                  : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
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
                  <label className="block text-sm font-medium text-slate-700">Email address</label>
                  <div className="mt-1">
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-openlead-blue hover:bg-openlead-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-openlead-blue disabled:opacity-50 transition-all duration-200"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm font-bold text-openlead-blue hover:text-openlead-blue/80 transition-colors"
                  >
                    Wait, I remember my password
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email address</label>
                    <div className="mt-1">
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <div className="mt-1">
                      <input
                        {...register('password')}
                        type="password"
                        placeholder="••••••••"
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                      />
                      {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                    </div>
                  </div>

                  {isSignUp && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Full Name</label>
                        <div className="mt-1">
                          <input
                            {...register('name')}
                            type="text"
                            placeholder="John Doe"
                            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                          />
                          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Company Name</label>
                        <div className="mt-1">
                          <input
                            {...register('company_name')}
                            type="text"
                            placeholder="Acme Corp"
                            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                          />
                          {errors.company_name && <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                        <div className="mt-1">
                          <input
                            {...register('phone')}
                            type="tel"
                            placeholder="+44 123 456 7890"
                            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                          />
                          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Business Address</label>
                        <div className="mt-1">
                          <input
                            {...register('address')}
                            type="text"
                            placeholder="123 Business Rd, London"
                            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                          />
                          {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Other Contacts <span className="text-slate-400 font-normal">(Optional)</span></label>
                          <div className="mt-1">
                            <input
                              {...register('other_contacts')}
                              type="text"
                              placeholder="Jane Smith"
                              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                            />
                            {errors.other_contacts && <p className="mt-1 text-sm text-red-600">{errors.other_contacts.message}</p>}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700">Other Numbers <span className="text-slate-400 font-normal">(Optional)</span></label>
                          <div className="mt-1">
                            <input
                              {...register('other_contact_numbers')}
                              type="tel"
                              placeholder="07712345678"
                              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-openlead-blue focus:border-openlead-blue sm:text-sm transition-colors"
                            />
                            {errors.other_contact_numbers && <p className="mt-1 text-sm text-red-600">{errors.other_contact_numbers.message}</p>}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {!isSignUp && (
                    <div className="flex items-center justify-end">
                      <div className="text-sm">
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="font-bold text-openlead-blue hover:text-openlead-blue/80 transition-colors"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] hover:shadow-[0_6px_20px_rgba(57,204,204,0.23)] hover:-translate-y-0.5 text-sm font-bold text-white bg-openlead-blue disabled:opacity-50 transition-all duration-200"
                    >
                      {isLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                  </div>
                </form>

                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-500 font-medium">Or</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="w-full flex justify-center py-3 px-4 border-2 border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
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