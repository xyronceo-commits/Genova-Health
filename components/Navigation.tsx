
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ScanLine, MessageSquare, ShieldAlert, User, Moon, Sun, Watch, Crown } from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user: UserProfile;
}

const Navigation: React.FC<Props> = ({ isDarkMode, toggleDarkMode, user }) => {
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
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around md:hidden z-50 transition-colors px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[8px] uppercase font-bold tracking-tighter">{item.label}</span>
          </NavLink>
        ))}

        <NavLink
          to="/emergency"
          className={({ isActive }) => 
            `flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-red-600' : 'text-red-400'
            }`
          }
        >
          <div className="relative">
            <ShieldAlert size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white dark:border-gray-800"></span>
          </div>
          <span className="text-[8px] uppercase font-bold tracking-tighter">SOS</span>
        </NavLink>

        {user.subscriptionStatus === 'free' && (
          <NavLink
            to="/premium"
            className="flex flex-col items-center gap-1 text-amber-500"
          >
            <Crown size={20} />
            <span className="text-[8px] uppercase font-bold tracking-tighter">Gold</span>
          </NavLink>
        )}
      </nav>

      {/* Desktop Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col items-center py-8 z-50 transition-colors">
        <div className="mb-12">
          <NavLink to="/" className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">G</NavLink>
        </div>
        <div className="flex flex-col gap-6 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `p-3 rounded-xl transition-all ${
                  isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                }`
              }
              title={item.label}
            >
              <item.icon size={24} />
            </NavLink>
          ))}
          
          {user.subscriptionStatus === 'free' && (
            <NavLink
              to="/premium"
              className={({ isActive }) => 
                `p-3 rounded-xl transition-all ${
                  isActive ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                }`
              }
              title="Upgrade to Premium"
            >
              <Crown size={24} />
            </NavLink>
          )}

          <NavLink
            to="/emergency"
            className={({ isActive }) => 
              `p-3 rounded-xl transition-all ${
                isActive ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`
            }
            title="Emergency"
          >
            <ShieldAlert size={24} />
          </NavLink>
        </div>
        <button 
          onClick={toggleDarkMode}
          className="p-3 mb-4 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </nav>
    </>
  );
};

export default Navigation;
