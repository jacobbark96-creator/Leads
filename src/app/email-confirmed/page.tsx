"use client";
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EmailConfirmed() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Attempt to close the window automatically after 5 seconds if allowed by the browser
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          try {
            window.close();
          } catch (e) {
            // Browser might block window.close(), provide a fallback button
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-12 px-4 shadow-xl sm:rounded-2xl sm:px-10 text-center border border-gray-100">
          
          <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Email Confirmed!
          </h2>
          
          <p className="text-base text-gray-600 mb-8 leading-relaxed">
            Thank you for verifying your email address. Your account is now active.
            <br className="hidden sm:block mt-2"/> You can safely close this tab and return to the original window to continue.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-sm font-medium text-gray-500">Closing automatically in</span>
              <span className="text-4xl font-extrabold text-openlead-blue">{countdown}</span>
              <span className="text-xs text-gray-400 mt-1">seconds</span>
            </div>
          </div>

          <button
            onClick={() => {
              try {
                window.close();
              } catch(e) {
                // fallback to dashboard if they can't close
                router.push('/subscription');
              }
            }}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(57,204,204,0.39)] text-sm font-bold text-white bg-openlead-blue hover:bg-openlead-blue/90 hover:-translate-y-0.5 transition-all duration-200"
          >
            Close this tab manually
          </button>
          
          <div className="mt-4">
            <button
              onClick={() => router.push('/subscription')}
              className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center justify-center w-full transition-colors"
            >
              Or continue in this tab <ArrowRight className="ml-1 w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}