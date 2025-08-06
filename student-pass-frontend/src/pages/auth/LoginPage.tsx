import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useLoginMutation } from '../../store/api/api';
import { useAppDispatch } from '../../store/hooks';
import { loginSuccess } from '../../store/slices/authSlice';
import { BouncyButton, PlayfulLoader, SuccessCelebration, PageTransition } from '../../components/common/DelightfulComponents';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inputFocus, setInputFocus] = useState<string | null>(null);
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data).unwrap();
      dispatch(loginSuccess(result));
      
      // Show success celebration
      setShowSuccess(true);
      
      // Redirect after celebration
      setTimeout(() => {
        const redirectPath = result.user.role === 'STUDENT' 
          ? '/student/dashboard' 
          : '/admin/dashboard';
        navigate(redirectPath);
      }, 2000);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-64 h-64 bg-gradient-to-r from-primary-200 to-secondary-200 rounded-full opacity-10"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, 100, 0],
                y: [0, -100, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 20 + i * 5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        <motion.div 
          className="max-w-md w-full space-y-8 relative z-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="flex justify-center">
              <motion.div 
                className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center relative overflow-hidden"
                whileHover={{ 
                  scale: 1.1,
                  rotate: 5,
                  boxShadow: "0 10px 25px rgba(37, 99, 235, 0.3)"
                }}
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(37, 99, 235, 0.3)",
                    "0 0 40px rgba(124, 58, 237, 0.3)",
                    "0 0 20px rgba(37, 99, 235, 0.3)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <motion.span 
                  className="text-white font-bold text-2xl relative z-10"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  SP
                </motion.span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-secondary-400 to-primary-400"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Sparkles around logo */}
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                    style={{
                      top: `${10 + i * 20}%`,
                      left: `${10 + i * 20}%`
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                      rotate: 360
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.5
                    }}
                  />
                ))}
              </motion.div>
            </div>
            
            <motion.h2 
              className="mt-6 text-center text-3xl font-extrabold text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Welcome Back!
              <motion.span
                className="inline-block ml-2"
                animate={{ 
                  rotate: [0, 20, -20, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                😊
              </motion.span>
            </motion.h2>
            
            <motion.p 
              className="mt-2 text-center text-sm text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Ready to access your student pass dashboard?
              <motion.span
                className="inline-block ml-1"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ✨
              </motion.span>
            </motion.p>
          </motion.div>

          <motion.form 
            className="mt-8 space-y-6" 
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <motion.div 
              className="form-group"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.label 
                htmlFor="email" 
                className="form-label"
                animate={{ 
                  color: inputFocus === 'email' ? '#2563eb' : '#374151',
                  scale: inputFocus === 'email' ? 1.05 : 1
                }}
              >
                Email address
                <motion.span
                  className="inline-block ml-1"
                  animate={{ opacity: inputFocus === 'email' ? 1 : 0.7 }}
                >
                  📧
                </motion.span>
              </motion.label>
              <motion.input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className="form-input"
                placeholder="Enter your email"
                onFocus={() => setInputFocus('email')}
                onBlur={() => setInputFocus(null)}
                whileFocus={{ 
                  scale: 1.02,
                  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  borderColor: '#2563eb'
                }}
              />
              <AnimatePresence>
                {errors.email && (
                  <motion.p 
                    className="mt-1 text-sm text-error-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="mr-1"
                    >
                      ⚠️
                    </motion.span>
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div 
              className="form-group"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.label 
                htmlFor="password" 
                className="form-label"
                animate={{ 
                  color: inputFocus === 'password' ? '#2563eb' : '#374151',
                  scale: inputFocus === 'password' ? 1.05 : 1
                }}
              >
                Password
                <motion.span
                  className="inline-block ml-1"
                  animate={{ opacity: inputFocus === 'password' ? 1 : 0.7 }}
                >
                  🔒
                </motion.span>
              </motion.label>
              <div className="relative">
                <motion.input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  className="form-input pr-10"
                  placeholder="Enter your password"
                  onFocus={() => setInputFocus('password')}
                  onBlur={() => setInputFocus(null)}
                  whileFocus={{ 
                    scale: 1.02,
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    borderColor: '#2563eb'
                  }}
                />
                <motion.button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    animate={{ rotate: showPassword ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </motion.div>
                </motion.button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p 
                    className="mt-1 text-sm text-error-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="mr-1"
                    >
                      ⚠️
                    </motion.span>
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                Forgot your password?
              </a>
            </div>
          </div>

          {error && (
            <div className="bg-error-50 border border-error-200 rounded-md p-4">
              <p className="text-sm text-error-600">
                {'data' in error && error.data 
                  ? (error.data as any).message || 'Login failed. Please try again.'
                  : 'Login failed. Please try again.'}
              </p>
            </div>
          )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {isLoading ? (
                <div className="w-full py-3">
                  <PlayfulLoader 
                    message="Logging you in with style..."
                    size="sm"
                  />
                </div>
              ) : (
                <BouncyButton
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3 text-base"
                >
                  <motion.div className="flex items-center justify-center">
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
                    Sign In
                    <motion.span
                      className="ml-2"
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </motion.div>
                </BouncyButton>
              )}
            </motion.div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Contact your administrator
              </Link>
            </p>
          </div>
          </motion.form>

          {/* Demo credentials */}
          <motion.div 
            className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            whileHover={{ 
              scale: 1.02,
              borderColor: '#2563eb',
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
            }}
          >
            <motion.h3 
              className="text-sm font-medium text-gray-900 mb-2 flex items-center"
              animate={{ color: ['#111827', '#2563eb', '#111827'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                🎭
              </motion.span>
              Demo Credentials:
            </motion.h3>
            <div className="text-xs text-gray-600 space-y-1">
              <motion.p
                whileHover={{ scale: 1.05, color: '#2563eb' }}
                className="cursor-pointer"
              >
                <strong>Student:</strong> student@demo.com / password123 
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="ml-1"
                >
                  🎓
                </motion.span>
              </motion.p>
              <motion.p
                whileHover={{ scale: 1.05, color: '#7c3aed' }}
                className="cursor-pointer"
              >
                <strong>Admin:</strong> admin@demo.com / password123
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="ml-1"
                >
                  👑
                </motion.span>
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
        
        <SuccessCelebration 
          show={showSuccess}
          message="Welcome back! Redirecting to your dashboard..."
        />
      </div>
    </PageTransition>
  );
};

export default LoginPage;