import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, FileText, Lock, Cookie, AlertOctagon, Scale, 
  Award, Copyright, Users, ShieldAlert, ChevronLeft, Search, 
  Printer, Copy, Check, ExternalLink, ArrowRight, BookOpen
} from 'lucide-react';
import { LEGAL_DOCS, LegalDoc } from '../data/legalData';

const NAV_ITEMS = [
  { id: 'hub', label: 'Legal Hub', icon: BookOpen, color: 'text-blue-500' },
  { id: 'terms', label: 'Terms & Conditions', icon: Scale, color: 'text-indigo-500' },
  { id: 'privacy', label: 'Privacy Policy', icon: Lock, color: 'text-emerald-500' },
  { id: 'cookies', label: 'Cookie Policy', icon: Cookie, color: 'text-amber-500' },
  { id: 'acceptable-use', label: 'Acceptable Use', icon: ShieldCheck, color: 'text-teal-500' },
  { id: 'disclaimer', label: 'Disclaimer', icon: AlertOctagon, color: 'text-rose-500' },
  { id: 'intellectual-property', label: 'Intellectual Property', icon: Award, color: 'text-purple-500' },
  { id: 'copyright', label: 'Copyright Policy', icon: Copyright, color: 'text-cyan-500' },
  { id: 'community-guidelines', label: 'Community Guidelines', icon: Users, color: 'text-orange-500' },
  { id: 'trust-and-safety', label: 'Trust & Safety', icon: ShieldAlert, color: 'text-red-500' },
];

const Legal: React.FC = () => {
  const { docId } = useParams<{ docId?: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Determine active document
  const currentDocKey = (docId && LEGAL_DOCS[docId]) ? docId : 'hub';
  const doc: LegalDoc = LEGAL_DOCS[currentDocKey];

  const handleCopyText = () => {
    const textToCopy = `${doc.title}\nLast Updated: ${doc.lastUpdated}\n\n` + 
      doc.sections.map(s => `${s.heading}\n${Array.isArray(s.content) ? s.content.join('\n') : s.content}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter doc sections by query
  const filteredSections = doc.sections.filter(sec => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const headingMatch = sec.heading.toLowerCase().includes(q);
    const contentMatch = Array.isArray(sec.content) 
      ? sec.content.some(c => c.toLowerCase().includes(q))
      : sec.content.toLowerCase().includes(q);
    return headingMatch || contentMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors md:pl-16">
      {/* Top Header */}
      <header className="p-4 md:p-6 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-30 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl text-gray-700 dark:text-gray-200 transition-all"
            title="Back to App"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-extrabold text-lg md:text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-blue-600 dark:text-blue-400" size={22} />
              Legal & Policy Center
            </h1>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Genova Health Governance & Compliance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopyText}
            className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Copy document text"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button 
            onClick={handlePrint}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10"
            title="Print or export document"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search policy sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <nav className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
              {NAV_ITEMS.map((item) => {
                const isActive = currentDocKey === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/legal/${item.id}`)}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent size={18} className={isActive ? 'text-white' : item.color} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ArrowRight size={14} className="text-white" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Info Box */}
          <div className="bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/20 p-5 rounded-3xl space-y-2 text-xs">
            <h4 className="font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
              <Lock size={12} /> Compliance Commitment
            </h4>
            <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              Genova Health adheres strictly to Nigerian NDPR privacy requirements, global digital health disclaimers, and local-first data sandbox protocols.
            </p>
          </div>
        </aside>

        {/* Right Main Document Content */}
        <main className="lg:col-span-8">
          <motion.div 
            key={doc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-8"
          >
            {/* Document Title Banner */}
            <div className="border-b border-gray-100 dark:border-gray-700 pb-6 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/40">
                  {doc.category}
                </span>
                <span className="text-xs font-mono font-bold text-gray-400">
                  Last Updated: {doc.lastUpdated}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {doc.title}
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {doc.shortDesc}
              </p>
            </div>

            {/* Document Hub Overview Cards (If Hub view) */}
            {doc.id === 'hub' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {NAV_ITEMS.filter(item => item.id !== 'hub').map((item) => {
                  const subDoc = LEGAL_DOCS[item.id];
                  const IconComp = item.icon;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => navigate(`/legal/${item.id}`)}
                      className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 hover:border-blue-500/50 cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xs">
                          <IconComp size={18} className={item.color} />
                        </div>
                        <ChevronLeft size={16} className="text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h3 className="font-extrabold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {subDoc.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {subDoc.shortDesc}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Document Sections Content */}
            <div className="space-y-8">
              {filteredSections.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 dark:bg-gray-750 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Search size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No matching sections found</p>
                  <p className="text-xs text-gray-400">Try searching for a different term or clear the search query.</p>
                </div>
              ) : (
                filteredSections.map((sec, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      {sec.heading}
                    </h3>

                    {Array.isArray(sec.content) ? (
                      <ul className="space-y-2.5 pl-4 text-xs md:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                        {sec.content.map((item, iIdx) => (
                          <li key={iIdx} className="bg-gray-50 dark:bg-gray-750 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed bg-gray-50 dark:bg-gray-750 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                        {sec.content}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bottom Footer Callout */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500">
              <p>Questions regarding our policies? Contact <span className="text-blue-600 font-mono font-bold">legal@genovahealth.com</span></p>
              <div className="flex items-center gap-4">
                <Link to="/about" className="hover:text-blue-600 transition-colors">About Genova</Link>
                <span>•</span>
                <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Legal;
