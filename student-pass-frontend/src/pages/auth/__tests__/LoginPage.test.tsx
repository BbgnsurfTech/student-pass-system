import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createUnauthenticatedState } from '../../../utils/test-utils';
import LoginPage from '../LoginPage';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock the icons
jest.mock('@heroicons/react/24/outline', () => ({
  EyeIcon: () => <div data-testid="eye-icon" />,
  EyeSlashIcon: () => <div data-testid="eye-slash-icon" />,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderLoginPage = (preloadedState = createUnauthenticatedState()) => {
    return renderWithProviders(
      <LoginPage />,
      { 
        preloadedState,
        initialEntries: ['/login']
      }
    );
  };

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      renderLoginPage();

      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByText('Access your student pass dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText('Remember me')).toBeInTheDocument();
      expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    });

    it('should render demo credentials section', () => {
      renderLoginPage();

      expect(screen.getByText('Demo Credentials:')).toBeInTheDocument();
      expect(screen.getByText(/student@demo.com/)).toBeInTheDocument();
      expect(screen.getByText(/admin@demo.com/)).toBeInTheDocument();
    });

    it('should render Student Pass logo', () => {
      renderLoginPage();

      expect(screen.getByText('SP')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show email validation error for invalid email', async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should show password validation error for short password', async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    it('should show validation errors for empty fields', async () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    it('should clear validation errors when valid input is entered', async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation errors
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      // Enter valid values
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
        expect(screen.queryByText('Password must be at least 6 characters')).not.toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye icon is clicked', async () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const toggleButton = screen.getByTestId('eye-icon').closest('button');

      // Initially password should be hidden
      expect(passwordInput.type).toBe('password');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      // Click to show password
      await user.click(toggleButton!);

      expect(passwordInput.type).toBe('text');
      expect(screen.getByTestId('eye-slash-icon')).toBeInTheDocument();

      // Click to hide password again
      await user.click(toggleButton!);

      expect(passwordInput.type).toBe('password');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should login successfully with valid student credentials', async () => {
      const { store } = renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user?.email).toBe('test@example.com');
        expect(state.auth.user?.role).toBe('STUDENT');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard');
    });

    it('should login successfully with valid admin credentials', async () => {
      const { store } = renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user?.email).toBe('admin@example.com');
        expect(state.auth.user?.role).toBe('ADMIN');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('should show error message for invalid credentials', async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show loading state during login', async () => {
      // Mock a delayed response
      server.use(
        http.post('/api/v1/auth/login', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
              role: 'STUDENT',
            },
            token: 'mock-token',
          });
        })
      );

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.error();
        })
      );

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should allow form submission with Enter key', async () => {
      const { store } = renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
      });
    });

    it('should focus on password field after typing email and pressing tab', async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.keyboard('{Tab}');

      expect(passwordInput).toHaveFocus();
    });

    it('should handle remember me checkbox', async () => {
      renderLoginPage();

      const rememberCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;

      expect(rememberCheckbox.checked).toBe(false);

      await user.click(rememberCheckbox);
      expect(rememberCheckbox.checked).toBe(true);

      await user.click(rememberCheckbox);
      expect(rememberCheckbox.checked).toBe(false);
    });
  });

  describe('Links and Navigation', () => {
    it('should have link to register page', () => {
      renderLoginPage();

      const contactAdminLink = screen.getByText('Contact your administrator');
      expect(contactAdminLink).toHaveAttribute('href', '/register');
    });

    it('should have forgot password link', () => {
      renderLoginPage();

      const forgotPasswordLink = screen.getByText('Forgot your password?');
      expect(forgotPasswordLink).toHaveAttribute('href', '#');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should associate error messages with form fields', async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Please enter a valid email address');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    it('should show custom error message from server', async () => {
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Account temporarily locked' },
            { status: 401 }
          );
        })
      );

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Account temporarily locked')).toBeInTheDocument();
      });
    });

    it('should show generic error message for unknown errors', async () => {
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({}, { status: 500 });
        })
      );

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });
  });
});