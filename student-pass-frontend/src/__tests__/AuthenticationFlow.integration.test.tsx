import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createUnauthenticatedState } from '../utils/test-utils';
import LoginPage from '../pages/auth/LoginPage';
import Layout from '../components/common/Layout';
import StudentDashboard from '../pages/student/StudentDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock components to avoid complex animations and external dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
    thead: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
    tbody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  EyeIcon: () => <div data-testid="eye-icon" />,
  EyeSlashIcon: () => <div data-testid="eye-slash-icon" />,
  HomeIcon: () => <div data-testid="home-icon" />,
  DocumentTextIcon: () => <div data-testid="document-icon" />,
  UserIcon: () => <div data-testid="user-icon" />,
  CogIcon: () => <div data-testid="cog-icon" />,
  LogoutIcon: () => <div data-testid="logout-icon" />,
  MenuIcon: () => <div data-testid="menu-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  QrCodeIcon: () => <div data-testid="qr-code-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  CheckCircleIcon: () => <div data-testid="check-circle-icon" />,
  SparklesIcon: () => <div data-testid="sparkles-icon" />,
  UsersIcon: () => <div data-testid="users-icon" />,
  ChartBarIcon: () => <div data-testid="chart-bar-icon" />,
}));

// Mock delightful components
jest.mock('../components/common/DelightfulComponents', () => ({
  BouncyButton: ({ children, className, ...props }: any) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
  WigglyCard: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  PlayfulLoader: ({ message }: any) => <div data-testid="playful-loader">{message}</div>,
  EmptyStateWithPersonality: ({ title, description, actionButton, icon: Icon }: any) => (
    <div data-testid="empty-state">
      <Icon />
      <h3>{title}</h3>
      <p>{description}</p>
      {actionButton && <button onClick={actionButton.onClick}>{actionButton.text}</button>}
    </div>
  ),
  AnimatedStatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
  PageTransition: ({ children }: any) => <div>{children}</div>,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Authentication Flow Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe('Student Authentication Flow', () => {
    it('should complete full student login flow', async () => {
      const { store } = renderWithProviders(
        <LoginPage />,
        {
          preloadedState: createUnauthenticatedState(),
          initialEntries: ['/login']
        }
      );

      // Verify login page is rendered
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();

      // Fill in student credentials
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for login to complete
      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user?.email).toBe('test@example.com');
        expect(state.auth.user?.role).toBe('STUDENT');
        expect(state.auth.token).toBe('mock-token');
      });

      // Verify navigation to student dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard');

      // Verify localStorage is updated
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
    });

    it('should render student dashboard after successful login', async () => {
      // Simulate already authenticated student
      const authenticatedState = {
        auth: {
          user: {
            id: '1',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT' as const,
          },
          token: 'mock-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(
        <Layout>
          <StudentDashboard />
        </Layout>,
        {
          preloadedState: authenticatedState,
          initialEntries: ['/student/dashboard']
        }
      );

      // Verify student dashboard is rendered
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, John!/)).toBeInTheDocument();
        expect(screen.getByText('New Application')).toBeInTheDocument();
        expect(screen.getByText('Active Passes')).toBeInTheDocument();
        expect(screen.getByText('Recent Applications')).toBeInTheDocument();
      });

      // Verify student navigation is present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Verify user info in sidebar
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('STUDENT')).toBeInTheDocument();
    });
  });

  describe('Admin Authentication Flow', () => {
    it('should complete full admin login flow', async () => {
      const { store } = renderWithProviders(
        <LoginPage />,
        {
          preloadedState: createUnauthenticatedState(),
          initialEntries: ['/login']
        }
      );

      // Fill in admin credentials
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for login to complete
      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user?.email).toBe('admin@example.com');
        expect(state.auth.user?.role).toBe('ADMIN');
        expect(state.auth.token).toBe('mock-admin-token');
      });

      // Verify navigation to admin dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('should render admin dashboard after successful login', async () => {
      // Simulate already authenticated admin
      const authenticatedState = {
        auth: {
          user: {
            id: '2',
            email: 'admin@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'ADMIN' as const,
          },
          token: 'mock-admin-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(
        <Layout>
          <AdminDashboard />
        </Layout>,
        {
          preloadedState: authenticatedState,
          initialEntries: ['/admin/dashboard']
        }
      );

      // Verify admin dashboard is rendered
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Manage student applications and monitor system activity.')).toBeInTheDocument();
        expect(screen.getByText('Pending Applications')).toBeInTheDocument();
        expect(screen.getByText('Recent Passes')).toBeInTheDocument();
      });

      // Verify admin navigation is present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Logout Flow', () => {
    it('should handle logout correctly', async () => {
      const authenticatedState = {
        auth: {
          user: {
            id: '1',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT' as const,
          },
          token: 'mock-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

      const { store } = renderWithProviders(
        <Layout>
          <StudentDashboard />
        </Layout>,
        {
          preloadedState: authenticatedState,
          initialEntries: ['/student/dashboard']
        }
      );

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, John!/)).toBeInTheDocument();
      });

      // Find and click logout button
      const logoutButton = screen.getByTestId('logout-icon').closest('button');
      await user.click(logoutButton!);

      // Verify state is cleared
      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(false);
        expect(state.auth.user).toBeNull();
        expect(state.auth.token).toBeNull();
      });

      // Verify navigation to login
      expect(mockNavigate).toHaveBeenCalledWith('/login');

      // Verify localStorage is cleared
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Error Handling', () => {
    it('should handle login failure gracefully', async () => {
      // Mock login failure
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      const { store } = renderWithProviders(
        <LoginPage />,
        {
          preloadedState: createUnauthenticatedState(),
          initialEntries: ['/login']
        }
      );

      // Try to login with invalid credentials
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });

      // Verify state remains unauthenticated
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.user).toBeNull();
      expect(state.auth.token).toBeNull();

      // Verify no navigation occurred
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      // Mock network error
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.error();
        })
      );

      renderWithProviders(
        <LoginPage />,
        {
          preloadedState: createUnauthenticatedState(),
          initialEntries: ['/login']
        }
      );

      // Try to login
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Role-based Navigation', () => {
    it('should show different navigation for different roles', async () => {
      // Test student navigation
      const studentState = {
        auth: {
          user: {
            id: '1',
            email: 'student@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT' as const,
          },
          token: 'mock-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

      const { rerender } = renderWithProviders(
        <Layout>
          <div>Student Content</div>
        </Layout>,
        {
          preloadedState: studentState,
          initialEntries: ['/student/dashboard']
        }
      );

      // Verify student navigation
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/student/dashboard');

      // Test admin navigation
      const adminState = {
        auth: {
          user: {
            id: '2',
            email: 'admin@example.com',
            firstName: 'Jane',
            lastName: 'Admin',
            role: 'ADMIN' as const,
          },
          token: 'mock-admin-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

      rerender(
        <Layout>
          <div>Admin Content</div>
        </Layout>
      );

      // Wait for re-render and check for updated navigation
      await waitFor(() => {
        const adminDashboardLink = screen.getByRole('link', { name: /dashboard/i });
        expect(adminDashboardLink).toHaveAttribute('href', '/admin/dashboard');
      });
    });
  });

  describe('Token Persistence', () => {
    it('should persist authentication state on page reload', () => {
      // Mock localStorage with existing token
      (localStorage.getItem as jest.Mock).mockReturnValue('existing-token');

      // This would typically be handled by app initialization
      const existingAuthState = {
        auth: {
          user: null,
          token: 'existing-token',
          isAuthenticated: false,
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(
        <Layout>
          <div>Test Content</div>
        </Layout>,
        {
          preloadedState: existingAuthState,
          initialEntries: ['/']
        }
      );

      // Verify token is loaded from localStorage
      expect(localStorage.getItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      // Mock delayed login response
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

      renderWithProviders(
        <LoginPage />,
        {
          preloadedState: createUnauthenticatedState(),
          initialEntries: ['/login']
        }
      );

      // Start login process
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify loading state
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation Integration', () => {
    it('should prevent login attempt with invalid form data', async () => {
      renderWithProviders(
        <LoginPage />,
        {
          preloadedState: createUnauthenticatedState(),
          initialEntries: ['/login']
        }
      );

      // Try to submit with invalid email
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Verify validation error is shown
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      // Verify no API call was made (no navigation)
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});