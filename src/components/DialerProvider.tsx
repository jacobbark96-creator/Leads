'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { MessageSquare, Phone, PhoneOff, Mic, MicOff, Volume2, Hash, Settings, Check } from 'lucide-react';
import { DialerContext } from '@/contexts/DialerContext';
import { InternalChat } from './InternalChat';

export const DialerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuthStore();
  const pathname = usePathname();
  // #region debug-point sound:report-helper
  const reportDebug = async (hypothesisId: string, msg: string, data: Record<string, unknown> = {}) => {
    try {
      await fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'internal-chat-desktop',
          runId: 'pre-fix',
          hypothesisId,
          location: 'src/components/DialerProvider.tsx',
          msg: `[DEBUG] ${msg}`,
          data,
          ts: Date.now()
        })
      });
    } catch {}
  };
  // #endregion
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [currentNumber, setCurrentNumber] = useState('');
  
  const callDurationRef = useRef<NodeJS.Timeout | null>(null);
  const [duration, setDuration] = useState(0);

  const [isDialpadOpen, setIsDialpadOpen] = useState(false);
  const [isInternalChatOpen, setIsInternalChatOpen] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('default');
  const [selectedOutput, setSelectedOutput] = useState<string>('default');
  const [dtmfDigits, setDtmfDigits] = useState('');
  const [toastMessage, setToastMessage] = useState<{ senderName: string, content: string } | null>(null);

  useEffect(() => {
    const handleToggleChat = () => setIsInternalChatOpen(prev => !prev);
    window.addEventListener('toggle-internal-chat', handleToggleChat);
    return () => window.removeEventListener('toggle-internal-chat', handleToggleChat);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleNewMessageToast = (e: any) => {
      setToastMessage(e.detail);
      // #region debug-point sound:event
      void reportDebug('E', 'Chat toast event received in dialer provider', {
        senderName: e?.detail?.senderName || null,
        pathname: window.location.pathname,
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus()
      });
      // #endregion
      playInternalChatSound();
      
      // Auto-hide after 5 seconds
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    };

    window.addEventListener('new-internal-message-toast', handleNewMessageToast);
    return () => {
      window.removeEventListener('new-internal-message-toast', handleNewMessageToast);
      if (timeout) clearTimeout(timeout);
    };
  }, []);
  const [manualNumber, setManualNumber] = useState('');
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);
  const initPromise = useRef<Promise<Device | null> | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playInternalChatSound = () => {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = ctx;
      // #region debug-point sound:before-play
      void reportDebug('E', 'Attempting to play internal chat sound', {
        pathname: window.location.pathname,
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus(),
        audioContextState: ctx.state
      });
      // #endregion

      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const oscillatorTwo = ctx.createOscillator();
      const gainNodeTwo = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.32);

      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.18);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.36);

      oscillatorTwo.type = 'sine';
      oscillatorTwo.frequency.setValueAtTime(740, ctx.currentTime + 0.22);
      oscillatorTwo.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.58);

      gainNodeTwo.gain.setValueAtTime(0.0001, ctx.currentTime + 0.2);
      gainNodeTwo.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.28);
      gainNodeTwo.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.62);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillatorTwo.connect(gainNodeTwo);
      gainNodeTwo.connect(ctx.destination);
      oscillator.start();
      oscillatorTwo.start(ctx.currentTime + 0.2);
      oscillator.stop(ctx.currentTime + 0.38);
      oscillatorTwo.stop(ctx.currentTime + 0.64);
      // #region debug-point sound:scheduled
      void reportDebug('E', 'Internal chat sound scheduled', {
        audioContextState: ctx.state,
        currentTime: ctx.currentTime
      });
      // #endregion
    } catch (error: any) {
      // #region debug-point sound:error
      void reportDebug('E', 'Internal chat sound threw', {
        message: error?.message || 'Unknown error',
        name: error?.name || null
      });
      // #endregion
    }
  };

  // Cleanup on unmount - Only destroy device when provider unmounts
  useEffect(() => {
    return () => {
      if (deviceRef.current && deviceRef.current.state !== 'destroyed') {
        console.log('Destroying Twilio device on DialerProvider unmount');
        deviceRef.current.destroy();
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []); // Only run on actual provider unmount

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

  // Initialize device on first user interaction to avoid AudioContext warnings
  useEffect(() => {
    if (profile?.id && profile?.twilio_number && ['rep', 'super_admin', 'admin', 'sales'].includes(profile.role)) {
      // Request notification permission for incoming calls
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      const handleInteraction = () => {
        initDevice().catch(console.error);
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
      };

      window.addEventListener('click', handleInteraction);
      window.addEventListener('keydown', handleInteraction);
      window.addEventListener('touchstart', handleInteraction);

      return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
      };
    }
  }, [profile?.id, profile?.twilio_number, profile?.role]);

  useEffect(() => {
    if (!activeCall) {
      if (callDurationRef.current) clearInterval(callDurationRef.current);
      setDuration(0);
    }
  }, [activeCall]);

  const initDevice = async (): Promise<Device | null> => {
    // Priority 1: Check if we already have a device in state that's valid
    if (device && device.state !== 'destroyed') return device;
    // Priority 2: Check if we have a device in ref (survives re-renders)
    if (deviceRef.current && deviceRef.current.state !== 'destroyed') {
      setDevice(deviceRef.current);
      return deviceRef.current;
    }
    // Priority 3: Check if an initialization is already in progress
    if (initPromise.current) return initPromise.current;

    initPromise.current = (async () => {
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
          // Explicitly set edges to optimize routing and avoid high-latency "global" jumps
          // This includes US East, Europe West (Dublin), and Singapore for global coverage
          edge: ['ashburn', 'dublin', 'singapore'],
          // Enhance audio quality via WebRTC constraints
          audioConstraints: {
            autoGainControl: true,   // Helps with "quiet" voice issues
            echoCancellation: true,  // Reduces background echo
            noiseSuppression: true,  // Filters out background noise
          },
          // Increase logging for quality troubleshooting if needed
          logLevel: 'error',
        } as any);

        newDevice.on('error', (twilioError: any) => {
          console.error('Twilio Error:', twilioError);
          
          // Suppress noisy token and connection errors from popping up toasts
          const ignoredCodes = [20104, 20101, 31009, 31005];
          if (ignoredCodes.includes(twilioError.code)) {
            // If token expired, clear device to force re-init next time
            if (twilioError.code === 20104 || twilioError.code === 20101) {
              setDevice(null);
            }
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
          const fromNum = call.parameters.From || 'Unknown Caller';
          const callerNameParam = call.parameters.callerName;
          setCurrentNumber(callerNameParam ? `${callerNameParam} (${fromNum})` : fromNum);
          setActiveCall(call);

          // Attempt to resolve name from DB if not passed in parameters
          if (!callerNameParam && fromNum !== 'Unknown Caller') {
            const cleanNum = fromNum.replace(/[^\d]/g, '').slice(-10);
            if (cleanNum.length >= 10) {
              (async () => {
                try {
                  let resolvedName = fromNum;
                  const fuzzyNum = `%${cleanNum.split('').join('%')}%`;
                  const [
                    { data: leads }, 
                    { data: leadsSec }, 
                    { data: clients }, 
                    { data: clientsSec },
                    { data: clientsOther }, 
                    { data: users }
                  ] = await Promise.all([
                    supabase.from('leads').select('name, company').ilike('phone', fuzzyNum).limit(1),
                    supabase.from('leads').select('name, company').ilike('secondary_phone', fuzzyNum).limit(1),
                    supabase.from('contractors').select('company_name, contact_name').ilike('phone', fuzzyNum).limit(1),
                    supabase.from('contractors').select('company_name, contact_name').ilike('secondary_phone', fuzzyNum).limit(1),
                    supabase.from('contractors').select('company_name, contact_name').ilike('other_contact_numbers', fuzzyNum).limit(1),
                    supabase.from('users').select('name').ilike('twilio_number', fuzzyNum).limit(1)
                  ]);

                  const isValidName = (name?: string | null) => name && !name.toLowerCase().includes('unknown');

                  if (leads?.[0] && (isValidName(leads[0].name) || isValidName(leads[0].company))) resolvedName = isValidName(leads[0].name) ? leads[0].name : leads[0].company;
                  else if (leadsSec?.[0] && (isValidName(leadsSec[0].name) || isValidName(leadsSec[0].company))) resolvedName = isValidName(leadsSec[0].name) ? leadsSec[0].name : leadsSec[0].company;
                  else if (clients?.[0] && (isValidName(clients[0].company_name) || isValidName(clients[0].contact_name))) resolvedName = isValidName(clients[0].company_name) ? clients[0].company_name : clients[0].contact_name;
                  else if (clientsSec?.[0] && (isValidName(clientsSec[0].company_name) || isValidName(clientsSec[0].contact_name))) resolvedName = isValidName(clientsSec[0].company_name) ? clientsSec[0].company_name : clientsSec[0].contact_name;
                  else if (clientsOther?.[0] && (isValidName(clientsOther[0].company_name) || isValidName(clientsOther[0].contact_name))) resolvedName = isValidName(clientsOther[0].company_name) ? clientsOther[0].company_name : clientsOther[0].contact_name;
                  else if (users?.[0] && isValidName(users[0].name)) resolvedName = users[0].name;
                  
                  setCurrentNumber(`${resolvedName} (${fromNum})`);
                  
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Incoming Call', {
                      body: `You have an incoming call from ${resolvedName}`,
                      icon: '/favicon.ico'
                    });
                  }
                } catch (e) {
                  console.error('Failed to resolve caller ID', e);
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Incoming Call', {
                      body: `You have an incoming call from ${fromNum}`,
                      icon: '/favicon.ico'
                    });
                  }
                }
              })();
            } else {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Incoming Call', {
                  body: `You have an incoming call from ${fromNum}`,
                  icon: '/favicon.ico'
                });
              }
            }
          } else {
            // If callerNameParam was provided, show notification with it
            if (callerNameParam && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Incoming Call', {
                body: `You have an incoming call from ${callerNameParam}`,
                icon: '/favicon.ico'
              });
            } else if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Incoming Call', {
                body: `You have an incoming call${fromNum !== 'Unknown Caller' ? ` from ${fromNum}` : ''}`,
                icon: '/favicon.ico'
              });
            }
          }

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

        // Handle Audio Device Management
        const updateDevices = async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setInputDevices(devices.filter(d => d.kind === 'audioinput'));
            setOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
          } catch (e) {
            console.error('Failed to enumerate devices:', e);
          }
        };

        navigator.mediaDevices?.addEventListener('devicechange', updateDevices);
        await updateDevices();

        await newDevice.register();
        setDevice(newDevice);
        deviceRef.current = newDevice;
        return newDevice;
      } catch (error: any) {
        console.error('Failed to setup Twilio device:', error);
        toast.error('Failed to connect to dialer');
        setCallStatus('');
        return null;
      }
    })();

    const result = await initPromise.current;
    initPromise.current = null;
    return result;
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
    if (activeCall) {
      activeCall.accept();
    }
  };

  const reject = () => {
    if (activeCall) {
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

  const setInputDevice = async (deviceId: string) => {
    if (!device) return;
    try {
      // @ts-ignore
      await device.audio.setInputDevice(deviceId);
      setSelectedInput(deviceId);
      toast.success('Microphone updated');
    } catch (e) {
      console.error('Failed to set input device:', e);
      toast.error('Failed to update microphone');
    }
  };

  const setOutputDevice = async (deviceId: string) => {
    if (!device) return;
    try {
      // @ts-ignore
      await device.audio.speakerDevices.set(deviceId);
      setSelectedOutput(deviceId);
      toast.success('Speaker updated');
    } catch (e) {
      console.error('Failed to set output device:', e);
      toast.error('Failed to update speaker');
    }
  };

  const sendDigit = (digit: string) => {
    if (activeCall && callStatus === 'Connected') {
      activeCall.sendDigits(digit);
      setDtmfDigits(prev => prev + digit);
      setTimeout(() => setDtmfDigits(prev => prev.slice(0, -1)), 2000);
    }
  };

  const clearDtmf = () => {
    setDtmfDigits('');
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

  const canUseInternalChat = profile && ['admin', 'super_admin', 'rep', 'sales', 'growth_manager'].includes(profile.role);
  const isStaffRoute = pathname?.startsWith('/staff');
  const shouldRenderGlobalInternalChat = canUseInternalChat && !isStaffRoute;
  const showFloatingDialer = profile && ['rep', 'super_admin', 'admin'].includes(profile.role);

  return (
    <DialerContext.Provider value={{ makeCall, activeCall, currentEntityId }}>
      {children}

      {shouldRenderGlobalInternalChat && (
        <InternalChat isOpen={isInternalChatOpen} onClose={() => setIsInternalChatOpen(false)} isModal={true} />
      )}

      {canUseInternalChat && toastMessage && (
        <div className="fixed bottom-6 right-6 z-[95] w-72 bg-gray-900 border border-gray-700 text-white p-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{toastMessage.senderName}</span>
            </div>
            <span className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed font-medium">{toastMessage.content}</span>
          </div>
        </div>
      )}
      
      {/* Floating Dialer Button & Manual Dialpad */}
      {showFloatingDialer && !activeCall && callStatus !== 'Connecting...' && (
        <>
          <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-4">
            {/* Internal Chat UI will go here */}
            
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

          <div className="flex items-center gap-3">
            {canUseInternalChat && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (isStaffRoute) {
                      const element = document.getElementById('staff-team-messages');
                      if (element) {
                        element.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center'
                        });
                      }
                      return;
                    }

                    window.dispatchEvent(new CustomEvent('toggle-internal-chat'));
                  }}
                  className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-transform hover:scale-105 active:scale-95 relative"
                  title={isStaffRoute ? 'Jump to Team Messages' : 'Internal Chat'}
                >
                  <MessageSquare className="w-6 h-6" />
                  <span id="global-unread-badge" className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full hidden"></span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${showSettings ? 'bg-gray-700 text-white shadow-gray-700/30' : 'bg-gray-800 text-gray-400 hover:text-white shadow-gray-800/30'}`}
              title="Audio Settings"
            >
              <Settings className="w-6 h-6" />
            </button>

            <button
              onClick={() => setIsDialpadOpen(!isDialpadOpen)}
              className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95"
              title="Open Dialer"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>

          {/* Audio Settings Panel */}
          {showSettings && (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden w-72 animate-in slide-in-from-bottom-5">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" /> Audio Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                  &times;
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Microphone</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {inputDevices.length === 0 ? (
                      <p className="text-[11px] text-gray-500 italic">No microphones found</p>
                    ) : (
                      inputDevices.map(device => (
                        <button
                          key={device.deviceId}
                          onClick={() => setInputDevice(device.deviceId)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[11px] flex items-center justify-between transition-colors ${
                            selectedInput === device.deviceId 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate flex-1">{device.label || `Microphone ${device.deviceId.slice(0, 5)}`}</span>
                          {selectedInput === device.deviceId && <Check className="w-3 h-3 shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Speaker</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {outputDevices.length === 0 ? (
                      <p className="text-[11px] text-gray-500 italic">No speakers found</p>
                    ) : (
                      outputDevices.map(device => (
                        <button
                          key={device.deviceId}
                          onClick={() => setOutputDevice(device.deviceId)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[11px] flex items-center justify-between transition-colors ${
                            selectedOutput === device.deviceId 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate flex-1">{device.label || `Speaker ${device.deviceId.slice(0, 5)}`}</span>
                          {selectedOutput === device.deviceId && <Check className="w-3 h-3 shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <p className="text-[9px] text-gray-500 leading-tight">
                    Tip: If people can't hear you clearly, ensure you've selected your headset microphone instead of the system default.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
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
                    onClick={() => setShowKeypad(!showKeypad)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${showKeypad ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    title="Keypad (IVR)"
                  >
                    <Hash className="w-5 h-5" />
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

      {/* DTMF Keypad Modal */}
      {showKeypad && activeCall && (
        <div className="fixed bottom-24 right-6 z-[110] w-72 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden text-white animate-in slide-in-from-bottom-5">
          <div className="p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
            <h3 className="font-bold text-sm">IVR Keypad</h3>
            <button 
              onClick={() => { setShowKeypad(false); setDtmfDigits(''); }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              &times;
            </button>
          </div>
          
          {dtmfDigits && (
            <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Entered:</p>
              <p className="text-2xl font-mono tracking-widest text-center text-blue-400">{dtmfDigits}</p>
            </div>
          )}
          
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
                <button
                  key={digit}
                  onClick={() => sendDigit(digit)}
                  className="h-12 bg-gray-800 hover:bg-gray-700 rounded-lg text-lg font-medium transition-colors active:bg-gray-600"
                >
                  {digit}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={clearDtmf}
                className="flex-1 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors text-gray-400"
              >
                Clear
              </button>
              <button
                onClick={() => setShowKeypad(false)}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
            
            <p className="text-[10px] text-gray-500 text-center mt-3">
              Press digits to navigate IVR menus
            </p>
          </div>
        </div>
      )}
    </DialerContext.Provider>
  );
};
