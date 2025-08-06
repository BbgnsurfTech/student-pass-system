import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  SparklesIcon,
  RocketLaunchIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { BouncyButton } from './DelightfulComponents';

interface DelightfulFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const DelightfulForm: React.FC<DelightfulFormProps> = ({
  onSubmit,
  isLoading = false,
  children,
  title,
  subtitle
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showMotivation, setShowMotivation] = useState(false);

  const motivationalMessages = [
    "You're doing great! Keep going! 💪",
    "Almost there! You've got this! ✨",
    "Every field completed is progress! 🚀",
    "Looking good so far! 👍",
    "You're on fire! 🔥"
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setShowMotivation(true);
        setTimeout(() => setShowMotivation(false), 3000);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-secondary-50 opacity-50" />
      
      {/* Floating sparkles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-40"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`
          }}
          animate={{
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.5
          }}
        />
      ))}

      {/* Header */}
      <motion.div 
        className="text-center mb-8 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <motion.h1 
          className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center"
          animate={{ 
            background: [
              'linear-gradient(45deg, #1f2937, #2563eb)',
              'linear-gradient(45deg, #2563eb, #7c3aed)',
              'linear-gradient(45deg, #7c3aed, #1f2937)'
            ]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}
        >
          <motion.span
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mr-3"
          >
            📝
          </motion.span>
          {title}
        </motion.h1>
        
        {subtitle && (
          <motion.p 
            className="text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {subtitle}
            <motion.span
              className="inline-block ml-2"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ✨
            </motion.span>
          </motion.p>
        )}
      </motion.div>

      {/* Motivational message */}
      <AnimatePresence>
        {showMotivation && (
          <motion.div
            className="mb-6 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300 relative z-10"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <motion.p 
              className="text-yellow-800 font-medium text-center flex items-center justify-center"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="mr-2"
              >
                🎉
              </motion.span>
              {motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form content */}
      <motion.div 
        className="relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Delightful Input Field Component
export const DelightfulInput: React.FC<{
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  emoji?: string;
  required?: boolean;
}> = ({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error, 
  emoji = '📝', 
  required = false 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  React.useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  return (
    <motion.div 
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.label 
        className="block text-sm font-medium text-gray-700 mb-2 flex items-center"
        animate={{
          color: isFocused ? '#2563eb' : '#374151',
          scale: isFocused ? 1.02 : 1
        }}
        transition={{ duration: 0.2 }}
      >
        <motion.span
          animate={{ 
            scale: isFocused ? [1, 1.2, 1] : 1,
            rotate: isFocused ? [0, 10, -10, 0] : 0
          }}
          transition={{ duration: 0.5 }}
          className="mr-2"
        >
          {emoji}
        </motion.span>
        {label}
        {required && (
          <motion.span 
            className="text-red-500 ml-1"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            *
          </motion.span>
        )}
      </motion.label>
      
      <motion.div className="relative">
        <motion.input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          whileFocus={{
            scale: 1.01,
            boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
            borderColor: '#2563eb'
          }}
          animate={{
            borderColor: hasValue ? '#10b981' : '#d1d5db'
          }}
        />
        
        {/* Success indicator */}
        <AnimatePresence>
          {hasValue && !error && (
            <motion.div
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Floating label animation */}
        {isFocused && (
          <motion.div
            className="absolute -top-2 left-3 px-1 bg-white text-xs text-primary-600 font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.div>
        )}
      </motion.div>
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-2 flex items-center text-red-600 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className="mr-2"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
            </motion.span>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Fancy Submit Button
export const FancySubmitButton: React.FC<{
  isLoading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ isLoading = false, children, onClick, disabled = false }) => {
  return (
    <motion.div className="text-center">
      <BouncyButton
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-lg shadow-lg ${
          disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center justify-center">
          {isLoading ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span>Processing...</span>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="ml-2"
              >
                ✨
              </motion.span>
            </>
          ) : (
            <>
              <motion.span
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mr-2"
              >
                🚀
              </motion.span>
              {children}
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="ml-2"
              >
                →
              </motion.span>
            </>
          )}
        </div>
      </BouncyButton>
    </motion.div>
  );
};
