
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Mic, Speaker, Stethoscope, Utensils, Activity, Brain, ClipboardList, Pill, Baby, MicOff, Crown, Globe, ExternalLink, Volume2, Square, Loader2, Shield } from 'lucide-react';
import { UserProfile, Message, AssistantType, HealthMetrics } from '../types';
import { ai } from '../services/ai';
import { SYSTEM_PROMPTS, STORAGE_KEYS } from '../constants';

interface Props {
  user: UserProfile;
}

const Assistant: React.FC<Props> = ({ user }) => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  
  // Live API State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState({ input: '', output: '' });
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const canAccess = () => {
    if (user.subscriptionStatus === 'gold') return true;
    
    const freeAssistants = ['nurse'];
    const silverAssistants = ['nurse', 'fitness', 'nutritionist', 'prescription'];
    
    if (user.subscriptionStatus === 'silver') {
      return silverAssistants.includes(type || 'nurse');
    }
    
    return freeAssistants.includes(type || 'nurse');
  };

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

  useEffect(() => {
    const welcomeMessages: Record<string, string> = {
      nurse: `Hi ${user.fullName?.split(' ')[0] || 'there'}, I'm Nurse Genova. How are you feeling today?`,
      nutritionist: `Hello! I can help you create a meal plan tailored for ${user.genotype} genotype. What's on the menu?`,
      fitness: `Ready to get active? I can suggest exercises for your weight (${user.weight}kg) and goals.`,
      mental: `Take a deep breath. I'm here to support your mental wellness. How's your mood?`,
      symptom: `Let's analyze your symptoms. Please be descriptive about how you feel.`,
      prescription: `I can explain how your medications work. Which drug are you taking?`,
      family: `Hi! I'm here for you and your family's health. Ask me about baby growth, immunizations, or child nutrition.`
    };

    setMessages([{ 
      role: 'model', 
      text: welcomeMessages[type || 'nurse'] || welcomeMessages.nurse, 
      timestamp: new Date() 
    }]);
  }, [type, user.fullName, user.genotype, user.weight]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setGroundingLinks([]);

    const storedHistory = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
    const lastMetric: HealthMetrics | null = storedHistory ? JSON.parse(storedHistory).pop() : null;
    const biometricContext = lastMetric ? `\nLATEST BIOMETRICS: HR=${lastMetric.heartRate} BPM, BP=${lastMetric.bloodPressure}.` : '';

    try {
      const stream = ai.getResponseStream(
        'gpt-4o-mini',
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
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 transition-colors md:pl-20">
      <header className={`${assistantConfig.color} p-4 md:p-6 text-white flex items-center justify-between sticky top-0 z-20 shadow-lg`}>
        <div className="flex items-center gap-4">
          <button onClick={() => isLiveMode ? stopLiveMode() : navigate('/')} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              {isLiveMode ? <Volume2 size={24} className="animate-pulse" /> : assistantConfig.icon}
            </div>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                {isLiveMode ? 'Live Triage' : assistantConfig.title}
                {user.subscriptionStatus === 'gold' && <Crown size={14} className="text-amber-300 shadow-sm" />}
                {user.subscriptionStatus === 'silver' && <Shield size={14} className="text-blue-200" />}
              </h1>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isLiveActive || isListening ? 'bg-red-400 animate-ping' : 'bg-green-400 animate-pulse'}`}></span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {isLiveMode ? 'Voice Mode Active' : (isListening ? 'Listening...' : 'AI Active')}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {!isLiveMode && (
             <button 
               onClick={() => setUseSearch(!useSearch)}
               className={`p-2.5 rounded-xl transition-all ${useSearch ? 'bg-white/20 text-white' : 'text-white/40 hover:bg-white/10'}`}
               title="Google Search Grounding"
             >
               <Globe size={20} />
             </button>
           )}
           <button 
             onClick={isLiveMode ? stopLiveMode : startLiveMode}
             className={`p-2.5 rounded-xl transition-all ${isLiveMode ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
           >
             {isLiveMode ? <Square size={20} /> : <Volume2 size={20} />}
           </button>
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
            onClick={stopLiveMode}
            className="px-10 py-5 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-red-600/20 active:scale-95 transition-all"
          >
            End Live Triage
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900 transition-colors custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user' 
                    ? `${assistantConfig.color} text-white rounded-tr-none` 
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
                  }`}>
                    {m.text}
                    {m.role === 'model' && groundingLinks.length > 0 && i === messages.length - 1 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Globe size={10} /> Verified Sources
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
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold px-1">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 px-5 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
                   <Loader2 className="animate-spin text-blue-600" size={16} />
                   <span className="text-xs font-bold text-gray-400">Searching and thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 transition-colors">
            <div className="flex gap-2 max-w-4xl mx-auto items-center">
              <button 
                onClick={() => {
                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRecognition) return alert("Speech recognition not supported.");
                  const rec = new SpeechRecognition();
                  rec.onstart = () => setIsListening(true);
                  rec.onresult = (e: any) => handleSend(e.results[0][0].transcript);
                  rec.onend = () => setIsListening(false);
                  rec.start();
                }}
                className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 dark:text-gray-500 hover:text-blue-500'}`}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={assistantConfig.placeholder}
                className="flex-1 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none text-gray-900 dark:text-gray-100 shadow-inner"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className={`${assistantConfig.color} text-white p-3.5 rounded-2xl disabled:opacity-50 transition-all active:scale-90 shadow-lg`}
              >
                <Send size={22} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Assistant;
