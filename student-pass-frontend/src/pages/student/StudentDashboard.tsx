import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  QrCodeIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  SparklesIcon,
  RocketLaunchIcon,
  TrophyIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../store/hooks';
import { useGetApplicationsQuery, useGetPassesQuery } from '../../store/api/api';
import { 
  BouncyButton, 
  WigglyCard, 
  PlayfulLoader, 
  EmptyStateWithPersonality,
  AnimatedStatusBadge,
  PageTransition
} from '../../components/common/DelightfulComponents';

const StudentDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [greeting, setGreeting] = useState('Welcome back');
  const [motivationalQuote, setMotivationalQuote] = useState('');
  
  const { data: applications = [], isLoading: applicationsLoading } = useGetApplicationsQuery({
    userId: user?.id,
  });
  const { data: passes = [], isLoading: passesLoading } = useGetPassesQuery({
    userId: user?.id,
    active: true,
  });
  
  const greetings = [
    'Welcome back', 'Hey there', 'Great to see you', 'Hello again', 'Ready to rock'
  ];
  
  const quotes = [
    'Every pass is a step forward! 🚀',
    'Your journey to access starts here! ✨',
    'Making campus life easier, one pass at a time! 🎯',
    'You\'re doing great! Keep applying! 💪',
    'Success is just one application away! 🌟'
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
      setMotivationalQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, 5000);
    
    setMotivationalQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      name: 'Active Passes',
      value: passes.length,
      icon: QrCodeIcon,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      emoji: '🎫',
      celebration: passes.length > 0
    },
    {
      name: 'Pending Applications',
      value: applications.filter(app => app.status === 'PENDING').length,
      icon: ClockIcon,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
      emoji: '⏳',
      celebration: false
    },
    {
      name: 'Approved Applications',
      value: applications.filter(app => app.status === 'APPROVED').length,
      icon: CheckCircleIcon,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      emoji: '✅',
      celebration: applications.filter(app => app.status === 'APPROVED').length > 0
    },
    {
      name: 'Total Applications',
      value: applications.length,
      icon: DocumentTextIcon,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      emoji: '📋',
      celebration: applications.length >= 5
    },
  ];

  const recentApplications = applications.slice(0, 5);

  const getStatusBadge = (status: string) => {
    const baseClasses = 'badge';
    switch (status) {
      case 'APPROVED':
        return `${baseClasses} badge-success`;
      case 'PENDING':
        return `${baseClasses} badge-warning`;
      case 'REJECTED':
        return `${baseClasses} badge-error`;
      case 'EXPIRED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} badge-info`;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex-1">
            <motion.h1 
              className="text-2xl font-bold text-gray-900 flex items-center"
              key={greeting}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.span
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mr-3"
              >
                👋
              </motion.span>
              {greeting}, {user?.firstName}!
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="ml-2"
              >
                <SparklesIcon className="w-6 h-6 text-yellow-500" />
              </motion.div>
            </motion.h1>
            
            <motion.p 
              className="text-gray-600 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Manage your access passes and applications from your dashboard.
            </motion.p>
            
            {motivationalQuote && (
              <motion.div
                className="mt-2 px-3 py-2 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg border border-primary-200"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                key={motivationalQuote}
              >
                <motion.p 
                  className="text-sm text-primary-700 font-medium"
                  animate={{ color: ['#1d4ed8', '#7c3aed', '#1d4ed8'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {motivationalQuote}
                </motion.p>
              </motion.div>
            )}
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <BouncyButton className="btn-primary flex items-center">
              <Link to="/student/applications/new" className="flex items-center">
                <motion.div
                  animate={{ rotate: [0, 90, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                </motion.div>
                New Application
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-2"
                >
                  🚀
                </motion.span>
              </Link>
            </BouncyButton>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <WigglyCard key={stat.name} className="card" delay={index * 0.1}>
              <div className="flex items-center">
                <motion.div 
                  className={`p-3 rounded-lg ${stat.bgColor} relative overflow-hidden`}
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 5,
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                  }}
                  animate={stat.celebration ? {
                    boxShadow: [
                      "0 0 0 rgba(34, 197, 94, 0.4)",
                      "0 0 20px rgba(34, 197, 94, 0.4)",
                      "0 0 0 rgba(34, 197, 94, 0.4)"
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.5
                    }}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </motion.div>
                  
                  {/* Celebration particles */}
                  {stat.celebration && (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                          style={{
                            top: `${20 + i * 10}%`,
                            left: `${20 + i * 15}%`
                          }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                            y: [-10, -20, -10]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3
                          }}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
                
                <div className="ml-4 flex-1">
                  <motion.p 
                    className="text-sm font-medium text-gray-600 flex items-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    {stat.name}
                    <motion.span
                      className="ml-1"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {stat.emoji}
                    </motion.span>
                  </motion.p>
                  
                  <motion.p 
                    className="text-2xl font-bold text-gray-900"
                    animate={ stat.celebration ? {
                      scale: [1, 1.1, 1],
                      color: ['#111827', '#059669', '#111827']
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {stat.value}
                    {stat.celebration && (
                      <motion.span
                        className="inline-block ml-1 text-lg"
                        animate={{ 
                          rotate: [0, 360],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        🎉
                      </motion.span>
                    )}
                  </motion.p>
                </div>
              </div>
            </WigglyCard>
          ))}
        </div>

        {/* Active Passes */}
        <WigglyCard className="card" delay={0.3}>
          <motion.div 
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.h2 
              className="text-lg font-semibold text-gray-900 flex items-center"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mr-2"
              >
                🎫
              </motion.span>
              Active Passes
            </motion.h2>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/student/passes"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center"
              >
                View all
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-1"
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          {passesLoading ? (
            <PlayfulLoader message="Loading your awesome passes..." />
          ) : passes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {passes.slice(0, 3).map((pass, index) => (
                <motion.div 
                  key={pass.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ 
                    scale: 1.02,
                    y: -5,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                  }}
                >
                  <motion.div
                    className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full -mr-10 -mt-10 opacity-50"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  />
                  
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <motion.h3 
                      className="font-medium text-gray-900"
                      whileHover={{ scale: 1.05, color: '#2563eb' }}
                    >
                      {pass.passType} Pass
                    </motion.h3>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <QrCodeIcon className="h-6 w-6 text-gray-400" />
                    </motion.div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 relative z-10">
                    <motion.p whileHover={{ x: 5, color: '#374151' }}>
                      📅 Valid from: {new Date(pass.validFrom).toLocaleDateString()}
                    </motion.p>
                    <motion.p whileHover={{ x: 5, color: '#374151' }}>
                      📅 Valid to: {new Date(pass.validTo).toLocaleDateString()}
                    </motion.p>
                    <motion.p whileHover={{ x: 5, color: '#374151' }}>
                      📊 Usage: {pass.usageCount} times
                    </motion.p>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center relative z-10">
                    <AnimatedStatusBadge status="Active" />
                    <BouncyButton className="text-primary-600 hover:text-primary-500 text-sm font-medium bg-transparent border-none shadow-none p-0">
                      View Pass ✨
                    </BouncyButton>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyStateWithPersonality
              icon={QrCodeIcon}
              title="No Active Passes Yet! 🎫"
              description="Don't worry! Your digital passes will appear here once approved. Ready to apply for your first one?"
              actionButton={{
                text: "🚀 Apply for a Pass",
                onClick: () => window.location.href = '/student/applications/new'
              }}
            />
          )}
        </WigglyCard>

        {/* Recent Applications */}
        <WigglyCard className="card" delay={0.5}>
          <motion.div 
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <motion.h2 
              className="text-lg font-semibold text-gray-900 flex items-center"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="mr-2"
              >
                📋
              </motion.span>
              Recent Applications
            </motion.h2>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/student/applications"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center"
              >
                View all
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-1"
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          {applicationsLoading ? (
            <PlayfulLoader message="Fetching your applications..." />
          ) : recentApplications.length > 0 ? (
            <motion.div 
              className="overflow-hidden rounded-lg border border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <motion.thead 
                  className="bg-gradient-to-r from-gray-50 to-primary-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      🎫 Pass Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      🎯 Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      📈 Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      📅 Applied
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </motion.thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {recentApplications.map((application, index) => (
                      <motion.tr 
                        key={application.id} 
                        className="hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + index * 0.1, duration: 0.6 }}
                        whileHover={{ 
                          backgroundColor: '#f9fafb',
                          scale: 1.01,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <motion.span whileHover={{ scale: 1.05, color: '#2563eb' }}>
                            {application.passType}
                          </motion.span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <motion.span whileHover={{ scale: 1.05 }}>
                            {application.purpose}
                          </motion.span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <AnimatedStatusBadge status={application.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <motion.span whileHover={{ scale: 1.05 }}>
                            {new Date(application.createdAt).toLocaleDateString()}
                          </motion.span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <BouncyButton className="text-primary-600 hover:text-primary-500 bg-transparent border-none shadow-none p-0">
                            <Link
                              to={`/student/applications/${application.id}`}
                              className="flex items-center"
                            >
                              View
                              <motion.span
                                animate={{ x: [0, 2, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="ml-1"
                              >
                                👁️
                              </motion.span>
                            </Link>
                          </BouncyButton>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </motion.div>
          ) : (
            <EmptyStateWithPersonality
              icon={DocumentTextIcon}
              title="No Applications Yet! 📋"
              description="This is where your application history will live. Ready to submit your first application and start your journey?"
              actionButton={{
                text: "🎆 Submit First Application",
                onClick: () => window.location.href = '/student/applications/new'
              }}
            />
          )}
        </WigglyCard>
      </div>
    </PageTransition>
  );
};

export default StudentDashboard;