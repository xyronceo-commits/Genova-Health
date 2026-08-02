
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Mic, Speaker, Stethoscope, Utensils, Activity, Brain, ClipboardList, Pill, Baby, MicOff, Crown, Globe, ExternalLink, Volume2, Square, Loader2, Shield, History, Plus, Trash2, Copy, Check, MessageSquare, Menu, X } from 'lucide-react';
import { UserProfile, Message, AssistantType, HealthMetrics } from '../types';
import { ai } from '../services/ai';
import { SYSTEM_PROMPTS, STORAGE_KEYS } from '../constants';
import { auth, saveChatSession, getChatSessions, deleteChatSession } from '../services/firebase';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
  user: UserProfile;
}

const Assistant: React.FC<Props> = ({ user }) => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  
  // Chat History Management States
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [showMobHistory, setShowMobHistory] = useState(false);
  const [showDesktopHistory, setShowDesktopHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  // Live API State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState({ input: '', output: '' });
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const canAccess = () => true;

  useEffect(() => {
    if (!canAccess()) {
      navigate('/premium');
    }
  }, [type, user.subscriptionStatus, navigate]);

  const assistantConfig = {
    nurse: { 
      title: 'Nurse Genova', 
      role: AssistantType.NURSE, 
      prompt: SYSTEM_PROMPTS.NURSE, 
      color: 'bg-blue-600', 
      icon: <Stethoscope size={24} />,
      placeholder: 'Describe how you feel...'
    },
    nutritionist: { 
      title: 'Genova Nutrition', 
      role: AssistantType.NUTRITIONIST, 
      prompt: SYSTEM_PROMPTS.NUTRITIONIST, 
      color: 'bg-orange-500', 
      icon: <Utensils size={24} />,
      placeholder: 'Ask about Nigerian meal plans...'
    },
    fitness: { 
      title: 'Fitness Coach', 
      role: AssistantType.FITNESS, 
      prompt: SYSTEM_PROMPTS.FITNESS, 
      color: 'bg-green-600', 
      icon: <Activity size={24} />,
      placeholder: 'Ask for a home workout...'
    },
    mental: { 
      title: 'Wellness Guide', 
      role: AssistantType.MENTAL, 
      prompt: SYSTEM_PROMPTS.WELLNESS, 
      color: 'bg-purple-600', 
      icon: <Brain size={24} />,
      placeholder: 'Talk about your mood or stress...'
    },
    symptom: { 
      title: 'Symptom Checker', 
      role: AssistantType.SYMPTOM_CHECKER, 
      prompt: SYSTEM_PROMPTS.SYMPTOM_CHECKER, 
      color: 'bg-red-500', 
      icon: <ClipboardList size={24} />,
      placeholder: 'List your symptoms (e.g. fever, headache)...'
    },
    prescription: { 
      title: 'Medication Explainer', 
      role: AssistantType.NURSE, 
      prompt: SYSTEM_PROMPTS.PRESCRIPTION, 
      color: 'bg-indigo-600', 
      icon: <Pill size={24} />,
      placeholder: 'Enter drug name (e.g. Lonart, Paracetamol)...'
    },
    family: {
      title: 'Family Health',
      role: AssistantType.FAMILY,
      prompt: SYSTEM_PROMPTS.FAMILY,
      color: 'bg-pink-500',
      icon: <Baby size={24} />,
      placeholder: 'Ask about baby care or growth...'
    }
  }[type || 'nurse'] || { 
    title: 'Genova AI', 
    role: AssistantType.NURSE, 
    prompt: SYSTEM_PROMPTS.NURSE, 
    color: 'bg-blue-600', 
    icon: <Bot size={24} />,
    placeholder: 'How can I help?'
  };

  const loadSessions = async () => {
    if (!auth.currentUser) {
      // Offline / Local storage fallback
      const local = localStorage.getItem(`genova_local_chats_${type}`);
      if (local) {
        const parsed = JSON.parse(local);
        const mapped = parsed.map((s: any) => ({
          ...s,
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
        setSessions(mapped);
      }
      return;
    }

    setSessionsLoading(true);
    try {
      const allSessions = await getChatSessions(auth.currentUser.uid);
      if (allSessions) {
        // Filter by current assistant type
        const filtered = allSessions.filter((s: any) => s.assistantType === type);
        setSessions(filtered);
      }
    } catch (err) {
      console.error("Error loading chat sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const startNewSession = () => {
    const newId = 'chat_' + Math.random().toString(36).substring(2, 11);
    setCurrentSessionId(newId);
    
    // Welcome message
    const welcomeMessages: Record<string, string> = {
      nurse: `Hi ${user.fullName?.split(' ')[0] || 'there'}, I'm Nurse Genova. How are you feeling today?`,
      nutritionist: `Hello! I can help you create a meal plan tailored for ${user.genotype} genotype. What's on the menu?`,
      fitness: `Ready to get active? I can suggest exercises for your weight (${user.weight}kg) and goals.`,
      mental: `Take a deep breath. I'm here to support your mental wellness. How's your mood?`,
      symptom: `Let's analyze your symptoms. Please be descriptive about how you feel.`,
      prescription: `I can explain how your medications work. Which drug are you taking?`,
      family: `Hi! I'm here for you and your family's health. Ask me about baby growth, immunizations, or child nutrition.`
    };

    const initialMessage: Message = { 
      role: 'model', 
      text: welcomeMessages[type || 'nurse'] || welcomeMessages.nurse, 
      timestamp: new Date() 
    };

    setMessages([initialMessage]);
  };

  const selectSession = (sessionId: string) => {
    const found = sessions.find(s => s.id === sessionId);
    if (found) {
      setCurrentSessionId(found.id);
      setMessages(found.messages);
      if (showMobHistory) setShowMobHistory(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // prevent selectSession trigger
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    if (auth.currentUser) {
      try {
        await deleteChatSession(auth.currentUser.uid, sessionId);
      } catch (err) {
        console.error("Error deleting session:", err);
      }
    }

    // Also update local storage fallback
    const local = localStorage.getItem(`genova_local_chats_${type}`);
    if (local) {
      const parsed = JSON.parse(local);
      const filtered = parsed.filter((s: any) => s.id !== sessionId);
      localStorage.setItem(`genova_local_chats_${type}`, JSON.stringify(filtered));
    }

    // Update state
    setSessions(prev => prev.filter(s => s.id !== sessionId));

    // If deleted current session, reset to most recent or start a new one
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        startNewSession();
      }
    }
  };

  // Load sessions when type or user changes
  useEffect(() => {
    setCurrentSessionId('');
    setMessages([]);
    setSessions([]);
    loadSessions();
  }, [type, user]);

  // Synchronize initial session choice once sessions load
  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
      setMessages(sessions[0].messages);
    } else if (sessions.length === 0 && !currentSessionId) {
      startNewSession();
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: messageText, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setGroundingLinks([]);

    const storedHistory = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
    const lastMetric: HealthMetrics | null = storedHistory ? JSON.parse(storedHistory).pop() : null;
    const biometricContext = lastMetric ? `\nLATEST BIOMETRICS: HR=${lastMetric.heartRate} BPM, BP=${lastMetric.bloodPressure}.` : '';

    try {
      const stream = ai.getResponseStream(
        selectedModel,
        assistantConfig.prompt + `\n\nUSER MEDICAL PROFILE:\nName: ${user.fullName}\nAge: ${user.age}\nGender: ${user.gender}\nGenotype: ${user.genotype}\nBlood Group: ${user.bloodGroup}\nAllergies: ${user.allergies.join(', ') || 'None'}\nWeight: ${user.weight}kg\nHeight: ${user.height}cm\nEMERGENCY CONTACT: ${user.emergencyContactName} (${user.emergencyContactPhone})` + biometricContext,
        messages,
        messageText,
        useSearch
      );

      let fullText = '';
      const botMsg: Message = { role: 'model', text: '', timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);

      for await (const chunk of stream) {
        fullText += chunk.text;
        if (chunk.groundingMetadata?.groundingChunks) {
          const links = chunk.groundingMetadata.groundingChunks
            .filter((c: any) => c.web)
            .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
          setGroundingLinks(prev => {
            const newLinks = [...prev];
            links.forEach((l: any) => {
              if (!newLinks.find(nl => nl.uri === l.uri)) newLinks.push(l);
            });
            return newLinks;
          });
        }
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...botMsg, text: fullText };
          return updated;
        });
      }

      // Sync complete thread to Local Storage and Firestore
      const finalBotMsg: Message = { role: 'model', text: fullText, timestamp: new Date() };
      const absoluteMessages = [...updatedMessages, finalBotMsg];

      let existingSession = sessions.find(s => s.id === currentSessionId);
      let sessionTitle = existingSession?.title || (messageText.length > 35 ? messageText.substring(0, 35) + '...' : messageText);

      const updatedSession = {
        id: currentSessionId,
        title: sessionTitle,
        assistantType: type || 'nurse',
        messages: absoluteMessages,
        updatedAt: new Date()
      };

      // Save locally
      const local = localStorage.getItem(`genova_local_chats_${type}`);
      let localSessions = local ? JSON.parse(local) : [];
      const localIdx = localSessions.findIndex((s: any) => s.id === currentSessionId);
      if (localIdx >= 0) {
        localSessions[localIdx] = updatedSession;
      } else {
        localSessions.unshift(updatedSession);
      }
      localStorage.setItem(`genova_local_chats_${type}`, JSON.stringify(localSessions));

      // Save to Firestore DB
      if (auth.currentUser) {
        try {
          await saveChatSession(auth.currentUser.uid, updatedSession);
        } catch (err) {
          console.error("Local save failed:", err);
        }
      }

      // Update state list
      setSessions(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(s => s.id === currentSessionId);
        if (idx >= 0) {
          copy[idx] = updatedSession;
        } else {
          copy.unshift(updatedSession);
        }
        return copy;
      });

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Connection error. Please try again.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Live Voice Logic ---

  const startLiveMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outCtx = audioContextRef.current;
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputNode = outCtx.createGain();
      outputNode.connect(outCtx.destination);

      const decode = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
      };

      const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
        return buffer;
      };

      const encode = (bytes: Uint8Array) => {
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };

      const createBlob = (data: Float32Array) => {
        const int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
        return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
      };

      const sessionPromise = ai.connectLive({
        onopen: () => {
          setIsLiveActive(true);
          const source = inCtx.createMediaStreamSource(stream);
          const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inCtx.destination);
        },
        onmessage: async (msg: any) => {
          if (msg.serverContent?.outputTranscription) {
            setLiveTranscript(prev => ({ ...prev, output: prev.output + msg.serverContent.outputTranscription.text }));
          }
          if (msg.serverContent?.inputTranscription) {
            setLiveTranscript(prev => ({ ...prev, input: prev.input + msg.serverContent.inputTranscription.text }));
          }
          if (msg.serverContent?.turnComplete) {
            setLiveTranscript({ input: '', output: '' });
          }

          const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
            const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
            const source = outCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputNode);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onclose: () => {
          setIsLiveActive(false);
          setIsLiveMode(false);
        }
      }, assistantConfig.prompt + "\nUSER: " + user.fullName + ", Bio: " + user.genotype + ", Age: " + user.age);

      sessionRef.current = await sessionPromise;
      setIsLiveMode(true);
    } catch (err) {
      console.error("Live mode failed:", err);
      alert("Microphone access or Live API connection failed.");
    }
  };

  const stopLiveMode = () => {
    sessionRef.current?.close();
    setIsLiveMode(false);
    setIsLiveActive(false);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  // --- Rendering ---

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 transition-colors md:pl-20 overflow-hidden">
      
      {/* 1. Sidebar for Desktop Past Chats */}
      {showDesktopHistory && (
        <aside className="hidden md:flex flex-col w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-colors h-full shrink-0 animate-in slide-in-from-left duration-200">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <History size={14} className="text-blue-500 animate-pulse" /> Chat History
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={startNewSession}
                title="Start New Chat"
                className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 transition hover:scale-105"
              >
                <Plus size={16} />
              </button>
              <button 
                type="button"
                onClick={() => setShowDesktopHistory(false)}
                title="Hide past chats box for extra space"
                className="px-2 py-1 text-[10.5px] font-black text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition flex items-center gap-1 duration-150"
              >
                <X size={11} className="text-gray-400 group-hover:text-red-500" /> Hide
              </button>
            </div>
          </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sessionsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Loader2 className="animate-spin text-blue-500" size={20} />
              <span className="text-[10px] uppercase font-bold text-gray-400">Loading history...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              <MessageSquare className="mx-auto mb-2 opacity-30" size={24} />
              No past chats.
            </div>
          ) : (
            sessions.map((s) => (
              <div 
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition ${
                  currentSessionId === s.id 
                    ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                  <MessageSquare size={16} className={currentSessionId === s.id ? 'text-blue-600 dark:text-blue-400 shrink-0' : 'text-gray-400 dark:text-gray-500 shrink-0'} />
                  <div className="overflow-hidden">
                    <p className={`text-xs font-semibold truncate ${currentSessionId === s.id ? 'text-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}`}>
                      {s.title}
                    </p>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold block mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  title="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Dynamic status count */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-between">
          <span>{sessions.length} Session{sessions.length !== 1 ? 's' : ''}</span>
          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-2 py-0.5 rounded-full font-black text-[9px]">Cloud-Synced</span>
        </div>
      </aside>
      )}

      {/* 2. Mobile flyout history list drawer overlay */}
      {showMobHistory && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-in fade-in cursor-pointer"
          onClick={() => setShowMobHistory(false)}
        />
      )}

      <div className={`md:hidden fixed top-0 bottom-0 left-0 w-[24rem] max-w-[85vw] bg-white dark:bg-gray-950 z-50 shadow-2xl transition-all duration-300 ease-out flex flex-col ${
        showMobHistory ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <span className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <History size={14} className="text-blue-500" /> Past Chats
          </span>
          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={() => {
                startNewSession();
                setShowMobHistory(false);
              }}
              title="Start New Chat"
              className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 transition"
            >
              <Plus size={16} />
            </button>
            <button 
              type="button"
              onClick={() => setShowMobHistory(false)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gray-50/40 dark:bg-gray-900/10">
          {sessionsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Loader2 className="animate-spin text-blue-500" size={20} />
              <span className="text-[10px] uppercase font-bold text-gray-400">Loading history...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              <MessageSquare className="mx-auto mb-2 opacity-30" size={24} />
              No past chats.
            </div>
          ) : (
            sessions.map((s) => (
              <div 
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition ${
                  currentSessionId === s.id 
                    ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent bg-white dark:bg-gray-900/30'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                  <MessageSquare size={16} className={currentSessionId === s.id ? 'text-blue-600' : 'text-gray-400'} />
                  <div className="overflow-hidden">
                    <p className={`text-xs font-semibold truncate ${currentSessionId === s.id ? 'text-blue-950 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}`}>
                      {s.title}
                    </p>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold block mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-between">
          <span>{sessions.length} Chat{sessions.length !== 1 ? 's' : ''} stored</span>
          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-2 py-0.5 rounded-full font-black text-[9px]">Synced</span>
        </div>
      </div>

      {/* 3. Main Chat Area Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className={`${assistantConfig.color} p-4 md:p-6 text-white flex items-center justify-between sticky top-0 z-20 shadow-lg shrink-0`}>
          <div className="flex items-center gap-4 overflow-hidden">
            <button 
              type="button"
              onClick={() => isLiveMode ? stopLiveMode() : navigate('/')} 
              className="hover:bg-white/20 p-2 rounded-full transition-colors shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
            <button 
              type="button"
              onClick={() => {
                if (window.innerWidth >= 768) {
                  setShowDesktopHistory(prev => !prev);
                } else {
                  setShowMobHistory(true);
                }
              }} 
              className={`${!showDesktopHistory ? 'md:flex' : 'md:hidden'} hover:bg-white/20 p-2 rounded-full transition-colors shrink-0 flex items-center justify-center`}
              title="Toggle past conversations"
            >
              <History size={24} />
            </button>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shrink-0">
                {isLiveMode ? <Volume2 size={24} className="animate-pulse" /> : assistantConfig.icon}
              </div>
              <div className="overflow-hidden">
                <h1 className="font-bold text-base md:text-lg flex items-center gap-2 truncate">
                  {isLiveMode ? 'Live Triage' : assistantConfig.title}
                </h1>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isLiveActive || isListening ? 'bg-red-400 animate-ping' : 'bg-green-400 animate-pulse'}`}></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 truncate">
                    {isLiveMode ? 'Voice Mode Active' : (isListening ? 'Listening...' : 'AI ACTIVE')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
             {!isLiveMode && (
               <>
                 <button 
                   type="button"
                   onClick={() => setUseSearch(!useSearch)}
                   className={`p-2.5 rounded-xl transition-all ${useSearch ? 'bg-white/20 text-white' : 'text-white/40 hover:bg-white/10'}`}
                   title="Google Search Grounding"
                 >
                   <Globe size={20} />
                 </button>
               </>
             )}
          </div>
        </header>

        {isLiveMode ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 p-6 space-y-12 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-[100px] animate-pulse rounded-full"></div>
              <div className="w-64 h-64 rounded-full border-4 border-white/5 flex items-center justify-center relative z-10">
                 <div className="flex items-center gap-1">
                   {[...Array(8)].map((_, i) => (
                     <div 
                      key={i} 
                      className="w-1.5 bg-blue-500 rounded-full animate-[bounce_1s_infinite]" 
                      style={{ height: `${20 + Math.random() * 60}px`, animationDelay: `${i * 0.1}s` }}
                     />
                   ))}
                 </div>
              </div>
            </div>
            
            <div className="w-full max-w-lg space-y-6 text-center">
              <div className="min-h-[4rem]">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">You</p>
                <p className="text-white text-xl font-medium">{liveTranscript.input || 'Listening for your voice...'}</p>
              </div>
              <div className="min-h-[6rem] p-6 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-2">Nurse Genova</p>
                <p className="text-gray-200 text-lg leading-relaxed">{liveTranscript.output || 'Awaiting response...'}</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={stopLiveMode}
              className="px-10 py-5 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-red-600/20 active:scale-95 transition-all"
            >
              End Live Triage
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-950 transition-colors custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.role === 'user' 
                      ? `${assistantConfig.color} text-white rounded-tr-none shadow-blue-500/10` 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm'
                    }`}>
                      {m.role === 'model' ? (
                        <MarkdownRenderer content={m.text} />
                      ) : (
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      )}
                      
                      {m.role === 'model' && (
                        <div className="flex items-center justify-between gap-4 mt-4 pt-2 border-t border-gray-100/10 dark:border-gray-700/30 text-[10px]">
                          <span className="text-[9px] bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded font-black tracking-wider opacity-60">
                            {assistantConfig.title} Health Coach
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(m.text);
                              setCopiedId(i);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="flex items-center gap-1.5 hover:text-blue-500 text-gray-400 dark:text-gray-400 transition"
                            title="Copy message text to clipboard"
                          >
                            {copiedId === i ? (
                              <>
                                <Check size={11} className="text-emerald-400 shrink-0" />
                                <span className="text-emerald-400 font-bold uppercase tracking-wider">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} className="shrink-0" />
                                <span className="uppercase font-bold tracking-wider">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {m.role === 'model' && groundingLinks.length > 0 && i === messages.length - 1 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Globe size={10} /> Verified Clinical Context Sources
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {groundingLinks.map((link, idx) => (
                              <a 
                                key={idx} 
                                href={link.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-100 dark:border-blue-800 hover:scale-105 transition-transform"
                              >
                                {link.title} <ExternalLink size={10} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold px-1 mt-0.5">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Starter Query suggestion cards (only shown in a fresh chat thread with just the welcome message) */}
              {messages.length === 1 && (
                <div className="p-4 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/40 dark:border-blue-950/20 rounded-3xl max-w-2xl mx-auto space-y-4 animate-in fade-in duration-500">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 text-center">Suggested Starter Queries</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {type === 'nurse' && (
                      <>
                        <button type="button" onClick={() => setInput("What are the typical red flags of malaria that require prompt clinical guidance?")} className="text-left text-xs p-3.5 bg-white hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🚨 Warning signs of malaria?
                        </button>
                        <button type="button" onClick={() => setInput("Can you suggest first aid steps and lifestyle actions to manage a severe migraine headache?")} className="text-left text-xs p-3.5 bg-white hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          💆 First aid for severe migraine?
                        </button>
                      </>
                    )}
                    {type === 'nutritionist' && (
                      <>
                        <button type="button" onClick={() => setInput("Create a nutrient-dense, traditional Nigerian meal plan specifically tailored for someone with genotype AS.")} className="text-left text-xs p-3.5 bg-white hover:bg-orange-50 dark:bg-gray-800 dark:hover:bg-orange-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🍛 Traditional diet for AS genotype?
                        </button>
                        <button type="button" onClick={() => setInput("Provide creative other high-quality sources of plant protein suited for deep nutrition.")} className="text-left text-xs p-3.5 bg-white hover:bg-orange-50 dark:bg-gray-800 dark:hover:bg-orange-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🥜 High-quality vegan protein ideas?
                        </button>
                      </>
                    )}
                    {type === 'fitness' && (
                      <>
                        <button type="button" onClick={() => setInput("Design a rapid 15-minute high intensity, equipment-free lower body workout plan.")} className="text-left text-xs p-3.5 bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          ⚡ 15-min home HIIT for lower body?
                        </button>
                        <button type="button" onClick={() => setInput("Recommend standard fitness mobility and stretch recovery tactics to minimize delayed muscle soreness.")} className="text-left text-xs p-3.5 bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🧘 Post-workout recovery routine?
                        </button>
                      </>
                    )}
                    {type === 'mental' && (
                      <>
                        <button type="button" onClick={() => setInput("What sensory-based breathing exercises are best to help reduce a sudden stress spike?")} className="text-left text-xs p-3.5 bg-white hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-purple-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🍃 Instant stress relief breathing?
                        </button>
                        <button type="button" onClick={() => setInput("Provide a calm mindfulness routine I can practice in the evening to combat persistent insomnia.")} className="text-left text-xs p-3.5 bg-white hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-purple-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🌙 Reflective guidance for better sleep?
                        </button>
                      </>
                    )}
                    {type === 'symptom' && (
                      <>
                        <button type="button" onClick={() => setInput("I am experiencing a dry cough, low-grade fever, and a sore throat. Guide me through the checker protocol.")} className="text-left text-xs p-3.5 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🤒 Cough and fever symptom inquiry?
                        </button>
                        <button type="button" onClick={() => setInput("What are the most common causes of sudden, acute pain localized on the bottom lower-right abdomen?")} className="text-left text-xs p-3.5 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          👉 Lower-right abdomen pain red flag?
                        </button>
                      </>
                    )}
                    {type === 'prescription' && (
                      <>
                        <button type="button" onClick={() => setInput("What is the main chemical compound, therapeutic uses, and safety warnings for Coartem?")} className="text-left text-xs p-3.5 bg-white hover:bg-indigo-50 dark:bg-gray-800 dark:hover:bg-indigo-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          💊 Active components & uses of Coartem?
                        </button>
                        <button type="button" onClick={() => setInput("Are there any contraindicated safety issues with taking Ibuprofen and Paracetamol closely together?")} className="text-left text-xs p-3.5 bg-white hover:bg-indigo-50 dark:bg-gray-800 dark:hover:bg-indigo-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          ⚠️ Drug-drug interaction context: Ibuprofen + Paracetamol?
                        </button>
                      </>
                    )}
                    {type === 'family' && (
                      <>
                        <button type="button" onClick={() => setInput("What is the standard pediatric immunization cycle and recommendations for infants?")} className="text-left text-xs p-3.5 bg-white hover:bg-pink-50 dark:bg-gray-800 dark:hover:bg-pink-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          👶 Pediatric vaccination schedule?
                        </button>
                        <button type="button" onClick={() => setInput("What are gentle, safe parent relief techniques for a baby suffering from severe colic and gas?")} className="text-left text-xs p-3.5 bg-white hover:bg-pink-50 dark:bg-gray-800 dark:hover:bg-pink-900/10 border border-gray-100 dark:border-gray-700/50 rounded-2xl transition shadow-sm text-gray-700 dark:text-gray-300">
                          🍼 Infant colic and bloating relief?
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 px-5 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3 animate-pulse">
                     <Loader2 className="animate-spin text-blue-600" size={16} />
                     <span className="text-xs font-bold text-gray-400">Genova is researching & formulating advice...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 transition-colors shrink-0">
              <div className="flex gap-2 max-w-4xl mx-auto items-center">
                <button 
                  type="button"
                  onClick={() => {
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SpeechRecognition) return alert("Speech recognition not supported in this browser.");
                    const rec = new SpeechRecognition();
                    rec.onstart = () => setIsListening(true);
                    rec.onresult = (e: any) => handleSend(e.results[0][0].transcript);
                    rec.onend = () => setIsListening(false);
                    rec.start();
                  }}
                  className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 dark:text-gray-500 hover:text-blue-500'}`}
                  title="Speech-to-Text Input"
                >
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={assistantConfig.placeholder}
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none text-gray-900 dark:text-gray-100 shadow-inner"
                />
                <button 
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className={`${assistantConfig.color} text-white p-3.5 rounded-2xl disabled:opacity-50 transition-all active:scale-95 shadow-lg shrink-0`}
                  title="Send message"
                >
                  <Send size={22} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Assistant;
