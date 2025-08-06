import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ShieldCheckIcon, 
  ClockIcon,
  QrCodeIcon,
  StarIcon,
  SparklesIcon,
  RocketLaunchIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { FloatingParticles, BouncyButton, WigglyCard } from '../components/common/DelightfulComponents';

const LandingPage: React.FC = () => {
  const [currentEmoji, setCurrentEmoji] = useState('🎓');
  const [heroText, setHeroText] = useState('Streamline Your');
  
  const emojis = ['🎓', '✨', '🚀', '💫', '🎉', '⭐'];
  const heroVariations = [
    'Streamline Your',
    'Revolutionize Your',
    'Transform Your',
    'Supercharge Your'
  ];
  
  useEffect(() => {
    const emojiInterval = setInterval(() => {
      setCurrentEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 2000);
    
    const textInterval = setInterval(() => {
      setHeroText(heroVariations[Math.floor(Math.random() * heroVariations.length)]);
    }, 4000);
    
    return () => {
      clearInterval(emojiInterval);
      clearInterval(textInterval);
    };
  }, []);

  const features = [
    {
      icon: QrCodeIcon,
      title: 'Digital Pass System',
      description: 'Generate and manage digital passes with secure QR codes for easy access control.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure Authentication',
      description: 'Role-based authentication ensures only authorized personnel can access sensitive features.',
    },
    {
      icon: ClockIcon,
      title: 'Real-time Processing',
      description: 'Instant application processing and real-time status updates for all users.',
    },
    {
      icon: CheckCircleIcon,
      title: 'Easy Management',
      description: 'Streamlined workflow for students to apply and administrators to approve passes.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 relative overflow-hidden">
      <FloatingParticles />
      
      {/* Header */}
      <motion.header 
        className="bg-white shadow-sm relative z-10"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex-shrink-0">
                <motion.div 
                  className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center relative overflow-hidden"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <motion.span 
                    className="text-white font-bold text-lg"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    SP
                  </motion.span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-secondary-400 to-primary-400 opacity-0"
                    whileHover={{ opacity: 0.3 }}
                  />
                </motion.div>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">Student Pass System</h1>
              </div>
            </motion.div>
            <div className="flex items-center space-x-4">
              <BouncyButton className="btn-primary">
                <Link to="/login" className="flex items-center">
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mr-2"
                  >
                    ✨
                  </motion.span>
                  Sign In
                </Link>
              </BouncyButton>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              className="mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <motion.span 
                className="text-6xl mb-4 inline-block"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                key={currentEmoji}
              >
                {currentEmoji}
              </motion.span>
            </motion.div>
            
            <motion.h1 
              className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.span
                key={heroText}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {heroText}
              </motion.span>
              <br />
              <motion.span 
                className="text-primary-600 relative"
                animate={{ 
                  background: [
                    'linear-gradient(45deg, #2563eb, #7c3aed)',
                    'linear-gradient(45deg, #7c3aed, #059669)',
                    'linear-gradient(45deg, #059669, #d97706)',
                    'linear-gradient(45deg, #d97706, #2563eb)'
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}
              >
                Student Pass
                <motion.span
                  className="absolute -top-2 -right-2"
                  animate={{ rotate: 360, scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <SparklesIcon className="w-6 h-6 text-yellow-400" />
                </motion.span>
              </motion.span>
              <br />
              Management
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              A comprehensive digital solution for managing student access passes. 
              From application to approval to access control - all in one platform.
              <motion.span
                className="inline-block ml-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🎯
              </motion.span>
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              <BouncyButton className="btn-primary text-lg px-8 py-3">
                <Link to="/login" className="flex items-center">
                  <RocketLaunchIcon className="w-5 h-5 mr-2" />
                  Get Started
                  <motion.span
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </Link>
              </BouncyButton>
              
              <BouncyButton className="btn-outline text-lg px-8 py-3">
                <a href="#features" className="flex items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <StarIcon className="w-5 h-5" />
                  </motion.div>
                  Learn More
                </a>
              </BouncyButton>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-3xl font-bold text-gray-900 mb-4"
              animate={{ 
                background: [
                  'linear-gradient(45deg, #1f2937, #374151)',
                  'linear-gradient(45deg, #374151, #2563eb)',
                  'linear-gradient(45deg, #2563eb, #1f2937)'
                ]
              }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}
            >
              Why Choose Our System?
              <motion.span
                className="inline-block ml-2"
                animate={{ rotate: [0, 20, -20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🤔
              </motion.span>
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              viewport={{ once: true }}
            >
              Built specifically for educational institutions to manage student access 
              with modern technology and user-friendly interfaces.
              <motion.span
                className="inline-block ml-1"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.span>
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <WigglyCard 
                key={index} 
                className="text-center" 
                delay={index * 0.2}
              >
                <motion.div 
                  className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden"
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 10,
                    background: 'linear-gradient(45deg, #dbeafe, #ede9fe)'
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.5
                    }}
                  >
                    <feature.icon className="w-8 h-8 text-primary-600" />
                  </motion.div>
                  
                  {/* Sparkle effect on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0"
                    whileHover={{ opacity: 1 }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                        style={{
                          top: `${20 + i * 20}%`,
                          left: `${20 + i * 25}%`
                        }}
                        animate={{ 
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </motion.div>
                </motion.div>
                
                <motion.h3 
                  className="text-xl font-semibold text-gray-900 mb-2"
                  whileHover={{ scale: 1.05, color: '#2563eb' }}
                >
                  {feature.title}
                </motion.h3>
                
                <motion.p 
                  className="text-gray-600"
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1.02 }}
                >
                  {feature.description}
                </motion.p>
              </WigglyCard>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Simple three-step process for both students and administrators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Student Applies
              </h3>
              <p className="text-gray-600">
                Students submit applications with required documents through the digital platform.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Admin Reviews
              </h3>
              <p className="text-gray-600">
                Administrators review applications and approve or request additional information.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Access Granted
              </h3>
              <p className="text-gray-600">
                Approved students receive digital passes with QR codes for secure access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of students and administrators who trust our platform 
            for their access control needs.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 transition-colors"
          >
            Sign In Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SP</span>
              </div>
              <span className="ml-3 text-lg font-semibold">Student Pass System</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 Student Pass System. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;