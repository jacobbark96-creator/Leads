'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

interface DialerContextType {
  makeCall: (number: string) => void;
}

const DialerContext = createContext<DialerContextType | undefined>(undefined);

export const useDialer = () => {
  const context = useContext(DialerContext);
  if (!context) {
    throw new Error('useDialer must be used within a DialerProvider');
  }
  return context;
};

export const DialerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuthStore();
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [currentNumber, setCurrentNumber] = useState('');
  
  const callDurationRef = useRef<NodeJS.Timeout | null>(null);
  const [duration, setDuration] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (device) {
        device.destroy();
      }
    };
  }, [device]);

  useEffect(() => {
    if (!activeCall) {
      if (callDurationRef.current) clearInterval(callDurationRef.current);
      setDuration(0);
    }
  }, [activeCall]);

  const initDevice = async (): Promise<Device | null> => {
    if (device && device.state !== 'destroyed') return device;

    try {
      setCallStatus('Initializing dialer...');
      const res = await fetch('/api/twilio/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: profile?.id || 'unknown' })
      });
      
      if (!res.ok) {
        toast.error('Twilio configuration error');
        setCallStatus('');
        return null;
      }
      
      const { token } = await res.json();
      if (!token) return null;

      const newDevice = new Device(token, {
        codecPreferences: ['opus', 'pcmu'] as any,
        fakeLocalDTMF: true,
        enableRingingState: true,
      });

      newDevice.on('error', (twilioError: any) => {
        console.error('Twilio Error:', twilioError);
        toast.error('Dialer error: ' + twilioError.message);
      });

      await newDevice.register();
      setDevice(newDevice);
      return newDevice;
    } catch (error: any) {
      console.error('Failed to setup Twilio device:', error);
      toast.error('Failed to connect to dialer');
      setCallStatus('');
      return null;
    }
  };

  const makeCall = async (number: string) => {
    if (!profile?.twilio_number) {
      toast.error('You do not have a Twilio Direct Dial Number assigned. Contact a Super Admin.');
      return;
    }

    try {
      setCurrentNumber(number);
      
      const currentDevice = await initDevice();
      if (!currentDevice) return;

      setCallStatus('Connecting...');
      
      const call = await currentDevice.connect({
        params: {
          To: number,
          CallerId: profile.twilio_number
        }
      });

      call.on('accept', () => {
        setCallStatus('Connected');
        setActiveCall(call);
        callDurationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      });

      call.on('disconnect', () => {
        setCallStatus('Disconnected');
        setTimeout(() => {
          setActiveCall(null);
          setCallStatus('');
        }, 2000);
      });

      call.on('cancel', () => {
        setCallStatus('Canceled');
        setTimeout(() => {
          setActiveCall(null);
          setCallStatus('');
        }, 2000);
      });

      call.on('error', (e: any) => {
        console.error(e);
        setCallStatus('Error');
        toast.error('Call failed');
        setTimeout(() => {
          setActiveCall(null);
          setCallStatus('');
        }, 2000);
      });

      setActiveCall(call);

    } catch (err: any) {
      console.error('Call error:', err);
      toast.error('Failed to initiate call');
    }
  };

  const hangup = () => {
    if (activeCall) {
      activeCall.disconnect();
    }
  };

  const toggleMute = () => {
    if (activeCall) {
      const muted = activeCall.isMuted();
      activeCall.mute(!muted);
      setIsMuted(!muted);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <DialerContext.Provider value={{ makeCall }}>
      {children}
      
      {/* Dialer UI Overlay */}
      {(activeCall || callStatus === 'Connecting...') && (
        <div className="fixed bottom-6 right-6 z-[100] w-80 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden text-white animate-in slide-in-from-bottom-5">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg">{currentNumber}</h3>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    {callStatus === 'Connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${callStatus === 'Connected' ? 'bg-green-500' : callStatus === 'Connecting...' ? 'bg-yellow-500' : 'bg-gray-500'}`}></span>
                  </span>
                  {callStatus} {callStatus === 'Connected' && `- ${formatDuration(duration)}`}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-gray-300" />
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-6">
              <button 
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-gray-900' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={hangup}
                className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="bg-gray-800 px-6 py-3 text-xs text-gray-400 text-center border-t border-gray-700">
            Using Caller ID: {profile?.twilio_number}
          </div>
        </div>
      )}
    </DialerContext.Provider>
  );
};