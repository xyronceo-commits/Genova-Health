
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, Activity, ShieldCheck, Zap, ArrowRight, Play, ChevronRight, Brain, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const scenes = [
  {
    id: 'intro',
    bg: 'bg-black',
    title: 'Genova Health',
    subtitle: 'The Future of Personal Wellness',
    icon: <Sparkles className="text-blue-500 w-16 h-16" />,
    color: 'text-blue-500'
  },
  {
    id: 'ai',
    bg: 'bg-black',
    title: 'AI Diagnostic Engine',
    subtitle: 'SmartScan™ nutrition & biometric insights',
    icon: <Brain className="text-emerald-500 w-16 h-16" />,
    color: 'text-emerald-500'
  },
  {
    id: 'vitals',
    bg: 'bg-black',
    title: 'Real-time Vitals',
    subtitle: 'BioScan™ camera-based heart rate tracking',
    icon: <Activity className="text-red-500 w-16 h-16" />,
    color: 'text-red-500'
  },
  {
    id: 'diet',
    bg: 'bg-black',
    title: 'Localized Nutrition',
    subtitle: 'Genotype-specific diet plans for Nigeria',
    icon: <Utensils className="text-orange-500 w-16 h-16" />,
    color: 'text-orange-500'
  },
  {
    id: 'trust',
    bg: 'bg-black',
    title: 'Trusted Security',
    subtitle: 'Enterprise-grade data protection',
    icon: <ShieldCheck className="text-indigo-500 w-16 h-16" />,
    color: 'text-indigo-500'
  }
];

const Showcase: React.FC = () => {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentScene((prev) => {
        if (prev === scenes.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleNext = () => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene(currentScene + 1);
    } else {
      navigate('/');
    }
  };

  const current = scenes[currentScene];

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col items-center justify-center font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] ${current.color.replace('text', 'bg')}/20`}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity }}
          className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px] bg-white/5`}
        />
      </div>

      {/* Progress Bars */}
      <div className="absolute top-8 left-8 right-8 flex gap-2 z-50">
        {scenes.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            {idx < currentScene && <div className="h-full bg-white w-full" />}
            {idx === currentScene && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 4, ease: "linear" }}
                className="h-full bg-white"
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
            className="mb-12 p-8 bg-white/5 rounded-[3rem] backdrop-blur-xl border border-white/10 shadow-2xl relative group"
          >
            {current.icon}
            <div className={`absolute inset-0 blur-3xl -z-10 opacity-30 ${current.color.replace('text', 'bg')}`} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-none"
          >
            {current.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-lg md:text-2xl text-gray-400 font-medium tracking-tight mb-12"
          >
            {current.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <button
              onClick={handleNext}
              className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg flex items-center gap-3 transition-transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]"
            >
              {currentScene === scenes.length - 1 ? 'Start Experience' : 'Next Insight'}
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Elements / Particles */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight 
            }}
            animate={{
              y: [null, Math.random() * -100],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 4,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
          />
        ))}
      </div>

      <button
        onClick={() => navigate('/')}
        className="absolute bottom-8 text-gray-500 font-bold uppercase tracking-[0.3em] text-xs hover:text-white transition-colors"
      >
        Skip presentation
      </button>
    </div>
  );
};

export default Showcase;
