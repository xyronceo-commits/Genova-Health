
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ScanLine, MessageSquare, ShieldAlert, User, 
  Moon, Sun, Watch, Crown, LogOut, Info, Menu, X, ChevronLeft, ChevronRight, Sparkles, Shield
} from 'lucide-react';
import { UserProfile } from '../types';
import { GenovaLogo } from './GenovaLogo';
import { NotificationCenter } from './NotificationCenter';

interface Props {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user: UserProfile;
  onLogout: () => void;
  onOpenSecureAccess: () => void;
}

export const Navigation: React.FC<Props> = ({ isDarkMode, toggleDarkMode, user, onLogout, onOpenSecureAccess }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const location = useLocation();

  // Close mobile navigation drawer whenever route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Handle escape key to close mobile nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/scan', icon: ScanLine, label: 'Smart Scan' },
    { to: '/wearables', icon: Watch, label: 'Devices' },
    { to: '/assistant/nurse', icon: MessageSquare, label: 'AI Assistant' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* MOBILE: Top Header Bar with Side Drawer Toggle */}
      <div className="sticky top-0 z-40 md:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 bg-gray-100 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
            aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
            title="Open Side Menu"
          >
            {isMobileOpen ? <X size={20} className="text-gray-800 dark:text-gray-100" /> : <Menu size={20} className="text-blue-600 dark:text-blue-400" />}
          </button>
          
          <NavLink to="/" className="flex items-center gap-2">
            <GenovaLogo className="w-6 h-6" />
            <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">Genova Health</span>
          </NavLink>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Real-time Push Notification Bell */}
          <NotificationCenter user={user} />

          {/* Discreet Shield Icon for Secure Access */}
          <button
            type="button"
            onClick={onOpenSecureAccess}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
            title="Secure access"
            aria-label="Secure access"
          >
            <Shield size={18} />
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-xl transition-colors"
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
          </button>
        </div>
      </div>

      {/* MOBILE: Side Navigation Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* MOBILE: Slide-Over Side Navigation Drawer */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-gray-100 dark:border-gray-700/60">
          <NavLink to="/" className="flex items-center gap-2.5" onClick={() => setIsMobileOpen(false)}>
            <div className="p-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-center shadow-2xs">
              <GenovaLogo className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight leading-none">Genova Health</h2>
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">AI Medical Portal</span>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Profile Card inside Mobile Side Drawer */}
        <div className="mb-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{user.fullName || 'User'}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">{user.bloodGroup || 'A+'} • {user.genotype || 'AA'}</span>
            </div>
          </div>
        </div>

        {/* Primary Navigation Links */}
        <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 custom-scrollbar">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2.5 block mb-1">Menu</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-xs ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-2 my-2 border-t border-gray-100 dark:border-gray-700/60 space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2.5 block mb-1">Emergency & Tools</span>
            
            <NavLink
              to="/emergency"
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-xs ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-xs shadow-red-500/20' 
                    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60'
                }`
              }
            >
              <div className="relative">
                <ShieldAlert size={17} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white dark:border-gray-800"></span>
              </div>
              <div className="flex items-center justify-between flex-1">
                <span>SOS Emergency</span>
                <span className="text-[9px] bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200 px-1.5 py-0.2 rounded-md uppercase font-black tracking-wider">Fast</span>
              </div>
            </NavLink>

            <NavLink
              to="/about"
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-xs ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`
              }
            >
              <Info size={17} />
              <span>About & Legal</span>
            </NavLink>
          </div>
        </div>

        {/* Footer Controls inside Mobile Drawer */}
        <div className="pt-3 mt-auto border-t border-gray-100 dark:border-gray-700/60 space-y-1.5">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-bold text-xs"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
              <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
              {isDarkMode ? "Dark" : "Light"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileOpen(false);
              if (window.confirm("Are you sure you want to log out?")) {
                onLogout();
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-bold text-xs"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* DESKTOP / PC: Fixed Side Navigation */}
      <aside 
        className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col z-40 transition-all duration-300 shadow-sm ${
          isDesktopExpanded ? 'w-60' : 'w-16'
        }`}
      >
        {/* Desktop Header */}
        <div className={`p-3.5 flex items-center ${isDesktopExpanded ? 'justify-between px-4' : 'justify-center'} border-b border-gray-100 dark:border-gray-700/60`}>
          <NavLink to="/" className="flex items-center gap-3 group" title="Genova Health">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <GenovaLogo className="w-8 h-8" />
            </div>
            {isDesktopExpanded && (
              <div className="min-w-0">
                <h1 className="font-black text-sm text-gray-900 dark:text-white truncate">Genova Health</h1>
                <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider truncate">Medical Portal</p>
              </div>
            )}
          </NavLink>

          <div className="flex items-center gap-1">
            {/* Real-time Push Notification Bell for Desktop */}
            <NotificationCenter user={user} />

            {/* Discreet Shield Icon inside Sidebar Header (No floating overlay over page content!) */}
            {isDesktopExpanded && (
              <button
                type="button"
                onClick={onOpenSecureAccess}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                title="Secure access"
                aria-label="Secure access"
              >
                <Shield size={16} />
              </button>
            )}

            {/* Desktop Toggle Expand/Collapse */}
            <button
              type="button"
              onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-all"
              title={isDesktopExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isDesktopExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* Primary Desktop Nav Items */}
        <div className="flex-1 py-4 flex flex-col gap-2 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 p-3 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
                } ${!isDesktopExpanded ? 'justify-center' : ''}`
              }
              title={!isDesktopExpanded ? item.label : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {isDesktopExpanded && <span className="text-xs truncate">{item.label}</span>}
            </NavLink>
          ))}

          <div className="my-2 border-t border-gray-100 dark:border-gray-700/60 pt-2 space-y-2">
            <NavLink
              to="/emergency"
              className={({ isActive }) => 
                `flex items-center gap-3 p-3 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20' 
                    : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50'
                } ${!isDesktopExpanded ? 'justify-center' : ''}`
              }
              title={!isDesktopExpanded ? "SOS Emergency" : undefined}
            >
              <div className="relative shrink-0">
                <ShieldAlert size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white dark:border-gray-800"></span>
              </div>
              {isDesktopExpanded && <span className="text-xs truncate">SOS Emergency</span>}
            </NavLink>

            <NavLink 
              to="/about"
              className={({ isActive }) => 
                `flex items-center gap-3 p-3 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-800 dark:hover:text-gray-200'
                } ${!isDesktopExpanded ? 'justify-center' : ''}`
              }
              title={!isDesktopExpanded ? "About & Legal" : undefined}
            >
              <Info size={20} className="shrink-0" />
              {isDesktopExpanded && <span className="text-xs truncate">About & Legal</span>}
            </NavLink>
          </div>
        </div>

        {/* Desktop Footer Actions */}
        <div className="p-2 border-t border-gray-100 dark:border-gray-700/60 flex flex-col gap-1.5">
          <button 
            type="button"
            onClick={toggleDarkMode}
            className={`flex items-center gap-3 p-3 rounded-2xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-all font-bold ${
              !isDesktopExpanded ? 'justify-center' : ''
            }`}
            title={!isDesktopExpanded ? (isDarkMode ? "Light Mode" : "Dark Mode") : undefined}
          >
            {isDarkMode ? <Sun size={20} className="text-amber-400 shrink-0" /> : <Moon size={20} className="text-indigo-600 shrink-0" />}
            {isDesktopExpanded && <span className="text-xs truncate">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>

          <button 
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to log out?")) {
                onLogout();
              }
            }}
            className={`flex items-center gap-3 p-3 rounded-2xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all font-bold ${
              !isDesktopExpanded ? 'justify-center' : ''
            }`}
            title={!isDesktopExpanded ? "Log Out" : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {isDesktopExpanded && <span className="text-xs truncate">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE: Bottom Fixed Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700/80 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold scale-105'
                  : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
