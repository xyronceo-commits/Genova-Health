import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Shield, Lock, FileText, Database, Heart, ArrowRight, Sparkles, AlertCircle, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GenovaLogo } from './GenovaLogo';

const About: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = [
    { label: "Storage Architecture", value: "Offline-First Local" },
    { label: "Core AI Engine", value: "Gemini 3.5 Flash" },
    { label: "Biometric Processing", value: "Ephemeral PPG Vitals" },
    { label: "Status", value: "Clinical Grade & Private" }
  ];

  const privacyHighlights = [
    {
      icon: <Lock className="text-blue-500" size={24} />,
      title: "Data Sovereignty",
      desc: "All health records, biomarkers, and logs stay fully sandboxed in your device's browser localStorage."
    },
    {
      icon: <Database className="text-emerald-500" size={24} />,
      title: "Zero Server Logging",
      desc: "Our API integrations process scanning signals ephemerally. Vitals statistics are never cataloged or stored on cloud networks."
    },
    {
      icon: <Shield className="text-indigo-500" size={24} />,
      title: "Self-Sovereign Architecture",
      desc: "All health records and authentication keys are stored 100% locally on your device with zero cloud database dependency."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors md:pl-20">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md z-30 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white dark:bg-gray-850 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
          <Heart className="text-red-500 animate-pulse" size={20} />
          About Genova Health
        </h1>
        <div className="w-9" /> {/* Spacer */}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-12">
        {/* Hero Brand Card */}
        <section className="text-center space-y-4 py-8">
          <div className="w-20 h-20 p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/10">
            <GenovaLogo className="w-14 h-14" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Genova Health</h2>
            <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Version 2.4.0 — Clinical Local Companion</p>
          </div>
          <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed text-sm font-medium">
            Genova is an advanced clinical assistant and biometric monitoring tool built to provide offline-first, highly secured health intelligence, nutritional scanning, and instant emergency dispatch telemetry.
          </p>
        </section>

        {/* System Stats bento */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl transition-all shadow-sm flex flex-col justify-between h-28">
              <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">{stat.label}</span>
              <span className="text-sm font-black text-gray-900 dark:text-white leading-normal tracking-tight">{stat.value}</span>
            </div>
          ))}
        </section>

        {/* Dedicated Data Privacy & Local Storage Section */}
        <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl transition-all shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl animate-pulse">
              <Database size={20} />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Data Privacy & Local Storage</h3>
          </div>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
            <p>
              To ensure unmatched privacy, Genova Health strictly relies on <span className="font-mono bg-gray-100 dark:bg-gray-750 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-extrabold">localStorage</span> to save all your medical profile specifications and health metrics directly on your physical device. 
            </p>
            <p>
              By utilizing local sandbox database keys, your sensitive information never touches external cloud storage or centralized logging servers, guaranteeing 100% ownership and complete sovereignty over your wellness telemetry.
            </p>
            
            <div className="p-5 bg-blue-500/5 dark:bg-blue-900/10 rounded-2xl border border-blue-500/10 dark:border-blue-900/20 space-y-4">
              <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Lock size={12} /> Local Storage Breakdown:
              </h4>
              <ul className="text-xs space-y-3 font-semibold text-gray-500 dark:text-gray-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Onboarding & Demographics:</strong> Your name, age, allergies, blood group, height, weight, and clinical goals are safely saved client-side for dynamic personalization.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>SmartScan Biometrics:</strong> Digital PPG vital readings, pulse estimates, historical blood pressure trends, and stress records remain strictly in local storage registry.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>AI Assistant Dialogues:</strong> Dialogue session history and clinical system advice context are stored exclusively in temporary browser state cache, maintaining complete medical anonymity.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Privacy Highlight Row */}
        <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl transition-all shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl">
              <Shield size={20} />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Local Privacy Standard</h3>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
            Unlike traditional health trackers that upload personal medical charts and tracking statistics to centralized corporate databases, Genova operates as a self-contained local unit. Your health profile remains private to you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800 transition-colors">
            {privacyHighlights.map((hl, i) => (
              <div key={i} className="space-y-2">
                <div className="mb-2 p-1.5 w-fit rounded-lg bg-gray-50 dark:bg-gray-750">{hl.icon}</div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{hl.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">{hl.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <FileText size={18} />
              Open Data Privacy Policy
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Disclaimer Board */}
        <section className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle size={18} />
            <h4 className="text-xs font-black uppercase tracking-wider">Clinical Guidance Disclaimer</h4>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-semibold">
            Genova Health provides local digital analytics, wellness scanning guides, and expert AI dialogue models. The output does not substitute for real clinical assessments, professional nursing care, or direct specialized consultation from a qualified physician. Always consult emergency systems or your healthcare provider in case of true medical crises.
          </p>
        </section>
      </main>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 dark:bg-gray-950/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Top Row */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Data Privacy Policy</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Offline Local Guarantee</p>
                </div>
              </div>

              {/* Policy Text (Scrollable) */}
              <div className="flex-1 overflow-y-auto py-6 space-y-6 text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <h4 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Database size={14} className="text-blue-500" />
                    1. Storage Location & Technology
                  </h4>
                  <p className="text-xs">
                    Your entire health profile—including full name, blood status, genotypes, fitness step totals, personal meal scan logs, and biometric PPG signal analyses—is **strictly stored locally on your device** utilizing the browser's sandboxed <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono font-bold text-blue-600 dark:text-blue-400">localStorage</code>. Genova has zero server-side telemetry trackers attached to this data.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Lock size={14} className="text-emerald-500" />
                    2. Ephemeral Signal Processing
                  </h4>
                  <p className="text-xs">
                    When you perform a camera-based vital scan, video frames are processed completely in local RAM. The extracted photoplethysmogram (PPG) values are sent directly inside secure headers to our AI engine to compile your health report in real-time. This transmission is fully encrypted and transient; none of your raw vital feeds or bio-signals are written to cloud databases or logged.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Sparkles size={14} className="text-purple-500" />
                    3. Personalized LLM Interactions
                  </h4>
                  <p className="text-xs">
                    Conversations with our Genova AI coaches use specialized model completions to construct highly aligned medical guidance rules. They do not retain logging history on centralized networks for any future training or branding purposes. Conversations are entirely managed and cached in local states.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Award size={14} className="text-indigo-500" />
                    4. Offline Local Sandbox
                  </h4>
                  <p className="text-xs">
                    Genova operates 100% client-side. Your user credentials, chat logs, and bio-scans are completely isolated to your device browser sandbox without transmitting data to cloud databases.
                  </p>
                </div>

                <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-start gap-3">
                  <Shield size={18} className="mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-semibold leading-relaxed">
                    <strong>Strictest Local-First Guarantee:</strong> Your vitals metrics, daily steps, scans, and AI dialogue sessions are strictly kept in local custody on this device. They are never exported or combined with third-party behavioral profiles or advertorial platforms.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-sm text-center shadow-lg hover:shadow-blue-500/15 active:scale-[0.98] transition-all"
                >
                  I Understand & Accept
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default About;
