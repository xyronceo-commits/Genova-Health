
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ScanLine, MessageSquare, ShieldAlert, User, Moon, Sun, Watch, Crown, LogOut, Info } from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user: UserProfile;
  onLogout: () => void;
}

const Navigation: React.FC<Props> = ({ isDarkMode, toggleDarkMode, user, onLogout }) => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/scan', icon: ScanLine, label: 'Scan' },
    { to: '/wearables', icon: Watch, label: 'Devices' },
    { to: '/assistant/nurse', icon: MessageSquare, label: 'Nurse' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around md:hidden z-50 transition-colors px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <item.icon size={18} />
            <span className="text-[8px] font-bold tracking-tight">{item.label}</span>
          </NavLink>
        ))}

        <NavLink
          to="/emergency"
          className={({ isActive }) => 
            `flex flex-col items-center gap-0.5 transition-colors ${
              isActive ? 'text-red-600' : 'text-red-400'
            }`
          }
        >
          <div className="relative">
            <ShieldAlert size={18} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white dark:border-gray-800"></span>
          </div>
          <span className="text-[8px] font-bold tracking-tight">SOS</span>
        </NavLink>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col items-center py-4 z-50 transition-colors">
        <div className="mb-6">
          <NavLink to="/" className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">G</NavLink>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `p-2.5 rounded-xl transition-all ${
                  isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                }`
              }
              title={item.label}
            >
              <item.icon size={20} />
            </NavLink>
          ))}

          <NavLink
            to="/emergency"
            className={({ isActive }) => 
              `p-2.5 rounded-xl transition-all ${
                isActive ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`
            }
            title="Emergency"
          >
            <ShieldAlert size={20} />
          </NavLink>
        </div>
        <button 
          onClick={() => {
            if (window.confirm("Are you sure you want to log out?")) {
              onLogout();
            }
          }}
          className="p-2.5 mb-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          title="Log Out"
        >
          <LogOut size={20} />
        </button>
        <NavLink 
          to="/about"
          className={({ isActive }) => 
            `p-2.5 mb-2 rounded-xl transition-all ${
              isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-350'
            }`
          }
          title="About & Privacy"
        >
          <Info size={20} />
        </NavLink>
        <button 
          onClick={toggleDarkMode}
          className="p-2.5 mb-2 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>
    </>
  );
};

export default Navigation;
