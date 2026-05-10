'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

interface DialerContextType {
  makeCall: (number: string, entityId?: string, userName?: string, entityType?: string) => void;
  activeCall: Call | null;
  currentEntityId: string | null;
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

  const [isDialpadOpen, setIsDialpadOpen] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);

  // Cleanup on unmount - Only destroy device when provider unmounts
  useEffect(() => {
    return () => {
      if (device) {
        device.destroy();
      }
    };
  }, [device]);

  // Handle dialing status cleanup separately
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentEntityId && profile?.id) {
        // Use a separate async call or navigator.sendBeacon if needed for reliable cleanup on close
        supabase.from('leads').update({ being_dialed_by: null }).eq('id', currentEntityId).eq('being_dialed_by', profile.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentEntityId, profile?.id]);

  // Initialize device on mount to receive incoming calls
  useEffect(() => {
    if (profile?.id && profile?.twilio_number) {
      // Don't auto-init if they are just a client, etc.
      if (['rep', 'super_admin', 'admin', 'sales'].includes(profile.role)) {
        initDevice().catch(console.error);
      }
    }
  }, [profile?.id, profile?.twilio_number, profile?.role]);

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
        enableRingingState: true,
      } as any);

      newDevice.on('error', (twilioError: any) => {
        console.error('Twilio Error:', twilioError);
        
        // Suppress noisy token and connection errors from popping up toasts
        // 20104: AccessTokenExpired, 20101: AccessTokenInvalid
        // 31009: TransportError, 31005: ConnectionError
        const ignoredCodes = [20104, 20101, 31009, 31005];
        if (ignoredCodes.includes(twilioError.code)) {
          return;
        }
        
        toast.error('Dialer error: ' + twilioError.message);
      });

      newDevice.on('tokenWillExpire', async () => {
        try {
          console.log('Renewing Twilio token...');
          const res = await fetch('/api/twilio/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: profile?.id || 'unknown' })
          });
          const { token: newToken } = await res.json();
          if (newToken) {
            newDevice.updateToken(newToken);
            console.log('Twilio token renewed.');
          }
        } catch (e) {
          console.error('Failed to renew Twilio token:', e);
        }
      });

      newDevice.on('incoming', (call: Call) => {
        setCallStatus('Incoming Call');
        setCurrentNumber(call.parameters.From || 'Unknown Caller');
        setActiveCall(call);

        call.on('accept', () => {
          setCallStatus('Connected');
          callDurationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        });

        call.on('disconnect', () => {
          setCallStatus('Disconnected');
          setTimeout(() => {
            setActiveCall(null);
            setCallStatus('');
            setCurrentNumber('');
          }, 2000);
        });

        call.on('cancel', () => {
          setCallStatus('Missed Call');
          setTimeout(() => {
            setActiveCall(null);
            setCallStatus('');
            setCurrentNumber('');
          }, 2000);
        });

        call.on('reject', () => {
          setCallStatus('Rejected');
          setTimeout(() => {
            setActiveCall(null);
            setCallStatus('');
            setCurrentNumber('');
          }, 2000);
        });
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

  const makeCall = async (number: string, entityId?: string, userName?: string, entityType: string = 'lead') => {
    if (!profile?.twilio_number) {
      toast.error('You do not have a Twilio Direct Dial Number assigned. Contact a Super Admin.');
      return;
    }

    // Clean number: remove all non-numeric characters except +
    const cleanNum = number.replace(/[^\d+]/g, '');
    
    // Prevent calling 0800, 08xx, 09xx, and 118 toll/premium numbers
    const isBlocked = /^(\+44|0)(84|87|9|118)\d+/.test(cleanNum);
    if (isBlocked) {
      toast.error("Calls to toll or premium rate numbers are not permitted.");
      return;
    }

    try {
      setCurrentNumber(cleanNum);
      setCurrentEntityId(entityId || null);
      
      const currentDevice = await initDevice();
      if (!currentDevice) return;

      setCallStatus('Connecting...');

      // Mark lead as being dialed
      if (entityId && entityType === 'lead') {
        await supabase
          .from('leads')
          .update({ being_dialed_by: profile.id, last_dialed_at: new Date().toISOString() })
          .eq('id', entityId);
      }
      
      const call = await currentDevice.connect({
        params: {
          To: String(cleanNum || ''),
          CallerId: String(profile.twilio_number || ''),
          EntityId: String(entityId || ''),
          UserName: String(userName || profile.name || ''),
          EntityType: String(entityType || 'lead')
        }
      });

      call.on('accept', () => {
        setCallStatus('Connected');
        setActiveCall(call);
        callDurationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      });

      call.on('disconnect', () => {
        setCallStatus('Disconnected');
        
        // Clear dialing status
        if (entityId && entityType === 'lead') {
          supabase.from('leads').update({ being_dialed_by: null }).eq('id', entityId).then(({ error }) => {
            if (error) console.error('Error clearing dial status:', error);
          });
        }

        // Log manual disconnects if duration is 0 (failed to connect)
        if (entityId && duration === 0) {
          fetch(`/api/twilio/status?entityId=${encodeURIComponent(entityId)}&userName=${encodeURIComponent(userName || profile.name || '')}&entityType=${encodeURIComponent(entityType)}`, {
            method: 'POST',
            body: new URLSearchParams({ CallStatus: 'no-answer', CallDuration: '0' })
          }).catch(console.error);
        }
        
        setTimeout(() => {
          setActiveCall(null);
          setCallStatus('');
          setCurrentEntityId(null);
        }, 2000);
      });

      call.on('cancel', () => {
        setCallStatus('Canceled');

        // Clear dialing status
        if (entityId && entityType === 'lead') {
          supabase.from('leads').update({ being_dialed_by: null }).eq('id', entityId).then(({ error }) => {
            if (error) console.error('Error clearing dial status:', error);
          });
        }

        if (entityId) {
          fetch(`/api/twilio/status?entityId=${encodeURIComponent(entityId)}&userName=${encodeURIComponent(userName || profile.name || '')}&entityType=${encodeURIComponent(entityType)}`, {
            method: 'POST',
            body: new URLSearchParams({ CallStatus: 'canceled', CallDuration: '0' })
          }).catch(console.error);
        }
        setTimeout(() => {
          setActiveCall(null);
          setCallStatus('');
          setCurrentEntityId(null);
        }, 2000);
      });

      call.on('error', (e: any) => {
        console.error(e);
        setCallStatus('Error');
        toast.error('Call failed');
        
        // Clear dialing status
        if (entityId && entityType === 'lead') {
          supabase.from('leads').update({ being_dialed_by: null }).eq('id', entityId).then(({ error }) => {
            if (error) console.error('Error clearing dial status:', error);
          });
        }

        // Log the failure
        if (entityId) {
          fetch(`/api/twilio/status?entityId=${encodeURIComponent(entityId)}&userName=${encodeURIComponent(userName || profile.name || '')}&entityType=${encodeURIComponent(entityType)}`, {
            method: 'POST',
            body: new URLSearchParams({ CallStatus: 'failed', CallDuration: '0' })
          }).catch(console.error);
        }

        setTimeout(() => {
          setActiveCall(null);
          setCallStatus('');
          setCurrentEntityId(null);
        }, 2000);
      });

      setActiveCall(call);

    } catch (err: any) {
      console.error('Call error:', err);
      toast.error('Failed to initiate call');
    }
  };

  const answer = () => {
    if (activeCall && activeCall.status() === 'pending') {
      activeCall.accept();
    }
  };

  const reject = () => {
    if (activeCall && activeCall.status() === 'pending') {
      activeCall.reject();
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

  const handleManualCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNumber.trim()) return;
    setIsDialpadOpen(false);
    makeCall(manualNumber.trim(), '', 'Manual Dial');
    setManualNumber('');
  };

  const showFloatingDialer = profile && ['rep', 'super_admin', 'admin'].includes(profile.role);

  return (
    <DialerContext.Provider value={{ makeCall, activeCall, currentEntityId }}>
      {children}
      
      {/* Floating Dialer Button & Manual Dialpad */}
      {showFloatingDialer && !activeCall && callStatus !== 'Connecting...' && (
        <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-4">
          {isDialpadOpen && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-72 border border-gray-200 animate-in slide-in-from-bottom-5">
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold">Manual Dial</h3>
                <button onClick={() => setIsDialpadOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  &times;
                </button>
              </div>
              <form onSubmit={handleManualCall} className="p-4 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    placeholder="+447..."
                    className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualNumber.trim()}
                  className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </button>
              </form>
            </div>
          )}

          <button
            onClick={() => setIsDialpadOpen(!isDialpadOpen)}
            className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95"
            title="Open Dialer"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Dialer UI Overlay (Active Call) */}
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
              {callStatus === 'Incoming Call' ? (
                <>
                  <button 
                    onClick={reject}
                    className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={answer}
                    className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
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