import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  UserIcon, 
  CogIcon,
  ArrowRightStartOnRectangleIcon as LogoutIcon,
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  SparklesIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  QrCodeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { logout } from '../../store/slices/authSlice';
import { BouncyButton, PlayfulLoader } from './DelightfulComponents';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    // Add a delightful delay with animation
    setTimeout(() => {
      dispatch(logout());
      navigate('/login');
    }, 1500);
  };

  const navigation = React.useMemo(() => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      return [
        { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
        { name: 'Applications', href: '/admin/applications', icon: DocumentTextIcon },
        { name: 'Users', href: '/admin/users', icon: UserIcon },
        { name: 'Reports', href: '/admin/reports', icon: CogIcon },
      ];
    }

    if (user?.role === 'SECURITY') {
      return [
        { name: 'Scanner', href: '/security/scanner', icon: QrCodeIcon },
        { name: 'Access Logs', href: '/security/logs', icon: ShieldCheckIcon },
      ];
    }

    // Student navigation
    return [
      { name: 'Dashboard', href: '/student/dashboard', icon: HomeIcon },
      { name: 'Applications', href: '/student/applications', icon: DocumentTextIcon },
      { name: 'My Passes', href: '/student/passes', icon: QrCodeIcon },
      { name: 'Profile', href: '/student/profile', icon: UserIcon },
    ];
  }, [user?.role]);

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-primary-50'} transition-colors duration-300`}>
      {/* Sidebar */}
      <motion.div 
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200"
        initial={{ x: -256 }}
        animate={{ 
          x: sidebarOpen ? 0 : -256,
          transition: { type: "spring", stiffness: 300, damping: 30 }
        }}
        style={{ display: sidebarOpen || window.innerWidth >= 1024 ? 'block' : 'none' }}
      >
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-primary-600 to-secondary-600 relative overflow-hidden"
          whileHover={{ 
            background: 'linear-gradient(45deg, #2563eb, #7c3aed, #2563eb)',
            transition: { duration: 0.3 }
          }}
        >
          {/* Animated background elements */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{ 
              background: [
                'radial-gradient(circle at 20% 50%, #ffffff 0%, transparent 50%)',
                'radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 50%)',
                'radial-gradient(circle at 20% 50%, #ffffff 0%, transparent 50%)'
              ]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          
          <motion.div 
            className="flex items-center relative z-10"
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex-shrink-0">
              <motion.div 
                className="w-8 h-8 bg-white rounded-lg flex items-center justify-center relative overflow-hidden"
                animate={{ 
                  boxShadow: [
                    '0 0 10px rgba(255,255,255,0.5)',
                    '0 0 20px rgba(255,255,255,0.8)',
                    '0 0 10px rgba(255,255,255,0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                whileHover={{ rotate: 360, transition: { duration: 0.6 } }}
              >
                <motion.span 
                  className="text-primary-600 font-bold text-sm"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    color: ['#2563eb', '#7c3aed', '#2563eb']
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  SP
                </motion.span>
              </motion.div>
            </div>
            <div className="ml-3">
              <motion.h1 
                className="text-white text-lg font-semibold"
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Student Pass
              </motion.h1>
            </div>
          </motion.div>
          
          <motion.button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white hover:bg-opacity-20 rounded-md p-1 relative z-10"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
          >
            <XIcon className="h-5 w-5" />
          </motion.button>
        </motion.div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="block"
                  >
                    <motion.div
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-700 shadow-md'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      whileHover={{ 
                        scale: 1.02,
                        x: 5,
                        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-secondary-500 rounded-r"
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      
                      <motion.div
                        animate={isActive ? {
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0]
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mr-3"
                      >
                        <item.icon className="h-5 w-5" />
                      </motion.div>
                      
                      <span className="flex-1">{item.name}</span>
                      
                      {isActive && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <SparklesIcon className="h-4 w-4 text-primary-500" />
                        </motion.div>
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="flex items-center">
            <motion.div 
              className="flex-shrink-0"
              whileHover={{ scale: 1.1 }}
            >
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center relative overflow-hidden"
                animate={{ 
                  boxShadow: [
                    '0 0 0 0 rgba(37, 99, 235, 0.4)',
                    '0 0 0 8px rgba(37, 99, 235, 0)',
                    '0 0 0 0 rgba(37, 99, 235, 0.4)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.span 
                  className="text-white text-sm font-bold"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </motion.span>
                
                {/* Sparkle effect */}
                <motion.div
                  className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            </motion.div>
            
            <div className="ml-3 flex-1">
              <motion.p 
                className="text-sm font-medium text-gray-900"
                whileHover={{ scale: 1.02, color: '#2563eb' }}
              >
                {user?.firstName} {user?.lastName}
                <motion.span
                  className="inline-block ml-1"
                  animate={{ 
                    rotate: [0, 20, -20, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  😊
                </motion.span>
              </motion.p>
              <motion.p 
                className="text-xs text-gray-500 flex items-center"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {user?.role}
                <motion.span
                  className="ml-1"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {user?.role === 'ADMIN' ? '👑' : user?.role === 'SECURITY' ? '🔒' : '🎓'}
                </motion.span>
              </motion.p>
            </div>
            
            {/* Theme toggle */}
            <motion.button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              title="Toggle theme"
            >
              <motion.div
                animate={{ rotate: isDarkMode ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isDarkMode ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </motion.div>
            </motion.button>
            
            {/* Logout button */}
            <BouncyButton
              onClick={handleLogout}
              className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded-md bg-transparent border-none shadow-none"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ 
                    scale: 1.1,
                    color: '#ef4444',
                    rotate: [0, -10, 10, 0]
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <LogoutIcon className="h-4 w-4" />
                </motion.div>
              )}
            </BouncyButton>
          </div>
          
          {/* Logout confirmation */}
          <AnimatePresence>
            {isLoggingOut && (
              <motion.div
                className="mt-2 p-2 bg-primary-50 rounded-lg text-center"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <motion.p 
                  className="text-xs text-primary-600 font-medium"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  👋 Goodbye! See you soon!
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Mobile menu button */}
      <motion.div 
        className="lg:hidden fixed top-4 left-4 z-50"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <BouncyButton
          onClick={() => setSidebarOpen(true)}
          className="bg-white p-3 rounded-xl shadow-lg text-gray-600 hover:text-gray-900 border border-gray-200"
        >
          <motion.div
            animate={{ rotate: sidebarOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <MenuIcon className="h-6 w-6" />
          </motion.div>
        </BouncyButton>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0 relative">
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, 50, 0],
                y: [0, -30, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 15 + i * 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none z-10">
          <motion.div 
            className="py-6 px-4 sm:px-6 lg:px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            className="lg:hidden fixed inset-0 z-40 bg-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;