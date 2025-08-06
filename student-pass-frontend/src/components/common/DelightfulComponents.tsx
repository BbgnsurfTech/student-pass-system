import React from 'react';
import { motion } from 'framer-motion';
import { 
  SparklesIcon,
  FaceSmileIcon,
  HeartIcon,
  StarIcon,
  BoltIcon,
  SunIcon,
  MoonIcon,
  RocketLaunchIcon,
  TrophyIcon,
  FireIcon,
  BeakerIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

// Floating Particles Component
export const FloatingParticles: React.FC = () => {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    icon: [SparklesIcon, StarIcon, HeartIcon, SunIcon, BoltIcon][i % 5],
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => {
        const IconComponent = particle.icon;
        return (
          <motion.div
            key={particle.id}
            className="absolute opacity-20"
            initial={{ 
              x: `${particle.x}vw`, 
              y: `${particle.y}vh`,
              scale: 0,
              rotate: 0
            }}
            animate={{
              y: [`${particle.y}vh`, `${particle.y - 20}vh`, `${particle.y}vh`],
              x: [`${particle.x}vw`, `${particle.x + 5}vw`, `${particle.x}vw`],
              scale: [0, 1, 0.8, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <IconComponent className="w-4 h-4 text-primary-400" />
          </motion.div>
        );
      })}
    </div>
  );
};

// Bouncy Button Component
export const BouncyButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}> = ({ children, onClick, className = '', type = 'button', disabled = false }) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${className} relative overflow-hidden`}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
      }}
      whileTap={{ 
        scale: 0.95,
        boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary-400 to-secondary-400 opacity-0"
        whileHover={{ opacity: 0.1 }}
        transition={{ duration: 0.3 }}
      />
      {children}
    </motion.button>
  );
};

// Wiggling Card Component
export const WigglyCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      className={`${className} relative`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        rotate: [0, 0.5, -0.5, 0]
      }}
      transition={{ 
        duration: 0.6,
        delay,
        rotate: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      whileHover={{ 
        scale: 1.02,
        rotate: 0,
        boxShadow: "0 15px 30px rgba(0,0,0,0.1)",
        transition: { duration: 0.2 }
      }}
    >
      {children}
    </motion.div>
  );
};

// Celebration Confetti
export const CelebrationConfetti: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['bg-primary-400', 'bg-secondary-400', 'bg-success-400', 'bg-warning-400'][i % 4]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          className={`absolute w-2 h-2 ${piece.color} rounded-full`}
          initial={{
            x: `${piece.x}vw`,
            y: "-10vh",
            rotate: 0,
            scale: 0
          }}
          animate={{
            y: "110vh",
            rotate: 360,
            scale: [0, 1, 1, 0],
            x: [`${piece.x}vw`, `${piece.x + (Math.random() - 0.5) * 20}vw`]
          }}
          transition={{
            duration: 3,
            delay: piece.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
};

// Playful Loading Spinner
export const PlayfulLoader: React.FC<{ 
  message?: string;
  icon?: React.ElementType;
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  message = "Working some magic...", 
  icon: Icon = BeakerIcon,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const loadingMessages = [
    "Sprinkling some digital dust...",
    "Connecting the dots...",
    "Making things awesome...",
    "Brewing something special...",
    "Almost there...",
    "Putting the pieces together..."
  ];

  const [currentMessage, setCurrentMessage] = React.useState(message);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
      setCurrentMessage(randomMessage);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className={`${sizeClasses[size]} text-primary-600`}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Icon className="w-full h-full" />
        </motion.div>
        
        {/* Orbiting sparkles */}
        {[0, 120, 240].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-secondary-400 rounded-full"
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: '0 0'
            }}
            animate={{
              rotate: [angle, angle + 360],
              x: [0, 20, 0],
              y: [0, 0, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </motion.div>
      
      <motion.p 
        className="text-sm text-gray-600 text-center max-w-xs"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        key={currentMessage}
      >
        {currentMessage}
      </motion.p>
    </div>
  );
};

// Success Celebration Component
export const SuccessCelebration: React.FC<{
  show: boolean;
  message: string;
  icon?: React.ElementType;
}> = ({ show, message, icon: Icon = TrophyIcon }) => {
  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-lg p-8 text-center max-w-md mx-4"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: 1, 
          rotate: 0,
          transition: {
            type: "spring",
            stiffness: 200,
            damping: 15
          }
        }}
      >
        <motion.div
          className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 0.6,
            repeat: 2
          }}
        >
          <Icon className="w-8 h-8 text-success-600" />
        </motion.div>
        
        <motion.h3 
          className="text-xl font-bold text-gray-900 mb-2"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Awesome!
        </motion.h3>
        
        <motion.p 
          className="text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>
      </motion.div>
      
      <CelebrationConfetti show={show} />
    </motion.div>
  );
};

// Empty State with Personality
export const EmptyStateWithPersonality: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
}> = ({ icon: Icon, title, description, actionButton }) => {
  return (
    <motion.div
      className="text-center py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"
        animate={{ 
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.1 }}
      >
        <Icon className="w-12 h-12 text-gray-400" />
      </motion.div>
      
      <motion.h3 
        className="text-lg font-medium text-gray-900 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>
      
      <motion.p 
        className="text-gray-600 mb-6 max-w-sm mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {description}
      </motion.p>
      
      {actionButton && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <BouncyButton
            onClick={actionButton.onClick}
            className="btn-primary"
          >
            {actionButton.text}
          </BouncyButton>
        </motion.div>
      )}
    </motion.div>
  );
};

// Animated Status Badge
export const AnimatedStatusBadge: React.FC<{
  status: string;
  className?: string;
}> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          className: 'badge-success',
          icon: '✅',
          animate: { scale: [1, 1.1, 1] }
        };
      case 'pending':
        return {
          className: 'badge-warning',
          icon: '⏳',
          animate: { rotate: [0, 10, -10, 0] }
        };
      case 'rejected':
        return {
          className: 'badge-error',
          icon: '❌',
          animate: { x: [-2, 2, -2, 2, 0] }
        };
      case 'active':
        return {
          className: 'badge-success',
          icon: '🟢',
          animate: { opacity: [1, 0.7, 1] }
        };
      default:
        return {
          className: 'badge-info',
          icon: '📋',
          animate: { y: [0, -2, 0] }
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <motion.span
      className={`badge ${config.className} ${className} inline-flex items-center gap-1`}
      animate={config.animate}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="text-xs">{config.icon}</span>
      {status}
    </motion.span>
  );
};

// Page Transition Wrapper
export const PageTransition: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ 
        duration: 0.3,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};
