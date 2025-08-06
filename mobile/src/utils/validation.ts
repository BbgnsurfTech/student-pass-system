export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

export function validateStudentId(studentId: string): boolean {
  // Assuming student ID format: alphanumeric, 6-12 characters
  const studentIdRegex = /^[A-Z0-9]{6,12}$/;
  return studentIdRegex.test(studentId.toUpperCase());
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateMinLength(
  value: string, 
  minLength: number, 
  fieldName: string
): string | null {
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  return null;
}

export function validateMaxLength(
  value: string, 
  maxLength: number, 
  fieldName: string
): string | null {
  if (value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters long`;
  }
  return null;
}

export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export function validateFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
}

export function validatePastDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
}

export interface ValidationRule {
  field: string;
  value: any;
  rules: Array<{
    type: 'required' | 'email' | 'password' | 'phone' | 'minLength' | 'maxLength' | 'custom';
    params?: any;
    message?: string;
    validator?: (value: any) => boolean;
  }>;
}

export function validateForm(rules: ValidationRule[]): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  rules.forEach(({ field, value, rules: fieldRules }) => {
    for (const rule of fieldRules) {
      let isValid = true;
      let errorMessage = '';

      switch (rule.type) {
        case 'required':
          isValid = value !== null && value !== undefined && value !== '';
          errorMessage = rule.message || `${field} is required`;
          break;

        case 'email':
          isValid = !value || validateEmail(value);
          errorMessage = rule.message || `${field} must be a valid email`;
          break;

        case 'password':
          const passwordValidation = validatePassword(value);
          isValid = passwordValidation.isValid;
          errorMessage = rule.message || passwordValidation.errors[0];
          break;

        case 'phone':
          isValid = !value || validatePhone(value);
          errorMessage = rule.message || `${field} must be a valid phone number`;
          break;

        case 'minLength':
          isValid = !value || value.length >= (rule.params || 0);
          errorMessage = rule.message || `${field} must be at least ${rule.params} characters`;
          break;

        case 'maxLength':
          isValid = !value || value.length <= (rule.params || Infinity);
          errorMessage = rule.message || `${field} must be no more than ${rule.params} characters`;
          break;

        case 'custom':
          isValid = !value || !rule.validator || rule.validator(value);
          errorMessage = rule.message || `${field} is invalid`;
          break;

        default:
          break;
      }

      if (!isValid) {
        errors[field] = errorMessage;
        break; // Stop at first error for this field
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}