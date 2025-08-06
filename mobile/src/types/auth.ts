export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin' | 'school_admin' | 'security';
  avatar?: string;
  phone?: string;
  studentId?: string;
  schoolId?: string;
  department?: string;
  year?: number;
  location?: string;
  permissions: string[];
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  studentId?: string;
  schoolId?: string;
  department?: string;
  year?: number;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface BiometricCredentials {
  email: string;
  userId: string;
}

export interface PasswordReset {
  email: string;
  token?: string;
  newPassword?: string;
}

export interface EmailVerification {
  email: string;
  token: string;
}